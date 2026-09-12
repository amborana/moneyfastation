/* Moneyfastation runtime compatibility layer.
   This file intentionally owns startup so the modular app has one boot path. */
var cloud = window.cloud || {user:null, household:null, member:null, ready:false};
window.cloud = cloud;
var mfBootPromise = null;

document.title = 'Moneyfastation';

function mfBrand(){
  const root=document.getElementById('app');
  if(!root)return;
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes=[];
  while(w.nextNode())nodes.push(w.currentNode);
  nodes.forEach(n=>{
    const v=n.nodeValue;
    const next=v.replace(/The Ledger/g,'Moneyfastation').replace(/Ask Ledger/g,'Ask Moneyfastation');
    if(next!==v)n.nodeValue=next;
  });
}

async function mfQ(table){
  const r=await sb.from(table).select('*').eq('household_id',cloud.household.id);
  if(r.error)throw r.error;
  return r.data||[];
}
window.q=mfQ;

async function mfLoad(){
  if(!cloud.household)return;
  const h=cloud.household.id;
  const [cats,subs,exps,inc,plans,inv,ic,rec,cc,goals,gc,assets,liab,subscrip,mb,yb,settings,members]=await Promise.all([
    mfQ('categories'),mfQ('subcategories'),mfQ('expenses'),mfQ('other_income'),mfQ('plans'),
    mfQ('investments'),mfQ('investment_contributions'),mfQ('recurring_items'),mfQ('credit_card_bills'),
    mfQ('goals'),mfQ('goal_contributions'),mfQ('assets'),mfQ('liabilities'),mfQ('subscriptions'),
    mfQ('monthly_budgets'),mfQ('yearly_budgets'),mfQ('settings'),
    sb.from('household_members').select('user_id,role,profiles(display_name)').eq('household_id',h)
      .then(x=>x.error?Promise.reject(x.error):x.data||[])
  ]);
  state.categories=cats; state.subcategories=subs; state.expenses=exps; state.income=inc;
  state.plans=plans; state.investments=inv; state.investmentContributions=ic; state.recurring=rec;
  state.bills=cc; state.goals=goals; state.goalContributions=gc; state.assets=assets;
  state.liabilities=liab; state.subscriptions=subscrip; state.monthlyBudgets=mb; state.yearlyBudgets=yb;
  state.settings=settings[0]||{}; state.baseIncome=state.settings.base_income||{}; state.members=members;
}
window.loadCloudData=mfLoad;

async function mfMaterialize(){
  if(!cloud.household)return;
  const month=thisMonth();
  for(const r of (state.recurring||[]).filter(x=>x.auto_add!==false&&x.active!==false)){
    const type=r.transaction_type||'expense';
    const exists=type==='income'
      ?state.income.some(x=>x.recurring_id===r.id&&x.income_date?.startsWith(month))
      :state.expenses.some(x=>x.recurring_id===r.id&&x.expense_date?.startsWith(month));
    if(exists)continue;
    const day=String(Math.min(28,Math.max(1,Number(r.day||1)))).padStart(2,'0');
    if(type==='income'){
      const row={id:uid(),household_id:cloud.household.id,label:r.label||'Recurring income',amount:r.amount,
        income_date:`${month}-${day}`,received_by_name:r.received_by_name||activeName(),recurring_id:r.id,created_by:cloud.user.id};
      const x=await sb.from('other_income').insert(row); if(x.error)throw x.error;
      state.income.push(row);
    }else{
      if(!r.category_id)continue;
      const row={id:uid(),household_id:cloud.household.id,category_id:r.category_id,subcategory_id:r.subcategory_id||null,
        amount:r.amount,expense_date:`${month}-${day}`,note:r.label||'Recurring expense',
        added_by_name:r.added_by_name||activeName(),payment_method:r.payment_method||'',recurring_id:r.id,
        created_by:cloud.user.id,spent_for:r.spent_for||null};
      const x=await sb.from('expenses').insert(row); if(x.error)throw x.error;
      state.expenses.push(row);
    }
  }
}
window.materializeRecurring=mfMaterialize;

