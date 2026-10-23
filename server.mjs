import http from 'node:http';
import {readFile, stat, mkdir, writeFile, appendFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {randomUUID} from 'node:crypto';
const root=resolve('public');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.avif':'image/avif','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.ico':'image/x-icon','.mp4':'video/mp4'};
const port=Number(process.env.PORT||3000);
const attempts=new Map();
function json(res,status,body){res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(body));}
async function inquiry(req,res){
 const origin=req.headers.origin;
 if(origin && new URL(origin).host!==req.headers.host)return json(res,403,{success:false,message:'Please submit from this website.'});
 const key=req.socket.remoteAddress, now=Date.now();
 const recent=(attempts.get(key)||[]).filter(t=>now-t<60000);
 attempts.set(key,recent);if(recent.length>=10)return json(res,429,{success:false,message:'Please wait a minute before submitting again.'});
 let size=0,chunks=[];
 for await (const chunk of req){size+=chunk.length;if(size>21*1024*1024)return json(res,413,{success:false,message:'Please choose a file smaller than 20 MB.'});chunks.push(chunk);}
 let form;try{form=await new Request('http://localhost',{method:'POST',headers:{'content-type':req.headers['content-type']||''},body:Buffer.concat(chunks)}).formData();}catch{return json(res,400,{success:false,message:'Invalid form data.'});}
 const data={}; const uploads=[];
 for(const [key,value] of form){
  if(key.startsWith('_')||key==='cf-turnstile-response')continue;
  if(typeof value==='string'){data[key]=value.trim().slice(0,5000);}else if(value.size){uploads.push(value);}
 }
 const contact=req.url.startsWith('/contact/');
 const required=contact?['full_name','email','phone','details']:['name','contact','product_type','quantity'];
 if(required.some(k=>!data[k]))return json(res,422,{success:false,message:'Please complete all required fields.'});
 if(contact && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)||data.details.length<10))return json(res,422,{success:false,message:'Enter a valid email and at least 10 characters of project details.'});
 const allowed=new Set(['.jpg','.jpeg','.png','.webp','.pdf','.docx','.pptx']);
 if(uploads.some(f=>f.size>20*1024*1024||!allowed.has(extname(f.name).toLowerCase())))return json(res,422,{success:false,message:'Please upload a supported file smaller than 20 MB.'});
 const id=randomUUID();await mkdir('.local/inquiries',{recursive:true,mode:0o700});data.files=[];
 for(const [i,file] of uploads.entries()){
  const name=`${id}-${i}${extname(file.name).toLowerCase()}`;
  await writeFile(resolve('.local/inquiries',name),Buffer.from(await file.arrayBuffer()),{mode:0o600});data.files.push({name:file.name,stored:name,size:file.size});
 }
 await appendFile('.local/inquiries/requests.jsonl',JSON.stringify({id,createdAt:new Date().toISOString(),kind:contact?'contact':'sourcing',...data})+'\n',{mode:0o600});recent.push(now);
 json(res,201,{success:true,id,message:`Your inquiry has been saved. Reference: ${id.slice(0,8).toUpperCase()}.`});
}
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(req.method==='POST' && ['/contact/submit','/sourcing/submit'].includes(url.pathname))return await inquiry(req,res);
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end('Method not allowed');}
  if(url.pathname==='/health')return json(res,200,{status:'ok',name:'TA Sports'});
  let path=resolve(root,'.'+decodeURIComponent(url.pathname));
  if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403);return res.end('Forbidden');}
  try{if((await stat(path)).isDirectory())path=resolve(path,'index.html');}catch{}
  let body;try{body=await readFile(path);}catch{res.writeHead(404,{'content-type':'text/html; charset=utf-8'});return res.end(await readFile(resolve(root,'404.html')));}
  res.writeHead(200,{'content-type':types[extname(path)]||'application/octet-stream','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','cache-control':path.endsWith('.html')?'no-cache':'public, max-age=86400'});
  res.end(req.method==='HEAD'?undefined:body);
 }catch(error){console.error('Request failed:',error.message);if(!res.headersSent)json(res,500,{success:false,message:'Unable to save your inquiry. Please try again.'});else res.end();}
});
server.listen(port,'0.0.0.0',()=>console.log(`TA Sports running on port ${port}`));
