import {submitInquiry} from '../../../lib/inquiries';
export const runtime='nodejs';
export const maxDuration=30;
export async function POST(request){return submitInquiry(request,new URL(request.url).searchParams.get('kind')==='contact'?'contact':'sourcing');}
