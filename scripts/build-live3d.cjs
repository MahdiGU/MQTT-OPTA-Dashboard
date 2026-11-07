const esbuild = require('esbuild');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
esbuild.buildSync({
  entryPoints: [path.join(root, 'app/src/main/scene/live3d-scene.js')],
  outfile: path.join(root, 'app/src/main/assets/live3d-scene.bundle.js'),
  bundle: true,
  format: 'iife',
  target: 'chrome80',
  minify: true,
  legalComments: 'inline',
  banner: { js: '/* ElMAJD 3D scene. Source: ../scene/live3d-scene.js. Three.js 0.180.0, MIT. */' },
});
fs.copyFileSync(
  path.join(root, 'node_modules/three/LICENSE'),
  path.join(root, 'app/src/main/assets/THREE-LICENSE.txt'),
);
console.log('Built the offline 3D scene and included the Three.js license.');
