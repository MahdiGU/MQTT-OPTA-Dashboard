// Run locally by the project owner. OAuth tokens must never be committed or printed.
const fs=require('node:fs'),http=require('node:http'),crypto=require('node:crypto'),path=require('node:path');
const [clientFile,outputFile]=process.argv.slice(2);
if(!clientFile||!outputFile)throw Error('Usage: node scripts/gmail-authorize.cjs <downloaded-client.json> <private-output.json>');
if(path.resolve(outputFile).startsWith(path.resolve(__dirname,'..')+path.sep))throw Error('Save OAuth credentials outside the repository.');
const client=JSON.parse(fs.readFileSync(clientFile,'utf8')).installed;
if(!client?.client_id||!client?.client_secret)throw Error('A Desktop app OAuth client JSON is required.');
const verifier=crypto.randomBytes(48).toString('base64url'),state=crypto.randomBytes(32).toString('base64url');
let redirect,handling=false;
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  if(url.pathname!=='/oauth2/callback'||url.searchParams.get('state')!==state){res.writeHead(400);res.end('Invalid OAuth callback.');return;}
  if(handling){res.writeHead(409);res.end('Authorization is already processing.');return;}
  handling=true;
  try{
    if(!url.searchParams.get('code'))throw Error('Authorization was not granted.');
    const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:client.client_id,client_secret:client.client_secret,
      code:url.searchParams.get('code'),code_verifier:verifier,redirect_uri:redirect,grant_type:'authorization_code'}),signal:AbortSignal.timeout(20000)});
    const token=await response.json();if(!response.ok||!token.refresh_token)throw Error('No offline authorization received. Revoke the old grant and authorize again.');
    const scopes=String(token.scope||'').split(/\s+/);
    if(!scopes.includes('https://www.googleapis.com/auth/gmail.send')){
      const error=Error('Gmail send permission was not granted.');error.code='GMAIL_SCOPE_REQUIRED';throw error;
    }
    const userResponse=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{authorization:'Bearer '+token.access_token},signal:AbortSignal.timeout(10000)});
    const user=await userResponse.json();
    if(!userResponse.ok||user.email!=='elmajdautomation@gmail.com'||!user.email_verified)throw Error('Authorize the elmajdautomation@gmail.com mailbox.');
    fs.mkdirSync(path.dirname(outputFile),{recursive:true});
    fs.writeFileSync(outputFile,JSON.stringify({client_id:client.client_id,client_secret:client.client_secret,refresh_token:token.refresh_token,sender_email:user.email}),{mode:0o600});
    res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end('<h1>ElMAJD Automation</h1><p>Autorisation Gmail reçue. Vous pouvez fermer cette fenêtre et revenir à Codex.</p>');
    console.log('AUTHORIZED: Gmail sender verified; credentials saved privately.');server.close();clearTimeout(expiry);
  }catch(error){
    res.writeHead(400,{'content-type':'text/plain; charset=utf-8'});
    res.end(error.code==='GMAIL_SCOPE_REQUIRED'
      ? 'ElMAJD Automation : Google a confirmé la connexion, mais pas la permission Gmail. Relancez l’autorisation depuis Codex et cochez « Envoyer des e-mails en votre nom » avant de continuer.'
      : 'Authorization could not be completed. Return to Codex.');
    console.error(error.message);server.close();clearTimeout(expiry);process.exitCode=1;
  }
});
server.listen(0,'127.0.0.1',()=>{
  redirect=`http://127.0.0.1:${server.address().port}/oauth2/callback`;
  const params=new URLSearchParams({client_id:client.client_id,redirect_uri:redirect,response_type:'code',access_type:'offline',prompt:'consent',
    scope:'openid email https://www.googleapis.com/auth/gmail.send',login_hint:'elmajdautomation@gmail.com',state,code_challenge:crypto.createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'});
  console.log('AUTHORIZE_URL: https://accounts.google.com/o/oauth2/v2/auth?'+params);
});
const expiry=setTimeout(()=>{console.error('Authorization timed out. Run the helper again.');server.close();process.exitCode=1;},15*60*1000);
