// Browser gateway for the existing pilot endpoints. No broker or privileged keys leave the backend.
const cors = {'access-control-allow-origin':'*', 'access-control-allow-methods':'POST, OPTIONS',
  'access-control-allow-headers':'authorization, apikey, content-type, x-client-info', 'vary':'Origin'};
const json = (body: unknown, status=200) => new Response(JSON.stringify(body), {status, headers:{...cors, 'content-type':'application/json'}});
export async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, {status:204, headers:cors});
  if (request.method !== 'POST') return json({error:'POST required'},405);
  try {
    if (Number(request.headers.get('content-length') || 0)>4096) return json({error:'Invalid request'},413);
    const text=await request.text();if(text.length>4096)return json({error:'Invalid request'},413);
    const input=JSON.parse(text), operation=input.operation;
    const auth=request.headers.get('authorization') || '';
    const headers:Record<string,string>={'content-type':'application/json', apikey:'sb_publishable_qiP1Lnh1iQ32EUEFKxRCiA_F8XiQ1uj'};
    let path:string, body:unknown;
    if(operation==='account_recovery') {
      path='account-recovery';body={email:String(input.email||'').trim()};
    } else {
      // The target function independently verifies this JWT and farm permissions.
      if(!/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(auth))return json({error:'Authentication required'},401);
      headers.authorization=auth;
      if(operation==='command') {
        const payload=String(input.payload||'').trim().replace(/\s+/g,' ').toUpperCase();
        if(!/^(?:D[0-3]|LED[0-3]|ALL) (?:ON|OFF|TOGGLE|1|0)$/.test(payload))return json({error:'Invalid OPTA command'},400);
        path='send-mqtt-command';body={payload};
      } else if(operation==='notification_test') {
        if(!['test','test_email'].includes(input.action))return json({error:'Only a self-test is permitted'},403);
        path='dispatch-alarms';body={action:input.action};
      } else return json({error:'Unknown operation'},400);
    }
    const base=Deno.env.get('SUPABASE_URL');if(!base)return json({error:'Gateway unavailable'},503);
    const response=await fetch(`${base}/functions/v1/${path}`,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});
    return new Response(await response.text(),{status:response.status,headers:{...cors,'content-type':'application/json','cache-control':'no-store'}});
  } catch {return json({error:'Cloud request could not be completed. Try again.'},503);}
}
Deno.serve(handler);
