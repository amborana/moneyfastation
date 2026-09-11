// Product branding for Moneyfastation. Kept separate so the existing finance logic is untouched.
(function(){
  document.title='Moneyfastation';
  const replace=()=>{
    const root=document.getElementById('app');
    if(!root)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(n=>{n.nodeValue=n.nodeValue.replace(/The Ledger/g,'Moneyfastation').replace(/Ask Ledger/g,'Ask Moneyfastation')});
  };
  const start=()=>{replace();const root=document.getElementById('app');if(root)new MutationObserver(replace).observe(root,{childList:true,subtree:true,characterData:true});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
