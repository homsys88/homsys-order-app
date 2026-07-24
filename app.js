/* ===== Supabase 연결 설정 =====
   1) SUPABASE_URL은 현재 프로젝트 주소입니다.
   2) SUPABASE_ANON_KEY에는 Supabase의 Publishable/anon key를 넣으세요.
   주의: service_role 또는 secret key는 절대 여기에 넣지 마세요.
*/
const SUPABASE_URL = 'https://whedhpxnrbftsheokmtz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_EwiqNJQ7atTAnmUEG_Un8Q_d6unValm';
const CLOUD_ROW_ID = 1;

const supabaseEnabled =
  typeof window.supabase !== 'undefined' &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_ANON_KEY.includes('여기에_');

const db = supabaseEnabled
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

let cloudSaveTimer = null;
let cloudSaving = false;
let cloudSaveQueued = false;
let cloudLastUpdatedAt = '';
let realtimeChannel = null;

const BRANDS = ['귀뚜라미','경동','대성셀틱','중형'];
const PRICE_GROUPS = { '0가':0, '1가':1000, '2가':2000, '3가':3000, '4가':4000, '5가':5000, '10가':10000 };
const PRICE_GROUP_KEYS = Object.keys(PRICE_GROUPS);
const DATA_VERSION = 11.0; // v11: 비밀번호 변경 + 발주이력 검색·복사·PDF·삭제
function localTodayISO(){
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth()+1).padStart(2,'0');
  const d = String(now.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}

const SEED_CUSTOMERS = []; // 보안: 거래처 정보는 로그인 후 Supabase에서만 불러옵니다.
const SEED_SUPPLIERS = []; // 보안: 계좌정보는 공개 GitHub 코드에 넣지 않습니다.

let state = {
  tab: 'order',
  settingsSub: 'cost',
  costItems: [{"id": 1, "brand": "귀뚜라미", "gubun": "법랑", "model": "G15", "cost": 76000, "prices": {"0가": 76000, "1가": 77000, "2가": 78000, "3가": 79000, "4가": 80000, "5가": 81000, "10가": 86000}}, {"id": 2, "brand": "귀뚜라미", "gubun": "법랑", "model": "G15U(상향)", "cost": 76000, "prices": {"0가": 76000, "1가": 77000, "2가": 78000, "3가": 79000, "4가": 80000, "5가": 81000, "10가": 86000}}, {"id": 3, "brand": "귀뚜라미", "gubun": "법랑", "model": "G30", "cost": 91000, "prices": {"0가": 91000, "1가": 92000, "2가": 93000, "3가": 94000, "4가": 95000, "5가": 96000, "10가": 101000}}, {"id": 4, "brand": "귀뚜라미", "gubun": "법랑", "model": "G30U(상향)", "cost": 91000, "prices": {"0가": 91000, "1가": 92000, "2가": 93000, "3가": 94000, "4가": 95000, "5가": 96000, "10가": 101000}}, {"id": 5, "brand": "귀뚜라미", "gubun": "법랑", "model": "G50(세로)", "cost": 111000, "prices": {"0가": 111000, "1가": 112000, "2가": 113000, "3가": 114000, "4가": 115000, "5가": 116000, "10가": 121000}}, {"id": 6, "brand": "귀뚜라미", "gubun": "법랑", "model": "G50H(가로)", "cost": 111000, "prices": {"0가": 111000, "1가": 112000, "2가": 113000, "3가": 114000, "4가": 115000, "5가": 116000, "10가": 121000}}, {"id": 7, "brand": "귀뚜라미", "gubun": "법랑", "model": "KDEWPLUS-50B(바닥)", "cost": 111000, "prices": {"0가": 111000, "1가": 112000, "2가": 113000, "3가": 114000, "4가": 115000, "5가": 116000, "10가": 121000}}, {"id": 8, "brand": "귀뚜라미", "gubun": "법랑", "model": "G80H(가로)", "cost": 151000, "prices": {"0가": 151000, "1가": 152000, "2가": 153000, "3가": 154000, "4가": 155000, "5가": 156000, "10가": 161000}}, {"id": 9, "brand": "귀뚜라미", "gubun": "법랑", "model": "G100H(가로)", "cost": 181000, "prices": {"0가": 181000, "1가": 182000, "2가": 183000, "3가": 184000, "4가": 185000, "5가": 186000, "10가": 191000}}, {"id": 10, "brand": "귀뚜라미", "gubun": "법랑", "model": "KDEWPLUS-100U(바닥)", "cost": 201000, "prices": {"0가": 201000, "1가": 202000, "2가": 203000, "3가": 204000, "4가": 205000, "5가": 206000, "10가": 211000}}, {"id": 11, "brand": "귀뚜라미", "gubun": "법랑", "model": "W15E(가로)", "cost": 63000, "prices": {"0가": 63000, "1가": 64000, "2가": 65000, "3가": 66000, "4가": 67000, "5가": 68000, "10가": 73000}}, {"id": 12, "brand": "귀뚜라미", "gubun": "스텐", "model": "W-15S", "cost": 90000, "prices": {"0가": 90000, "1가": 91000, "2가": 92000, "3가": 93000, "4가": 94000, "5가": 95000, "10가": 100000}}, {"id": 13, "brand": "귀뚜라미", "gubun": "스텐", "model": "W-15SU(상향)", "cost": 90000, "prices": {"0가": 90000, "1가": 91000, "2가": 92000, "3가": 93000, "4가": 94000, "5가": 95000, "10가": 100000}}, {"id": 14, "brand": "귀뚜라미", "gubun": "스텐", "model": "W-30", "cost": 105000, "prices": {"0가": 105000, "1가": 106000, "2가": 107000, "3가": 108000, "4가": 109000, "5가": 110000, "10가": 115000}}, {"id": 15, "brand": "귀뚜라미", "gubun": "스텐", "model": "W-30SU(상향)", "cost": 105000, "prices": {"0가": 105000, "1가": 106000, "2가": 107000, "3가": 108000, "4가": 109000, "5가": 110000, "10가": 115000}}, {"id": 16, "brand": "귀뚜라미", "gubun": "스텐", "model": "W-50H(가로)", "cost": 129999, "prices": {"0가": 129999.99999999999, "1가": 130999.99999999999, "2가": 132000, "3가": 133000, "4가": 134000, "5가": 135000, "10가": 140000}}, {"id": 17, "brand": "귀뚜라미", "gubun": "스텐", "model": "W-50SV(세로)", "cost": 129999, "prices": {"0가": 129999.99999999999, "1가": 130999.99999999999, "2가": 132000, "3가": 133000, "4가": 134000, "5가": 135000, "10가": 140000}}, {"id": 18, "brand": "경동", "gubun": "법랑", "model": "ESW350-15W", "cost": 77000, "prices": {"0가": 77000, "1가": 78000, "2가": 79000, "3가": 80000, "4가": 81000, "5가": 82000, "10가": 87000}}, {"id": 19, "brand": "경동", "gubun": "법랑", "model": "ESW350-15U(상향)", "cost": 77000, "prices": {"0가": 77000, "1가": 78000, "2가": 79000, "3가": 80000, "4가": 81000, "5가": 82000, "10가": 87000}}, {"id": 20, "brand": "경동", "gubun": "법랑", "model": "ESW350-30W", "cost": 94000, "prices": {"0가": 94000, "1가": 95000, "2가": 96000, "3가": 97000, "4가": 98000, "5가": 99000, "10가": 104000}}, {"id": 21, "brand": "경동", "gubun": "법랑", "model": "ESW350-30U(상향)", "cost": 94000, "prices": {"0가": 94000, "1가": 95000, "2가": 96000, "3가": 97000, "4가": 98000, "5가": 99000, "10가": 104000}}, {"id": 22, "brand": "경동", "gubun": "법랑", "model": "ESW350-50WV(세로)", "cost": 117000, "prices": {"0가": 117000, "1가": 118000, "2가": 119000, "3가": 120000, "4가": 121000, "5가": 122000, "10가": 127000}}, {"id": 23, "brand": "경동", "gubun": "법랑", "model": "ESW350-50WH(가로)", "cost": 117000, "prices": {"0가": 117000, "1가": 118000, "2가": 119000, "3가": 120000, "4가": 121000, "5가": 122000, "10가": 127000}}, {"id": 24, "brand": "경동", "gubun": "법랑", "model": "ESW350-50FS(바닥)", "cost": 145000, "prices": {"0가": 145000, "1가": 146000, "2가": 147000, "3가": 148000, "4가": 149000, "5가": 150000, "10가": 155000}}, {"id": 25, "brand": "경동", "gubun": "법랑", "model": "ESW350-80WV(세로)", "cost": 195000, "prices": {"0가": 195000, "1가": 196000, "2가": 197000, "3가": 198000, "4가": 199000, "5가": 200000, "10가": 205000}}, {"id": 26, "brand": "경동", "gubun": "법랑", "model": "ESW350-100WV(세로)", "cost": 215000, "prices": {"0가": 215000, "1가": 216000, "2가": 217000, "3가": 218000, "4가": 219000, "5가": 220000, "10가": 225000}}, {"id": 27, "brand": "경동", "gubun": "법랑", "model": "ESW350-100FS(바닥)", "cost": 204999, "prices": {"0가": 204999.99999999997, "1가": 205999.99999999997, "2가": 206999.99999999997, "3가": 207999.99999999997, "4가": 208999.99999999997, "5가": 209999.99999999997, "10가": 214999.99999999997}}, {"id": 28, "brand": "경동", "gubun": "법랑", "model": "ESW360-15W", "cost": 77000, "prices": {"0가": 77000, "1가": 78000, "2가": 79000, "3가": 80000, "4가": 81000, "5가": 82000, "10가": 87000}}, {"id": 29, "brand": "경동", "gubun": "법랑", "model": "ESW360-15U(상향)", "cost": 77000, "prices": {"0가": 77000, "1가": 78000, "2가": 79000, "3가": 80000, "4가": 81000, "5가": 82000, "10가": 87000}}, {"id": 30, "brand": "경동", "gubun": "법랑", "model": "ESW360-30W", "cost": 94000, "prices": {"0가": 94000, "1가": 95000, "2가": 96000, "3가": 97000, "4가": 98000, "5가": 99000, "10가": 104000}}, {"id": 31, "brand": "경동", "gubun": "법랑", "model": "ESW360-30U(상향)", "cost": 94000, "prices": {"0가": 94000, "1가": 95000, "2가": 96000, "3가": 97000, "4가": 98000, "5가": 99000, "10가": 104000}}, {"id": 32, "brand": "경동", "gubun": "법랑", "model": "ESW360-50WV(세로)", "cost": 117000, "prices": {"0가": 117000, "1가": 118000, "2가": 119000, "3가": 120000, "4가": 121000, "5가": 122000, "10가": 127000}}, {"id": 33, "brand": "경동", "gubun": "스텐", "model": "ESW550-15W", "cost": 87000, "prices": {"0가": 87000, "1가": 88000, "2가": 89000, "3가": 90000, "4가": 91000, "5가": 92000, "10가": 97000}}, {"id": 34, "brand": "경동", "gubun": "스텐", "model": "ESW550-15U(상향)", "cost": 87000, "prices": {"0가": 87000, "1가": 88000, "2가": 89000, "3가": 90000, "4가": 91000, "5가": 92000, "10가": 97000}}, {"id": 35, "brand": "경동", "gubun": "스텐", "model": "ESW550-30W", "cost": 104000, "prices": {"0가": 104000, "1가": 105000, "2가": 106000, "3가": 107000, "4가": 108000, "5가": 109000, "10가": 114000}}, {"id": 36, "brand": "경동", "gubun": "스텐", "model": "ESW550-30U(상향)", "cost": 104000, "prices": {"0가": 104000, "1가": 105000, "2가": 106000, "3가": 107000, "4가": 108000, "5가": 109000, "10가": 114000}}, {"id": 37, "brand": "경동", "gubun": "스텐", "model": "ESW550-50WV(세로)", "cost": 132000, "prices": {"0가": 132000, "1가": 133000, "2가": 134000, "3가": 135000, "4가": 136000, "5가": 137000, "10가": 142000}}, {"id": 38, "brand": "경동", "gubun": "스텐", "model": "ESW550-50WH(가로)", "cost": 132000, "prices": {"0가": 132000, "1가": 133000, "2가": 134000, "3가": 135000, "4가": 136000, "5가": 137000, "10가": 142000}}, {"id": 39, "brand": "경동", "gubun": "법랑", "model": "ESW351-15W", "cost": 75000, "prices": {"0가": 75000, "1가": 76000, "2가": 77000, "3가": 78000, "4가": 79000, "5가": 80000, "10가": 85000}}, {"id": 40, "brand": "경동", "gubun": "법랑", "model": "ESW351-15U", "cost": 75000, "prices": {"0가": 75000, "1가": 76000, "2가": 77000, "3가": 78000, "4가": 79000, "5가": 80000, "10가": 85000}}, {"id": 41, "brand": "경동", "gubun": "법랑", "model": "ESW351-30W", "cost": 92000, "prices": {"0가": 92000, "1가": 93000, "2가": 94000, "3가": 95000, "4가": 96000, "5가": 97000, "10가": 102000}}, {"id": 42, "brand": "경동", "gubun": "법랑", "model": "ESW351-30U", "cost": 92000, "prices": {"0가": 92000, "1가": 93000, "2가": 94000, "3가": 95000, "4가": 96000, "5가": 97000, "10가": 102000}}, {"id": 43, "brand": "경동", "gubun": "법랑", "model": "ESW351-50WV", "cost": 115000, "prices": {"0가": 115000, "1가": 116000, "2가": 117000, "3가": 118000, "4가": 119000, "5가": 120000, "10가": 125000}}, {"id": 44, "brand": "경동", "gubun": "법랑", "model": "ESW351-50WH", "cost": 115000, "prices": {"0가": 115000, "1가": 116000, "2가": 117000, "3가": 118000, "4가": 119000, "5가": 120000, "10가": 125000}}, {"id": 45, "brand": "대성셀틱", "gubun": "법랑", "model": "SG15", "cost": 70000, "prices": {"0가": 72000, "1가": 74000, "2가": 76000, "3가": 78000, "4가": 79000, "5가": 80000, "10가": 84000}}, {"id": 46, "brand": "대성셀틱", "gubun": "법랑", "model": "SG15US(상향)", "cost": 70000, "prices": {"0가": 72000, "1가": 74000, "2가": 76000, "3가": 78000, "4가": 79000, "5가": 80000, "10가": 84000}}, {"id": 47, "brand": "대성셀틱", "gubun": "법랑", "model": "SG30", "cost": 85000, "prices": {"0가": 87000, "1가": 89000, "2가": 91000, "3가": 93000, "4가": 94000, "5가": 95000, "10가": 99000}}, {"id": 48, "brand": "대성셀틱", "gubun": "법랑", "model": "SG30US(상향)", "cost": 85000, "prices": {"0가": 87000, "1가": 89000, "2가": 91000, "3가": 93000, "4가": 94000, "5가": 95000, "10가": 99000}}, {"id": 49, "brand": "대성셀틱", "gubun": "법랑", "model": "SEV50", "cost": 105000, "prices": {"0가": 107000, "1가": 109000, "2가": 111000, "3가": 113000, "4가": 114000, "5가": 115000, "10가": 119000}}, {"id": 50, "brand": "대성셀틱", "gubun": "법랑", "model": "SEV80(세로)", "cost": 158000, "prices": {"0가": 160000, "1가": 162000, "2가": 164000, "3가": 166000, "4가": 167000, "5가": 168000, "10가": 172000}}, {"id": 51, "brand": "대성셀틱", "gubun": "법랑", "model": "SEV100(세로)", "cost": 178000, "prices": {"0가": 180000, "1가": 182000, "2가": 184000, "3가": 186000, "4가": 187000, "5가": 188000, "10가": 192000}}, {"id": 52, "brand": "대성셀틱", "gubun": "법랑", "model": "DSF-50JRB(바닥)", "cost": 116000, "prices": {"0가": 118000, "1가": 120000, "2가": 122000, "3가": 124000, "4가": 125000, "5가": 126000, "10가": 130000}}, {"id": 53, "brand": "대성셀틱", "gubun": "법랑", "model": "DSF-100JRB(바닥)", "cost": 186000, "prices": {"0가": 188000, "1가": 190000, "2가": 192000, "3가": 194000, "4가": 195000, "5가": 196000, "10가": 200000}}, {"id": 54, "brand": "대성셀틱", "gubun": "스텐", "model": "RZS15(OS하향)", "cost": 80000, "prices": {"0가": 82000, "1가": 84000, "2가": 86000, "3가": 88000, "4가": 89000, "5가": 90000, "10가": 94000}}, {"id": 55, "brand": "대성셀틱", "gubun": "스텐", "model": "RZS15(US상향)", "cost": 80000, "prices": {"0가": 82000, "1가": 84000, "2가": 86000, "3가": 88000, "4가": 89000, "5가": 90000, "10가": 94000}}, {"id": 56, "brand": "대성셀틱", "gubun": "스텐", "model": "RZS30(OS하향)", "cost": 96000, "prices": {"0가": 98000, "1가": 100000, "2가": 102000, "3가": 104000, "4가": 105000, "5가": 106000, "10가": 110000}}, {"id": 57, "brand": "대성셀틱", "gubun": "스텐", "model": "RZS30(US상향)", "cost": 96000, "prices": {"0가": 98000, "1가": 100000, "2가": 102000, "3가": 104000, "4가": 105000, "5가": 106000, "10가": 110000}}, {"id": 58, "brand": "대성셀틱", "gubun": "스텐", "model": "RZF-15(가로)", "cost": 83000, "prices": {"0가": 85000, "1가": 87000, "2가": 89000, "3가": 91000, "4가": 92000, "5가": 93000, "10가": 97000}}, {"id": 59, "brand": "대성셀틱", "gubun": "스텐", "model": "RZF-15US(상향)", "cost": 83000, "prices": {"0가": 85000, "1가": 87000, "2가": 89000, "3가": 91000, "4가": 92000, "5가": 93000, "10가": 97000}}, {"id": 60, "brand": "대성셀틱", "gubun": "스텐", "model": "RZB30(가로)", "cost": 105000, "prices": {"0가": 107000, "1가": 109000, "2가": 111000, "3가": 113000, "4가": 114000, "5가": 115000, "10가": 119000}}, {"id": 61, "brand": "대성셀틱", "gubun": "스텐", "model": "RZB50(가로)", "cost": 135000, "prices": {"0가": 137000, "1가": 139000, "2가": 141000, "3가": 143000, "4가": 144000, "5가": 145000, "10가": 149000}}, {"id": 62, "brand": "대성셀틱", "gubun": "스텐", "model": "RZL50A(세로)", "cost": 120000, "prices": {"0가": 122000, "1가": 124000, "2가": 126000, "3가": 128000, "4가": 129000, "5가": 130000, "10가": 134000}}, {"id": 63, "brand": "대성셀틱", "gubun": "스텐", "model": "RZL80A(세로)", "cost": 176000, "prices": {"0가": 178000, "1가": 180000, "2가": 182000, "3가": 184000, "4가": 185000, "5가": 186000, "10가": 190000}}, {"id": 64, "brand": "대성셀틱", "gubun": "스텐", "model": "RZL100A(세로)", "cost": 196000, "prices": {"0가": 198000, "1가": 200000, "2가": 202000, "3가": 204000, "4가": 205000, "5가": 206000, "10가": 210000}}, {"id": 65, "brand": "대성셀틱", "gubun": "스텐", "model": "DSF-50JRBS(바닥)", "cost": 146000, "prices": {"0가": 148000, "1가": 150000, "2가": 152000, "3가": 154000, "4가": 155000, "5가": 156000, "10가": 160000}}, {"id": 66, "brand": "대성셀틱", "gubun": "스텐", "model": "DSF-100JRBS(바닥)", "cost": 206000, "prices": {"0가": 208000, "1가": 210000, "2가": 212000, "3가": 214000, "4가": 215000, "5가": 216000, "10가": 220000}}, {"id": 67, "brand": "중형", "gubun": "법랑", "model": "G200", "cost": 477000, "prices": {"0가": 477000, "1가": 477000, "2가": 487000, "3가": 487000, "4가": 492000, "5가": 497000, "10가": 517000}}, {"id": 68, "brand": "중형", "gubun": "법랑", "model": "G300", "cost": 570000, "prices": {"0가": 570000, "1가": 570000, "2가": 580000, "3가": 580000, "4가": 585000, "5가": 590000, "10가": 610000}}, {"id": 69, "brand": "중형", "gubun": "법랑", "model": "G400", "cost": 667000, "prices": {"0가": 667000, "1가": 667000, "2가": 677000, "3가": 677000, "4가": 682000, "5가": 687000, "10가": 707000}}, {"id": 70, "brand": "중형", "gubun": "법랑", "model": "G470", "cost": 738000, "prices": {"0가": 738000, "1가": 738000, "2가": 748000, "3가": 748000, "4가": 753000, "5가": 758000, "10가": 778000}}, {"id": 71, "brand": "중형", "gubun": "법랑", "model": "DSF-140JK", "cost": 268000, "prices": {"0가": 268000, "1가": 278000, "2가": 278000, "3가": 288000, "4가": 293000, "5가": 298000, "10가": 318000}}, {"id": 72, "brand": "중형", "gubun": "법랑", "model": "DSF-220JK", "cost": 368000, "prices": {"0가": 368000, "1가": 378000, "2가": 378000, "3가": 388000, "4가": 393000, "5가": 398000, "10가": 418000}}, {"id": 73, "brand": "중형", "gubun": "법랑", "model": "DSF-270JK", "cost": 448000, "prices": {"0가": 448000, "1가": 458000, "2가": 458000, "3가": 468000, "4가": 473000, "5가": 478000, "10가": 498000}}, {"id": 74, "brand": "중형", "gubun": "법랑", "model": "DSF-340JK", "cost": 488000, "prices": {"0가": 488000, "1가": 498000, "2가": 498000, "3가": 508000, "4가": 513000, "5가": 518000, "10가": 538000}}, {"id": 75, "brand": "중형", "gubun": "법랑", "model": "DSF-430JK", "cost": 548000, "prices": {"0가": 548000, "1가": 558000, "2가": 558000, "3가": 568000, "4가": 573000, "5가": 578000, "10가": 598000}}, {"id": 76, "brand": "중형", "gubun": "법랑", "model": "DSF-500JK", "cost": 688000, "prices": {"0가": 688000, "1가": 698000, "2가": 698000, "3가": 708000, "4가": 713000, "5가": 718000, "10가": 738000}}],
  shippingItems: [{"id": 1, "brand": "귀뚜라미", "model": "G15", "fee": 4000}, {"id": 2, "brand": "귀뚜라미", "model": "G15U(상향)", "fee": 4000}, {"id": 3, "brand": "귀뚜라미", "model": "G30", "fee": 5000}, {"id": 4, "brand": "귀뚜라미", "model": "G30U(상향)", "fee": 5000}, {"id": 5, "brand": "귀뚜라미", "model": "G50(세로)", "fee": 6000}, {"id": 6, "brand": "귀뚜라미", "model": "G50H(가로)", "fee": 6000}, {"id": 7, "brand": "귀뚜라미", "model": "KDEWPLUS-50B(바닥)", "fee": 6000}, {"id": 8, "brand": "귀뚜라미", "model": "G80H(가로)", "fee": 10000}, {"id": 9, "brand": "귀뚜라미", "model": "G100H(가로)", "fee": 20000}, {"id": 10, "brand": "귀뚜라미", "model": "KDEWPLUS-100U(바닥)", "fee": 20000}, {"id": 11, "brand": "귀뚜라미", "model": "W15E(가로)", "fee": 4000}, {"id": 12, "brand": "귀뚜라미", "model": "W-15S", "fee": 4000}, {"id": 13, "brand": "귀뚜라미", "model": "W-15SU(상향)", "fee": 4000}, {"id": 14, "brand": "귀뚜라미", "model": "W-30", "fee": 5000}, {"id": 15, "brand": "귀뚜라미", "model": "W-30SU(상향)", "fee": 5000}, {"id": 16, "brand": "귀뚜라미", "model": "W-50H(가로)", "fee": 6000}, {"id": 17, "brand": "귀뚜라미", "model": "W-50SV(세로)", "fee": 6000}, {"id": 18, "brand": "경동", "model": "ESW350-15W", "fee": 4000}, {"id": 19, "brand": "경동", "model": "ESW350-15U(상향)", "fee": 4000}, {"id": 20, "brand": "경동", "model": "ESW350-30W", "fee": 5000}, {"id": 21, "brand": "경동", "model": "ESW350-30U(상향)", "fee": 5000}, {"id": 22, "brand": "경동", "model": "ESW350-50WV(세로)", "fee": 6000}, {"id": 23, "brand": "경동", "model": "ESW350-50WH(가로)", "fee": 6000}, {"id": 24, "brand": "경동", "model": "ESW350-50FS(바닥)", "fee": 6000}, {"id": 25, "brand": "경동", "model": "ESW350-80WV(세로)", "fee": 10000}, {"id": 26, "brand": "경동", "model": "ESW350-100WV(세로)", "fee": 20000}, {"id": 27, "brand": "경동", "model": "ESW350-100FS(바닥)", "fee": 20000}, {"id": 28, "brand": "경동", "model": "ESW360-15W", "fee": 4000}, {"id": 29, "brand": "경동", "model": "ESW360-15U(상향)", "fee": 4000}, {"id": 30, "brand": "경동", "model": "ESW360-30W", "fee": 5000}, {"id": 31, "brand": "경동", "model": "ESW360-30U(상향)", "fee": 5000}, {"id": 32, "brand": "경동", "model": "ESW360-50WV(세로)", "fee": 6000}, {"id": 33, "brand": "경동", "model": "ESW550-15W", "fee": 4000}, {"id": 34, "brand": "경동", "model": "ESW550-15U(상향)", "fee": 4000}, {"id": 35, "brand": "경동", "model": "ESW550-30W", "fee": 5000}, {"id": 36, "brand": "경동", "model": "ESW550-30U(상향)", "fee": 5000}, {"id": 37, "brand": "경동", "model": "ESW550-50WV(세로)", "fee": 6000}, {"id": 38, "brand": "경동", "model": "ESW550-50WH(가로)", "fee": 6000}, {"id": 39, "brand": "경동", "model": "ESW351-15W", "fee": 4000}, {"id": 40, "brand": "경동", "model": "ESW351-15U", "fee": 4000}, {"id": 41, "brand": "경동", "model": "ESW351-30W", "fee": 5000}, {"id": 42, "brand": "경동", "model": "ESW351-30U", "fee": 5000}, {"id": 43, "brand": "경동", "model": "ESW351-50WV", "fee": 6000}, {"id": 44, "brand": "경동", "model": "ESW351-50WH", "fee": 6000}, {"id": 45, "brand": "대성셀틱", "model": "SG15", "fee": 4000}, {"id": 46, "brand": "대성셀틱", "model": "SG15US(상향)", "fee": 4000}, {"id": 47, "brand": "대성셀틱", "model": "SG30", "fee": 5000}, {"id": 48, "brand": "대성셀틱", "model": "SG30US(상향)", "fee": 5000}, {"id": 49, "brand": "대성셀틱", "model": "SEV50", "fee": 6000}, {"id": 50, "brand": "대성셀틱", "model": "SEV80(세로)", "fee": 10000}, {"id": 51, "brand": "대성셀틱", "model": "SEV100(세로)", "fee": 20000}, {"id": 52, "brand": "대성셀틱", "model": "DSF-50JRB(바닥)", "fee": 6000}, {"id": 53, "brand": "대성셀틱", "model": "DSF-100JRB(바닥)", "fee": 20000}, {"id": 54, "brand": "대성셀틱", "model": "RZS15(OS하향)", "fee": 4000}, {"id": 55, "brand": "대성셀틱", "model": "RZS15(US상향)", "fee": 4000}, {"id": 56, "brand": "대성셀틱", "model": "RZS30(OS하향)", "fee": 5000}, {"id": 57, "brand": "대성셀틱", "model": "RZS30(US상향)", "fee": 5000}, {"id": 58, "brand": "대성셀틱", "model": "RZF-15(가로)", "fee": 4000}, {"id": 59, "brand": "대성셀틱", "model": "RZF-15US(상향)", "fee": 4000}, {"id": 60, "brand": "대성셀틱", "model": "RZB30(가로)", "fee": 5000}, {"id": 61, "brand": "대성셀틱", "model": "RZB50(가로)", "fee": 6000}, {"id": 62, "brand": "대성셀틱", "model": "RZL50A(세로)", "fee": 6000}, {"id": 63, "brand": "대성셀틱", "model": "RZL80A(세로)", "fee": 10000}, {"id": 64, "brand": "대성셀틱", "model": "RZL100A(세로)", "fee": 20000}, {"id": 65, "brand": "대성셀틱", "model": "DSF-50JRBS(바닥)", "fee": 6000}, {"id": 66, "brand": "대성셀틱", "model": "DSF-100JRBS(바닥)", "fee": 20000}, {"id": 67, "brand": "중형", "model": "G200", "fee": 38500}, {"id": 68, "brand": "중형", "model": "G300", "fee": 41800}, {"id": 69, "brand": "중형", "model": "G400", "fee": 62700}, {"id": 70, "brand": "중형", "model": "G470", "fee": 71500}, {"id": 71, "brand": "중형", "model": "DSF-140JK", "fee": 30000}, {"id": 72, "brand": "중형", "model": "DSF-220JK", "fee": 38000}, {"id": 73, "brand": "중형", "model": "DSF-270JK", "fee": 45000}, {"id": 74, "brand": "중형", "model": "DSF-340JK", "fee": 50000}, {"id": 75, "brand": "중형", "model": "DSF-430JK", "fee": 62000}, {"id": 76, "brand": "중형", "model": "DSF-500JK", "fee": 70000}],
  customers: JSON.parse(JSON.stringify(SEED_CUSTOMERS)),
  suppliers: JSON.parse(JSON.stringify(SEED_SUPPLIERS)),
  orderMeta: { customerId: null, supplierId: 1, date: localTodayISO(), docNo: 'ORD-'+Date.now().toString().slice(-6) },
  orderLines: [],
  orderHistory: [],
  draftOrder: null,
  editingHistoryId: null,
  selectedBrands: [],
  selectedModel: null,
  lineQty: 1,
  costBrandFilter: '전체',
  shipBrandFilter: '전체',
  orderCustSearch: '',
  favoriteCustomerIds: [],
  custSearch: '',
  historyFilters: { from:'', to:'', customer:'', orderNo:'', brand:'전체' },
  _idSeq: 2000,
};

