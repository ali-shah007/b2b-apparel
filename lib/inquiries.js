import {randomUUID} from 'node:crypto';
import {extname,resolve} from 'node:path';
import {mkdir,writeFile,appendFile} from 'node:fs/promises';
const attempts=new Map();
const allowed=new Set(['.jpg','.jpeg','.png','.webp','.pdf','.docx','.pptx']);
const reply=(status,body)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});

export async function submitInquiry(request,kind){
 try{
  const host=request.headers.get('host')||new URL(request.url).host,origin=request.headers.get('origin');
  if(origin&&new URL(origin).host!==host)return reply(403,{success:false,message:'Please submit from this website.'});
  const key=request.headers.get('x-forwarded-for')||'local',now=Date.now();
  const recent=(attempts.get(key)||[]).filter(t=>now-t<60000);attempts.set(key,recent);
  if(recent.length>=10)return reply(429,{success:false,message:'Please wait a minute before submitting again.'});
  const limit=(process.env.VERCEL?4:21)*1024*1024;
  let size=0;const chunks=[];const reader=request.body?.getReader();
  if(!reader)return reply(400,{success:false,message:'Invalid form data.'});
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();return reply(413,{success:false,message:`Please keep your inquiry and attachments under ${process.env.VERCEL?'4':'20'} MB.`});}chunks.push(value);}
  let form;
  try{form=await new Request(request.url,{method:'POST',headers:{'content-type':request.headers.get('content-type')||''},body:Buffer.concat(chunks)}).formData();}
  catch{return reply(400,{success:false,message:'Invalid form data.'});}
  const data={},files=[];
  for(const [key,value] of form){
   if(key.startsWith('_')||['action','cf-turnstile-response'].includes(key))continue;
   if(typeof value==='string')data[key]=value.trim().slice(0,5000);else if(value.size)files.push(value);
  }
  const contact=kind==='contact',required=contact?['full_name','email','phone','details']:['name','contact','product_type','quantity'];
  if(required.some(key=>!data[key]))return reply(422,{success:false,message:'Please complete all required fields.'});
  if(contact&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)||data.details.length<10))return reply(422,{success:false,message:'Enter a valid email and at least 10 characters of project details.'});
  if(files.some(f=>f.size>20*1024*1024||!allowed.has(extname(f.name).toLowerCase())))return reply(422,{success:false,message:'Please choose a supported file smaller than 20 MB.'});
  if(process.env.VERCEL&&!process.env.BLOB_READ_WRITE_TOKEN)return reply(503,{success:false,message:'Inquiry submission is not connected yet. Please try again later.'});
  const id=randomUUID(),record={id,createdAt:new Date().toISOString(),kind,...data,files:[]};
  if(process.env.VERCEL){
   const {put}=await import('@vercel/blob');
   for(const [i,file] of files.entries()){
    const result=await put(`inquiries/${id}/attachment-${i}${extname(file.name).toLowerCase()}`,file,{access:'private',addRandomSuffix:false});
    record.files.push({name:file.name,pathname:result.pathname,size:file.size});
   }
   await put(`inquiries/${id}/request.json`,JSON.stringify(record),{access:'private',addRandomSuffix:false,contentType:'application/json'});
  }else{
   await mkdir('.local/inquiries',{recursive:true,mode:0o700});
   for(const [i,file] of files.entries()){
    const name=`${id}-${i}${extname(file.name).toLowerCase()}`;
    await writeFile(resolve('.local/inquiries',name),Buffer.from(await file.arrayBuffer()),{mode:0o600});record.files.push({name:file.name,stored:name,size:file.size});
   }
   await appendFile('.local/inquiries/requests.jsonl',JSON.stringify(record)+'\n',{mode:0o600});
  }
  recent.push(now);return reply(201,{success:true,id,message:`Your inquiry has been saved. Reference: ${id.slice(0,8).toUpperCase()}.`});
 }catch{return reply(500,{success:false,message:'Unable to save your inquiry. Please try again.'});}
}
