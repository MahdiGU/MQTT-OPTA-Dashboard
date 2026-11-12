import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// The scene is bundled as a classic script so Android's local WebView needs no network access.
window.createElMajdScene = (canvas, onSelect, onFailure) => {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0xeaf1ed, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 200);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;
  controls.enablePan = true;
  controls.minDistance = 7;
  controls.maxDistance = 100;
  controls.minPolarAngle = 0.05;
  controls.maxPolarAngle = Math.PI * 0.485;
  controls.target.set(0, 1.8, 0);
  controls.touches.ONE = THREE.TOUCH.ROTATE;
  controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x84958a, 2.8));
  const sunlight = new THREE.DirectionalLight(0xfff5df, 3);
  sunlight.position.set(-12, 25, 18);
  scene.add(sunlight);

  const house = new THREE.Group();
  scene.add(house);
  const pickTargets = [];
  const items = new Map();
  const extraGeometries = [];
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const sphere = new THREE.SphereGeometry(1, 8, 6);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 12);
  const standard = (color, options = {}) => new THREE.MeshStandardMaterial({
    color, roughness: 0.72, metalness: 0.12, ...options,
  });
  const mat = {
    wall: standard(0xf5f5ef), edge: standard(0xced7d1), floor: standard(0xe2e8e2),
    concrete: standard(0xc3cec4), metal: standard(0xb1bcba, { metalness: 0.55 }),
    dark: standard(0x283b36), tray: standard(0xa0aaa6), green: standard(0x2c9075),
    grain: standard(0xc7a566), pipe: standard(0x366d83), water: standard(0x58bde2),
  };
  function box(parent, material, size, position) {
    const mesh = new THREE.Mesh(unitBox, material);
    mesh.scale.set(...size);
    mesh.position.set(...position);
    parent.add(mesh);
    return mesh;
  }
  function tube(parent, material, radius, length, position, horizontal = false) {
    const mesh = new THREE.Mesh(cylinder, material);
    mesh.scale.set(radius, length, radius);
    mesh.position.set(...position);
    if (horizontal) mesh.rotation.x = Math.PI / 2;
    parent.add(mesh);
    return mesh;
  }
  function brace(parent, material, start, end) {
    const from = new THREE.Vector3(...start);
    const to = new THREE.Vector3(...end);
    const direction = to.clone().sub(from);
    const mesh = new THREE.Mesh(cylinder, material);
    mesh.scale.set(0.045, direction.length(), 0.045);
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    parent.add(mesh);
  }
  function register(id, group, material) {
    const item = { id, group, material, state: 'unavailable', moving: [] };
    items.set(id, item);
    group.userData.equipment = id;
    group.traverse(object => {
      if (object.isMesh && !object.isInstancedMesh) pickTargets.push(object);
    });
    return item;
  }
  function label(text, x, y, z, width = 2.3, compact = false) {
    const surface = document.createElement('canvas');
    surface.width = compact ? 96 : 192;
    surface.height = compact ? 48 : 80;
    const context = surface.getContext('2d');
    context.fillStyle = '#fcfff9';
    context.fillRect(0, 0, surface.width, surface.height);
    context.strokeStyle = '#c3d6ca';
    context.lineWidth = 4;
    context.strokeRect(2, 2, surface.width - 4, surface.height - 4);
    context.fillStyle = '#244b3b';
    context.font = '700 43px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, surface.width / 2, surface.height / 2 + 2);
    const texture = new THREE.CanvasTexture(surface);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
    sprite.position.set(x, y, z);
    sprite.scale.set(width, width * surface.height / surface.width, 1);
    house.add(sprite);
    return sprite;
  }

  // Open roof and low cutaway walls reproduce the building in the reference image.
  box(house, mat.concrete, [18.7, 0.4, 46], [0, -0.38, 0]);
  box(house, mat.floor, [16, 0.14, 43], [0, -0.08, 0]);
  box(house, mat.wall, [0.28, 1.05, 43], [-8.1, 0.5, 0]);
  box(house, mat.wall, [0.28, 1.05, 43], [8.1, 0.5, 0]);
  const endWall = box(house, mat.wall, [16.5, 5.9, 0.28], [0, 2.85, -21.5]);
  box(house, mat.wall, [16.5, 0.8, 0.28], [0, 0.35, 21.5]);
  const endCap = box(house, mat.edge, [16.9, 0.18, 0.55], [0, 5.9, -21.5]);
  const gable = new THREE.Shape();
  gable.moveTo(-8.2, 0);
  gable.lineTo(0, 2.2);
  gable.lineTo(8.2, 0);
  gable.closePath();
  const gableGeometry = new THREE.ShapeGeometry(gable);
  extraGeometries.push(gableGeometry);
  const gableMesh = new THREE.Mesh(gableGeometry, standard(0xe8ece6, { side: THREE.DoubleSide }));
  gableMesh.position.set(0, 5.86, -21.5);
  house.add(gableMesh);
  const fanWallObjects = new Set([endWall, endCap, gableMesh]);
  for (let z = -18; z <= 18; z += 6) {
    for (const x of [-8.1, 8.1]) {
      box(house, mat.edge, [0.35, 1.5, 0.35], [x, 0.7, z]);
      box(house, mat.pipe, [0.045, 0.3, 0.75], [x * 0.985, 1.1, z + 2]);
    }
  }
  // Entry room and the two side pad enclosures.
  box(house, mat.floor, [4, 0.14, 3.7], [0, -0.04, 23.4]);
  box(house, mat.wall, [0.22, 2.1, 3.7], [-2, 1, 23.4]);
  box(house, mat.wall, [0.22, 2.1, 3.7], [2, 1, 23.4]);
  box(house, mat.edge, [2, 0.12, 0.6], [0, 0.02, 25.5]);
  box(house, mat.dark, [1.15, 1.7, 0.08], [0, 0.85, 21.3]);
  label('ELMAJD', 0, 1.1, 24, 3.2);

  // Two horizontal fans on either side of a central 2 x 2 group.
  const fanRing = new THREE.TorusGeometry(0.75, 0.065, 6, 24);
  const fanDisk = new THREE.CircleGeometry(0.75, 24);
  const blade = new THREE.Shape();
  blade.moveTo(0, 0.12);
  blade.bezierCurveTo(-0.28, 0.34, -0.38, 0.72, -0.05, 0.69);
  blade.bezierCurveTo(0.28, 0.64, 0.36, 0.25, 0.08, 0.07);
  blade.closePath();
  const bladeGeometry = new THREE.ShapeGeometry(blade);
  extraGeometries.push(fanRing, fanDisk, bladeGeometry);
  const fanPositions = [
    [-6.5, 2], [-4.2, 2],
    [-1.2, 2], [1.2, 2], [-1.2, 4.55], [1.2, 4.55],
    [4.2, 2], [6.5, 2],
  ];
  fanPositions.forEach(([x, y], index) => {
    const group = new THREE.Group();
    group.position.set(x, y, -21.14);
    house.add(group);
    const material = standard(0x91a29c, { side: THREE.DoubleSide, metalness: 0.45 });
    box(group, mat.edge, [1.85, 1.85, 0.22], [0, 0, 0]);
    const disk = new THREE.Mesh(fanDisk, mat.dark);
    disk.position.z = 0.13;
    group.add(disk);
    const ring = new THREE.Mesh(fanRing, material);
    ring.position.z = 0.15;
    group.add(ring);
    const rotor = new THREE.Group();
    rotor.position.z = 0.2;
    for (let i = 0; i < 4; i++) {
      const mesh = new THREE.Mesh(bladeGeometry, material);
      mesh.rotation.z = i * Math.PI / 2;
      rotor.add(mesh);
    }
    const hub = new THREE.Mesh(sphere, mat.edge);
    hub.scale.set(0.15, 0.15, 0.1);
    rotor.add(hub);
    group.add(rotor);
    const shutters = new THREE.Group();
    for (let slat = 0; slat < 7; slat++) {
      box(shutters, mat.metal, [1.65, 0.23, 0.08], [0, -0.72 + slat * 0.24, 0.34]);
    }
    shutters.visible = false;
    group.add(shutters);
    const item = register(`fan-${index}`, group, material);
    item.rotor = rotor;
    item.shutters = shutters;
    const badge = label(`V${index + 1}`, x, y - 1.2, -20.8, 1.5, true);
    badge.userData.view = 'fans';
    fanWallObjects.add(group);
    fanWallObjects.add(badge);
  });

  // Cooling pads are physically separate and share the configured I7 auxiliary contact.
  for (let side = 0; side < 2; side++) {
    const group = new THREE.Group();
    const x = side === 0 ? -8.8 : 8.8;
    group.position.set(x, 0, 13.1);
    house.add(group);
    const material = standard(0x9baaa3);
    box(group, mat.concrete, [1.35, 0.22, 9], [0, 0.02, 0]);
    box(group, material, [0.25, 2.85, 8.2], [0, 1.6, 0]);
    for (let z = -4; z <= 4; z += 0.5) box(group, mat.edge, [0.31, 2.95, 0.055], [0, 1.6, z]);
    box(group, mat.pipe, [0.37, 0.15, 8.8], [0, 3.15, 0]);
    box(group, mat.pipe, [0.5, 0.25, 8.8], [0, 0.22, 0]);
    const item = register(`pad-${side}`, group, material);
    for (let z = -3.8; z < 4; z += 0.8) {
      const drop = new THREE.Mesh(sphere, mat.water);
      drop.scale.set(0.075, 0.2, 0.075);
      drop.position.set(side === 0 ? 0.23 : -0.23, 1, z);
      drop.visible = false;
      group.add(drop);
      item.moving.push(drop);
    }
    label(`PAD ${side + 1}`, x, 3.9, 13.1, 2.7).userData.view = 'pads';
  }

  // Rectangular IBC tanks with translucent plastic, steel cages and wooden pallets.
  const tankShell = new RoundedBoxGeometry(1.94, 2.08, 1.94, 2, 0.1);
  const tankWater = new RoundedBoxGeometry(1.82, 1.8, 1.82, 2, 0.08);
  const tankPlastic = standard(0xdde5e0, { transparent: true, opacity: 0.43, depthWrite: false, metalness: 0 });
  const cageMaterial = standard(0x7e8985, { metalness: 0.65, roughness: 0.5 });
  extraGeometries.push(tankShell, tankWater);
  const cageParts = [];
  for (const face of [-1.03, 1.03]) {
    for (let column = 0; column < 5; column++) {
      const cross = -1.03 + column * 0.515;
      cageParts.push({ size: [0.045, 2.2, 0.045], position: [face, 1.46, cross] });
      cageParts.push({ size: [0.045, 2.2, 0.045], position: [cross, 1.46, face] });
    }
    for (let row = 0; row < 6; row++) {
      const y = 0.36 + row * 0.44;
      cageParts.push({ size: [2.1, 0.045, 0.045], position: [0, y, face] });
      cageParts.push({ size: [0.045, 0.045, 2.1], position: [face, y, 0] });
    }
  }
  for (let index = 0; index < 3; index++) {
    const group = new THREE.Group();
    group.position.set(-5.6 + index * 2.7, 0, 19.2);
    house.add(group);
    const indicator = standard(0x99a7a1);
    const shell = new THREE.Mesh(tankShell, tankPlastic);
    shell.position.y = 1.42;
    group.add(shell);
    const contents = new THREE.Mesh(tankWater, standard(0x4db8dc, { transparent: true, opacity: 0.85, metalness: 0 }));
    contents.position.y = 1.3;
    contents.visible = false;
    group.add(contents);
    const cage = new THREE.InstancedMesh(unitBox, cageMaterial, cageParts.length);
    const cageTransform = new THREE.Object3D();
    cageParts.forEach((part, partIndex) => {
      cageTransform.position.set(...part.position);
      cageTransform.scale.set(...part.size);
      cageTransform.updateMatrix();
      cage.setMatrixAt(partIndex, cageTransform.matrix);
    });
    group.add(cage);
    for (const x of [-0.73, 0, 0.73]) box(group, mat.grain, [0.2, 0.18, 2.16], [x, 0.13, 0]);
    for (let board = 0; board < 5; board++) box(group, mat.grain, [2.2, 0.12, 0.35], [0, 0.28, -0.84 + board * 0.42]);
    tube(group, mat.edge, 0.2, 0.1, [0, 2.51, 0]);
    tube(group, indicator, 0.23, 0.07, [0, 2.6, 0]);
    box(group, mat.dark, [0.26, 0.17, 0.25], [0, 0.45, 1.07]);
    box(group, indicator, [0.32, 0.05, 0.08], [0, 0.59, 1.14]);
    const item = register(`cistern-${index}`, group, indicator);
    item.contents = contents;
    label(`C${index + 1}`, group.position.x, 3.4, group.position.z, 1.8, true).userData.view = 'cisterns';
  }

  // Tall corrugated metal silos stand together alongside the egg-depot annex.
  const siloBody = new THREE.CylinderGeometry(1.18, 1.18, 5.2, 32);
  const siloRoof = new THREE.ConeGeometry(1.21, 0.42, 32);
  const siloFunnel = new THREE.CylinderGeometry(1.18, 0.16, 2.3, 32);
  const siloRing = new THREE.TorusGeometry(1.19, 0.035, 6, 32);
  const corrugationRing = new THREE.TorusGeometry(1.185, 0.015, 4, 32);
  const siloMetal = standard(0xb7b5a1, { metalness: 0.65, roughness: 0.58 });
  const corrugationMetal = standard(0x979d8e, { metalness: 0.6, roughness: 0.6 });
  extraGeometries.push(siloBody, siloRoof, siloFunnel, siloRing, corrugationRing);
  for (let index = 0; index < 2; index++) {
    const group = new THREE.Group();
    group.position.set(12.25, 0, 22.6 + index * 4.2);
    house.add(group);
    const indicator = standard(0x99a7a1);
    box(group, mat.concrete, [3.2, 0.28, 3.2], [0, 0.14, 0]);
    const body = new THREE.Mesh(siloBody, siloMetal);
    body.position.y = 5.95;
    group.add(body);
    const corrugation = new THREE.InstancedMesh(corrugationRing, corrugationMetal, 36);
    const ringTransform = new THREE.Object3D();
    ringTransform.rotation.x = Math.PI / 2;
    for (let ringIndex = 0; ringIndex < 36; ringIndex++) {
      ringTransform.position.set(0, 3.42 + ringIndex * 0.144, 0);
      ringTransform.updateMatrix();
      corrugation.setMatrixAt(ringIndex, ringTransform.matrix);
    }
    group.add(corrugation);
    for (const y of [3.35, 8.55]) {
      const ring = new THREE.Mesh(siloRing, mat.metal);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      group.add(ring);
    }
    const funnel = new THREE.Mesh(siloFunnel, siloMetal);
    funnel.position.y = 2.2;
    group.add(funnel);
    const roof = new THREE.Mesh(siloRoof, siloMetal);
    roof.position.y = 8.76;
    group.add(roof);
    tube(group, mat.edge, 0.1, 0.15, [0, 9.02, 0]);
    tube(group, mat.dark, 0.16, 0.25, [0, 0.97, 0]);
    const contents = new THREE.Group();
    box(group, mat.dark, [0.68, 4.4, 0.05], [0, 5.92, 1.19]);
    box(contents, mat.grain, [0.58, 4.1, 0.035], [0, 5.92, 1.225]);
    box(group, mat.dark, [0.05, 4.4, 0.68], [1.19, 5.92, 0]);
    box(contents, mat.grain, [0.035, 4.1, 0.58], [1.225, 5.92, 0]);
    contents.visible = false;
    group.add(contents);
    tube(group, indicator, 0.15, 0.07, [0.55, 3.72, 1.07], true);
    for (const x of [-1.05, 1.05]) {
      for (const z of [-1.05, 1.05]) {
        box(group, mat.metal, [0.12, 3.1, 0.12], [x, 1.85, z]);
        box(group, mat.dark, [0.32, 0.08, 0.32], [x, 0.34, z]);
      }
      brace(group, mat.metal, [x, 0.45, -1.05], [x, 3.33, 1.05]);
      brace(group, mat.metal, [x, 0.45, 1.05], [x, 3.33, -1.05]);
    }
    for (const z of [-1.05, 1.05]) {
      brace(group, mat.metal, [-1.05, 0.45, z], [1.05, 3.33, z]);
      brace(group, mat.metal, [1.05, 0.45, z], [-1.05, 3.33, z]);
    }
    const item = register(`silo-${index}`, group, indicator);
    item.contents = contents;
    label(`S${index + 1}`, group.position.x, 9.7, group.position.z, 1.8, true).userData.view = 'silos';
  }

  // The open-roof egg depot is an annex beside the entrance.
  const depot = new THREE.Group();
  depot.position.set(6.2, 0, 25.2);
  house.add(depot);
  const depotIndicator = standard(0x99a7a1);
  box(depot, mat.floor, [7.5, 0.2, 6.3], [0, 0.04, 0]);
  box(depot, mat.wall, [7.5, 1.35, 0.2], [0, 0.8, -3.05]);
  box(depot, mat.wall, [0.2, 1.35, 6.1], [-3.65, 0.8, 0]);
  box(depot, mat.wall, [0.2, 1.35, 6.1], [3.65, 0.8, 0]);
  box(depot, depotIndicator, [7.5, 0.14, 0.2], [0, 1.52, -3.05]);
  box(depot, depotIndicator, [0.2, 0.14, 6.1], [-3.65, 1.52, 0]);
  box(depot, depotIndicator, [0.2, 0.14, 6.1], [3.65, 1.52, 0]);
  // A transparent selection volume makes the trays and the room easy to tap.
  box(depot, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), [7.3, 3.2, 6.1], [0, 1.7, 0]);
  label('OEUFS', 6.2, 1.2, 28.5, 3.1).userData.view = 'depot';
  for (let pallet = 0; pallet < 12; pallet++) {
    const x = (pallet % 4 - 1.5) * 1.4;
    const z = (Math.floor(pallet / 4) - 1) * 1.6;
    box(depot, mat.grain, [1, 0.13, 1.25], [x, 0.2, z]);
  }
  const maxDisplayTrays = 96;
  const trays = new THREE.InstancedMesh(unitBox, standard(0xb99569), maxDisplayTrays);
  const rims = new THREE.InstancedMesh(unitBox, standard(0xd4b48b), maxDisplayTrays * 4);
  const eggs = new THREE.InstancedMesh(sphere, standard(0xffe8bf, { roughness: 0.9, metalness: 0 }), maxDisplayTrays * 30);
  for (const mesh of [trays, rims, eggs]) {
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    depot.add(mesh);
  }
  register('egg-depot', depot, depotIndicator);
  const inventoryTransform = new THREE.Object3D();
  function instance(mesh, index, position, scale) {
    inventoryTransform.position.set(...position);
    inventoryTransform.scale.set(...scale);
    inventoryTransform.updateMatrix();
    mesh.setMatrixAt(index, inventoryTransform.matrix);
  }
  function updateInventory(reading) {
    const item = items.get('egg-depot');
    item.state = reading.status;
    const color = { stored: 0xc69a48, empty: 0x7fa995, overflow: 0xdc7c35, unavailable: 0x99a7a1 };
    item.material.color.setHex(color[reading.status] ?? color.unavailable);
    let visibleTrays = 0;
    if (reading.available && reading.stock > 0) {
      const slots = Math.min(maxDisplayTrays, Math.max(1, reading.capacityTrays));
      visibleTrays = Math.min(maxDisplayTrays, reading.trays, Math.max(1, Math.ceil(reading.fill * slots)));
    }
    let eggCount = 0;
    for (let tray = 0; tray < visibleTrays; tray++) {
      const pallet = tray % 12;
      const layer = Math.floor(tray / 12);
      const x = (pallet % 4 - 1.5) * 1.4;
      const z = (Math.floor(pallet / 4) - 1) * 1.6;
      const y = 0.36 + layer * 0.31;
      instance(trays, tray, [x, y, z], [0.88, 0.08, 1.08]);
      instance(rims, tray * 4, [x - 0.43, y + 0.07, z], [0.045, 0.12, 1.08]);
      instance(rims, tray * 4 + 1, [x + 0.43, y + 0.07, z], [0.045, 0.12, 1.08]);
      instance(rims, tray * 4 + 2, [x, y + 0.07, z - 0.52], [0.88, 0.12, 0.045]);
      instance(rims, tray * 4 + 3, [x, y + 0.07, z + 0.52], [0.88, 0.12, 0.045]);
      const actualPartialTray = visibleTrays === reading.trays && tray === visibleTrays - 1 && reading.stock % 30 !== 0;
      const contents = actualPartialTray ? reading.stock % 30 : 30;
      for (let egg = 0; egg < contents; egg++) {
        instance(eggs, eggCount++, [x + (egg % 5 - 2) * 0.15, y + 0.14, z + (Math.floor(egg / 5) - 2.5) * 0.16], [0.061, 0.093, 0.061]);
      }
    }
    trays.count = visibleTrays;
    rims.count = visibleTrays * 4;
    eggs.count = eggCount;
    for (const mesh of [trays, rims, eggs]) mesh.instanceMatrix.needsUpdate = true;
    dirty = true;
  }

  const wireSurface = document.createElement('canvas');
  wireSurface.width = wireSurface.height = 64;
  const wireContext = wireSurface.getContext('2d');
  wireContext.strokeStyle = '#83948d';
  wireContext.lineWidth = 2;
  wireContext.strokeRect(1, 1, 62, 62);
  const wireTexture = new THREE.CanvasTexture(wireSurface);
  wireTexture.wrapS = wireTexture.wrapT = THREE.RepeatWrapping;
  wireTexture.repeat.set(64, 3);
  const wireMaterial = new THREE.MeshStandardMaterial({
    map: wireTexture, transparent: true, side: THREE.DoubleSide, roughness: 0.55,
    depthWrite: false, alphaTest: 0.1,
  });
  const fenceGeometry = new THREE.PlaneGeometry(32.4, 0.93);
  extraGeometries.push(fenceGeometry);
  const henPositions = [];
  const rowXs = [-5.5, -1.85, 1.85, 5.5];
  rowXs.forEach((x, row) => {
    for (const z of [-16.8, -8.4, 0, 8.4, 16.8]) {
      for (const dx of [-0.94, 0.94]) box(house, mat.metal, [0.09, 4.6, 0.12], [x + dx, 2.3, z]);
    }
    for (let level = 0; level < 3; level++) {
      const y = 0.95 + level * 1.32;
      box(house, mat.tray, [2.08, 0.12, 33.4], [x, y - 0.25, 0]);
      box(house, mat.metal, [2.08, 0.08, 33.4], [x, y + 0.8, 0]);
      for (const side of [-1, 1]) {
        const fence = new THREE.Mesh(fenceGeometry, wireMaterial);
        fence.position.set(x + side * 0.97, y + 0.28, 0);
        fence.rotation.y = Math.PI / 2;
        house.add(fence);
        box(house, mat.metal, [0.08, 0.09, 33.5], [x + side * 1.02, y + 0.3, 0]);
      }
      const group = new THREE.Group();
      group.position.set(x + 1.17, y - 0.08, 0);
      house.add(group);
      const material = standard(0x91a29c);
      box(group, material, [0.3, 0.17, 33.4], [0, 0, 0]);
      for (const side of [-1, 1]) box(group, mat.metal, [0.04, 0.14, 33.4], [side * 0.17, 0.08, 0]);
      box(group, mat.grain, [0.18, 0.035, 32.8], [0, 0.09, 0]);
      const item = register(`feed-${row * 3 + level}`, group, material);
      for (let segment = 0; segment < 16; segment++) {
        const marker = box(group, material, [0.3, 0.09, 0.22], [0, 0.15, segment * 2.05 - 16]);
        item.moving.push(marker);
      }
      // Model hens in instanced batches, keeping rendering practical on phones.
      for (let bird = 0; bird < 22; bird++) {
        henPositions.push({ x, y: y + 0.05, z: -15.5 + bird * 1.45, side: bird % 2 === 0 ? 1 : -1 });
      }
    }
    label(`R${row + 1}`, x, 0.65, 18.5, 2.4);
  });
  function henPart(material, scale, offset) {
    const instances = new THREE.InstancedMesh(sphere, material, henPositions.length);
    const transform = new THREE.Object3D();
    henPositions.forEach((bird, index) => {
      transform.position.set(bird.x + offset[0] * bird.side, bird.y + offset[1], bird.z + offset[2]);
      transform.scale.set(...scale);
      transform.updateMatrix();
      instances.setMatrixAt(index, transform.matrix);
    });
    house.add(instances);
  }
  henPart(standard(0xa46332), [0.34, 0.31, 0.43], [0, 0.22, 0]);
  henPart(standard(0xc58a4c), [0.15, 0.2, 0.17], [0.38, 0.53, 0.1]);
  henPart(standard(0xb84132), [0.07, 0.12, 0.12], [0.38, 0.72, 0.1]);

  const selectionBox = new THREE.Box3Helper(new THREE.Box3(), 0xe8a543);
  selectionBox.visible = false;
  scene.add(selectionBox);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let pressed;
  let active = false;
  let animationId = 0;
  let dirty = true;
  let previousTime = 0;
  let destroyed = false;
  let contextLost = false;
  let activeView = 'overview';
  let selectedId;
  let viewportWidth = 0;
  let viewportHeight = 0;
  let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const colors = { running: 0x15a77b, stopped: 0xd65c59, unavailable: 0x99a7a1 };

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    if (width === viewportWidth && height === viewportHeight) return;
    viewportWidth = width;
    viewportHeight = height;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (activeView === 'fans') fitFanWall();
    dirty = true;
  }
  function fitFanWall() {
    // Fit the complete wall, including its gable, to the current phone orientation.
    const halfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const distance = Math.max(8.8 / (halfFov * camera.aspect), 4.4 / halfFov) * 1.1;
    camera.position.set(0, 3.65, -21.1 + distance);
    controls.target.set(0, 3.65, -21.1);
    controls.update();
    dirty = true;
  }
  function preset(view) {
    activeView = view;
    const focusedLabels = ['pads', 'cisterns', 'silos', 'depot'].includes(view);
    house.children.forEach(object => {
      object.visible = view !== 'fans' || fanWallObjects.has(object);
      if (focusedLabels && object.isSprite) object.visible = object.userData.view === view;
    });
    selectionBox.visible = !!selectedId && (view !== 'fans' || selectedId.startsWith('fan-'));
    if (view === 'fans') { fitFanWall(); return; }
    const narrow = canvas.clientWidth < 500;
    const positions = {
      overview: narrow ? [39, 39, 59] : [32, 29, 45],
      top: narrow ? [0, 74, 2] : [0, 61, 2],
      pads: narrow ? [27, 17, 40] : [22, 14, 33],
      cisterns: [-9, 10, 33],
      silos: [29, 14, 34],
      depot: [-5, 11, 39],
    };
    const targets = { overview: [0, 1.6, 0], top: [0, 1.6, 0], pads: [0, 1.6, 13],
      cisterns: [-2.9, 1.3, 19.2], silos: [12.25, 4.5, 24.7], depot: [6.2, 1.3, 25.2] };
    camera.position.set(...(positions[view] || positions.overview));
    controls.target.set(...(targets[view] || targets.overview));
    controls.update();
    dirty = true;
  }
  function select(id, focus = false) {
    selectedId = id;
    const item = items.get(id);
    selectionBox.visible = !!item;
    if (item) {
      house.updateMatrixWorld(true);
      selectionBox.box.setFromObject(item.group).expandByScalar(0.16);
      if (focus) {
        const center = new THREE.Vector3();
        selectionBox.box.getCenter(center);
        controls.target.copy(center);
        if (id.startsWith('fan')) camera.position.copy(center).add(new THREE.Vector3(1, 2, 9));
        else if (id.startsWith('pad')) camera.position.copy(center).add(new THREE.Vector3(id === 'pad-0' ? -10 : 10, 7, 12));
        else if (id.startsWith('cistern')) camera.position.copy(center).add(new THREE.Vector3(5, 4, 6));
        else if (id.startsWith('silo')) camera.position.copy(center).add(new THREE.Vector3(7, 6, 9));
        else if (id === 'egg-depot') camera.position.copy(center).add(new THREE.Vector3(-9, 8, 11));
        else camera.position.copy(center).add(new THREE.Vector3(13, 12, 23));
        controls.update();
      }
    }
    dirty = true;
  }
  function pick(event) {
    if (!pressed || Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) > 7) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    camera.updateMatrixWorld();
    house.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    const targets = pickTargets.filter(mesh => {
      let object = mesh;
      while (object && object !== house) {
        if (!object.visible) return false;
        object = object.parent;
      }
      return true;
    });
    const hit = raycaster.intersectObjects(targets, false)[0];
    let object = hit?.object;
    while (object && !object.userData.equipment) object = object.parent;
    if (object) onSelect(object.userData.equipment);
    pressed = null;
  }
  const pointerDown = event => { pressed = { x: event.clientX, y: event.clientY }; };
  const change = () => { dirty = true; };
  const lost = event => {
    event.preventDefault();
    contextLost = true;
    cancelAnimationFrame(animationId);
    animationId = 0;
    onFailure();
  };
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointerup', pick);
  canvas.addEventListener('webglcontextlost', lost);
  controls.addEventListener('change', change);
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  const motionChange = event => { reducedMotion = event.matches; dirty = true; };
  motionQuery.addEventListener('change', motionChange);

  function frame(now) {
    if (!active || destroyed || contextLost) { animationId = 0; return; }
    animationId = requestAnimationFrame(frame);
    if (now - previousTime < 1000 / 24) return;
    const delta = Math.min((now - previousTime) / 1000, 0.1);
    previousTime = now;
    let moving = false;
    if (!reducedMotion) {
      for (const item of items.values()) {
        if (item.state !== 'running' || (!item.rotor && !item.moving.length)) continue;
        moving = true;
        if (item.rotor) item.rotor.rotation.z -= delta * 4;
        item.moving.forEach((part, index) => {
          if (item.id.startsWith('pad')) part.position.y = 2.85 - ((now / 750 + index * 0.28) % 2.55);
          else part.position.z = ((now / 1400 + index * 2.05) % 32.8) - 16.4;
        });
      }
    }
    if (dirty || moving) {
      renderer.render(scene, camera);
      dirty = false;
    }
  }
  resize();
  preset('overview');
  return {
    setActive(value) {
      active = !!value;
      if (!active) { cancelAnimationFrame(animationId); animationId = 0; return; }
      resize();
      dirty = true;
      if (!animationId && !contextLost) animationId = requestAnimationFrame(frame);
    },
    update(statuses) {
      for (const [id, status] of Object.entries(statuses)) {
        const item = items.get(id);
        if (!item || id === 'egg-depot') continue;
        item.state = status;
        if (item.shutters) {
          item.shutters.visible = status === 'stopped';
          item.rotor.visible = status !== 'stopped';
        }
        const coolingActive = id.startsWith('pad') && status === 'running';
        item.material.color.setHex(coolingActive ? 0x299ed1 : colors[status] ?? colors.unavailable);
        item.material.emissive.setHex(status === 'running' ? coolingActive ? 0x073d5c : 0x064632 : 0x000000);
        item.material.emissiveIntensity = 0.2;
        if (id.startsWith('pad')) item.moving.forEach(part => { part.visible = status === 'running'; });
        if (item.contents) item.contents.visible = status === 'running';
      }
      dirty = true;
    },
    preset,
    select,
    updateInventory,
    zoom(factor) {
      const offset = camera.position.clone().sub(controls.target);
      offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance));
      camera.position.copy(controls.target).add(offset);
      controls.update();
      dirty = true;
    },
    rotate(angle) {
      const offset = camera.position.clone().sub(controls.target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      camera.position.copy(controls.target).add(offset);
      controls.update();
      dirty = true;
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(animationId);
      observer.disconnect();
      controls.dispose();
      motionQuery.removeEventListener('change', motionChange);
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointerup', pick);
      canvas.removeEventListener('webglcontextlost', lost);
      const geometries = new Set(extraGeometries);
      const materials = new Set();
      const textures = new Set();
      scene.traverse(object => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) materials.add(object.material);
      });
      materials.forEach(material => { if (material.map) textures.add(material.map); material.dispose(); });
      textures.forEach(texture => texture.dispose());
      geometries.forEach(geometry => geometry.dispose());
      renderer.dispose();
    },
  };
};
