// TA Sports uses its own local inquiry workflow, never the reference site's services.
document.addEventListener('submit',async event=>{
 const form=event.target;
 if(!form.matches('#bigbee-contact-form,#bb-sourcing-form,.bb-chat__form'))return;
 event.preventDefault();event.stopImmediatePropagation();
 if(!form.reportValidity())return;
 const button=form.querySelector('[type="submit"]');
 const label=button?.querySelector('span')||button;
 const original=label?.textContent;
 let status=form.querySelector('[role="status"]');
 if(!status){status=document.createElement('p');status.setAttribute('role','status');form.append(status);}
 status.hidden=false;status.textContent='Saving your inquiry…';
 if(button)button.disabled=true;
 if(label)label.textContent='Saving…';
 try{
  const response=await fetch(form.action,{method:'POST',body:new FormData(form)});
  const result=await response.json();
  if(!response.ok)throw new Error(result.message||'Please try again.');
  status.style.color='#237345';status.textContent=result.message;form.reset();
 }catch(error){status.style.color='#b32c27';status.textContent=error.message;}
 finally{if(button)button.disabled=false;if(label)label.textContent=original;}
},true);
document.addEventListener('click',event=>{
 const action=event.target.closest('[data-chat-action="live-chat"],[data-chat-action="whatsapp"]');
 if(action){event.preventDefault();event.stopImmediatePropagation();location.href='/contact';}
},true);
document.addEventListener('DOMContentLoaded',()=>{
 document.querySelectorAll('.cf-turnstile,.contact-form__captcha,.bb-chat__turnstile').forEach(el=>el.remove());
 document.querySelectorAll('[data-chat-action="live-chat"] strong').forEach(el=>el.textContent='Contact TA Sports');
 document.querySelectorAll('[data-chat-action="live-chat"] p').forEach(el=>el.textContent='Share your project with our team.');
 document.querySelectorAll('form input[name="_token"]').forEach(el=>el.remove());
});
