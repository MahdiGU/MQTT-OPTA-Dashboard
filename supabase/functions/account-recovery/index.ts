import {jsonResponse,requireEnvironment,requireSupabaseSecretKey} from '../_shared/http.ts';
import {sendGmail} from '../_shared/gmail.ts';

Deno.serve(async(request)=>{
  if(request.method!=='POST')return jsonResponse({error:'POST required'},405);
  try{
    if(Number(request.headers.get('content-length')||0)>2048)return jsonResponse({error:'Invalid request'},400);
    const body=await request.text();if(body.length>2048)return jsonResponse({error:'Invalid request'},400);
    const email=String(JSON.parse(body).email||'').trim().toLowerCase();
    if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return jsonResponse({error:'Enter a valid email address.'},400);
    const base=requireEnvironment('SUPABASE_URL'),key=requireSupabaseSecretKey(),headers={apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json'};
    async function rpc(name:string,input={}){const r=await fetch(`${base}/rest/v1/rpc/${name}`,{method:'POST',headers,body:JSON.stringify(input),signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Recovery database unavailable');return r.json();}
    const config=await rpc('gmail_worker_config');if(!config)return jsonResponse({error:'Email recovery is not configured yet.'},503);
    const generic={message:'If this account exists, a recovery code has been sent.'};
    if(!await rpc('reserve_account_recovery',{normalized_email:email}))return jsonResponse(generic);
    const recipient=await rpc('account_recovery_recipient',{normalized_email:email});
    if(!recipient){await new Promise(resolve=>setTimeout(resolve,600));return jsonResponse(generic);}
    const link=await fetch(`${base}/auth/v1/admin/generate_link`,{method:'POST',headers,body:JSON.stringify({type:'recovery',email:recipient.email}),signal:AbortSignal.timeout(10000)});
    if(!link.ok)throw Error('Recovery generation unavailable');const generated=await link.json();
    const french=recipient.language!=='en',code=generated.email_otp;
    if(typeof code!=='string'||!/^\d{6,10}$/.test(code))throw Error('Recovery code unavailable');
    const result=await sendGmail(config,recipient.email,french?'ElMAJD — Récupération de votre compte':'ElMAJD — Account recovery',
      french?`Votre code de récupération ElMAJD Automation : ${code}\n\nSaisissez ce code dans l’application pour choisir un nouveau mot de passe. Ce code est à usage unique et expire selon la politique de sécurité du projet. Ne le partagez avec personne.\n\nSi vous n’avez pas demandé cette opération, ignorez cet e-mail.`:
        `Your ElMAJD Automation recovery code: ${code}\n\nEnter this one-time code in the app to choose a new password. It expires according to the project's security policy. Do not share it.\n\nIf you did not request this, ignore this email.`,crypto.randomUUID());
    // Keep the same public response for known/unknown accounts, including provider failures.
    if(result.status!=='sent')console.error('RECOVERY_MAIL_NOT_ACCEPTED');
    return jsonResponse(generic);
  }catch{console.error('ACCOUNT_RECOVERY_UNAVAILABLE');return jsonResponse({error:'Account recovery is temporarily unavailable. Try again later.'},503);}
});
