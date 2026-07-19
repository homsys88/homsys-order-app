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

/* ===== 백업 / 복구 =====
   기존 저장 구조(cloudPayload/applyCloudPayload)는 그대로 재사용하고,
   백업 파일 생성·검증·자동백업 관리 기능만 추가합니다. */
const BACKUP_APP_ID = 'homsys-order-backup';
const BACKUP_FORMAT_VERSION = 1;
const AUTO_BACKUP_KEEP = 5;
const AUTO_BACKUP_TABLE = 'app_state_backups';

function backupTimestamp(d = new Date()){
  const p = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function backupTableCounts(data){
  return {
    customers: (data.customers||[]).length,
    suppliers: (data.suppliers||[]).length,
    order_history: (data.order_history||[]).length,
    cost_items: (data.cost_items||[]).length,
    shipping_items: (data.shipping_items||[]).length
  };
}

// 전체 백업 파일(JSON) 객체 생성 — 기존 cloudPayload()를 그대로 담습니다.
function buildBackupFile(){
  const data = cloudPayload();
  return {
    app: BACKUP_APP_ID,
    backup_version: BACKUP_FORMAT_VERSION,
    data_version: DATA_VERSION,
    created_at: new Date().toISOString(),
    table_counts: backupTableCounts(data),
    data
  };
}

// 백업 JSON 파일 다운로드
function downloadBackupFile(){
  const backup = buildBackupFile();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `homsys-order-backup-${backupTimestamp()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  toast('백업 파일을 다운로드했습니다');
}

// 복원 전 파일 구조 검사 (덮어쓰기 전 1차 검증)
function validateBackupFile(obj){
  const errors = [];
  if(!obj || typeof obj !== 'object'){
    errors.push('올바른 JSON 파일이 아닙니다.');
    return { ok:false, errors };
  }
  if(obj.app !== BACKUP_APP_ID) errors.push('홈시스 발주앱 백업 파일이 아닙니다.');
  const d = obj.data;
  if(!d || typeof d !== 'object'){
    errors.push('백업 안에 데이터가 없습니다.');
  }else{
    ['customers','suppliers','cost_items','shipping_items','order_history'].forEach(k=>{
      if(!Array.isArray(d[k])) errors.push(`${k} 데이터 구조가 올바르지 않습니다.`);
    });
  }
  if(Number(obj.data_version||0) > DATA_VERSION){
    errors.push('이 백업은 현재 앱보다 새 버전에서 만들어졌습니다. 앱을 먼저 업데이트해주세요.');
  }
  return { ok: errors.length===0, errors };
}

// 실제 복원 처리: 복원 직전 안전백업 → 기존 applyCloudPayload로 상태 반영 → 클라우드 저장
// (주의) app_state는 전 직원 공용 데이터라 복원 즉시 다른 접속 기기에도 실시간 반영됩니다.
async function restoreFromBackup(backup){
  await saveAutoBackup('pre-restore-backup');
  applyCloudPayload(backup.data);
  const ok = await saveCloudNow();
  if(ok){ render(); toast('백업을 복원했습니다'); }
  return ok;
}

/* ---- 자동백업 보관 (Supabase 테이블: app_state_backups) ---- */
async function saveAutoBackup(label='auto'){
  if(!db) return false;
  const backup = buildBackupFile();
  try{
    const { error } = await db.from(AUTO_BACKUP_TABLE).insert({
      label,
      data: backup,
      table_counts: backup.table_counts,
      created_at: backup.created_at
    });
    if(error) throw error;
    await trimAutoBackups();
    return true;
  }catch(e){
    console.error('자동백업 저장 실패:', e);
    return false;
  }
}

async function listAutoBackups(){
  if(!db) return [];
  const { data, error } = await db
    .from(AUTO_BACKUP_TABLE)
    .select('id, label, table_counts, created_at')
    .order('created_at', { ascending:false });
  if(error){ console.error('자동백업 목록 조회 실패:', error); return []; }
  return data || [];
}

async function trimAutoBackups(){
  if(!db) return;
  const { data, error } = await db
    .from(AUTO_BACKUP_TABLE)
    .select('id, created_at')
    .order('created_at', { ascending:false });
  if(error || !data) return;
  const excess = data.slice(AUTO_BACKUP_KEEP);
  if(excess.length){
    await db.from(AUTO_BACKUP_TABLE).delete().in('id', excess.map(r=>r.id));
  }
}

async function deleteAutoBackup(id){
  if(!db) return false;
  const { error } = await db.from(AUTO_BACKUP_TABLE).delete().eq('id', id);
  if(error){ console.error('자동백업 삭제 실패:', error); return false; }
  return true;
}

async function fetchAutoBackupData(id){
  if(!db) return null;
  const { data, error } = await db.from(AUTO_BACKUP_TABLE).select('data').eq('id', id).maybeSingle();
  if(error || !data) return null;
  return data.data;
}

// 로그인 직후 1회 호출: 오늘자 자동백업이 없으면 만듭니다 (저장할 때마다 만들지 않음)
async function maybeCreateDailyAutoBackup(){
  if(!db) return;
  try{
    const { data, error } = await db
      .from(AUTO_BACKUP_TABLE)
      .select('created_at')
      .eq('label', 'daily')
      .order('created_at', { ascending:false })
      .limit(1)
      .maybeSingle();
    if(error) return;
    const today = localTodayISO();
    const lastDay = data && data.created_at ? data.created_at.slice(0,10) : '';
    if(lastDay !== today) await saveAutoBackup('daily');
  }catch(e){
    console.error('일일 자동백업 확인 실패:', e);
  }
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
    maybeCreateDailyAutoBackup();
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
