// Schema compatibility: legacy Moneyfastation tables do not all have created_at.
// Keep the existing database schema authoritative; do not require timestamp columns just to load data.
async function q(table,extra=''){let r=await sb.from(table).select('*').eq('household_id',cloud.household.id);if(r.error)throw r.error;return r.data||[]}
async function loadCloudContext(){const r=await sb.from('household_members').select('household_id,role').eq('user_id',cloud.user.id).maybeSingle();if(r.error)throw r.error;if(!r.data){cloud.member=null;cloud.household=null;return}cloud.member=r.data;const h=await sb.from('households').select('*').eq('id',r.data.household_id).single();if(h.error)throw h.error;cloud.household=h.data}
async function bootCloud(user){cloud.user=user;try{await loadCloudContext();if(!cloud.household){onboarding();return}await loadCloudData();await materializeRecurring();await loadCloudData();cloud.ready=true;subscribeRealtime();render()}catch(e){console.error(e);toast(e.message||'Cloud initialization failed')}}
sb?.auth.onAuthStateChange((event,session)=>{if(session?.user&&!cloud.ready)bootCloud(session.user);if(!session){cloud={user:null,household:null,member:null,ready:false};renderAuth()}});
window.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();page='Transactions';render();setTimeout(()=>document.getElementById('txSearch')?.focus(),50)}});
(async()=>{if(!sb){renderAuth();return}const {data:{session}}=await sb.auth.getSession();if(session?.user)await bootCloud(session.user);else renderAuth()})();
