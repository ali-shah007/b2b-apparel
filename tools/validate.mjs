import {readdir,readFile,access} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
const root=resolve('public');
async function walk(dir){const files=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=resolve(dir,e.name);if(e.isDirectory())files.push(...await walk(p));else files.push(p);}return files;}
const files=await walk(root),pages=files.filter(f=>f.endsWith('.html'));const missing=[];
for(const path of pages){
 const html=await readFile(path,'utf8');
 if(/Big\s?Bee\s+Apparels/i.test(html))throw new Error(`Unrebranded company in ${path}`);
 for(const [,attr,url] of html.matchAll(/\b(src|href|poster)=["']([^"']+)["']/g)){
  if(!url.startsWith('/')||url.startsWith('//')||url.includes('/cdn-cgi/')||attr==='href'&&!/\.(css|js|svg|png|ico)(\?|$)/.test(url))continue;
  const p=resolve(root,'.'+url.split(/[?#]/)[0]);
  try{await access(p);}catch{missing.push({path:path.slice(root.length),url});}
 }
}
if(missing.length){console.error('Missing assets:',missing);process.exitCode=1;}else console.log(`Build validation passed: ${pages.length} pages, ${files.length} files. All linked scripts, styles, and images are local and present.`);
for(const path of files.filter(f=>f.endsWith('.css'))){
 const css=await readFile(path,'utf8');
 for(const [,raw] of css.matchAll(/url\(\s*["']?([^\s"')]+)/g)){
  if(raw.startsWith('data:')||raw.startsWith('#'))continue;
  if(raw.startsWith('http')||raw.startsWith('//'))throw new Error(`External CSS asset in ${path}: ${raw}`);
  const file=raw.startsWith('/')?resolve(root,'.'+raw):resolve(dirname(path),raw);
  try{await access(file);}catch{throw new Error(`Missing CSS asset: ${raw} in ${path}`);}
 }
}
console.log('All CSS background images and font files are present locally.');
