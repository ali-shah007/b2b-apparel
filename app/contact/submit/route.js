import {submitInquiry} from '../../../lib/inquiries';
export const runtime='nodejs';
export const maxDuration=30;
export async function POST(request){return submitInquiry(request,'contact');}