function mfAddExpense(){
  const cats=state.categories.map(c=>({value:c.id,label:c.name+(c.period==='yearly'?' · yearly':'')}));
  const members=state.members.map(m=>({value:m.profiles?.display_name||m.display_name||m.user_id,label:m.profiles?.display_name||m.display_name||'Member'}));
  modal('Add transaction',`<div class="form-grid">
    ${selectField('Type','fType',[{value:'expense',label:'Expense'},{value:'income',label:'Income'}],'expense')}
    ${field('Amount','fAmount','','number','min="0.01" step="0.01" placeholder="0.00"')}
    ${field('Date','fDate',today(),'date')}
    ${selectField('Category','fCat',cats)}
    ${selectField('Subcategory','fSub',[])}
    ${selectField('Person','fPerson',members,activeName())}
    ${selectField('Payment method','fPay',['UPI','Cash','Card','Credit Card','Bank Transfer','Other'].map(x=>({value:x,label:x})))}
    ${selectField('Link to plan','fPlan',[{value:'',label:'None'},...state.plans.map(p=>({value:p.id,label:p.title}))])}
    <div class="field full"><label>Spent for</label><input id="fSpentFor" type="text" placeholder="Self, spouse, family, gift…"></div>
    <div class="field full"><label style="display:flex;align-items:center;gap:8px;text-transform:none;letter-spacing:0;color:#cbd7d2;font-size:10px"><input id="fRecurring" type="checkbox" style="width:16px;height:16px"> Make this a recurring transaction</label></div>
    <div id="fRecurringFields" class="field full" style="display:none"><div class="form-grid">
      ${field('Recurring name','fRecurringName','','text','placeholder="Home Loan EMI, Rent, Salary…"')}
      ${field('Day every month','fRecurringDay','1','number','min="1" max="28"')}
    </div></div>
    <div class="field full"><label>Note / merchant</label><textarea id="fNote" placeholder="Merchant, reason, or anything you want to remember"></textarea></div>
  </div>`,async()=>{
    const type=document.getElementById('fType').value;
    const amount=Number(document.getElementById('fAmount').value);
    const date=document.getElementById('fDate').value;
    if(!(amount>0)||!date)throw Error('Amount and date are required');
    const person=document.getElementById('fPerson').value||activeName();
    const note=document.getElementById('fNote').value.trim();
    const recurring=document.getElementById('fRecurring').checked;
    let recurringId=null;
    if(type==='expense'){
      const cat=document.getElementById('fCat').value;
      if(!cat)throw Error('Category is required for expenses');
      const sub=document.getElementById('fSub').value||null;
      if(recurring){
        recurringId=uid();
        const rr=await sb.from('recurring_items').insert({id:recurringId,household_id:cloud.household.id,
          label:document.getElementById('fRecurringName').value.trim()||note||'Recurring expense',amount,
          day:Math.min(28,Math.max(1,Number(document.getElementById('fRecurringDay').value)||1)),auto_add:true,
          transaction_type:'expense',category_id:cat,subcategory_id:sub,added_by_name:person,
          payment_method:document.getElementById('fPay').value,spent_for:document.getElementById('fSpentFor').value.trim()||null});
        if(rr.error)throw rr.error;
      }
      const rr=await sb.from('expenses').insert({id:uid(),household_id:cloud.household.id,category_id:cat,
        subcategory_id:sub,amount,expense_date:date,note,added_by_name:person,
        payment_method:document.getElementById('fPay').value,plan_id:document.getElementById('fPlan').value||null,
        recurring_id:recurringId,created_by:cloud.user.id,spent_for:document.getElementById('fSpentFor').value.trim()||null});
      if(rr.error)throw rr.error;
    }else{
      const row={id:uid(),household_id:cloud.household.id,label:note||'Income',amount,income_date:date,
        received_by_name:person,created_by:cloud.user.id};
      if(recurring){
        recurringId=uid();
        const rr=await sb.from('recurring_items').insert({id:recurringId,household_id:cloud.household.id,
          label:document.getElementById('fRecurringName').value.trim()||row.label,amount,
          day:Math.min(28,Math.max(1,Number(document.getElementById('fRecurringDay').value)||1)),auto_add:true,
          transaction_type:'income',received_by_name:person});
        if(rr.error)throw rr.error;
        row.recurring_id=recurringId;
      }
      const rr=await sb.from('other_income').insert(row); if(rr.error)throw rr.error;
    }
    await mfLoad(); render(); closeModal(); toast(recurring?'Transaction + recurring schedule saved':'Transaction synced');
  });
  setTimeout(()=>{
    const type=document.getElementById('fType'),cat=document.getElementById('fCat'),sub=document.getElementById('fSub');
    const fill=()=>{sub.innerHTML='<option value="">None</option>'+state.subcategories.filter(s=>s.category_id===cat.value).map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')};
    cat.onchange=fill; fill();
    const sync=()=>{const income=type.value==='income';cat.disabled=income;sub.disabled=income;document.getElementById('fPlan').disabled=income;document.getElementById('fPay').disabled=income;};
    type.onchange=sync; sync();
    const chk=document.getElementById('fRecurring'),fields=document.getElementById('fRecurringFields');
    chk.onchange=()=>fields.style.display=chk.checked?'block':'none';
  },0);
}
window.addExpense=mfAddExpense;

function mfAddRecurring(){
  const cats=state.categories.map(c=>({value:c.id,label:c.name}));
  const members=state.members.map(m=>({value:m.profiles?.display_name||m.display_name||m.user_id,label:m.profiles?.display_name||m.display_name||'Member'}));
  modal('Recurring income / expense',`<div class="form-grid">
    ${selectField('Type','rType',[{value:'expense',label:'Expense'},{value:'income',label:'Income'}],'expense')}
    ${field('Name','rLabel','','text','placeholder="Salary, EMI, Rent…"')}
    ${field('Amount','rAmount','','number','min="0.01" step="0.01"')}
    ${field('Day every month','rDay','1','number','min="1" max="28"')}
    ${selectField('Category','rCat',cats)}${selectField('Subcategory','rSub',[])}
    ${selectField('Person / recipient','rPerson',members,activeName())}
    ${selectField('Payment method','rPay',['UPI','Cash','Card','Credit Card','Bank Transfer','Other'].map(x=>({value:x,label:x})))}
    <div class="field"><label>Spent for</label><input id="rSpentFor" placeholder="Self, spouse, family…"></div>
    <div class="field"><label>Auto add each month</label><select id="rAuto"><option value="true">Yes</option><option value="false">No</option></select></div>
  </div>`,async()=>{
    const type=document.getElementById('rType').value,label=document.getElementById('rLabel').value.trim();
    const amount=Number(document.getElementById('rAmount').value),day=Math.min(28,Math.max(1,Number(document.getElementById('rDay').value)||1));
    if(!label||!(amount>0))throw Error('Name and amount are required');
    const row={id:uid(),household_id:cloud.household.id,label,amount,day,auto_add:document.getElementById('rAuto').value==='true',transaction_type:type};
    if(type==='expense'){row.category_id=document.getElementById('rCat').value||null;row.subcategory_id=document.getElementById('rSub').value||null;row.added_by_name=document.getElementById('rPerson').value||activeName();row.payment_method=document.getElementById('rPay').value;row.spent_for=document.getElementById('rSpentFor').value.trim()||null}
    else row.received_by_name=document.getElementById('rPerson').value||activeName();
    const rr=await sb.from('recurring_items').insert(row);if(rr.error)throw rr.error;
    await mfLoad();render();closeModal();toast(type==='income'?'Recurring income saved':'Recurring expense saved');
  });
  setTimeout(()=>{
    const type=document.getElementById('rType'),cat=document.getElementById('rCat'),sub=document.getElementById('rSub');
    const fill=()=>sub.innerHTML='<option value="">None</option>'+state.subcategories.filter(x=>x.category_id===cat.value).map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');
    fill();cat.onchange=fill;type.onchange=()=>{const income=type.value==='income';cat.disabled=income;sub.disabled=income;document.getElementById('rPay').disabled=income;document.getElementById('rSpentFor').disabled=income};
  },0);
}
window.addRecurring=mfAddRecurring;

async function mfBoot(user){
  if(mfBootPromise)return mfBootPromise;
  mfBootPromise=(async()=>{
    cloud.user=user;
    try{
      await loadCloudContext();
      if(!cloud.household){cloud.ready=false;onboarding();return}
      await mfLoad();
      await mfMaterialize();
      cloud.ready=true;
      if(typeof subscribeRealtime==='function')subscribeRealtime();
      render();mfBrand();
    }catch(e){
      cloud.ready=false;
      console.error('Moneyfastation bootstrap failed:',e);
      try{renderAuth()}catch(_){document.getElementById('app').innerHTML='<div style="padding:40px;font-family:system-ui;color:white;background:#07100d;min-height:100vh">Moneyfastation could not start. Please refresh the page.</div>'}
    }finally{mfBootPromise=null}
  })();
  return mfBootPromise;
}
window.bootCloud=mfBoot;

new MutationObserver(()=>setTimeout(mfBrand,0)).observe(document.documentElement,{childList:true,subtree:true});

(async()=>{
  try{
    if(!sb){renderAuth();return}
    const s=await sb.auth.getSession();
    if(s.error){console.error('Auth session check failed:',s.error);renderAuth();return}
    if(s.data?.session?.user)await mfBoot(s.data.session.user);else renderAuth();
  }catch(e){console.error('Moneyfastation startup failed:',e);try{renderAuth()}catch(_){} }
})();
