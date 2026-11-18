const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'..'),source=path.join(root,'app/src/main/assets'),out=path.join(root,'web/dist');
fs.mkdirSync(out,{recursive:true});
// Explicit asset allowlist: no firmware, keystores, Android config or backend artifacts.
const assets=['flow.css','flow-scene.css','flow-building.png','flow-logo.svg','flow-data.js','flow-ui.js',
  'flow-scene-view.js','flow-performance.js','i18n.js','phase5.js','account.js','history.js','feed-chains.js',
  'live3d.js','live3d.css','live3d-scene.bundle.js','THREE-LICENSE.txt','elmajd-icon.png'];
for(const asset of assets)fs.copyFileSync(path.join(source,asset),path.join(out,asset));
fs.cpSync(path.join(source,'fonts'),path.join(out,'fonts'),{recursive:true});
fs.copyFileSync(path.join(root,'web/desktop.css'),path.join(out,'desktop.css'));
fs.copyFileSync(path.join(root,'web/layout.js'),path.join(out,'web-layout.js'));
const build=esbuild.buildSync({entryPoints:[path.join(root,'web/bridge.js')],outfile:path.join(out,'web-bridge.js'),bundle:true,format:'iife',target:'es2022',minify:true,legalComments:'eof',metafile:true});
const licenses=new Map();
for(const input of Object.keys(build.metafile.inputs)){
  if(!input.includes('node_modules'))continue;
  let folder=path.dirname(path.resolve(root,input));
  while(folder!==path.dirname(folder)&&!fs.existsSync(path.join(folder,'package.json')))folder=path.dirname(folder);
  if(licenses.has(folder)||!fs.existsSync(path.join(folder,'package.json')))continue;
  const pkg=JSON.parse(fs.readFileSync(path.join(folder,'package.json'),'utf8'));
  const name=['LICENSE','LICENSE.md','LICENSE.txt','LICENSE-MIT'].find(file=>fs.existsSync(path.join(folder,file)));
  licenses.set(folder,pkg.name+' '+pkg.version+'\n'+(name?fs.readFileSync(path.join(folder,name),'utf8'):String(pkg.license||'See package license')));
}
fs.writeFileSync(path.join(out,'THIRD-PARTY-LICENSES.txt'),[...licenses.values()].join('\n\n--------------------------------\n\n'));
fs.copyFileSync(path.join(root,'node_modules/@supabase/supabase-js/LICENSE'),path.join(out,'SUPABASE-LICENSE.txt'));
let html=fs.readFileSync(path.join(source,'index.html'),'utf8');
html=html.replace('<title>ElMajd Automation</title>','<title>ElMAJD Automation · FLOW Dashboard</title><meta name="description" content="Tableau de bord ElMAJD : température, équipements, production et alarmes de votre élevage."><link rel="icon" type="image/svg+xml" href="flow-logo.svg">');
html=html.replace('</head>','<script src="web-bridge.js"></script></head>');
// Loaded last so responsive web rules also override dynamically inserted app styles.
html=html.replace('</body>','<script src="web-layout.js"></script></body>');
fs.writeFileSync(path.join(out,'index.html'),html);
fs.writeFileSync(path.join(out,'_headers'),'/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src \'self\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: blob:; font-src \'self\'; connect-src \'self\' https://zlmaombpfdznambrgqiv.supabase.co wss://zlmaombpfdznambrgqiv.supabase.co; object-src \'none\'; base-uri \'self\'; frame-ancestors \'none\'\n');
console.log('Built browser FLOW dashboard in web/dist (Android source unchanged).');
