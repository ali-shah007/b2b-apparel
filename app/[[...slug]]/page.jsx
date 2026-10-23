import {notFound} from 'next/navigation';
import {getPage,siteRoutes} from '../../lib/site';
import PageRuntime from '../../components/PageRuntime';
export const dynamicParams=false;
export function generateStaticParams(){return siteRoutes.map(({route})=>({slug:route==='/'?[]:route.slice(1).split('/')}));}
export async function generateMetadata({params}){
 const {slug=[]}=await params;const page=await getPage(slug);
 if(!page)return {title:'Page not found | TA Sports'};
 return {metadataBase:new URL(process.env.VERCEL_URL?'https://'+process.env.VERCEL_URL:'http://localhost:3000'),title:page.title,description:page.description,openGraph:{title:page.title,description:page.description,siteName:'TA Sports',images:['/assets/images/ta-sports-logo.svg']}};
}
export default async function Page({params}){
 const {slug=[]}=await params;const page=await getPage(slug);if(!page)notFound();
 const html=process.env.VERCEL?page.html.replace(/20 (?:MiB|MB)/g,'4 MB').replace(/data-upload-max-bytes="20971520"/g,'data-upload-max-bytes="4194304"'):page.html;
 return <>
  <div style={{display:'contents'}} dangerouslySetInnerHTML={{__html:html}}/>
  <PageRuntime scripts={page.scripts}/>
 </>;
}