// 초기화할 때 사용할 HTML 기본 데이터 복사본
const DEFAULT_PERSISTED_STATE = JSON.parse(JSON.stringify({
  costItems: state.costItems,
  shippingItems: state.shippingItems,
  customers: state.customers,
  suppliers: state.suppliers,
  orderHistory: state.orderHistory,
  draftOrder: state.draftOrder,
  favoriteCustomerIds: state.favoriteCustomerIds,
  idSeq: state._idSeq
}));

function nextId(){ return ++state._idSeq; }
function fmt(n){ return (n||0).toLocaleString('ko-KR'); }
// 사용자가 입력한 텍스트(거래처명, 모델명 등)를 화면에 표시하기 전 HTML 특수문자를 이스케이프합니다.
// innerHTML로 직접 렌더링하는 곳에 사용자가 입력한 값이 들어갈 때는 반드시 이 함수를 거칩니다.
function escapeHtml(value){
  return String(value ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
function findCost(brand, model){ const c = state.costItems.find(c=>c.brand===brand && c.model===model); return c?c.cost:0; }
function findModel(brand, model){ return state.costItems.find(c=>c.brand===brand && c.model===model) || null; }
// 모델+가격그룹의 판매단가: 엑셀에 저장된 가격표 우선, 없으면 원가+기본마진
function priceOf(brand, model, group){
  const m = findModel(brand, model);
  if(!m) return 0;
  if(m.prices && m.prices[group]!=null) return m.prices[group];
  // 가격표에 값이 없는 그룹이면 원가+기본마진으로 대체
  return (m.cost||0) + (PRICE_GROUPS[group]||0);
}
// 모델이 실제로 판매 가능한 가격그룹만 반환 (엑셀에서 값이 채워진 것)
function availableGroups(brand, model){
  const m = findModel(brand, model);
  if(!m || !m.prices) return PRICE_GROUP_KEYS;
  const ok = PRICE_GROUP_KEYS.filter(g=> m.prices[g]!=null);
  return ok.length ? ok : PRICE_GROUP_KEYS;
}
function findShipping(brand, model){ const s = state.shippingItems.find(s=>s.brand===brand && s.model===model); return s?s.fee:0; }
function brandClass(b){ return b==='귀뚜라미'?'guttu':b==='경동'?'kd':b==='대성셀틱'?'ds':b==='중형'?'rn':'guttu'; }
function brandShort(b){ return b==='대성셀틱' ? '대성' : b; } // 화면 표시용 짧은 이름 (내부 데이터는 그대로 '대성셀틱')
function formatDateShort(dateStr){
  if(!dateStr) return '-';
  const [y,m,d] = dateStr.split('-');
  return m && d ? `${m}월${d}일` : dateStr;
}
function makePriceGroups(g){ const o={}; BRANDS.forEach(b=>o[b]=g||'5가'); return o; }
// 거래처 데이터를 브랜드별 가격그룹(priceGroups) 구조로 이관 (기존 단일 priceGroup 값을 4개 브랜드에 동일 적용)
function migrateCustomer(c){
  if(!c.priceGroups){
    c.priceGroups = makePriceGroups(c.priceGroup || '5가');
    delete c.priceGroup;
  } else {
    BRANDS.forEach(b=>{ if(!c.priceGroups[b]) c.priceGroups[b]='5가'; });
  }
}

function normalizeSeedName(v){
  return String(v||'').replace(/\s+/g,'').replace(/[()（）]/g,'').replace(/주식회사/g,'').replace(/[^0-9A-Za-z가-힣]/g,'').toLowerCase();
}
function mergeSeedData(dataVersion){
  if(Number(dataVersion||0) >= DATA_VERSION) return false;
  let changed=false;

  // v4: 기존 ID와 발주내역은 유지하고, 사업자번호를 우선 기준으로 최신 거래처 정보를 반영합니다.
  const demoNames=new Set(['OO설비','△△에너지']);
  const existing=state.customers.filter(c=>!demoNames.has(c.name));
  const bizKey=v=>String(v||'').replace(/\D/g,'');
  const byBiz=new Map(existing.filter(c=>bizKey(c.bizNo)).map(c=>[bizKey(c.bizNo),c]));
  const byName=new Map(existing.map(c=>[normalizeSeedName(c.name),c]));

  SEED_CUSTOMERS.forEach(seed=>{
    const seedBiz=bizKey(seed.bizNo);
    const nameKey=normalizeSeedName(seed.name);
    const cur=(seedBiz && byBiz.get(seedBiz)) || byName.get(nameKey);
    if(cur){
      ['name','bizNo','phone','tel','mobile','representative','email'].forEach(k=>{
        if(String(cur[k]||'') !== String(seed[k]||'')){ cur[k]=seed[k]||''; changed=true; }
      });
      if(!cur.priceGroups){ cur.priceGroups=JSON.parse(JSON.stringify(seed.priceGroups)); changed=true; }
      if(!cur.shipVat){ cur.shipVat=seed.shipVat; changed=true; }
      byName.set(nameKey,cur);
      if(seedBiz) byBiz.set(seedBiz,cur);
    }else{
      const copy=JSON.parse(JSON.stringify(seed));
      copy.id=nextId();
      existing.push(copy);
      byName.set(nameKey,copy);
      if(seedBiz) byBiz.set(seedBiz,copy);
      changed=true;
    }
  });
  state.customers=existing;

  const supByName=new Map(state.suppliers.map(s=>[normalizeSeedName(s.name),s]));
  SEED_SUPPLIERS.forEach(seed=>{
    const key=normalizeSeedName(seed.name);
    const cur=supByName.get(key);
    if(cur){
      ['name','bizNo','bank','account','holder'].forEach(k=>{
        if(String(cur[k]||'') !== String(seed[k]||'')){ cur[k]=seed[k]||''; changed=true; }
      });
    }else{
      const copy=JSON.parse(JSON.stringify(seed));
      state.suppliers.push(copy);
      supByName.set(key,copy);
      changed=true;
    }
  });
  return changed;
}
function currentCustomer(){ return state.customers.find(c=>c.id===state.orderMeta.customerId) || null; }
function currentSupplier(){ return state.suppliers.find(s=>s.id===state.orderMeta.supplierId) || null; }

/* ============ 솔라피 보안 발송: Supabase Edge Function ============ */
function loadApiSettings(){ /* 비밀키는 브라우저에 저장하지 않음 */ }
function saveApiSettings(){ alert('솔라피 비밀키는 Supabase Edge Function의 Secrets에만 저장합니다.'); }

async function sendSolapiSecure(payload){
  if(!db) throw new Error('Supabase 연결이 없습니다.');
  const { data: sessionData } = await db.auth.getSession();
  if(!sessionData || !sessionData.session) throw new Error('로그인이 필요합니다.');
  const { data, error } = await db.functions.invoke('send-solapi-message', { body: payload });
  if(error){
    let msg=error.message || '문자발송 서버 호출에 실패했습니다.';
    try{
      if(error.context && typeof error.context.json==='function'){
        const detail=await error.context.json();
        msg=detail.error || detail.message || msg;
      }
    }catch(_e){}
    throw new Error(msg);
  }
  if(!data || data.ok!==true) throw new Error((data && (data.error||data.message)) || '문자발송에 실패했습니다.');
  return data;
}

async function sendSms(to,text){
  try{
    const result=await sendSolapiSecure({mode:'text',to,text});
    return {ok:true,data:result};
  }catch(e){
    return {ok:false,error:e.message};
  }
}
function buildOrderSmsText(){
  const cust=currentCustomer();
  const sup=currentSupplier();
  const t=calcTotals();
  const lines = state.orderLines.map(l=>{
    const ship = l.shipVat==='none' ? '' : (l.shippingTotal ? ` (택배 ${fmt(l.shippingTotal)})` : '');
    return `- ${l.brand} ${l.model}\n  ${fmt(l.unitPrice)}원 x ${l.qty}대 = ${fmt(l.amount)}원${ship}`;
  }).join('\n');
  let totals = `공급가액: ${fmt(t.supply)}원\n부가세(10%): ${fmt(t.vat)}원`;
  if(t.shipInc) totals += `\n택배비(포함가): ${fmt(t.shipInc)}원`;
  totals += `\n합계금액: ${fmt(t.grand)}원 (VAT포함)`;
  let payInfo='';
  if(sup && (sup.bank||sup.account)){
    payInfo = `\n\n[입금계좌] ${sup.bank||''} ${sup.account||''}${sup.holder?` (${sup.holder})`:''}`;
  }
  const supHead = sup ? `공급자: ${sup.name}${sup.bizNo?` (${sup.bizNo})`:''}\n` : '';
  return `[발주 거래명세서]\n${supHead}거래처: ${cust?cust.name:''}\n일자: ${state.orderMeta.date}\n\n${lines}\n\n${totals}${payInfo}`;
}

/* ===== 카카오 알림톡 (발주 요약 안내) ===== */
// 채널/템플릿은 비밀키가 아니라 공개 식별자라 코드에 둡니다. (Solapi 콘솔 > 카카오/네이버/RCS)
const KAKAO_PF_ID = 'KA01PF260703021005893EzZlbUkohfM';
const KAKAO_ORDER_TEMPLATE_ID = 'w0bAFOf7g5'; // "발주내역안내" 템플릿 (검수 완료 후 사용 가능)

function buildKakaoOrderVariables(){
  const cust = currentCustomer();
  const sup = currentSupplier();
  const t = calcTotals();
  const account = sup ? `${sup.bank||''} ${sup.account||''}${sup.holder?` (${sup.holder})`:''}`.trim() : '';
  return {
    '공급자': sup ? sup.name : '',
    '거래처': cust ? cust.name : '',
    '합계': fmt(t.grand),
    '계좌': account
  };
}

async function sendKakaoOrderNotice(to){
  return sendSolapiSecure({
    mode: 'kakao',
    to,
    pfId: KAKAO_PF_ID,
    templateId: KAKAO_ORDER_TEMPLATE_ID,
    variables: buildKakaoOrderVariables()
  });
}

const TABS = [
  {key:'order', label:'발주 작성'},
  {key:'invoice', label:'거래명세서'},
  {key:'history', label:'발주 이력'},
  {key:'pricelist', label:'가격표'},
  {key:'settings', label:'설정'},
];
function renderTabs(){
  document.getElementById('tabNav').innerHTML = TABS.map(t=>
    `<button class="${state.tab===t.key?'active':''}" onclick="setTab('${t.key}')">${t.label}</button>`).join('');
}
function setTab(key){ state.tab = key; render(); }

function render(){
  renderTabs();
  const app = document.getElementById('app');
  if(state.tab==='order') app.innerHTML = renderOrderTab();
  else if(state.tab==='invoice') app.innerHTML = renderInvoiceTab();
  else if(state.tab==='history') app.innerHTML = renderHistoryTab();
  else if(state.tab==='pricelist') app.innerHTML = renderPriceListTab();
  else if(state.tab==='settings') app.innerHTML = renderSettingsTab();
  if(state.tab==='settings' && state.settingsSub==='customer') requestAnimationFrame(initCustomerTableScroll);
}

function toast(msg){
  const t = document.createElement('div');
  t.className='toast'; t.textContent=msg; document.body.appendChild(t);
  setTimeout(()=>t.remove(), 2200);
}

/* =================== 발주 작성 =================== */
function renderOrderTab(){
  const cust = currentCustomer();

  const lineRows = state.orderLines.map(l=>`
    <tr>
      <td class="col-model-wrap">${escapeHtml(l.model)}</td>
      <td class="r">
        <div class="line-qty-stepper">
          <button class="lqbtn" onclick="stepLineQty(${l.id},-1)">−</button>
          <span class="lqval">${l.qty}</span>
          <button class="lqbtn" onclick="stepLineQty(${l.id},1)">＋</button>
        </div>
      </td>
      <td class="r num">${fmt(l.unitPrice)}</td>
      <td class="r">
        <select class="inline-sel" onchange="changeLineShip(${l.id}, this.value)">
          <option value="none" ${l.shipVat==='none'?'selected':''}>무료</option>
          <option value="separate" ${l.shipVat==='separate'?'selected':''}>별도</option>
          <option value="included" ${l.shipVat==='included'?'selected':''}>포함</option>
        </select>
      </td>
      <td class="r num col-amount">${fmt(l.amount)}</td>
      <td class="col-brand"><span class="pill ${brandClass(l.brand)}">${brandShort(l.brand)}</span></td>
      <td class="r"><button class="btn danger btn-x" onclick="removeLine(${l.id})">×</button></td>
    </tr>`).join('');

  const canAdd = !!state.selectedModel;

  // 브랜드 버튼 + 그 아래 가격그룹 선택을 한 세트로 묶어 4개를 가로 한 줄에 배치
  const brandPriceRow = `
    <div class="brand-price-row">
      ${BRANDS.map(b=>`
        <div class="brand-price-col">
          <button class="brand-chip ${state.selectedBrands.includes(b)?'on':''}" onclick="toggleBrand('${b}')"><span class="pill ${brandClass(b)}">${brandShort(b)}</span></button>
          ${cust ? `<select onchange="changeCustGroupQuick('${b}', this.value)">
            ${PRICE_GROUP_KEYS.map(g=>`<option value="${g}" ${(cust.priceGroups&&cust.priceGroups[b])===g?'selected':''}>${g.replace('가','')}</option>`).join('')}
          </select>` : ''}
        </div>`).join('')}
    </div>`;

  return `
  <!-- STEP 1 거래처 -->
  <div class="card">
    <div class="step-head"><span class="step-badge">1</span>거래처 · 브랜드 · 가격 · 공급자</div>

    <!-- 1행: 거래처 | 공급자 -->
    <div class="row-2col">
      <div style="position:relative;">
        <label class="f">거래처 (이름으로 검색)
          ${cust
            ? `<div class="cust-picked"><span>${escapeHtml(cust.name)}</span><button class="btn ghost sm" onclick="clearOrderCustomer()">변경</button></div>`
            : `<input type="text" id="custSearchOrder" placeholder="거래처명 일부를 입력하세요" value="${(state.orderCustSearch||'').replace(/"/g,'&quot;')}" oninput="onOrderCustSearch(this.value)" autocomplete="off">`}
        </label>
        ${!cust ? `<div class="cust-results" id="custResults">${buildCustResults()}</div>` : ''}
      </div>
      <label class="f">공급자
        <select id="orderSupplier" onchange="onSupplierChange(this.value)">
          ${state.suppliers.map(s=>`<option value="${s.id}" ${s.id===state.orderMeta.supplierId?'selected':''}>${escapeHtml(s.name)}</option>`).join('')}
        </select>
      </label>
    </div>

    <!-- 2행: 브랜드 + 가격그룹을 세트로 묶어 4열 한 줄 -->
    <div class="section-title" style="margin-top:14px;">브랜드 (여러 개 선택 가능) ${cust?'· 아래는 가격그룹':''}</div>
    ${brandPriceRow}
    ${cust ? '' : `<p class="desc" style="margin:8px 0 0;">거래처를 선택하면 브랜드 아래에 가격그룹 선택이 나와요.</p>`}

    <!-- 3행: 택배비 | 발주일자 -->
    <div class="row-2col" style="margin-top:14px;">
      ${cust ? `
      <label class="f">택배비
        <select id="custShipQuick" onchange="changeCustShipQuick(this.value)">
          <option value="none" ${cust.shipVat==='none'?'selected':''}>무료</option>
          <option value="separate" ${cust.shipVat==='separate'?'selected':''}>별도</option>
          <option value="included" ${cust.shipVat==='included'?'selected':''}>포함</option>
        </select>
      </label>` : `<label class="f">택배비<select disabled><option>거래처 선택 후</option></select></label>`}
      <label class="f">발주일자
        <div class="date-field-wrap">
          <input type="date" id="orderDate" value="${state.orderMeta.date || localTodayISO()}" max="2099-12-31"
            onchange="state.orderMeta.date=this.value || localTodayISO(); render();">
          <button type="button" class="date-today-btn" onclick="state.orderMeta.date=localTodayISO(); render();">오늘</button>
        </div>
      </label>
    </div>
    ${cust ? ''
      : `<p class="desc" style="margin:10px 0 0;">거래처명을 입력하면 목록이 뜹니다. 선택하면 가격그룹이 자동 적용돼요.</p>`}
  </div>

  <!-- STEP 2 모델 선택 (탭하면 수량·담기 바로 나옴) -->
  <div class="card ${cust?'':'locked'}">
    <div class="step-head"><span class="step-badge">2</span>모델 선택 <span class="muted" style="font-weight:400;font-size:12px;margin-left:6px;">모델을 누르면 바로 수량·담기</span></div>
    ${!cust ? `<div class="lock-hint">먼저 1단계에서 거래처를 선택하세요.</div>` : `
    <div class="model-list">${buildModelList()}</div>`}
  </div>


  <!-- 담긴 목록 -->
  <div class="card">
    <div class="step-head"><span class="step-badge">3</span>담은 품목 (${state.orderLines.length})</div>
    <div class="table-wrap">
      <table class="order-lines-table">
        <thead><tr><th>모델명</th><th class="r">수량</th><th class="r">단가</th><th class="r">택배비</th><th class="r col-amount">금액</th><th class="col-brand">브랜드</th><th></th></tr></thead>
        <tbody>${lineRows || `<tr><td colspan="6" class="empty">아직 담은 품목이 없습니다. 위에서 모델을 눌러 담아보세요.</td></tr>`}</tbody>
      </table>
    </div>
    <div class="row" style="margin-top:16px;gap:8px;align-items:center;">
      <button class="btn ghost" onclick="saveDraftOrder()" ${state.orderLines.length===0?'disabled':''}>📝 작업 저장해두기</button>
      ${state.draftOrder ? `<button class="btn ghost" onclick="loadDraftOrder()">📂 저장된 작업 불러오기</button><button class="btn danger" onclick="deleteDraftOrder()">삭제</button>` : ''}
      <button class="btn accent big" style="flex:1;" onclick="setTab('invoice')" ${state.orderLines.length===0?'disabled':''}>거래명세서 만들기 →</button>
    </div>
    ${state.draftOrder ? `<p class="desc" style="margin:8px 0 0;">저장된 작업: ${state.draftOrder.customerName||'거래처 미지정'} · ${state.draftOrder.lines.length}개 품목 · ${new Date(state.draftOrder.savedAt).toLocaleString('ko-KR')}</p>` : ''}
  </div>`;
}
function changeCustGroupQuick(brand, g){
  const cust=currentCustomer();
  if(cust){ if(!cust.priceGroups) cust.priceGroups=makePriceGroups(); cust.priceGroups[brand]=g; saveData(); toast(`${brandShort(brand)} 가격그룹: ${g}`); }
}
function changeCustShipQuick(v){
  const cust=currentCustomer();
  if(cust){ cust.shipVat=v; saveData(); toast('택배비 방식 변경'); }
}

function buildModelList(){
  const brands = state.selectedBrands;
  if(brands.length===0) return `<div class="model-empty">위에서 브랜드를 먼저 선택하세요</div>`;
  const cust = currentCustomer();
  const sel = state.selectedModel;
  let html='';
  // 선택된 모델이 있으면 그 카드를 맨 위에 먼저 그림
  if(sel){
    const [sb,sm]=sel.split('||');
    const sc=state.costItems.find(c=>c.brand===sb&&c.model===sm);
    if(sc){
      const ship=findShipping(sb,sm);
      html += `<div class="model-chip on selected-inline" style="position:sticky;top:0;z-index:2;">
        <div class="mc-row" onclick="selectModel('${sel.replace(/'/g,"\\'")}')">
          <span class="mc-check">✓</span>
          <span class="mc-name">${escapeHtml(sc.model)}${sc.gubun?` <span class="badge-vat">${escapeHtml(sc.gubun)}</span>`:''}</span>
          <span class="mc-cost muted">${ship?`택배 ${fmt(ship)}/대`:''}</span>
        </div>
        <div class="mc-actions">
          <div class="qty-stepper">
            <button class="qbtn" onclick="stepQty(-1)">−</button>
            <span class="qval" id="qtyVal">${state.lineQty}</span>
            <button class="qbtn" onclick="stepQty(1)">＋</button>
          </div>
          <button class="btn accent addbtn" onclick="addLineInline('${sel.replace(/'/g,"\\'")}')">＋ 담기</button>
        </div>
      </div>`;
    }
  }
  brands.forEach(b=>{   // 선택한 순서대로 (최근 선택이 맨 위)
    const models = state.costItems.filter(c=>c.brand===b);
    if(models.length===0) return;
    if(brands.length>1) html += `<div class="model-group-label"><span class="pill ${brandClass(b)}">${brandShort(b)}</span></div>`;
    html += models.map(c=>{
      const val = `${b}||${c.model}`;
      if(state.selectedModel===val) return ''; // 선택된 건 위에 이미 그림
      return `<button class="model-chip" onclick="selectModel('${val.replace(/'/g,"\\'")}')">
        <span class="mc-check"></span>
        <span class="mc-name">${escapeHtml(c.model)}${c.gubun?` <span class="badge-vat">${escapeHtml(c.gubun)}</span>`:''}</span></button>`;
    }).join('');
  });
  return html || `<div class="model-empty">등록된 모델이 없습니다.</div>`;
}
function stepQty(delta){
  state.lineQty = Math.max(1, (state.lineQty||1)+delta);
  const el=document.getElementById('qtyVal');
  if(el) el.textContent=state.lineQty;
}
function selectModel(val){
  const wasSelected = state.selectedModel===val;
  if(wasSelected){ state.selectedModel=null; }
  else { state.selectedModel=val; state.lineQty=1; }
  render();
  if(!wasSelected){
    setTimeout(()=>{ const ml=document.querySelector('.model-list'); if(ml) ml.scrollTop=0; }, 30);
  }
}
function addLineInline(val){
  const cust=currentCustomer();
  const [brand,model]=val.split('||');
  const custGroup = cust && cust.priceGroups ? cust.priceGroups[brand] : null;
  const priceGroup = custGroup && availableGroups(brand,model).includes(custGroup) ? custGroup : availableGroups(brand,model)[0];
  const shipVat = cust ? cust.shipVat : 'included';
  const qty = state.lineQty||1;
  const unitPrice = priceOf(brand,model,priceGroup);
  const amount = unitPrice*qty;
  const shippingFee = findShipping(brand,model);
  const shippingTotal = (shipVat==='none') ? 0 : shippingFee*qty;
  state.orderLines.push({id:nextId(), brand, model, priceGroup, unitPrice, qty, amount, shippingFee, shippingTotal, shipVat});
  state.selectedModel=null; state.lineQty=1;
  render();
  toast('담았습니다: '+model+' '+qty+'대');
}
function toggleBrand(b){
  const i = state.selectedBrands.indexOf(b);
  if(i>=0){
    state.selectedBrands.splice(i,1);
  } else {
    state.selectedBrands.unshift(b); // 새로 선택한 브랜드를 맨 앞에 → 모델 목록 위로
  }
  if(state.selectedModel){ const mb = state.selectedModel.split('||')[0]; if(!state.selectedBrands.includes(mb)) state.selectedModel=null; }
  render();
  // 모델 목록을 맨 위로 올려 방금 추가한 브랜드가 바로 보이게
  setTimeout(()=>{ const ml=document.querySelector('.model-list'); if(ml) ml.scrollTop=0; }, 30);
}
function onSupplierChange(id){ state.orderMeta.supplierId=parseInt(id,10); render(); }
function onCustomerChange(id){
  state.orderMeta.customerId = id ? parseInt(id,10) : null;
  render();
}
function isFavoriteCustomer(id){
  return Array.isArray(state.favoriteCustomerIds) && state.favoriteCustomerIds.includes(Number(id));
}
function toggleFavoriteCustomer(id, event){
  if(event){ event.preventDefault(); event.stopPropagation(); }
  const n=Number(id);
  if(!Array.isArray(state.favoriteCustomerIds)) state.favoriteCustomerIds=[];
  const i=state.favoriteCustomerIds.indexOf(n);
  if(i>=0) state.favoriteCustomerIds.splice(i,1);
  else state.favoriteCustomerIds.unshift(n);
  saveData();
  render();
  setTimeout(()=>{ const input=document.getElementById('custSearchOrder'); if(input) input.focus(); },30);
}
function toggleFavoriteCustomerSetting(id, event){
  if(event){ event.preventDefault(); event.stopPropagation(); }
  const n=Number(id);
  if(!Array.isArray(state.favoriteCustomerIds)) state.favoriteCustomerIds=[];
  const i=state.favoriteCustomerIds.indexOf(n);
  if(i>=0) state.favoriteCustomerIds.splice(i,1);
  else state.favoriteCustomerIds.unshift(n);
  saveData();
  const btn=event && event.currentTarget;
  if(btn){ const on=isFavoriteCustomer(n); btn.textContent=on?'★':'☆'; btn.classList.toggle('on',on); btn.title=on?'즐겨찾기 해제':'즐겨찾기 등록'; }
}
function phoneHref(v){ const n=String(v||'').replace(/[^0-9+]/g,''); return n ? 'tel:'+n : ''; }
function syncCustomerTableScroll(source, targetId){ const target=document.getElementById(targetId); if(target && Math.abs(target.scrollLeft-source.scrollLeft)>1) target.scrollLeft=source.scrollLeft; }
function initCustomerTableScroll(){
  const top=document.getElementById('custTopScroll');
  const inner=document.getElementById('custTopScrollInner');
  const bottom=document.getElementById('custTableWrap');
  if(!top||!inner||!bottom) return;
  const table=bottom.querySelector('table');
  inner.style.width=Math.max(table?table.scrollWidth:0,bottom.clientWidth)+'px';
  top.scrollLeft=bottom.scrollLeft;
}
function customerResultRow(c){
  const fav=isFavoriteCustomer(c.id);
  return `<div class="cust-result-item cust-result-flex" onclick="pickOrderCustomer(${c.id})">
    <span class="cust-result-name">${fav?'★ ':''}${escapeHtml(c.name)}</span>
    <button type="button" class="favorite-star ${fav?'on':''}" title="즐겨찾기" onclick="toggleFavoriteCustomer(${c.id}, event)">${fav?'★':'☆'}</button>
  </div>`;
}
function buildCustResults(){
  const q=(state.orderCustSearch||'').trim();
  const favorites=(state.favoriteCustomerIds||[])
    .map(id=>state.customers.find(c=>c.id===id)).filter(Boolean);
  if(!q){
    if(favorites.length===0) return '';
    return `<div class="cust-results-title">★ 즐겨찾기 거래처</div>${favorites.slice(0,20).map(customerResultRow).join('')}`;
  }
  const matches=state.customers
    .filter(c=>c.name.includes(q))
    .sort((a,b)=>Number(isFavoriteCustomer(b.id))-Number(isFavoriteCustomer(a.id)))
    .slice(0,30);
  if(matches.length===0) return `<div class="cust-result-item muted">일치하는 거래처가 없습니다</div>`;
  return matches.map(customerResultRow).join('');
}
function onOrderCustSearch(v){
  state.orderCustSearch=v;
  const box=document.getElementById('custResults');
  if(box) box.innerHTML=buildCustResults();
}
function pickOrderCustomer(id){
  state.orderMeta.customerId=id;
  state.orderCustSearch='';
  render();
}
function clearOrderCustomer(){
  state.orderMeta.customerId=null;
  state.orderCustSearch='';
  render();
}
function addLine(){
  const modelVal = state.selectedModel;
  if(!modelVal){ alert('모델을 먼저 선택해주세요.'); return; }
  addLineInline(modelVal);
}
function removeLine(id){ state.orderLines = state.orderLines.filter(l=>l.id!==id); render(); }
function stepLineQty(id, delta){
  const l=state.orderLines.find(x=>x.id===id);
  if(!l) return;
  l.qty=Math.max(1, l.qty+delta);
  l.amount=l.unitPrice*l.qty;
  l.shippingTotal=(l.shipVat==='none')?0:l.shippingFee*l.qty;
  render();
}
function changeLineShip(id, v){
  const l=state.orderLines.find(x=>x.id===id);
  if(!l) return;
  l.shipVat=v;
  l.shippingTotal=(v==='none')?0:l.shippingFee*l.qty;
  render();
}

/* =================== 작업 저장(임시저장) =================== */
async function saveDraftOrder(){
  if(state.orderLines.length===0){ alert('저장할 품목이 없습니다.'); return; }
  const cust=currentCustomer();
  const sup=currentSupplier();
  state.draftOrder={
    savedAt:new Date().toISOString(),
    orderMeta:JSON.parse(JSON.stringify(state.orderMeta)),
    selectedBrands:JSON.parse(JSON.stringify(state.selectedBrands)),
    lines:JSON.parse(JSON.stringify(state.orderLines)),
    customerName:cust?cust.name:'미지정',
    supplierName:sup?sup.name:''
  };
  const ok = await saveCloudNow();
  render();
  if(ok) toast('작업을 저장해두었습니다');
}
async function loadDraftOrder(){
  const btn = document.querySelector('[onclick="loadDraftOrder()"]');
  const oldText = btn ? btn.textContent : '';
  if(btn){ btn.disabled=true; btn.textContent='불러오는 중…'; }
  try{
    const latest = (typeof fetchLatestDraftOrder === 'function') ? await fetchLatestDraftOrder() : state.draftOrder;
    if(!latest){
      state.draftOrder=null;
      render();
      alert('저장된 작업이 없습니다.');
      return;
    }
    const hasCurrentWork = !!state.orderMeta.customerId || state.orderLines.length>0;
    const sameAsDraft = hasCurrentWork && state.draftOrder && JSON.stringify(state.orderLines)===JSON.stringify(state.draftOrder.lines||[]) && Number(state.orderMeta.customerId||0)===Number((state.draftOrder.orderMeta||{}).customerId||0);
    if(hasCurrentWork && !sameAsDraft && !confirm('현재 작성 중인 내용이 사라집니다. 저장된 작업을 불러올까요?')) return;
    state.draftOrder = latest;
    state.orderMeta=JSON.parse(JSON.stringify(latest.orderMeta||{}));
    if(!state.orderMeta.date) state.orderMeta.date=localTodayISO();
    // 거래처 ID가 바뀐 경우 거래처명으로 다시 연결
    if(!state.customers.some(c=>c.id===state.orderMeta.customerId) && latest.customerName){
      const matched=state.customers.find(c=>c.name===latest.customerName);
      if(matched) state.orderMeta.customerId=matched.id;
    }
    state.orderLines=JSON.parse(JSON.stringify(latest.lines||[]));
    state.selectedBrands=JSON.parse(JSON.stringify(latest.selectedBrands||[]));
    if(state.selectedBrands.length===0){
      state.selectedBrands=[...new Set(state.orderLines.map(x=>x.brand).filter(Boolean))];
    }
    state.selectedModel=null;
    state.editingHistoryId=null;
    state.tab='order';
    render();
    toast(`저장된 작업을 불러왔습니다 · ${state.orderLines.length}개 품목`);
  }catch(e){
    console.error(e);
    alert('저장된 작업을 불러오지 못했습니다: '+e.message);
  }finally{
    if(btn && document.body.contains(btn)){ btn.disabled=false; btn.textContent=oldText; }
  }
}
async function deleteDraftOrder(){
  if(!state.draftOrder) return;
  if(!confirm('저장해둔 작업을 삭제할까요?')) return;
  state.draftOrder=null;
  const ok=await saveCloudNow();
  render();
  if(ok) toast('저장해둔 작업을 삭제했습니다');
}

/* =================== 거래명세서 =================== */
function calcTotals(){
  const productTotal = state.orderLines.reduce((s,l)=>s+l.amount,0);
  const shipSep = state.orderLines.filter(l=>l.shipVat==='separate').reduce((s,l)=>s+(l.shippingTotal||0),0);
  const shipInc = state.orderLines.filter(l=>l.shipVat==='included').reduce((s,l)=>s+(l.shippingTotal||0),0);
  const supply = productTotal + shipSep;
  const vat = Math.round(supply*0.1);
  const grand = supply + vat + shipInc;
  return {productTotal, shipSep, shipInc, supply, vat, grand};
}
function renderInvoiceTab(){
  if(state.orderLines.length===0){
    return `<div class="card"><div class="empty">담은 품목이 없습니다.<br><br><button class="btn accent" onclick="setTab('order')">← 발주 작성으로</button></div></div>`;
  }
  const cust = currentCustomer();
  const sup = currentSupplier();
  const t = calcTotals();
  const rows = state.orderLines.map(l=>{
    const shipLabel = l.shipVat==='none' ? '무료' : (l.shippingTotal ? `${fmt(l.shippingTotal)}<span class="badge-vat">${l.shipVat==='included'?'포함':'별도'}</span>` : '-');
    return `<tr>
      <td class="col-model">${escapeHtml(l.model)}</td>
      <td class="r num">${l.qty}</td>
      <td class="r num">${fmt(l.unitPrice)}</td>
      <td class="r num">${fmt(l.amount)}</td>
      <td class="r num">${shipLabel}</td>
      <td><span class="pill ${brandClass(l.brand)}">${l.brand}</span></td></tr>`;
  }).join('');

  return `
  <div class="card">
    <div class="row" style="justify-content:space-between;align-items:center;">
      <button class="btn ghost sm" onclick="setTab('order')">← 발주 수정</button>
      <div class="row" style="gap:8px;">
        <button class="btn accent sm" id="pdfBtn" onclick="makePDF()">📄 PDF 다운로드</button>
        <button class="btn sm" onclick="openSmsModal()">✉ 문자 발송</button>
        <button class="btn sm" onclick="openKakaoModal()">💬 카톡 발송</button>
        <button class="btn sm" onclick="saveToHistory()" style="background:var(--teal);">${state.editingHistoryId?'💾 수정 저장':'💾 발주 저장'}</button>
      </div>
    </div>
  </div>

  <div class="invoice" id="invoiceArea">
    <div class="invoice-head">
      <h2>거래명세서</h2>
      <div class="meta">${state.editingHistoryId?'수정 중 · ':''}발주일자 : ${state.orderMeta.date}</div>
    </div>
    <div class="invoice-meta-row">
      <div><b>공급자</b> : ${sup?escapeHtml(sup.name):'-'}</div>
      <div><b>공급받는자</b> : ${cust?escapeHtml(cust.name):'미지정'}</div>
    </div>
    <div class="table-wrap">
      <table class="invoice-table">
        <thead><tr><th>모델명</th><th class="r">수량</th><th class="r">단가</th><th class="r">판매금액</th><th class="r">택배비</th><th>브랜드</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="totals">
      <div class="line"><span>공급가액 (부가세 별도)</span><span class="num">${fmt(t.supply)}원</span></div>
      <div class="line"><span>부가세 (10%)</span><span class="num">${fmt(t.vat)}원</span></div>
      ${t.shipInc?`<div class="line"><span>택배비 (부가세 포함가, 별도청구)</span><span class="num">${fmt(t.shipInc)}원</span></div>`:''}
      <div class="line grand"><span>합계금액</span><span class="num">${fmt(t.grand)}원</span></div>
    </div>
    ${sup && (sup.bank||sup.account) ? `
    <div class="pay-box">
      <div class="pay-title">입금 계좌</div>
      <div class="pay-line"><b>${escapeHtml(sup.bank||'')} ${escapeHtml(sup.account||'')}</b>${sup.holder?` <span class="muted">(${escapeHtml(sup.holder)})</span>`:''}</div>
      ${sup.bizNo?`<div class="pay-sub">${escapeHtml(sup.name)} · 사업자번호 ${escapeHtml(sup.bizNo)}</div>`:''}
    </div>` : ''}
  </div>`;
}

/* =================== 발주 이력 =================== */
function nextOrderNo(dateStr){
  const ymd=String(dateStr||localTodayISO()).replace(/\D/g,'').slice(0,8);
  const nums=state.orderHistory
    .map(h=>String(h.orderNo||''))
    .filter(n=>n.startsWith(ymd))
    .map(n=>parseInt(n.slice(8),10)||0);
  const seq=(nums.length?Math.max(...nums):0)+1;
  return ymd+String(seq).padStart(4,'0');
}
/* 발주 이력은 다른 프로그램에서 세무 증빙을 따로 관리하므로, 최근 며칠치만 남기고 자동 정리합니다. */
const ORDER_HISTORY_KEEP_DAYS = 10;
function orderHistoryCutoffDate(){
  const d = new Date();
  d.setDate(d.getDate() - ORDER_HISTORY_KEEP_DAYS);
  const p = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}
function trimOrderHistory(){
  const cutoff = orderHistoryCutoffDate();
  const before = state.orderHistory.length;
  state.orderHistory = state.orderHistory.filter(h => String(h.date||'') >= cutoff);
  return state.orderHistory.length !== before;
}
async function trimOrderHistoryIfStale(){
  if(trimOrderHistory()){ render(); await saveCloudNow(); }
}
function saveToHistory(silent){
  if(state.orderLines.length===0){ if(!silent) alert('담은 품목이 없습니다.'); return; }
  const cust=currentCustomer();
  const sup=currentSupplier();
  const t=calcTotals();
  const sig=(cust?cust.name:'')+'|'+state.orderMeta.date+'|'+state.orderLines.length+'|'+t.grand;

  if(state.editingHistoryId){
    const idx=state.orderHistory.findIndex(h=>h.id===state.editingHistoryId);
    if(idx<0){ state.editingHistoryId=null; alert('수정할 발주를 찾지 못했습니다.'); return; }
    const old=state.orderHistory[idx];
    state.orderHistory[idx]={
      ...old,
      _sig:sig,
      updatedAt:new Date().toISOString(),
      date:state.orderMeta.date,
      customerId:state.orderMeta.customerId,
      customerName:cust?cust.name:'미지정',
      supplierId:state.orderMeta.supplierId,
      supplierName:sup?sup.name:'',
      lines:JSON.parse(JSON.stringify(state.orderLines)),
      grand:t.grand
    };
    state.editingHistoryId=null;
    trimOrderHistory();
    saveData(true);
    if(!silent){ toast('발주 이력을 수정했습니다'); render(); }
    return;
  }

  if(state.orderHistory[0] && state.orderHistory[0]._sig===sig){
    if(silent) return;
    if(!confirm('같은 내용의 발주가 최근 이력에 있습니다. 그래도 다시 저장할까요?')) return;
  }
  const entry={
    id:nextId(),
    orderNo:nextOrderNo(state.orderMeta.date),
    _sig:sig,
    savedAt:new Date().toISOString(),
    date:state.orderMeta.date,
    customerId:state.orderMeta.customerId,
    customerName:cust?cust.name:'미지정',
    supplierId:state.orderMeta.supplierId,
    supplierName:sup?sup.name:'',
    lines:JSON.parse(JSON.stringify(state.orderLines)),
    grand:t.grand
  };
  state.orderHistory.unshift(entry);
  trimOrderHistory();
  saveData(true);
  if(!silent){ toast('발주번호 '+entry.orderNo+'로 저장했습니다'); render(); }
}
function filteredHistory(){
  const f=state.historyFilters || {from:'',to:'',customer:'',orderNo:'',brand:'전체'};
  return state.orderHistory.filter(h=>{
    if(f.from && String(h.date||'') < f.from) return false;
    if(f.to && String(h.date||'') > f.to) return false;
    if(f.customer && !String(h.customerName||'').toLowerCase().includes(f.customer.toLowerCase())) return false;
    if(f.orderNo && !String(h.orderNo||'').includes(f.orderNo)) return false;
    if(f.brand && f.brand!=='전체' && !(h.lines||[]).some(l=>l.brand===f.brand)) return false;
    return true;
  });
}
function historyRows(list){
  return list.map(h=>{
    const items=(h.lines||[]).map(l=>`${escapeHtml(l.model)} ${l.qty}대`).join(', ');
    return `<tr>
      <td class="num">${h.orderNo||'-'}</td>
      <td>${h.date||'-'}</td>
      <td>${escapeHtml(h.customerName||'-')}</td>
      <td class="muted" style="font-size:12px;max-width:280px;white-space:normal;">${items}</td>
      <td class="r num">${fmt(h.grand)}원</td>
      <td class="r history-actions">
        <button class="btn ghost sm" onclick="viewHistory(${h.id})">열기/PDF</button>
        <button class="btn ghost sm" onclick="editHistory(${h.id})">수정</button>
        <button class="btn ghost sm" onclick="reuseHistory(${h.id})">복사</button>
        <button class="btn danger" onclick="deleteHistory(${h.id})">삭제</button>
      </td></tr>`;
  }).join('');
}
function renderHistoryTab(){
  const f=state.historyFilters || {from:'',to:'',customer:'',orderNo:'',brand:'전체'};
  const list=filteredHistory();
  const brandOpts=['전체',...BRANDS].map(b=>`<option value="${b}" ${f.brand===b?'selected':''}>${b==='전체'?'전체 브랜드':brandShort(b)}</option>`).join('');
  return `<div class="card">
    <h2>발주 이력 <span class="badge-vat">${state.orderHistory.length}건</span></h2>
    <p class="desc">기간·거래처·발주번호·브랜드로 찾고, 저장된 발주를 다시 열거나 PDF로 내려받고 복사해 새 발주로 사용할 수 있습니다. 최근 ${ORDER_HISTORY_KEEP_DAYS}일치만 보관되며, 그 이전 발주는 자동으로 정리됩니다.</p>
    <div class="history-filter-grid">
      <label class="f">시작일<input type="date" value="${f.from||''}" onchange="setHistoryFilter('from',this.value)"></label>
      <label class="f">종료일<input type="date" value="${f.to||''}" onchange="setHistoryFilter('to',this.value)"></label>
      <label class="f history-customer-filter">거래처명
        <div class="history-customer-search-wrap">
          <input id="historyCustomerInput" type="text" placeholder="거래처명 일부" value="${String(f.customer||'').replace(/"/g,'&quot;')}" oninput="onHistoryCustomerInput(this.value)" onfocus="showHistoryCustomerSuggestions()" onkeydown="onHistoryCustomerKeydown(event)" onblur="setTimeout(closeHistoryCustomerSuggestions,150)" autocomplete="off">
          <div id="historyCustomerSuggestions" class="history-customer-suggestions"></div>
        </div>
      </label>
      <label class="f">발주번호<input type="text" placeholder="예: 20260719" value="${String(f.orderNo||'').replace(/"/g,'&quot;')}" oninput="setHistoryFilter('orderNo',this.value)"></label>
      <label class="f">브랜드<select onchange="setHistoryFilter('brand',this.value)">${brandOpts}</select></label>
      <div class="history-filter-actions"><button class="btn ghost" onclick="resetHistoryFilters()">검색 초기화</button></div>
    </div>
    <div class="history-result-summary">검색 결과 <b>${list.length}건</b></div>
    <div class="table-wrap"><table>
      <thead><tr><th>발주번호</th><th>일자</th><th>거래처</th><th>품목</th><th class="r">합계</th><th></th></tr></thead>
      <tbody id="historyTbody">${historyRows(list)||`<tr><td colspan="6" class="empty">검색 결과가 없습니다.</td></tr>`}</tbody>
    </table></div>
  </div>`;
}

function historyCustomerCandidates(query=''){
  const q=String(query||'').trim().toLowerCase();
  const used=new Set();
  const names=[];
  // 등록 거래처 전체를 기준으로 후보 생성
  for(const c of state.customers||[]){
    const name=String(c.name||'').trim();
    if(!name || used.has(name)) continue;
    used.add(name); names.push(name);
  }
  // 발주 이력에만 남아 있는 거래처도 보충
  for(const h of state.orderHistory||[]){
    const name=String(h.customerName||'').trim();
    if(!name || used.has(name)) continue;
    used.add(name); names.push(name);
  }
  if(!q) return [];
  return names
    .filter(name=>name.toLowerCase().includes(q))
    .sort((a,b)=>{
      const al=a.toLowerCase(), bl=b.toLowerCase();
      const ap=al.startsWith(q)?0:1, bp=bl.startsWith(q)?0:1;
      if(ap!==bp) return ap-bp;
      return a.localeCompare(b,'ko');
    })
    .slice(0,12);
}
let historySuggestionIndex = -1;
function getHistorySuggestionBox(){
  let box=document.getElementById('historyCustomerSuggestionsPortal');
  if(!box){
    box=document.createElement('div');
    box.id='historyCustomerSuggestionsPortal';
    box.className='history-customer-suggestions';
    document.body.appendChild(box);
  }
  return box;
}
function positionHistoryCustomerSuggestions(){
  const input=document.getElementById('historyCustomerInput');
  const box=getHistorySuggestionBox();
  if(!input || !box) return;
  const r=input.getBoundingClientRect();
  box.style.left=`${Math.round(r.left)}px`;
  box.style.top=`${Math.round(r.bottom+5)}px`;
  box.style.width=`${Math.max(220,Math.round(r.width))}px`;
}
function renderHistoryCustomerSuggestions(query){
  const input=document.getElementById('historyCustomerInput');
  if(!input) return;
  const box=getHistorySuggestionBox();
  const q=String(query??input.value??'').trim();
  const list=historyCustomerCandidates(q);
  if(q.length<1 || !list.length){ closeHistoryCustomerSuggestions(); return; }
  historySuggestionIndex=-1;
  box.innerHTML=list.map((name,i)=>`<button type="button" data-index="${i}" onmousedown="event.preventDefault();selectHistoryCustomer(${JSON.stringify(name).replace(/</g,'\\u003c')})">${escapeHtml(name)}</button>`).join('');
  positionHistoryCustomerSuggestions();
  box.classList.add('show');
}
function closeHistoryCustomerSuggestions(){
  const box=document.getElementById('historyCustomerSuggestionsPortal');
  if(box){ box.innerHTML=''; box.classList.remove('show'); }
  historySuggestionIndex=-1;
}
function onHistoryCustomerInput(value){
  // 한 글자 입력 즉시 후보를 먼저 표시
  renderHistoryCustomerSuggestions(value);
  setHistoryFilter('customer',value);
  requestAnimationFrame(()=>renderHistoryCustomerSuggestions(value));
}
function showHistoryCustomerSuggestions(){
  const input=document.getElementById('historyCustomerInput');
  if(input && input.value.trim().length>=1) renderHistoryCustomerSuggestions(input.value);
}
function onHistoryCustomerKeydown(event){
  const box=document.getElementById('historyCustomerSuggestionsPortal');
  if(!box || !box.classList.contains('show')){
    if(event.key==='ArrowDown') showHistoryCustomerSuggestions();
    return;
  }
  const buttons=[...box.querySelectorAll('button')];
  if(!buttons.length) return;
  if(event.key==='ArrowDown'){
    event.preventDefault();
    historySuggestionIndex=(historySuggestionIndex+1)%buttons.length;
  }else if(event.key==='ArrowUp'){
    event.preventDefault();
    historySuggestionIndex=(historySuggestionIndex-1+buttons.length)%buttons.length;
  }else if(event.key==='Enter'){
    event.preventDefault();
    const idx=historySuggestionIndex>=0?historySuggestionIndex:0;
    buttons[idx].dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
    return;
  }else if(event.key==='Escape'){
    closeHistoryCustomerSuggestions();
    return;
  }else return;
  buttons.forEach((b,i)=>b.classList.toggle('active',i===historySuggestionIndex));
  buttons[historySuggestionIndex].scrollIntoView({block:'nearest'});
}
function selectHistoryCustomer(name){
  const input=document.getElementById('historyCustomerInput');
  if(input) input.value=name;
  setHistoryFilter('customer',name);
  closeHistoryCustomerSuggestions();
}
window.addEventListener('scroll',()=>{
  const box=document.getElementById('historyCustomerSuggestionsPortal');
  if(box?.classList.contains('show')) positionHistoryCustomerSuggestions();
},true);
window.addEventListener('resize',()=>{
  const box=document.getElementById('historyCustomerSuggestionsPortal');
  if(box?.classList.contains('show')) positionHistoryCustomerSuggestions();
});

function setHistoryFilter(key,value){
  state.historyFilters = state.historyFilters || {from:'',to:'',customer:'',orderNo:'',brand:'전체'};
  state.historyFilters[key]=value;
  const tb=document.getElementById('historyTbody');
  if(tb) tb.innerHTML=historyRows(filteredHistory())||`<tr><td colspan="6" class="empty">검색 결과가 없습니다.</td></tr>`;
  const summary=document.querySelector('.history-result-summary');
  if(summary) summary.innerHTML=`검색 결과 <b>${filteredHistory().length}건</b>`;
}
function resetHistoryFilters(){
  state.historyFilters={from:'',to:'',customer:'',orderNo:'',brand:'전체'};
  render();
}

function loadHistoryIntoOrder(id){
  const h=state.orderHistory.find(x=>x.id===id);
  if(!h) return false;
  state.orderMeta.customerId=h.customerId;
  state.orderMeta.supplierId=h.supplierId;
  state.orderMeta.date=h.date;
  state.orderLines=JSON.parse(JSON.stringify(h.lines));
  state.selectedModel=null; state.selectedBrands=[];
  return true;
}
function viewHistory(id){ if(loadHistoryIntoOrder(id)){ state.editingHistoryId=null; setTab('invoice'); toast('저장된 거래명세서를 다시 열었습니다. PDF 다운로드를 누르세요'); } }
function editHistory(id){
  if(state.orderLines.length>0 && !confirm('현재 작성 중인 내용을 선택한 발주 내용으로 바꿀까요?')) return;
  if(loadHistoryIntoOrder(id)){
    state.editingHistoryId=id;
    setTab('order');
    toast('발주를 불러왔습니다. 수정 후 거래명세서에서 수정 저장을 누르세요');
  }
}
function reuseHistory(id){
  if(loadHistoryIntoOrder(id)){
    state.editingHistoryId=null;
    state.orderMeta.date=localTodayISO(); // 오늘 날짜로
    setTab('order');
    toast('불러왔습니다. 수량만 고쳐서 다시 발주하세요');
  }
}
function deleteHistory(id){
  const h=state.orderHistory.find(x=>x.id===id);
  if(!confirm(`${h?.orderNo||''} 발주 이력을 삭제할까요?`)) return;
  state.orderHistory=state.orderHistory.filter(h=>h.id!==id);
  saveData(); render();
}

// 거래명세서 화면을 PDF로 만듭니다 (다운로드/업로드 공용 로직)
async function buildInvoicePdf(){
  const area = document.getElementById('invoiceArea');
  if(!area) throw new Error('거래명세서 화면을 찾을 수 없습니다.');
  const canvas = await html2canvas(area, {scale:2, backgroundColor:'#ffffff'});
  const img = canvas.toDataURL('image/png');
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p','mm','a4');
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const iw = pw - margin*2;
  const ih = canvas.height * iw / canvas.width;
  // 여러 페이지 분할
  if(ih <= ph - margin*2){
    pdf.addImage(img, 'PNG', margin, margin, iw, ih);
  } else {
    let position = margin;
    let remaining = ih;
    // 단순 분할: 이미지 하나를 여러 페이지에 걸쳐 표시
    pdf.addImage(img, 'PNG', margin, position, iw, ih);
    remaining -= (ph - margin*2);
    while(remaining > 0){
      pdf.addPage();
      position = margin - (ih - remaining);
      pdf.addImage(img, 'PNG', margin, position, iw, ih);
      remaining -= (ph - margin*2);
    }
  }
  const cust = currentCustomer();
  const filename = `거래명세서_${cust?cust.name:'발주'}_${state.orderMeta.date}.pdf`;
  return { pdf, filename };
}

async function makePDF(){
  const btn = document.getElementById('pdfBtn');
  if(!btn) return;
  btn.disabled = true; btn.textContent = '만드는 중…';
  try{
    const { pdf, filename } = await buildInvoicePdf();
    pdf.save(filename);
    toast('PDF를 저장했습니다');
  }catch(e){
    alert('PDF 생성 중 오류가 발생했습니다: '+e.message);
  }finally{
    btn.disabled = false; btn.textContent = '📄 PDF 다운로드';
  }
}

/* ===== 거래명세서 PDF 링크 발송 (Supabase Storage 업로드 + 알림톡 버튼) =====
   기존 send-solapi-message(문자/MMS)는 건드리지 않고, 별도 Edge Function
   send-solapi-kakao-link로만 처리합니다. 설정 방법은
   README_카톡링크발송_설정순서.txt 참고. */
const INVOICE_BUCKET = 'invoices';
const KAKAO_ORDER_LINK_TEMPLATE_ID = ''; // 웹링크 버튼이 추가된 카카오 템플릿 승인 후 여기에 templateId 입력

async function uploadInvoicePdf(pdf, filename){
  if(!db) throw new Error('Supabase 연결이 없습니다.');
  const { data: sessionData } = await db.auth.getSession();
  if(!sessionData || !sessionData.session) throw new Error('로그인이 필요합니다.');
  const uid = sessionData.session.user.id;
  const path = `${uid}/${Date.now()}_${filename}`;
  const blob = pdf.output('blob');
  const { error: upErr } = await db.storage.from(INVOICE_BUCKET).upload(path, blob, {
    contentType: 'application/pdf',
    upsert: false
  });
  if(upErr) throw new Error('PDF 업로드 실패: '+upErr.message);
  const { data: urlData, error: urlErr } = await db.storage
    .from(INVOICE_BUCKET)
    .createSignedUrl(path, 60*60*24*7); // 7일간 유효한 링크
  if(urlErr) throw new Error('링크 생성 실패: '+urlErr.message);
  return urlData.signedUrl;
}

async function sendKakaoOrderNoticeWithLink(to, link){
  if(!db) throw new Error('Supabase 연결이 없습니다.');
  const { data: sessionData } = await db.auth.getSession();
  if(!sessionData || !sessionData.session) throw new Error('로그인이 필요합니다.');
  const payload = {
    to,
    pfId: KAKAO_PF_ID,
    templateId: KAKAO_ORDER_LINK_TEMPLATE_ID,
    variables: { ...buildKakaoOrderVariables(), '링크': link }
  };
  const { data, error } = await db.functions.invoke('send-solapi-kakao-link', { body: payload });
  if(error){
    let msg = error.message || '알림톡 발송 서버 호출에 실패했습니다.';
    try{
      if(error.context && typeof error.context.json==='function'){
        const detail = await error.context.json();
        msg = detail.error || detail.message || msg;
      }
    }catch(_e){}
    throw new Error(msg);
  }
  if(!data || data.ok!==true) throw new Error((data && (data.error||data.message)) || '알림톡 발송에 실패했습니다.');
  return data;
}

function openSmsModal(){
  const cust=currentCustomer();
  const preview = buildOrderSmsText();
  const defaultTo = cust && cust.phone ? cust.phone : '';
  document.getElementById('modalRoot').innerHTML = `
  <div class="modal-bg" onclick="if(event.target===this) closeModal()">
    <div class="modal">
      <h3>✉ 문자 발송</h3>
      <div class="lock-hint" style="margin-bottom:12px;">로그인 계정으로 Supabase 보안 서버를 통해 발송합니다.</div>

      <label class="f" style="margin-bottom:10px;">받는 사람 번호
        <input type="text" id="smsTo" placeholder="010-0000-0000" value="${defaultTo}" style="width:100%;"></label>

      <label class="f" style="margin-bottom:10px;">보낼 내용 (수정 가능)
        <textarea id="smsText" style="width:100%;min-height:160px;border:1px solid var(--line);border-radius:8px;padding:10px;font-family:inherit;font-size:13px;line-height:1.5;">${preview}</textarea></label>

      <div id="smsResult" style="font-size:13px;margin-top:4px;"></div>
      <div class="modal-actions">
        <button class="btn ghost" onclick="closeModal()">닫기</button>
        <button class="btn accent" id="smsSendBtn" onclick="doSendSms()" >문자 보내기</button>
      </div>
    </div>
  </div>`;
}
async function doSendSms(){
  const to=document.getElementById('smsTo').value.trim();
  const text=document.getElementById('smsText').value;
  const rd=document.getElementById('smsResult');
  const btn=document.getElementById('smsSendBtn');
  if(!to){ rd.innerHTML='<span style="color:var(--danger)">받는 번호를 입력하세요.</span>'; return; }
  btn.disabled=true; btn.textContent='보내는 중…';
  const r=await sendSms(to,text);
  if(r.ok){
    rd.innerHTML='<span style="color:var(--teal)">✓ 발송 완료되었습니다.</span>';
    btn.textContent='발송됨';
    toast('문자를 발송했습니다');
    setTimeout(closeModal, 1200);
  } else {
    rd.innerHTML='<span style="color:var(--danger)">발송 실패: '+r.error+'</span>';
    btn.disabled=false; btn.textContent='문자 보내기';
  }
}
function openKakaoModal(){
  const cust=currentCustomer();
  const vars=buildKakaoOrderVariables();
  const defaultTo = cust && cust.phone ? cust.phone : '';
  document.getElementById('modalRoot').innerHTML = `
  <div class="modal-bg" onclick="if(event.target===this) closeModal()">
    <div class="modal">
      <h3>💬 카톡 발송</h3>
      <div class="lock-hint" style="margin-bottom:12px;">카카오 알림톡(발주내역안내 템플릿)으로 짧은 요약 알림을 보냅니다. 템플릿이 솔라피 검수 중이면 승인 전까지는 발송이 실패할 수 있습니다.</div>

      <label class="f" style="margin-bottom:10px;">받는 사람 번호
        <input type="text" id="kakaoTo" placeholder="010-0000-0000" value="${defaultTo}" style="width:100%;"></label>

      <div class="pick-summary" style="margin:0 0 12px;white-space:pre-line;">[${escapeHtml(vars['공급자'])}] 발주 내역 안내

