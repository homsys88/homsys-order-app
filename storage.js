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
    sms_settings: state.smsSettings || { apiKey:'', apiSecret:'', fromNum:'' }
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
  if(data.sms_settings && typeof data.sms_settings === 'object') state.smsSettings = data.sms_settings;
  if(Number.isFinite(Number(data.id_seq))) state._idSeq = Math.max(Number(data.id_seq), 2000);
  state.customers.forEach(migrateCustomer);
  state._seedMigrationNeeded = mergeSeedData(data.data_version);
  loadApiSettings();
  return true;
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
    state.smsSettings = { apiKey:'', apiSecret:'', fromNum:'' };
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

async function initializeApp(){
  try{
    await loadData();
    render();
    startRealtimeSync();
  }catch(e){
    console.error('Supabase 초기 불러오기 실패:', e);
    document.getElementById('app').innerHTML = `
      <div class="card">
        <h2>클라우드 연결 실패</h2>
        <p class="desc">Supabase의 app_state 테이블, RLS 정책, 인터넷 연결을 확인한 뒤 새로고침해주세요.</p>
        <button class="btn accent" onclick="location.reload()">다시 불러오기</button>
      </div>`;
  }
}

initializeApp();
