// Runtime bootstrap compatibility layer for the existing Moneyfastation schema.
// Do not wrap render(), addExpense(), editTransaction(), or upsert() here; those are defined by the modular UI files.
let bootPromise=null;

// Legacy tables do not all have created_at. Keep the live database schema authoritative.
async function q(table,extra=''){let r=await sb.from(table).select('*').eq('household_id',cloud.household.id);if(r.error)throw r.error;return r.data||[]}

async function bootCloud(user){
  if(bootPromise)return bootPromise;
  bootPromise=(async()=>{
    cloud.user=user;
    try{
      await loadCloudContext();
      if(!cloud.household){onboarding();return}
      await loadCloudData();
      await materializeRecurring();
      await loadCloudData();
      cloud.ready=true;
      subscribeRealtime();
      render();
    }catch(e){
      cloud.ready=false;
      console.error('Moneyfastation cloud bootstrap failed:',e);
      toast(e.message||'Cloud initialization failed');
    }finally{bootPromise=null}
  })();
  return bootPromise;
}

(async()=>{
  if(!sb){renderAuth();return}
  const {data:{session},error}=await sb.auth.getSession();
  if(error){console.error('Supabase session check failed:',error);renderAuth();return}
  if(session?.user)await bootCloud(session.user);else renderAuth();
})();
