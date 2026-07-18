/* ===== 데이터 저장: Supabase 단일 공용 저장소 ===== */
function cloudPayload(){
  return {
    data_version: DATA_VERSION,
    id_seq: state._idSeq,
    cost_items: state.costItems,
    shipping_items: state.shippingItems,
    customers: state.customers,
    suppliers: state.suppliers,
    order_history: state.orderHistory,
    draft_order: state.draftOrder,
    favorite_customer_ids: state.favoriteCustomerIds || []
  };
}

function applyCloudPayload(data){
  if(!data || typeof data !== 'object') return false;
  if(Array.isArray(data.cost_items)) state.costItems = data.cost_items;
  if(Array.isArray(data.shipping_items)) state.shippingItems = data.shipping_items;
  if(Array.isArray(data.customers)) state.customers = data.customers;
  if(Array.isArray(data.suppliers)) state.suppliers = data.suppliers;
  if(Array.isArray(data.order_history)) state.orderHistory = data.order_history;
  state.draftOrder = (data.draft_order && typeof data.draft_order === 'object') ? data.draft_order : null;
  state.favoriteCustomerIds = Array.isArray(data.favorite_customer_ids) ? data.favorite_customer_ids.map(Number) : [];
  if(Number.isFinite(Number(data.id_seq))) state._idSeq = Math.max(Number(data.id_seq), 2000);
  state.customers.forEach(migrateCustomer);
  state._seedMigrationNeeded = mergeSeedData(data.data_version);
  state.smsSettings = { apiKey:'', apiSecret:'', fromNum:'' };
  loadApiSettings();
  return true;
}

async function fetchLatestDraftOrder(){
  if(!db) throw new Error('Supabase 연결이 없습니다.');
  const { data, error } = await db
    .from('app_state')
    .select('data')
    .eq('id', CLOUD_ROW_ID)
    .maybeSingle();
  if(error) throw error;
  const draft = data && data.data ? data.data.draft_order : null;
  return (draft && typeof draft === 'object') ? draft : null;
}

async function saveCloudNow(){
  if(!db){
    alert('Supabase 연결 설정을 확인해주세요. 클라우드에 저장할 수 없습니다.');
    return false;
  }
  if(cloudSaving){
    cloudSaveQueued = true;
    return false;
  }

  cloudSaving = true;
  cloudSaveQueued = false;
  const updatedAt = new Date().toISOString();
  try{
    const { error } = await db
      .from('app_state')
      .upsert({
        id: CLOUD_ROW_ID,
        data: cloudPayload(),
        updated_at: updatedAt
      }, { onConflict: 'id' });
    if(error) throw error;
    cloudLastUpdatedAt = updatedAt;
    console.log('Supabase 저장 완료', updatedAt);
    return true;
  }catch(e){
    console.error('Supabase 저장 실패:', e);
    alert('클라우드 저장에 실패했습니다. 인터넷 연결, app_state 권한과 Supabase 설정을 확인해주세요.');
    return false;
  }finally{
    cloudSaving = false;
    if(cloudSaveQueued){
      cloudSaveQueued = false;
      clearTimeout(cloudSaveTimer);
      cloudSaveTimer = setTimeout(saveCloudNow, 100);
    }
  }
}

function saveData(immediate=false){
  if(!db) return;
  clearTimeout(cloudSaveTimer);
  if(immediate) saveCloudNow();
  else cloudSaveTimer = setTimeout(saveCloudNow, 700);
}

async function loadData(){
  if(!db) throw new Error('Supabase 클라이언트가 생성되지 않았습니다.');

  const { data, error } = await db
    .from('app_state')
    .select('data, updated_at')
    .eq('id', CLOUD_ROW_ID)
    .maybeSingle();

  if(error) throw error;

  if(data && data.data){
    applyCloudPayload(data.data);
    cloudLastUpdatedAt = data.updated_at || '';
    if(state._seedMigrationNeeded){
      state._seedMigrationNeeded=false;
      await saveCloudNow();
    }
  }else{
    await saveCloudNow();
  }
}

function startRealtimeSync(){
  if(!db || realtimeChannel) return;
  realtimeChannel = db
    .channel('app-state-sync')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'app_state',
      filter: `id=eq.${CLOUD_ROW_ID}`
    }, payload => {
      const row = payload.new;
      if(!row || !row.data) return;
      if(row.updated_at && row.updated_at === cloudLastUpdatedAt) return;
      cloudLastUpdatedAt = row.updated_at || '';
      applyCloudPayload(row.data);
      render();
      toast('다른 기기에서 변경한 내용을 불러왔습니다');
    })
    .subscribe(status => console.log('실시간 동기화 상태:', status));
}

let authBooted = false;

function showLogin(message=''){
  document.getElementById('appShell').hidden = true;
  document.getElementById('authGate').hidden = false;
  const msg=document.getElementById('loginMessage');
  if(msg) msg.textContent=message;
}

function showApp(session){
  document.getElementById('authGate').hidden = true;
  document.getElementById('appShell').hidden = false;
  const user=document.getElementById('loginUser');
  if(user) user.textContent=session?.user?.email || '';
}

async function loginWithEmail(event){
  event.preventDefault();
  const email=document.getElementById('loginEmail').value.trim();
  const password=document.getElementById('loginPassword').value;
  const btn=document.getElementById('loginBtn');
  const msg=document.getElementById('loginMessage');
  btn.disabled=true; btn.textContent='로그인 중...'; msg.textContent='';
  const { error } = await db.auth.signInWithPassword({ email, password });
  if(error){ msg.textContent='로그인 실패: 이메일 또는 비밀번호를 확인하세요.'; btn.disabled=false; btn.textContent='로그인'; }
}

async function logoutApp(){
  if(!confirm('로그아웃할까요?')) return;
  if(realtimeChannel){ await db.removeChannel(realtimeChannel); realtimeChannel=null; }
  await db.auth.signOut();
}

async function bootAuthorizedApp(session){
  if(authBooted) return;
  authBooted=true;
  showApp(session);
  try{
    await loadData();
    render();
    startRealtimeSync();
  }catch(e){
    console.error('보안 연결 실패:', e);
    document.getElementById('app').innerHTML = `<div class="card"><h2>데이터 접근 실패</h2><p class="desc">로그인은 되었지만 app_state RLS 정책이 아직 설정되지 않았을 수 있습니다.</p></div>`;
  }
}

async function initializeApp(){
  if(!db){ showLogin('Supabase 연결 설정을 확인해주세요.'); return; }
  const { data:{ session } } = await db.auth.getSession();
  if(session) await bootAuthorizedApp(session); else showLogin();
  db.auth.onAuthStateChange(async (event, session)=>{
    if(event==='SIGNED_IN' && session){ authBooted=false; await bootAuthorizedApp(session); }
    if(event==='SIGNED_OUT'){ authBooted=false; showLogin(); }
  });
}

initializeApp();
