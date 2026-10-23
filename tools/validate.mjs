import {readdir,readFile,access} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
const root=resolve('public');
async function walk(dir){const files=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=resolve(dir,e.name);if(e.isDirectory())files.push(...await walk(p));else files.push(p);}return files;}
const files=await walk(root);
const routes=JSON.parse(await readFile('content/routes.json','utf8'));
for(const route of routes){
 const page=JSON.parse(await readFile(resolve('content/pages',route.file),'utf8'));
 if(/Big\s?Bee\s+Apparels/i.test(page.title+' '+page.html))throw new Error('Unrebranded page: '+route.route);
 const urls=[...page.stylesheets,...page.scripts.map(s=>s.src).filter(Boolean)];
 for(const [,url] of page.html.matchAll(/\b(?:src|poster)=["']([^"']+)["']/g))urls.push(url);
 for(const url of urls){
  if(!url.startsWith('/')||url.startsWith('//'))continue;
  try{await access(resolve(root,'.'+url.split(/[?#]/)[0]));}catch{throw new Error(`Missing asset ${url} in ${route.route}`);}
 }
}
for(const path of files.filter(f=>f.endsWith('.css'))){
 const css=await readFile(path,'utf8');
 for(const [,raw] of css.matchAll(/url\(\s*["']?([^\s"')]+)/g)){
  if(raw.startsWith('data:')||raw.startsWith('#'))continue;
  if(raw.startsWith('http')||raw.startsWith('//'))throw new Error(`External CSS asset in ${path}: ${raw}`);
  try{await access(raw.startsWith('/')?resolve(root,'.'+raw):resolve(dirname(path),raw));}catch{throw new Error(`Missing CSS asset: ${raw} in ${path}`);}
 }
}
console.log(`Validated ${routes.length} Next.js page templates and ${files.length} public files; all referenced assets and fonts are present.`);
