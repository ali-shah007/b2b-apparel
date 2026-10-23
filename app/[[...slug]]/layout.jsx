import {getPage} from '../../lib/site';
export default async function RootLayout({children,params}){
 const {slug=[]}=await params;
 const page=await getPage(slug);
 return <html lang="en" className={page?.htmlClass||''} suppressHydrationWarning>
  <head>
   <link rel="icon" href="/assets/images/ta-sports-icon.svg" type="image/svg+xml"/>
   {(page?.stylesheets||[]).map(href=><link key={href} rel="stylesheet" href={href}/>)}
   {(page?.styles||[]).map((css,i)=><style key={i} dangerouslySetInnerHTML={{__html:css}}/>)}
   {(page?.schemas||[]).map((json,i)=><script key={i} type="application/ld+json" dangerouslySetInnerHTML={{__html:json}}/>)}
  </head>
  <body className={page?.bodyClass||''} suppressHydrationWarning>{children}</body>
 </html>;
}
