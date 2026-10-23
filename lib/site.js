import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {cache} from 'react';
import routes from '../content/routes.json';
export const siteRoutes=routes;
export const getPage=cache(async(slug=[])=>{
 const route='/'+slug.join('/');
 const entry=routes.find(item=>item.route===route);
 if(!entry)return null;
 return JSON.parse(await readFile(resolve('content/pages',entry.file),'utf8'));
});
