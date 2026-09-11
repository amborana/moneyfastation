async function bootCloud(user){cloud.user=user;try{await loadCloudContext();if(!cloud.household){onboarding();return}await loadCloudData();await materializeRecurring();await loadCloudData();cloud.ready=true;subscribeRealtime();render()}catch(e){console.error(e);toast(e.message||'Cloud initialization failed')}}
sb?.auth.onAuthStateChange((event,session)=>{if(session?.user&&!cloud.ready)bootCloud(session.user);if(!session){cloud={user:null,household:null,member:null,ready:false};renderAuth()}});
window.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();page='Transactions';render();setTimeout(()=>document.getElementById('txSearch')?.focus(),50)}});
(async()=>{if(!sb){renderAuth();return}const {data:{session}}=await sb.auth.getSession();if(session?.user)await bootCloud(session.user);else renderAuth()})();

