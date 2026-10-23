'use client';
import {useEffect} from 'react';

// Keep each reference page's visual behavior while Next renders its content on the server.
export default function PageRuntime({scripts}){
 useEffect(()=>{
  if(window.__taRuntimeStarted)return;
  window.__taRuntimeStarted=true;
  async function initialize(){
   for(const script of scripts){
    const el=document.createElement('script');
    el.type=script.type||'text/javascript';
    if(script.src){
     el.src=script.src;el.async=false;
     await new Promise((resolve,reject)=>{el.onload=resolve;el.onerror=()=>reject(new Error('Unable to load '+script.src));document.body.appendChild(el);});
     const path=script.src.split('?')[0];
     if(path==='/assets/js/script.js')window.initTASite?.();
     if(path.endsWith('/assets/js/main.js'))window.initTABrandHub?.();
    }else if(script.text){el.textContent=script.text;document.body.appendChild(el);}
   }
   window.initTASupport?.();
   document.documentElement.dataset.taReady='true';
  }
  initialize().catch(error=>{
   console.error('TA Sports initialization failed:',error);
   document.body.classList.remove('is-preloading');
   document.querySelector('#site-preloader')?.remove();
  });
 },[scripts]);
 return null;
}
