import assert from 'node:assert/strict';
import {submitInquiry} from '../lib/inquiries.js';
const prior=process.env.VERCEL;process.env.VERCEL='1';
const form=new FormData();form.set('full_name','Vercel validation');form.set('email','test@example.test');form.set('phone','555');form.set('details','Checking unavailable storage reports an honest failure.');
const request=new Request('https://ta-sports.example/contact/submit',{method:'POST',body:form});
if(!process.env.BLOB_READ_WRITE_TOKEN){const response=await submitInquiry(request,'contact');assert.equal(response.status,503);assert.equal((await response.json()).success,false);console.log('PASS: Vercel without storage returns 503, never a false saved confirmation.');}
if(prior===undefined)delete process.env.VERCEL;else process.env.VERCEL=prior;
