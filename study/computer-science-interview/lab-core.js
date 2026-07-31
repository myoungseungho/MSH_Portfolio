(function(){
  'use strict';
  const labs=new Map();
  let active=null;
  function register(id,definition){labs.set(id,definition)}
  function close(restore=true){
    if(!active)return;
    if(active.cleanup)active.cleanup();
    const host=document.querySelector(`[data-lab-host="${active.id}"]`);
    const opener=document.querySelector(`[data-lab-open="${active.id}"]`);
    if(host)host.innerHTML='';
    if(opener){opener.hidden=false;opener.setAttribute('aria-expanded','false');if(restore)opener.focus({preventScroll:true})}
    active=null;
  }
  function open(id){
    const definition=labs.get(id);
    if(!definition)return;
    close(false);
    const host=document.querySelector(`[data-lab-host="${id}"]`);
    const opener=document.querySelector(`[data-lab-open="${id}"]`);
    if(!host||!opener)return;
    opener.hidden=true;opener.setAttribute('aria-expanded','true');
    host.innerHTML=definition.html();
    active={id,cleanup:null};
    const cleanup=definition.bind?definition.bind(host):null;
    if(typeof cleanup==='function')active.cleanup=cleanup;
  }
  document.addEventListener('click',event=>{
    const opener=event.target.closest('[data-lab-open]');
    if(opener){open(Number(opener.dataset.labOpen));return}
    if(event.target.closest('[data-lab-close]'))close();
  });
  window.CSLabs={register,open,close,count:()=>labs.size};
})();
