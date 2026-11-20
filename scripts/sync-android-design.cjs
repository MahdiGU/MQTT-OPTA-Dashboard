/* Shared presentation files have one canonical source; native transport stays native. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),assets=path.join(root,'app/src/main/assets');
const ageAssets=[['web/flock-age.js','flock-age.js'],['web/performance.js','flow-performance.js']];
const files=[['web/brand.css','brand.css'],['web/brand.js','brand.js'],['web/live-workspace.css','live-workspace.css'],['web/live-workspace.js','live-workspace.js'],['web/production.css','production.css'],['web/production.js','production.js'],['web/brand/elmajd-logo.png','elmajd-logo.png'],['web/brand/house-architecture.png','house-architecture.png']];
for(const [source,target] of [...files,...ageAssets]){const input=fs.readFileSync(path.join(root,source)),output=path.join(assets,target);if(process.argv.includes('--check')){if(!fs.existsSync(output)||!input.equals(fs.readFileSync(output)))throw Error('Android presentation is out of sync: '+target);}else fs.writeFileSync(output,input);}
console.log(process.argv.includes('--check')?'Android presentation matches the shared sources.':'Synchronized Android presentation; no browser bridge or browser session code copied.');