${escapeHtml(vars['거래처'])}님, 발주해 주셔서 감사합니다.
아래 내역으로 발주가 확인되었습니다.

▶ 합계금액: ${escapeHtml(vars['합계'])}원 (VAT포함)
▶ 입금계좌: ${escapeHtml(vars['계좌'])}

상세 명세서는 별도로 전달드립니다.</div>

      <p class="desc small">품목별 상세 표는 알림톡 템플릿에 담기 어려워서, 위 요약 알림만 자동 발송됩니다. <b>상세 거래명세서 PDF는 아래 "링크 포함 발송"</b>을 누르면 다운로드 링크가 함께 자동 발송됩니다.</p>

      <div id="kakaoResult" style="font-size:13px;margin-top:4px;"></div>
      <div class="modal-actions">
        <button class="btn ghost" onclick="closeModal()">닫기</button>
        <button class="btn sm" id="kakaoLinkBtn" onclick="doSendKakaoLink()">📎 명세서 링크 포함 발송</button>
        <button class="btn accent" id="kakaoSendBtn" onclick="doSendKakao()">알림톡 보내기</button>
      </div>
    </div>
  </div>`;
}
async function doSendKakao(){
  const to=document.getElementById('kakaoTo').value.trim();
  const rd=document.getElementById('kakaoResult');
  const btn=document.getElementById('kakaoSendBtn');
  if(!to){ rd.innerHTML='<span style="color:var(--danger)">받는 번호를 입력하세요.</span>'; return; }
  btn.disabled=true; btn.textContent='보내는 중…';
  rd.innerHTML='<span class="muted">보안 서버를 통해 발송 중…</span>';
  try{
    await sendKakaoOrderNotice(to);
    rd.innerHTML='<span style="color:var(--teal)">✓ 알림톡을 발송했습니다.</span>';
    btn.textContent='발송됨';
    toast('알림톡을 발송했습니다');
    setTimeout(closeModal, 1400);
  }catch(err){
    rd.innerHTML='<span style="color:var(--danger)">발송 실패: '+err.message+'</span>';
    btn.disabled=false; btn.textContent='알림톡 보내기';
  }
}
async function doSendKakaoLink(){
  if(!KAKAO_ORDER_LINK_TEMPLATE_ID){
    alert('링크 포함 발송은 아직 설정 전입니다.\nREADME_카톡링크발송_설정순서.txt를 참고해 Storage와 카카오 템플릿 설정을 먼저 완료해주세요.');
    return;
  }
  const to=document.getElementById('kakaoTo').value.trim();
  const rd=document.getElementById('kakaoResult');
  const btn=document.getElementById('kakaoLinkBtn');
  if(!to){ rd.innerHTML='<span style="color:var(--danger)">받는 번호를 입력하세요.</span>'; return; }
  btn.disabled=true; btn.textContent='명세서 만드는 중…';
  rd.innerHTML='<span class="muted">명세서 PDF를 만드는 중…</span>';
  try{
    const { pdf, filename } = await buildInvoicePdf();
    btn.textContent='업로드 중…';
    rd.innerHTML='<span class="muted">PDF를 업로드하는 중…</span>';
    const link = await uploadInvoicePdf(pdf, filename);
    btn.textContent='보내는 중…';
    rd.innerHTML='<span class="muted">보안 서버를 통해 발송 중…</span>';
    await sendKakaoOrderNoticeWithLink(to, link);
    rd.innerHTML='<span style="color:var(--teal)">✓ 명세서 링크를 포함해 알림톡을 발송했습니다.</span>';
    btn.textContent='발송됨';
    toast('명세서 링크를 발송했습니다');
    setTimeout(closeModal, 1400);
  }catch(err){
    rd.innerHTML='<span style="color:var(--danger)">발송 실패: '+err.message+'</span>';
    btn.disabled=false; btn.textContent='📎 명세서 링크 포함 발송';
  }
}
function closeModal(){ document.getElementById('modalRoot').innerHTML=''; }

/* =================== 설정 =================== */
function renderSettingsTab(){
  const sub = state.settingsSub;
  const subNav = `
    <div class="settings-sub">
      <button class="${sub==='import'?'on':''}" onclick="setSettingsSub('import')" style="background:${sub==='import'?'':'#FFF8F3'};border-color:var(--accent);color:${sub==='import'?'':'var(--accent-ink)'};">📥 전체 불러오기</button>
      <button class="${sub==='cost'?'on':''}" onclick="setSettingsSub('cost')">원가표</button>
      <button class="${sub==='shipping'?'on':''}" onclick="setSettingsSub('shipping')">택배비표</button>
      <button class="${sub==='customer'?'on':''}" onclick="setSettingsSub('customer')">거래처</button>
      <button class="${sub==='supplier'?'on':''}" onclick="setSettingsSub('supplier')">공급자</button>
      <button class="${sub==='sms'?'on':''}" onclick="setSettingsSub('sms')">문자발송</button>
      <button class="${sub==='account'?'on':''}" onclick="setSettingsSub('account')">계정·비밀번호</button>
    </div>`;
  let body='';
  if(sub==='import') body = renderImportAllSettings();
  else if(sub==='cost') body = renderCostSettings();
  else if(sub==='shipping') body = renderShipSettings();
  else if(sub==='sms') body = renderSmsSettings();
  else if(sub==='supplier') body = renderSupplierSettings();
  else if(sub==='account') body = renderAccountSettings();
  else body = renderCustomerSettings();
  return subNav + body;
}
function setSettingsSub(s){ state.settingsSub=s; render(); }

function renderAccountSettings(){
  const email=document.getElementById('loginUser')?.textContent || '';
  return `<div class="card account-card">
    <h2>계정·비밀번호</h2>
    <p class="desc">현재 로그인 계정: <b>${email||'로그인 계정'}</b></p>
    <div class="password-change-box">
      <label class="f">새 비밀번호<input id="newPassword" type="password" minlength="8" autocomplete="new-password" placeholder="8자 이상"></label>
      <label class="f">새 비밀번호 확인<input id="newPasswordConfirm" type="password" minlength="8" autocomplete="new-password" placeholder="같은 비밀번호 다시 입력"></label>
      <button id="changePasswordBtn" class="btn accent" onclick="changePassword()">비밀번호 변경</button>
      <p class="desc small">변경한 비밀번호는 GitHub나 앱 데이터에 저장되지 않습니다.</p>
    </div>
  </div>`;
}
async function changePassword(){
  const pw=document.getElementById('newPassword')?.value || '';
  const confirmPw=document.getElementById('newPasswordConfirm')?.value || '';
  const btn=document.getElementById('changePasswordBtn');
  if(pw.length<8){ alert('새 비밀번호는 8자 이상으로 입력해주세요.'); return; }
  if(pw!==confirmPw){ alert('새 비밀번호와 확인 값이 다릅니다.'); return; }
  if(!confirm('비밀번호를 변경할까요?')) return;
  btn.disabled=true; btn.textContent='변경 중...';
  try{
    const { error }=await db.auth.updateUser({password:pw});
    if(error) throw error;
    document.getElementById('newPassword').value='';
    document.getElementById('newPasswordConfirm').value='';
    alert('비밀번호가 변경되었습니다. 다음 로그인부터 새 비밀번호를 사용하세요.');
  }catch(e){
    console.error(e);
    alert('비밀번호 변경에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }finally{
    btn.disabled=false; btn.textContent='비밀번호 변경';
  }
}

function renderSmsSettings(){
  return `<div class="card"><h2>문자발송 보안연동</h2>
  <div class="lock-hint">솔라피 API Key·Secret과 발신번호는 Supabase Edge Function Secrets에만 저장됩니다.</div>
  <p class="desc">로그인한 사용자만 문자 발송을 요청할 수 있습니다. 앱과 GitHub에는 비밀키가 저장되지 않습니다.</p>
  <div class="pick-summary" style="margin-top:12px;"><b>연동 함수:</b> send-solapi-message<br><b>발송 방식:</b> LMS/SMS 자동<br><b>발주 저장:</b> 문자발송과 별도</div></div>`;
}

/* =================== 가격표 (조회용) =================== */
function priceListFilterDefaults(){ return { brand:'', gubun:'', model:'', group:'0가', ship:'included' }; }
function ensurePriceListFilter(){
  if(!state.priceListFilter) state.priceListFilter = priceListFilterDefaults();
  return state.priceListFilter;
}
const SHIP_LABEL_MAP = {none:'무료', included:'포함', separate:'별도'};
// 무료→0, 포함→금액 그대로, 별도→부가세 10% 포함가로 환산해서 보여줌 (가격표 조회 화면 전용 계산)
function priceListShipDisplay(fee, ship){
  if(!fee) return 0;
  if(ship==='none') return 0;
  if(ship==='separate') return Math.round(fee*1.1);
  return fee;
}
function priceListFilteredRows(){
  const f = ensurePriceListFilter();
  const q = (f.model||'').trim().toLowerCase();
  return state.costItems.filter(c=>{
    if(f.brand && c.brand!==f.brand) return false;
    if(f.gubun && c.gubun!==f.gubun) return false;
    if(q && !String(c.model||'').toLowerCase().includes(q)) return false;
    return true;
  }).sort((a,b)=> a.brand===b.brand ? String(a.model).localeCompare(String(b.model),'ko') : a.brand.localeCompare(b.brand,'ko'));
}
function priceListRowsHtml(){
  const f = ensurePriceListFilter();
  const rows = priceListFilteredRows();
  if(!rows.length) return `<tr><td colspan="6" class="empty">조건에 맞는 모델이 없습니다.</td></tr>`;
  return rows.map(c=>{
    const sh = state.shippingItems.find(s=>s.brand===c.brand && s.model===c.model);
    const fee = sh ? sh.fee : 0;
    const priceVal = (c.prices && c.prices[f.group]!=null) ? c.prices[f.group] : c.cost;
    return `<tr>
      <td><span class="pill ${brandClass(c.brand)}">${brandShort(c.brand)}</span></td>
      <td>${escapeHtml(c.gubun||'-')}</td>
      <td class="col-model-wrap">${escapeHtml(c.model)}</td>
      <td class="r num">${fmt(c.cost)}</td>
      <td class="r num">${fmt(priceVal)}</td>
      <td class="r num">${fmt(priceListShipDisplay(fee, f.ship))}</td>
    </tr>`;
  }).join('');
}
function renderPriceListBody(){
  const tb = document.getElementById('priceListTbody');
  if(tb) tb.innerHTML = priceListRowsHtml();
  const f = ensurePriceListFilter();
  const gh = document.getElementById('priceListGroupHead');
  if(gh) gh.textContent = f.group;
  const sh = document.getElementById('priceListShipHead');
  if(sh) sh.textContent = `배송비(${SHIP_LABEL_MAP[f.ship]})`;
  const cnt = document.getElementById('priceListCount');
  if(cnt) cnt.textContent = priceListFilteredRows().length+'건';
}
function updatePriceListFilter(key, value){
  ensurePriceListFilter()[key] = value;
  renderPriceListBody();
}
function renderPriceListTab(){
  const f = ensurePriceListFilter();
  const gubuns = [...new Set(state.costItems.map(c=>c.gubun).filter(Boolean))];
  return `<div class="card">
    <h2>📋 가격표</h2>
    <p class="desc">브랜드·재질·모델명으로 빠르게 찾아보는 조회용 화면입니다. 값을 고치려면 설정 → 원가표로 가세요.</p>
    <div class="row" style="gap:8px;flex-wrap:wrap;margin:14px 0;">
      <select class="inline-sel" onchange="updatePriceListFilter('brand',this.value)">
        <option value="" ${!f.brand?'selected':''}>전체 브랜드</option>
        ${BRANDS.map(b=>`<option value="${b}" ${f.brand===b?'selected':''}>${brandShort(b)}</option>`).join('')}
      </select>
      <select class="inline-sel" onchange="updatePriceListFilter('gubun',this.value)">
        <option value="" ${!f.gubun?'selected':''}>전체 재질</option>
        ${gubuns.map(g=>`<option value="${escapeHtml(g)}" ${f.gubun===g?'selected':''}>${escapeHtml(g)}</option>`).join('')}
      </select>
      <input type="text" id="priceListModelInput" placeholder="모델명 검색 (1자 이상)" value="${escapeHtml(f.model||'')}" oninput="updatePriceListFilter('model',this.value)" autocomplete="off" style="min-width:160px;flex:1;">
      <select class="inline-sel" onchange="updatePriceListFilter('group',this.value)">
        ${PRICE_GROUP_KEYS.map(g=>`<option value="${g}" ${f.group===g?'selected':''}>${g}</option>`).join('')}
      </select>
      <select class="inline-sel" onchange="updatePriceListFilter('ship',this.value)">
        <option value="none" ${f.ship==='none'?'selected':''}>무료</option>
        <option value="included" ${f.ship==='included'?'selected':''}>포함</option>
        <option value="separate" ${f.ship==='separate'?'selected':''}>별도</option>
      </select>
    </div>
    <p class="desc small" id="priceListCount" style="margin:0 0 8px;">${priceListFilteredRows().length}건</p>
    <div class="table-wrap">
      <table>
        <thead><tr><th>브랜드</th><th>재질</th><th>모델명</th><th class="r">원가</th><th class="r" id="priceListGroupHead">${f.group}</th><th class="r" id="priceListShipHead">배송비(${SHIP_LABEL_MAP[f.ship]})</th></tr></thead>
        <tbody id="priceListTbody">${priceListRowsHtml()}</tbody>
      </table>
    </div>
  </div>`;
}

async function resetOne(what){
  const label = what==='cost'?'원가표':what==='shipping'?'택배비표':'거래처';
  if(!confirm(label+'을(를) 지우고 기본값으로 되돌립니다. 계속할까요?')) return;

  if(what==='cost') state.costItems = JSON.parse(JSON.stringify(DEFAULT_PERSISTED_STATE.costItems));
  else if(what==='shipping') state.shippingItems = JSON.parse(JSON.stringify(DEFAULT_PERSISTED_STATE.shippingItems));
  else if(what==='customer') {
    state.customers = JSON.parse(JSON.stringify(DEFAULT_PERSISTED_STATE.customers));
    state.orderMeta.customerId = null;
  }

  await saveCloudNow();
  render();
  toast(label+'을 기본값으로 되돌렸습니다');
}
async function resetAllData(){
  if(!confirm('원가·택배비·거래처·공급자·발주이력·발송설정을 모두 기본값으로 되돌립니다. 계속할까요?')) return;

  state.costItems = JSON.parse(JSON.stringify(DEFAULT_PERSISTED_STATE.costItems));
  state.shippingItems = JSON.parse(JSON.stringify(DEFAULT_PERSISTED_STATE.shippingItems));
  state.customers = JSON.parse(JSON.stringify(DEFAULT_PERSISTED_STATE.customers));
  state.suppliers = JSON.parse(JSON.stringify(DEFAULT_PERSISTED_STATE.suppliers));
  state.orderHistory = [];
  state.smsSettings = { apiKey:'', apiSecret:'', fromNum:'' };
  state._idSeq = DEFAULT_PERSISTED_STATE.idSeq;
  state.orderMeta.customerId = null;
  state.orderMeta.supplierId = state.suppliers[0]?.id || null;
  loadApiSettings();

  await saveCloudNow();
  render();
  toast('전체 데이터를 기본값으로 되돌렸습니다');
}

function renderCostSettings(){
  const filter = state.costBrandFilter;
  const list = state.costItems.filter(c=> filter==='전체'||c.brand===filter);
  const rows = list.map(c=>`
    <tr><td><span class="pill ${brandClass(c.brand)}">${c.brand}</span></td>
    <td><input type="text" class="inline-model" value="${c.model.replace(/"/g,'&quot;')}" onchange="updateModelName(${c.id},this.value)"></td>
    <td class="r"><input type="number" class="inline-num" value="${c.cost}" onchange="updateCost(${c.id},this.value)"> 원</td>
    <td class="r"><button class="btn danger" onclick="removeCost(${c.id})">삭제</button></td></tr>`).join('');
  const chips = ['전체',...BRANDS].map(b=>`<button class="brand-chip ${filter===b?'on':''}" onclick="setCostFilter('${b}')">${b==='전체'?'<b style="padding:2px 4px;">전체</b>':`<span class="pill ${brandClass(b)}">${b}</span>`}</button>`).join('');
  return `<div class="card">
    <h2>원가표</h2>
    <p class="desc">엑셀 업로드로 등록하거나, 표에서 직접 수정할 수 있어요. <b>모델명 칸을 눌러 이름을 바꾸면</b> 동일 용량 신제품 교체 시 편리합니다 (택배비표의 모델명도 자동으로 함께 바뀜).</p>
    <div class="row" style="margin-bottom:14px;">
      <input type="file" id="costFile" accept=".xlsx,.xls" style="display:none" onchange="handleExcel(event,'cost')">
      <div class="drop-box" id="costDrop"
           onclick="document.getElementById('costFile').click()"
           ondragover="dropOver(event,'costDrop')" ondragleave="dropLeave(event,'costDrop')"
           ondrop="dropFile(event,'cost','costDrop')">
        📄 <b>엑셀 파일을 여기로 끌어다 놓거나</b> 클릭해서 선택<br>
        <span class="drop-sub">제조사 / 구분 / 모델명 / 원가 / 0~10가 / 배송비 한 파일</span>
      </div>
    </div>
    <div class="section-title">브랜드 필터</div>
    <div class="brand-chips" style="margin-bottom:14px;">${chips}</div>
    <div class="table-wrap"><table>
      <thead><tr><th>브랜드</th><th>모델명</th><th class="r">원가(부가세별도)</th><th></th></tr></thead>
      <tbody>${rows||`<tr><td colspan="4" class="empty">등록된 모델이 없습니다.</td></tr>`}</tbody></table></div>
    <p class="desc" style="margin-top:10px;">총 ${list.length}개 모델</p></div>`;
}
function setCostFilter(b){ state.costBrandFilter=b; render(); }
function updateCost(id,v){ const it=state.costItems.find(c=>c.id===id); if(it) it.cost=parseInt(v||'0',10); saveData(); }
function updateModelName(id, newName){
  newName=(newName||'').trim();
  const it=state.costItems.find(c=>c.id===id);
  if(!it || !newName) { render(); return; }
  const oldName=it.model;
  if(oldName===newName) return;
  // 같은 브랜드에 같은 이름이 이미 있으면 막기
  if(state.costItems.some(c=>c.id!==id && c.brand===it.brand && c.model===newName)){
    alert('같은 브랜드에 이미 "'+newName+'" 모델이 있습니다.'); render(); return;
  }
  // 택배비표의 같은 모델명도 함께 변경 (연결 유지)
  state.shippingItems.forEach(s=>{ if(s.brand===it.brand && s.model===oldName) s.model=newName; });
  it.model=newName;
  toast('모델명을 변경했습니다: '+newName);
  render();
}
function removeCost(id){ state.costItems=state.costItems.filter(c=>c.id!==id); render(); }
function updateShipModelName(id, newName){
  newName=(newName||'').trim();
  const it=state.shippingItems.find(s=>s.id===id);
  if(!it || !newName){ render(); return; }
  const oldName=it.model;
  if(oldName===newName) return;
  if(state.shippingItems.some(s=>s.id!==id && s.brand===it.brand && s.model===newName)){
    alert('같은 브랜드에 이미 "'+newName+'" 택배비 항목이 있습니다.'); render(); return;
  }
  // 원가표의 같은 모델명도 함께 변경 (연결 유지)
  state.costItems.forEach(c=>{ if(c.brand===it.brand && c.model===oldName) c.model=newName; });
  it.model=newName;
  toast('모델명을 변경했습니다: '+newName);
  render();
}

function renderShipSettings(){
  const filter = state.shipBrandFilter;
  const list = state.shippingItems.filter(s=> filter==='전체'||s.brand===filter);
  const rows = list.map(s=>`
    <tr><td><span class="pill ${brandClass(s.brand)}">${s.brand}</span></td>
    <td><input type="text" class="inline-model" value="${s.model.replace(/"/g,'&quot;')}" onchange="updateShipModelName(${s.id},this.value)"></td>
    <td class="r"><input type="number" class="inline-num" value="${s.fee}" onchange="updateShip(${s.id},this.value)"> 원</td>
    <td class="r"><button class="btn danger" onclick="removeShip(${s.id})">삭제</button></td></tr>`).join('');
  const chips = ['전체',...BRANDS].map(b=>`<button class="brand-chip ${filter===b?'on':''}" onclick="setShipFilter('${b}')">${b==='전체'?'<b style="padding:2px 4px;">전체</b>':`<span class="pill ${brandClass(b)}">${b}</span>`}</button>`).join('');
  return `<div class="card">
    <h2>택배비표</h2>
    <p class="desc">엑셀 업로드로 등록하거나, 표에서 택배비·모델명을 바로 수정할 수 있어요. <b>모델명을 바꾸면 원가표의 같은 모델명도 자동으로 함께 바뀝니다.</b> 목록에 없는 모델은 택배비 없음으로 처리됩니다.</p>
    <div class="row" style="margin-bottom:14px;">
      <input type="file" id="shipFile" accept=".xlsx,.xls" style="display:none" onchange="handleExcel(event,'shipping')">
      <div class="drop-box" id="shipDrop"
           onclick="document.getElementById('shipFile').click()"
           ondragover="dropOver(event,'shipDrop')" ondragleave="dropLeave(event,'shipDrop')"
           ondrop="dropFile(event,'shipping','shipDrop')">
        📄 <b>엑셀 파일을 여기로 끌어다 놓거나</b> 클릭해서 선택<br>
        <span class="drop-sub">제조사 / 구분 / 모델명 / 원가 / 0~10가 / 배송비 한 파일</span>
      </div>
    </div>
    <div class="section-title">브랜드 필터</div>
    <div class="brand-chips" style="margin-bottom:14px;">${chips}</div>
    <div class="table-wrap"><table>
      <thead><tr><th>브랜드</th><th>모델명</th><th class="r">택배비</th><th></th></tr></thead>
      <tbody>${rows||`<tr><td colspan="4" class="empty">등록된 택배비가 없습니다.</td></tr>`}</tbody></table></div>
    <p class="desc" style="margin-top:10px;">총 ${list.length}개 모델</p></div>`;
}
function setShipFilter(b){ state.shipBrandFilter=b; render(); }
function updateShip(id,v){ const it=state.shippingItems.find(s=>s.id===id); if(it) it.fee=parseInt(v||'0',10); saveData(); }
function removeShip(id){ state.shippingItems=state.shippingItems.filter(s=>s.id!==id); render(); }

/* =============== 전체 불러오기 (엑셀 여러 개 한 번에 자동 구분) =============== */
function renderImportAllSettings(){
  return `<div class="card">
    <h2>📥 전체 불러오기</h2>
    <p class="desc">마이박스(또는 어디서든)에서 받은 엑셀 파일들을 <b>한꺼번에 끌어다 놓으면</b>, 파일 내용을 보고 원가/거래처/연락처/공급자를 알아서 구분해 채웁니다. 집·창고·사무실 어디서든 이 4개 파일만 있으면 앱이 똑같이 채워져요.</p>
    <div class="row" style="margin-bottom:14px;">
      <input type="file" id="allFile" accept=".xlsx,.xls" multiple style="display:none" onchange="handleAllExcel(event)">
      <div class="drop-box" id="allDrop" style="border-color:var(--accent);border-width:2.5px;padding:30px 16px;"
           onclick="document.getElementById('allFile').click()"
           ondragover="dropOver(event,'allDrop')" ondragleave="dropLeave(event,'allDrop')"
           ondrop="dropAllFiles(event)">
        📦 <b>엑셀 파일들을 여기로 한꺼번에 끌어다 놓기</b><br>
        <span class="drop-sub">전기온수기발주계산 · 거래처 · 전화번호 · 사업자등록번호 (4개 한 번에 가능)</span>
      </div>
    </div>
    <div id="allResult"></div>
    <div class="card" style="background:#F7F9FB;margin-top:4px;">
      <div class="section-title">이렇게 구분해요</div>
      <p class="desc" style="margin:0;line-height:1.8;">
      • <b>원가·판매가·택배비</b> → 열에 "원가/0가/배송비"가 있는 파일<br>
      • <b>거래처 등록</b> → 열에 "거래처명"이 있고 채권/코드 형식인 파일<br>
      • <b>거래처 연락처</b> → "거래처명 + 핸드폰번호(B·H열)"가 있는 파일<br>
      • <b>공급자 정보</b> → 열에 "공급자/사업자번호/통장번호"가 있는 파일</p>
    </div>
  </div>`;
}
function handleAllExcel(evt){ const fs=evt.target.files; if(fs&&fs.length) processAllFiles(Array.from(fs)); evt.target.value=''; }
function dropAllFiles(e){
  e.preventDefault();
  const el=document.getElementById('allDrop'); if(el) el.classList.remove('drag-on');
  const fs=e.dataTransfer.files;
  if(!fs||!fs.length) return;
  const arr=Array.from(fs).filter(f=>/\.(xlsx|xls)$/i.test(f.name));
  if(arr.length===0){ alert('엑셀 파일(.xlsx, .xls)만 올릴 수 있어요.'); return; }
  processAllFiles(arr);
}
async function processAllFiles(files){
  const results=[];
  const parsed=[];
  for(const file of files){
    try{
      const buf=await file.arrayBuffer();
      const wb=XLSX.read(new Uint8Array(buf),{type:'array'});
      const sheet=wb.Sheets[wb.SheetNames[0]];
      const aoa=XLSX.utils.sheet_to_json(sheet,{header:1,defval:''});
      parsed.push({name:file.name, aoa, kind:detectFileKind(aoa)});
    }catch(err){ results.push({name:file.name, kind:'오류', msg:err.message}); }
  }
  // 처리 순서: 원가 → 거래처 → 연락처 → 공급자 (거래처 먼저 있어야 연락처 매칭됨)
  const order={cost:1, customer:2, custphone:3, supplier:4, unknown:9};
  parsed.sort((a,b)=>(order[a.kind]||9)-(order[b.kind]||9));
  parsed.forEach(p=>{ results.push(applyFileByKind(p.kind, p.aoa, p.name)); });
  saveData(); render();
  setTimeout(()=>{
    const box=document.getElementById('allResult');
    if(box){
      box.innerHTML=`<div class="card" style="margin-top:4px;"><div class="section-title">불러오기 결과</div>`+
        results.map(r=>`<div style="font-size:13.5px;padding:5px 0;border-bottom:1px solid var(--line);"><b>${escapeHtml(r.name)}</b> → ${escapeHtml(r.kind)}${r.msg?` <span class="muted">(${escapeHtml(r.msg)})</span>`:''}</div>`).join('')+`</div>`;
    }
  },50);
  toast(files.length+'개 파일을 처리했습니다');
}
function headerSet(aoa){
  // 첫 5행 안에서 헤더 행을 찾아 열 이름 집합 반환
  for(let i=0;i<Math.min(5,aoa.length);i++){
    const row=aoa[i].map(x=>String(x||'').trim());
    if(row.some(c=>c)) {
      const joined=row.join('|');
      if(joined.includes('원가')||joined.includes('거래처명')||joined.includes('공급자')||joined.includes('핸드폰')) return {row, idx:i};
    }
  }
  return {row:(aoa[0]||[]).map(x=>String(x||'').trim()), idx:0};
}
function detectFileKind(aoa){
  const {row}=headerSet(aoa);
  const h=row.join('|');
  if(h.includes('공급자')&&(h.includes('사업자번호')||h.includes('통장번호'))) return 'supplier';
  if(h.includes('핸드폰')||h.includes('휴대폰')) return 'custphone';
  if(h.includes('원가')||h.includes('0가')||h.includes('배송비')) return 'cost';
  if(h.includes('거래처명')) return 'customer';
  return 'unknown';
}
function applyFileByKind(kind, aoa, fname){
  if(kind==='cost') return {name:fname, ...applyCostAoa(aoa)};
  if(kind==='customer') return {name:fname, ...applyCustomerAoa(aoa)};
  if(kind==='custphone') return {name:fname, ...applyCustPhoneAoa(aoa)};
  if(kind==='supplier') return {name:fname, ...applySupplierAoa(aoa)};
  return {name:fname, kind:'구분 실패', msg:'열 제목을 인식하지 못했습니다'};
}
// 헤더행 인덱스 찾기 (열이름 포함)
function findHeaderRow(aoa, keys){
  for(let i=0;i<Math.min(6,aoa.length);i++){
    const row=aoa[i].map(x=>String(x||'').trim());
    if(keys.some(k=>row.includes(k))) return i;
  }
  return 0;
}
function applyCostAoa(aoa){
  const hi=findHeaderRow(aoa,['모델명','원가']);
  const header=aoa[hi].map(x=>String(x||'').trim());
  const col=name=>header.indexOf(name);
  const cB=col('제조사')>=0?col('제조사'):col('브랜드');
  const cG=col('구분')>=0?col('구분'):col('재질'), cM=col('모델명'), cC=col('원가'), cS=col('배송비')>=0?col('배송비'):col('택배비');
  const gCols={}; PRICE_GROUP_KEYS.forEach(g=>gCols[g]=col(g));
  let n=0;
  for(let i=hi+1;i<aoa.length;i++){
    const r=aoa[i]; const model=String(r[cM]||'').trim(); if(!model) continue;
    const brand=String(r[cB]||'').trim()||BRANDS[0];
    const gubun=cG>=0?String(r[cG]||'').trim():'';
    const cost=parseInt(r[cC]||0,10)||0;
    const prices={}; PRICE_GROUP_KEYS.forEach(g=>{ const v=gCols[g]>=0?r[gCols[g]]:''; prices[g]=(v===''||v==null)?null:(parseInt(v,10)||0); });
    const ex=state.costItems.find(c=>c.brand===brand&&c.model===model);
    if(ex){ ex.cost=cost; ex.gubun=gubun; ex.prices=prices; }
    else state.costItems.push({id:nextId(),brand,gubun,model,cost,prices});
    // 배송비
    if(cS>=0){ const fee=parseInt(r[cS]||0,10)||0; const se=state.shippingItems.find(s=>s.brand===brand&&s.model===model); if(se) se.fee=fee; else state.shippingItems.push({id:nextId(),brand,model,fee}); }
    n++;
  }
  return {kind:'원가·판매가·택배비', msg:n+'개 모델 반영'};
}
function applyCustomerAoa(aoa){
  const hi=findHeaderRow(aoa,['거래처명']);
  const header=aoa[hi].map(x=>String(x||'').trim());
  const cN=header.indexOf('거래처명');
  const existing=new Set(state.customers.map(c=>c.name));
  let added=0;
  for(let i=hi+1;i<aoa.length;i++){
    let n=String(aoa[i][cN]||'').trim();
    if(!n||n==='[]'||n.includes('합계')||n.includes('소계')) continue;
    if(existing.has(n)) continue;
    state.customers.push({id:nextId(), name:n, phone:'', priceGroups:makePriceGroups('5가'), shipVat:'included'});
    existing.add(n); added++;
  }
  return {kind:'거래처 등록', msg:added+'곳 신규 추가 (기존 유지)'};
}
function applyCustPhoneAoa(aoa){
  const hi=findHeaderRow(aoa,['거래처명']);
  const header=aoa[hi].map(x=>String(x||'').trim());
  let cN=header.indexOf('거래처명'); if(cN<0) cN=1;
  let cP=header.indexOf('핸드폰번호'); if(cP<0) cP=header.indexOf('휴대폰번호'); if(cP<0) cP=7;
  const map={};
  for(let i=hi+1;i<aoa.length;i++){
    const name=String(aoa[i][cN]||'').trim(); const phone=String(aoa[i][cP]||'').trim();
    if(!name||!phone) continue;
    const d=phone.replace(/[^0-9]/g,'');
    if(!(d.startsWith('010')&&d.length===11)) continue;
    if(!map[name]) map[name]=d.slice(0,3)+'-'+d.slice(3,7)+'-'+d.slice(7);
  }
  let filled=0;
  state.customers.forEach(c=>{ if(map[c.name]){ c.phone=map[c.name]; filled++; } });
  return {kind:'거래처 연락처', msg:filled+'곳 번호 채움 (이름 일치)'};
}
function applySupplierAoa(aoa){
  const hi=findHeaderRow(aoa,['공급자']);
  const header=aoa[hi].map(x=>String(x||'').trim());
  const cN=header.indexOf('공급자'), cB=header.indexOf('사업자번호'), cA=header.indexOf('통장번호'), cBank=header.indexOf('은행'), cH=header.indexOf('예금주');
  let n=0;
  for(let i=hi+1;i<aoa.length;i++){
    let name=String(aoa[i][cN]||'').trim(); if(!name) continue;
    // 상호에서 (주) 등 제거해서 매칭 시도
    const bare=name.replace(/\(주\)|주식회사|㈜/g,'').trim();
    let sup=state.suppliers.find(s=>s.name===name||s.name===bare||name.includes(s.name)||s.name.includes(bare));
    if(!sup){ continue; }
    if(cB>=0) sup.bizNo=String(aoa[i][cB]||'').trim();
    if(cA>=0) sup.account=String(aoa[i][cA]||'').trim();
    if(cBank>=0) sup.bank=String(aoa[i][cBank]||'').trim();
    if(cH>=0) sup.holder=String(aoa[i][cH]||'').trim();
    n++;
  }
  return {kind:'공급자 정보', msg:n+'곳 반영'};
}

function renderSupplierSettings(){
  const rows = state.suppliers.map(s=>`
    <div class="sup-card">
      <div class="sup-name">${escapeHtml(s.name)}</div>
      <div class="sup-grid">
        <label class="f">상호<input type="text" value="${(s.name||'').replace(/"/g,'&quot;')}" onchange="updateSupplier(${s.id},'name',this.value)"></label>
        <label class="f">사업자번호<input type="text" value="${(s.bizNo||'').replace(/"/g,'&quot;')}" placeholder="000-00-00000" onchange="updateSupplier(${s.id},'bizNo',this.value)"></label>
        <label class="f">은행<input type="text" value="${(s.bank||'').replace(/"/g,'&quot;')}" placeholder="예: 국민은행" onchange="updateSupplier(${s.id},'bank',this.value)"></label>
        <label class="f">계좌번호<input type="text" value="${(s.account||'').replace(/"/g,'&quot;')}" placeholder="계좌번호" onchange="updateSupplier(${s.id},'account',this.value)"></label>
        <label class="f">예금주<input type="text" value="${(s.holder||'').replace(/"/g,'&quot;')}" placeholder="예금주명" onchange="updateSupplier(${s.id},'holder',this.value)"></label>
      </div>
    </div>`).join('');
  return `<div class="card">
    <h2>공급자 (우리 사업체)</h2>
    <p class="desc">공급자 엑셀을 올리면 적용 전에 신규·수정·변경 없음을 확인할 수 있습니다. <b>적용하기 전에는 저장되지 않습니다.</b></p>
    <div class="row" style="margin-bottom:14px;">
      <input type="file" id="supplierFile" accept=".xlsx,.xls" style="display:none" onchange="handleSupplierExcel(event)">
      <div class="drop-box" id="supplierDrop" style="border-color:var(--teal);"
           onclick="document.getElementById('supplierFile').click()"
           ondragover="dropOver(event,'supplierDrop')" ondragleave="dropLeave(event,'supplierDrop')"
           ondrop="dropSupplierFile(event)">
        🏦 <b>공급자 엑셀을 여기로 끌어다 놓거나</b> 클릭해서 선택<br>
        <span class="drop-sub">공급자(또는 상호) · 사업자번호 · 은행 · 계좌번호(통장번호) · 예금주 열을 읽습니다.</span>
      </div>
    </div>
    ${rows}
  </div>`;
}
function updateSupplier(id, field, val){
  const s=state.suppliers.find(x=>x.id===id);
  if(!s) return;
  s[field]=(val||'').trim();
  saveData();
  if(field==='name') render();
  else toast('저장되었습니다');
}

function renderCustomerSettings(){
  const q = (state.custSearch||'').trim();
  const list = q ? state.customers.filter(c=>c.name.includes(q)) : state.customers;
  return `<div class="card">
    <h2>거래처 <span class="badge-vat">${state.customers.length}곳</span></h2>
    <p class="desc">거래처 엑셀을 올리면 사업자번호를 기준으로 <b>신규·수정·변경 없음</b>을 먼저 보여줍니다. 엑셀에 없는 기존 거래처는 삭제하지 않고 삭제 후보로만 표시합니다.</p>

    <div class="row" style="margin-bottom:14px;">
      <input type="file" id="custFile" accept=".xlsx,.xls" style="display:none" onchange="handleCustExcel(event)">
      <div class="drop-box" id="custDrop"
           onclick="document.getElementById('custFile').click()"
           ondragover="dropOver(event,'custDrop')" ondragleave="dropLeave(event,'custDrop')"
           ondrop="dropCustFile(event)">
        📄 <b>거래처 엑셀을 여기로 끌어다 놓거나</b> 클릭해서 선택<br>
        <span class="drop-sub">거래처명 · 사업자번호 · 대표자 · 전화번호 · 휴대폰 · 이메일을 읽고 적용 전 변경 내용을 보여줍니다.</span>
      </div>
    </div>

    <div class="row" style="margin-bottom:14px;">
      <input type="file" id="custPhoneFile" accept=".xlsx,.xls" style="display:none" onchange="handleCustPhoneExcel(event)">
      <div class="drop-box" id="custPhoneDrop" style="border-color:var(--teal);"
           onclick="document.getElementById('custPhoneFile').click()"
           ondragover="dropOver(event,'custPhoneDrop')" ondragleave="dropLeave(event,'custPhoneDrop')"
           ondrop="dropCustPhoneFile(event)">
        📞 <b>거래처 연락처 엑셀을 여기로 끌어다 놓거나</b> 클릭해서 선택<br>
        <span class="drop-sub">B열(거래처명)·H열(전화번호)을 읽어, <b>이미 등록된 거래처의 휴대폰(010)만</b> 채웁니다. 새 거래처는 추가하지 않아요.</span>
      </div>
    </div>

    <div class="row" style="margin-bottom:14px;align-items:flex-end;">
      <label class="f" style="flex:1;">거래처명 직접 추가<input type="text" id="newCustName" placeholder="예: OO설비"></label>
      <label class="f">사업자번호<input type="text" id="newCustBizNo" placeholder="000-00-00000"></label>
      <label class="f">연락처<input type="text" id="newCustPhone" placeholder="010-0000-0000"></label>
      <label class="f">가격그룹<select id="newCustGroup">${PRICE_GROUP_KEYS.map(g=>`<option ${g==='5가'?'selected':''}>${g}</option>`).join('')}</select></label>
      <label class="f">택배비 방식<select id="newCustShipVat"><option value="none">무료</option><option value="separate">별도</option><option value="included" selected>포함</option></select></label>
      <button class="btn accent" onclick="addCustomer()">추가</button>
    </div>

    <div class="row" style="margin-bottom:10px;align-items:flex-end;gap:16px;">
      <label class="f" style="flex:1;">🔍 거래처 검색
        <input type="text" id="custSearchBox" placeholder="이름 일부를 입력하세요" oninput="onCustSearch(this.value)" style="max-width:340px;">
      </label>
      <label class="f">일괄 변경 브랜드
        <select id="bulkGroupBrand">
          <option value="all">전체(4개 브랜드)</option>
          ${BRANDS.map(b=>`<option value="${b}">${brandShort(b)}</option>`).join('')}
        </select>
      </label>
      <label class="f">가격그룹
        <select id="bulkGroupSel">
          <option value="">-- 선택 --</option>
          ${PRICE_GROUP_KEYS.map(g=>`<option value="${g}">${g}</option>`).join('')}
        </select>
      </label>
      <button class="btn ghost sm" onclick="bulkChangeGroup()">${q?'검색된 곳에':'전체'} 적용</button>
    </div>
    <div id="custTopScroll" class="cust-top-scroll" onscroll="syncCustomerTableScroll(this,'custTableWrap')"><div id="custTopScrollInner" class="cust-top-scroll-inner"></div></div>
    <div class="table-wrap" id="custTableWrap" onscroll="syncCustomerTableScroll(this,'custTopScroll')"><table>
      <thead><tr><th class="fav-col">즐겨찾기</th><th>거래처명</th><th>사업자번호</th><th>대표자</th><th>연락처</th><th>브랜드별 가격그룹</th><th>택배비</th><th></th></tr></thead>
      <tbody id="custTbody">${buildCustSettingRows()}</tbody></table></div>
    <p class="desc" style="margin-top:10px;" id="custCount">${q?`검색결과 ${list.length}곳`:`총 ${state.customers.length}곳`}</p></div>`;
}
function onCustSearch(v){
  state.custSearch=v;
  const tbody=document.getElementById('custTbody');
  if(tbody) tbody.innerHTML=buildCustSettingRows();
  requestAnimationFrame(initCustomerTableScroll);
  const cnt=document.getElementById('custCount');
  if(cnt){ const q=(state.custSearch||'').trim(); const list=q?state.customers.filter(c=>c.name.includes(q)):state.customers; cnt.textContent=q?`검색결과 ${list.length}곳`:`총 ${state.customers.length}곳`; }
}
function buildCustSettingRows(){
  const q=(state.custSearch||'').trim();
  const list=q?state.customers.filter(c=>c.name.includes(q)):state.customers;
  if(list.length===0) return `<tr><td colspan="8" class="empty">${q?'검색 결과가 없습니다.':'등록된 거래처가 없습니다.'}</td></tr>`;
  return list.map(c=>{ const fav=isFavoriteCustomer(c.id); const href=phoneHref(c.phone); return `
    <tr><td class="fav-col"><button type="button" class="favorite-star ${fav?'on':''}" title="${fav?'즐겨찾기 해제':'즐겨찾기 등록'}" onclick="toggleFavoriteCustomerSetting(${c.id},event)">${fav?'★':'☆'}</button></td><td>${escapeHtml(c.name)}</td>
    <td><input type="text" class="inline-phone" value="${(c.bizNo||'').replace(/"/g,'&quot;')}" placeholder="사업자번호" onchange="updateCustField(${c.id},'bizNo',this.value)"></td>
    <td><input type="text" class="inline-phone" value="${(c.representative||'').replace(/"/g,'&quot;')}" placeholder="대표자" onchange="updateCustField(${c.id},'representative',this.value)"></td>
    <td><div class="phone-cell"><input type="text" class="inline-phone" value="${(c.phone||'').replace(/"/g,'&quot;')}" placeholder="010-0000-0000" onchange="updateCustPhone(${c.id},this.value)">${href?`<a class="call-link" href="${href}" title="${escapeHtml(c.name)}에게 전화">전화</a>`:''}</div></td>
    <td><div style="display:flex;gap:4px;flex-wrap:wrap;">${BRANDS.map(b=>`<select class="inline-sel" style="width:auto;" onchange="updateCustGroup(${c.id},'${b}',this.value)" title="${brandShort(b)}">${PRICE_GROUP_KEYS.map(g=>`<option ${(c.priceGroups&&c.priceGroups[b])===g?'selected':''}>${g}</option>`).join('')}</select>`).join('')}</div></td>
    <td><select class="inline-sel" onchange="updateCustShipVat(${c.id},this.value)"><option value="none" ${c.shipVat==='none'?'selected':''}>무료</option><option value="separate" ${c.shipVat==='separate'?'selected':''}>별도</option><option value="included" ${c.shipVat==='included'?'selected':''}>포함</option></select></td>
    <td class="r"><button class="btn danger" onclick="removeCustomer(${c.id})">삭제</button></td></tr>`; }).join('');
}
function updateCustField(id, field, v){ const c=state.customers.find(x=>x.id===id); if(c){ c[field]=(v||'').trim(); saveData(); } }
function updateCustPhone(id, v){ updateCustField(id,'phone',v); }
function updateCustGroup(id, brand, g){ const c=state.customers.find(x=>x.id===id); if(c){ if(!c.priceGroups) c.priceGroups=makePriceGroups(); c.priceGroups[brand]=g; saveData(); toast(`${brandShort(brand)} 가격그룹 저장: ${g}`); } }
function bulkChangeGroup(){
  const brand=document.getElementById('bulkGroupBrand').value;
  const g=document.getElementById('bulkGroupSel').value;
  if(!g) return;
  const q=(state.custSearch||'').trim();
  const targets = q ? state.customers.filter(c=>c.name.includes(q)) : state.customers;
  if(targets.length===0){ return; }
  const scope = q ? `검색된 ${targets.length}곳` : `전체 ${targets.length}곳`;
  const brandLabel = brand==='all' ? '전체 브랜드' : brandShort(brand);
  if(!confirm(`${scope}의 ${brandLabel} 가격그룹을 모두 [${g}]로 바꿀까요?`)){ return; }
  targets.forEach(c=>{
    if(!c.priceGroups) c.priceGroups=makePriceGroups();
    if(brand==='all') BRANDS.forEach(b=>c.priceGroups[b]=g);
    else c.priceGroups[brand]=g;
  });
  saveData();
  render();
  toast(`${targets.length}곳을 ${g}로 변경했습니다`);
}
function updateCustShipVat(id, v){ const c=state.customers.find(x=>x.id===id); if(c) c.shipVat=v; saveData(); }
function addCustomer(){
  const name=document.getElementById('newCustName').value.trim();
  if(!name){ alert('거래처명을 입력해주세요.'); return; }
  if(state.customers.some(c=>c.name===name)){ alert('이미 등록된 거래처입니다.'); return; }
  const phone=document.getElementById('newCustPhone').value.trim();
  const bizNo=document.getElementById('newCustBizNo').value.trim();
  state.customers.push({id:nextId(), name, bizNo, phone, priceGroups:makePriceGroups(document.getElementById('newCustGroup').value), shipVat:document.getElementById('newCustShipVat').value});
  saveData();
  render();
}
function removeCustomer(id){
  state.customers=state.customers.filter(c=>c.id!==id);
  saveData();
  render();
}

/* 거래처 엑셀 업로드 (D열 = 거래처명) */
function handleCustExcel(evt){ const f=evt.target.files[0]; if(f) processCustFile(f); evt.target.value=''; }
function dropCustFile(e){
  e.preventDefault();
  const el=document.getElementById('custDrop'); if(el) el.classList.remove('drag-on');
  const f=e.dataTransfer.files && e.dataTransfer.files[0];
  if(!f) return;
  if(!/\.(xlsx|xls)$/i.test(f.name)){ alert('엑셀 파일(.xlsx, .xls)만 올릴 수 있어요.'); return; }
  processCustFile(f);
}
function normalizeImportBizNo(v){ return String(v||'').replace(/[^0-9]/g,''); }
function normalizeImportName(v){ return String(v||'').trim().replace(/\s+/g,' '); }
function findImportHeader(aoa, aliases){
  for(let i=0;i<Math.min(12,aoa.length);i++){
    const row=(aoa[i]||[]).map(x=>String(x||'').trim());
    let score=0;
    Object.values(aliases).forEach(list=>{ if(list.some(a=>row.includes(a))) score++; });
    if(score>=2 || (score>=1 && Object.values(aliases).flat().some(a=>a==='거래처명'&&row.includes(a)))) return {idx:i,row};
  }
  return {idx:0,row:(aoa[0]||[]).map(x=>String(x||'').trim())};
}
function aliasCol(header,list){ for(const a of list){ const i=header.indexOf(a); if(i>=0) return i; } return -1; }
function formatPhoneImport(v){
  const raw=String(v||'').trim(); const d=raw.replace(/[^0-9]/g,'');
  if(d.length===11&&d.startsWith('010')) return d.slice(0,3)+'-'+d.slice(3,7)+'-'+d.slice(7);
  if(d.length===10&&d.startsWith('02')) return d.slice(0,2)+'-'+d.slice(2,6)+'-'+d.slice(6);
  if(d.length===9&&d.startsWith('02')) return d.slice(0,2)+'-'+d.slice(2,5)+'-'+d.slice(5);
  if(d.length===10) return d.slice(0,3)+'-'+d.slice(3,6)+'-'+d.slice(6);
  return raw;
}
function processCustFile(file){
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      const wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'});
      const sheet=wb.Sheets[wb.SheetNames[0]];
      const aoa=XLSX.utils.sheet_to_json(sheet,{header:1,defval:''});
      const aliases={
        name:['거래처명','상호','업체명','거래처'], bizNo:['사업자번호','사업자등록번호','사업자 번호'],
        representative:['대표자','대표자명'], tel:['전화번호','전화','TEL','연락처'],
        mobile:['핸드폰번호','휴대폰번호','휴대폰','핸드폰','MOBILE'], email:['이메일','E-mail','EMAIL','메일']
      };
      const h=findImportHeader(aoa,aliases), header=h.row;
      const cols={}; Object.keys(aliases).forEach(k=>cols[k]=aliasCol(header,aliases[k]));
      // 구형 ESA 양식처럼 헤더가 인식되지 않으면 D열 거래처명만 허용
      if(cols.name<0 && aoa.some(r=>String((r||[])[3]||'').trim()==='거래처명')) cols.name=3;
      if(cols.name<0){ alert('거래처명(또는 상호) 열을 찾지 못했습니다.'); return; }
      const rows=[]; const seen=new Set();
      for(let i=h.idx+1;i<aoa.length;i++){
        const r=aoa[i]||[]; const name=normalizeImportName(r[cols.name]);
        if(!name||name==='[]'||name.includes('합계')||name.includes('소계')) continue;
        const bizNo=cols.bizNo>=0?normalizeImportBizNo(r[cols.bizNo]):'';
        const key=bizNo||('N:'+name); if(seen.has(key)) continue; seen.add(key);
        const tel=cols.tel>=0?formatPhoneImport(r[cols.tel]):'';
        const mobile=cols.mobile>=0?formatPhoneImport(r[cols.mobile]):'';
        rows.push({name,bizNo,representative:cols.representative>=0?String(r[cols.representative]||'').trim():'',tel,mobile,email:cols.email>=0?String(r[cols.email]||'').trim():'',phone:mobile||tel});
      }
      if(!rows.length){ alert('등록할 거래처 데이터를 읽지 못했습니다.'); return; }
      const byBiz=new Map(), byName=new Map();
      state.customers.forEach(c=>{ const b=normalizeImportBizNo(c.bizNo); if(b) byBiz.set(b,c); byName.set(normalizeImportName(c.name),c); });
      const changes={newRows:[],modified:[],unchanged:[],invalid:[],deleteCandidates:[]}; const matchedIds=new Set();
      rows.forEach(x=>{
        let old=x.bizNo?byBiz.get(x.bizNo):null; if(!old) old=byName.get(x.name);
        if(!old){ if(!x.bizNo) changes.invalid.push({...x,reason:'사업자번호 없음'}); else changes.newRows.push(x); return; }
        matchedIds.add(old.id);
        const patch={};
        ['name','bizNo','representative','tel','mobile','email'].forEach(k=>{ if(x[k] && String(old[k]||'').trim()!==String(x[k]).trim()) patch[k]=x[k]; });
        const newPhone=x.mobile||x.tel; if(newPhone && String(old.phone||'').trim()!==newPhone) patch.phone=newPhone;
        if(Object.keys(patch).length) changes.modified.push({id:old.id,old,x,patch}); else changes.unchanged.push({id:old.id,old,x});
      });
      state.customers.filter(c=>c.name!=='택배보상금'&&!matchedIds.has(c.id)).forEach(c=>changes.deleteCandidates.push(c));
      state.pendingCustImport={fileName:file.name,changes}; renderCustImportModal();
    }catch(err){ alert('엑셀 읽기 오류: '+err.message); }
  }; reader.readAsArrayBuffer(file);
}
function renderCustImportModal(){
  const p=state.pendingCustImport; const c=p.changes;
  const rows=[
    ...c.newRows.slice(0,30).map(x=>`<tr><td><b>신규</b></td><td>${escapeHtml(x.name)}</td><td>${escapeHtml(x.bizNo||'-')}</td><td>새로 등록</td></tr>`),
    ...c.modified.slice(0,30).map(m=>`<tr><td><b>수정</b></td><td>${escapeHtml(m.x.name)}</td><td>${escapeHtml(m.x.bizNo||'-')}</td><td>${Object.keys(m.patch).map(k=>({representative:'대표자',tel:'전화',mobile:'휴대폰',email:'이메일',phone:'연락처',name:'거래처명',bizNo:'사업자번호'}[k]||k)).join(', ')}</td></tr>`),
    ...c.invalid.slice(0,10).map(x=>`<tr><td>확인</td><td>${escapeHtml(x.name)}</td><td>-</td><td>${escapeHtml(x.reason)} · 자동 추가 제외</td></tr>`)
  ].join('');
  document.getElementById('modalRoot').innerHTML=`<div class="modal-bg"><div class="modal" style="max-width:820px;">
    <h3>거래처 엑셀 적용 전 확인</h3>
    <p><b>${p.fileName}</b>에서 신규 <b>${c.newRows.length}</b>곳 · 수정 <b>${c.modified.length}</b>곳 · 변경 없음 <b>${c.unchanged.length}</b>곳 · 확인 필요 <b>${c.invalid.length}</b>곳을 찾았습니다.</p>
    <div class="pick-summary" style="margin:10px 0;">엑셀에 없는 기존 거래처 <b>${c.deleteCandidates.length}</b>곳은 삭제 후보로만 확인하며 <b>자동 삭제하지 않습니다.</b></div>
    <div class="table-wrap" style="max-height:330px;overflow:auto;"><table><thead><tr><th>구분</th><th>거래처명</th><th>사업자번호</th><th>반영 내용</th></tr></thead><tbody>${rows||'<tr><td colspan="4" class="empty">적용할 변경사항이 없습니다.</td></tr>'}</tbody></table></div>
    <div class="modal-actions"><button class="btn ghost" onclick="cancelCustImport()">취소</button><button class="btn accent" onclick="confirmCustImport()" ${(c.newRows.length+c.modified.length)?'':'disabled'}>신규·수정 적용하기</button></div>
  </div></div>`;
}
function cancelCustImport(){ state.pendingCustImport=null; closeModal(); }
function confirmCustImport(){
  const c=state.pendingCustImport.changes; let added=0,updated=0;
  c.newRows.forEach(x=>{ state.customers.push({id:nextId(),name:x.name,bizNo:x.bizNo,representative:x.representative,tel:x.tel,mobile:x.mobile,email:x.email,phone:x.phone,priceGroups:makePriceGroups('5가'),shipVat:'included'}); added++; });
  c.modified.forEach(m=>{ const old=state.customers.find(x=>x.id===m.id); if(old){ Object.assign(old,m.patch); updated++; } });
  state.pendingCustImport=null; saveData(); closeModal(); render(); toast(`거래처 신규 ${added}곳 · 수정 ${updated}곳을 적용했습니다`);
}

/* 공급자 엑셀 업로드 + 미리보기 */
function handleSupplierExcel(evt){ const f=evt.target.files[0]; if(f) processSupplierFile(f); evt.target.value=''; }
function dropSupplierFile(e){ e.preventDefault(); const el=document.getElementById('supplierDrop'); if(el) el.classList.remove('drag-on'); const f=e.dataTransfer.files&&e.dataTransfer.files[0]; if(!f)return; if(!/\.(xlsx|xls)$/i.test(f.name)){alert('엑셀 파일만 올릴 수 있어요.');return;} processSupplierFile(f); }
function processSupplierFile(file){
  const reader=new FileReader(); reader.onload=function(e){ try{
    const wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'}), sheet=wb.Sheets[wb.SheetNames[0]], aoa=XLSX.utils.sheet_to_json(sheet,{header:1,defval:''});
    const aliases={name:['공급자','상호','업체명'],bizNo:['사업자번호','사업자등록번호'],bank:['은행','은행명'],account:['계좌번호','통장번호'],holder:['예금주','예금주명']};
    const h=findImportHeader(aoa,aliases), cols={}; Object.keys(aliases).forEach(k=>cols[k]=aliasCol(h.row,aliases[k])); if(cols.name<0){alert('공급자 또는 상호 열을 찾지 못했습니다.');return;}
    const input=[]; for(let i=h.idx+1;i<aoa.length;i++){ const r=aoa[i]||[],name=normalizeImportName(r[cols.name]); if(!name)continue; input.push({name,bizNo:cols.bizNo>=0?normalizeImportBizNo(r[cols.bizNo]):'',bank:cols.bank>=0?String(r[cols.bank]||'').trim():'',account:cols.account>=0?String(r[cols.account]||'').trim():'',holder:cols.holder>=0?String(r[cols.holder]||'').trim():''}); }
    const changes={newRows:[],modified:[],unchanged:[]}; input.forEach(x=>{ const bare=x.name.replace(/\(주\)|주식회사|㈜/g,'').trim(); let old=state.suppliers.find(s=>(x.bizNo&&normalizeImportBizNo(s.bizNo)===x.bizNo)||s.name===x.name||s.name===bare||s.name.includes(bare)||x.name.includes(s.name)); if(!old){changes.newRows.push(x);return;} const patch={}; ['name','bizNo','bank','account','holder'].forEach(k=>{if(x[k]&&String(old[k]||'').trim()!==x[k])patch[k]=x[k];}); if(Object.keys(patch).length)changes.modified.push({id:old.id,x,patch});else changes.unchanged.push({id:old.id,x}); });
    state.pendingSupplierImport={fileName:file.name,changes}; renderSupplierImportModal();
  }catch(err){alert('엑셀 읽기 오류: '+err.message);} }; reader.readAsArrayBuffer(file);
}
function renderSupplierImportModal(){ const p=state.pendingSupplierImport,c=p.changes; const rows=[...c.newRows.map(x=>`<tr><td>신규</td><td>${escapeHtml(x.name)}</td><td>${escapeHtml(x.bizNo||'-')}</td><td>새 공급자 추가</td></tr>`),...c.modified.map(m=>`<tr><td>수정</td><td>${escapeHtml(m.x.name)}</td><td>${escapeHtml(m.x.bizNo||'-')}</td><td>${Object.keys(m.patch).join(', ')}</td></tr>`)].join(''); document.getElementById('modalRoot').innerHTML=`<div class="modal-bg"><div class="modal"><h3>공급자 엑셀 적용 전 확인</h3><p>신규 <b>${c.newRows.length}</b>곳 · 수정 <b>${c.modified.length}</b>곳 · 변경 없음 <b>${c.unchanged.length}</b>곳</p><div class="table-wrap"><table><thead><tr><th>구분</th><th>공급자</th><th>사업자번호</th><th>반영 내용</th></tr></thead><tbody>${rows||'<tr><td colspan="4" class="empty">변경사항이 없습니다.</td></tr>'}</tbody></table></div><div class="modal-actions"><button class="btn ghost" onclick="cancelSupplierImport()">취소</button><button class="btn accent" onclick="confirmSupplierImport()" ${(c.newRows.length+c.modified.length)?'':'disabled'}>적용하기</button></div></div></div>`; }
function cancelSupplierImport(){state.pendingSupplierImport=null;closeModal();}
function confirmSupplierImport(){const c=state.pendingSupplierImport.changes;let a=0,u=0;c.newRows.forEach(x=>{state.suppliers.push({id:nextId(),...x});a++;});c.modified.forEach(m=>{const old=state.suppliers.find(x=>x.id===m.id);if(old){Object.assign(old,m.patch);u++;}});state.pendingSupplierImport=null;saveData();closeModal();render();toast(`공급자 신규 ${a}곳 · 수정 ${u}곳을 적용했습니다`);}

/* =================== 엑셀 업로드 =================== */
function handleExcel(evt, type){
  const file = evt.target.files[0]; if(!file) return;
  processExcelFile(file);
  evt.target.value='';
}
// 드래그앤드롭 핸들러
function dropOver(e, boxId){ e.preventDefault(); const el=document.getElementById(boxId); if(el) el.classList.add('drag-on'); }
function dropLeave(e, boxId){ const el=document.getElementById(boxId); if(el) el.classList.remove('drag-on'); }
function dropFile(e, type, boxId){
  e.preventDefault();
  const el=document.getElementById(boxId); if(el) el.classList.remove('drag-on');
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if(!file){ return; }
  if(!/\.(xlsx|xls)$/i.test(file.name)){ alert('엑셀 파일(.xlsx, .xls)만 올릴 수 있어요.'); return; }
  processExcelFile(file);
}
function processExcelFile(file){
  const reader = new FileReader();
  reader.onload = function(e){
    try{
      const wb = XLSX.read(new Uint8Array(e.target.result), {type:'array'});
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, {defval:''});
      if(json.length===0){ alert('시트에 데이터가 없습니다.'); return; }
      const head = json[0];
      const hasCost = ('원가' in head)||('Cost' in head);
      const hasShip = ('배송비' in head)||('택배비' in head)||('Shipping' in head);
      const rows = json.map(r=>{
        const brand=String(r['브랜드']||r['제조사']||r['Brand']||'').trim();
        const gubun=String(r['구분']||'').trim();
        const model=String(r['모델명']||r['모델']||r['Model']||'').trim();
        const cost=parseInt(r['원가']||r['Cost']||0,10)||0;
        const fee=parseInt(r['배송비']||r['택배비']||r['Shipping']||0,10)||0;
        const prices={};
        PRICE_GROUP_KEYS.forEach(g=>{
          const v=r[g];
          prices[g] = (v===''||v==null) ? null : (parseInt(v,10)||0);
        });
        return {brand, gubun, model, cost, fee, prices};
      }).filter(r=>r.model);
      if(rows.length===0){ alert('인식된 데이터가 없습니다. 열 제목에 "제조사(또는 브랜드), 모델명, 원가, 배송비"가 있는지 확인하세요.'); return; }
      state.pendingImport={rows, hasCost, hasShip};
      renderImportModal();
    }catch(err){ alert('엑셀 읽기 오류: '+err.message); }
  };
  reader.readAsArrayBuffer(file);
}
function renderImportModal(){
  const {rows, hasCost, hasShip}=state.pendingImport;
  let cols = '<th>제조사</th><th>모델명</th>';
  if(hasCost) cols+='<th class="r">원가</th>';
  if(hasShip) cols+='<th class="r">배송비</th>';
  const rowsHtml = rows.map(r=>{
    let c=`<td>${escapeHtml(r.brand||'-')}</td><td>${escapeHtml(r.model)}${r.gubun?` <span class="badge-vat">${escapeHtml(r.gubun)}</span>`:''}</td>`;
    if(hasCost) c+=`<td class="r num">${fmt(r.cost)}</td>`;
    if(hasShip) c+=`<td class="r num">${fmt(r.fee)}</td>`;
    return `<tr>${c}</tr>`;
  }).join('');
  const what = [hasCost?'원가':null, hasShip?'배송비':null].filter(Boolean).join(' + ');
  document.getElementById('modalRoot').innerHTML = `
  <div class="modal-bg"><div class="modal">
    <h3>엑셀 미리보기 — ${what}</h3>
    <p>${rows.length}건 인식됨. 반영하면 같은 제조사+모델은 값을 갱신하고, 없는 모델은 새로 추가합니다. ${what}을(를) 한 번에 반영합니다.</p>
    <div class="table-wrap" style="max-height:300px;overflow-y:auto;"><table>
      <thead><tr>${cols}</tr></thead><tbody>${rowsHtml}</tbody></table></div>
    <div class="modal-actions"><button class="btn ghost" onclick="cancelImport()">취소</button>
    <button class="btn accent" onclick="confirmImport()">반영하기</button></div>
  </div></div>`;
}
function cancelImport(){ state.pendingImport=null; closeModal(); }
function confirmImport(){
  const {rows, hasCost, hasShip}=state.pendingImport;
  rows.forEach(r=>{
    const brand=r.brand||BRANDS[0];
    if(hasCost){
      const ex=state.costItems.find(c=>c.brand===brand&&c.model===r.model);
      if(ex){ ex.cost=r.cost; if(r.gubun) ex.gubun=r.gubun; ex.prices=r.prices; }
      else state.costItems.push({id:nextId(),brand,gubun:r.gubun,model:r.model,cost:r.cost,prices:r.prices});
    }
    if(hasShip){
      const ex=state.shippingItems.find(s=>s.brand===brand&&s.model===r.model);
      if(ex) ex.fee=r.fee; else state.shippingItems.push({id:nextId(),brand,model:r.model,fee:r.fee});
    }
  });
  state.pendingImport=null;
  saveData();
  closeModal();
  render();
  toast('엑셀을 반영했습니다');
}

window.addEventListener('resize',()=>{ const b=document.getElementById('historyCustomerSuggestions'); if(b&&b.classList.contains('show')) positionHistoryCustomerSuggestions(); });
window.addEventListener('scroll',()=>{ const b=document.getElementById('historyCustomerSuggestions'); if(b&&b.classList.contains('show')) positionHistoryCustomerSuggestions(); }, true);
