import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const stage = document.getElementById('mvStage');
const LABELS = { all: 'Complete Assembly', sock: 'Removable Inner Sock', clog: 'Outer Clog' };
const ORDER = ['all', 'sock', 'clog'];
const $ = id => document.getElementById(id);

function fail(err){ console.error(err); $('mvLoading').classList.add('done'); $('mvError').style.display='flex'; }

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
} catch (e) { fail(e); }

if (renderer) init();

function init(){
  let visible = true, needs = true, running = false, last = performance.now();
  let interacted = false, pendingSwitch = null, fades = [], fadeT = 1, anim = null;
  // Quality settings: full-res on HiDPI/Windows scaling (125–200%), capped at 2x for performance.
  const DPR = () => Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;

  const camera = new THREE.PerspectiveCamera(30, 16/9, 0.01, 100);

  // Lights: soft key light with shadow + gentle fill/rim
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(2.5, 4, 3);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 6;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  const sc = key.shadow.camera; sc.left = -1; sc.right = 1; sc.top = 1; sc.bottom = -1; sc.near = 0.5; sc.far = 12;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xfff4e8, 0.9); rim.position.set(-3, 2, -3); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d4cc, 0.5));

  // Ground shadow catcher
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: 0.16 }));
  ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; scene.add(ground);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.8;
  controls.zoomSpeed = 0.9;
  controls.panSpeed = 0.8;
  controls.screenSpacePanning = true;
  controls.autoRotateSpeed = 1.6;
  controls.maxPolarAngle = Math.PI * 0.62; // allow a peek below the outsole without flipping
  controls.keys = { LEFT: 'ArrowLeft', UP: 'ArrowUp', RIGHT: 'ArrowRight', BOTTOM: 'ArrowDown' };
  controls.listenToKeyEvents(stage);

  const root = new THREE.Group(); scene.add(root);
  const models = {};
  let current = 'all', fitRadius = 1, center = new THREE.Vector3();

  // ---------- Loading embedded GLBs ----------
  const loader = new GLTFLoader();
  const sources = window.MV_SOURCES; // {all: url|ArrayBuffer-promise, ...}
  let loadedCount = 0;
  const bar = $('mvBar');
  const setProgress = p => bar.style.width = Math.round(p*100) + '%';

  async function getBuffer(src){
    if (src instanceof ArrayBuffer) return src;
    const r = await fetch(src);
    if (!r.ok) throw new Error('Could not load ' + src + ' (' + r.status + ')');
    return r.arrayBuffer();
  }
  function prepare(gltf){
    const obj = gltf.scene;
    obj.traverse(o => {
      if (o.isMesh){
        o.castShadow = true; o.receiveShadow = true;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach(m => { m.envMapIntensity = 1; if (m.map) m.map.anisotropy = renderer.capabilities.getMaxAnisotropy(); if (m.normalMap) m.normalMap.anisotropy = renderer.capabilities.getMaxAnisotropy(); if (m.sheen > 0 && m.sheenColor) m.sheenColor.multiplyScalar(0.3); m.userData.baseOpacity = m.opacity; m.userData.baseTransparent = m.transparent; });
      }
    });
    return obj;
  }
  async function load(name){
    const buf = await getBuffer(sources[name]);
    const gltf = await loader.parseAsync(buf, '');
    const obj = prepare(gltf);
    models[name] = obj; obj.visible = false; root.add(obj);
    loadedCount++; setProgress(loadedCount/3);
    return obj;
  }

  // Load ALL first so it shows ASAP, then the parts in the background.
  load('all').then(obj => {
    // Normalize: shared transform for all three (they share a coordinate system)
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const s = 1 / Math.max(size.x, size.y, size.z);
    root.scale.setScalar(s);
    box.getCenter(center);
    root.position.set(-center.x*s, -box.min.y*s, -center.z*s);
    root.updateMatrixWorld(true);
    obj.visible = true; setOpacity(obj, 1);
    frame('all', false);
    $('mvLoading').classList.add('done');
    requestRender();
    return Promise.all([load('sock'), load('clog')]);
  }).then(() => { if (pendingSwitch){ const p = pendingSwitch; pendingSwitch = null; show(p); } })
    .catch(fail);

  // ---------- Camera framing ----------
  const HOME_DIR = new THREE.Vector3(1.0, 0.5, -0.8).normalize(); // 3/4 front view
  function boundsOf(name){
    const box = new THREE.Box3().setFromObject(models[name] || models.all, true);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    return { box, sphere };
  }
  function distanceFor(radius){
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2*Math.atan(Math.tan(vFov/2)*camera.aspect);
    const fov = Math.min(vFov, hFov);
    return (radius / Math.sin(fov/2)) * 1.08;
  }
  function frame(name, animate = true, keepDirection = false){
    const { sphere } = boundsOf(name);
    fitRadius = sphere.radius;
    const dir = keepDirection ? camera.position.clone().sub(controls.target).normalize() : HOME_DIR.clone();
    const dist = distanceFor(sphere.radius);
    const toTarget = sphere.center.clone();
    const toPos = toTarget.clone().add(dir.multiplyScalar(dist));
    controls.minDistance = sphere.radius * 1.15;
    controls.maxDistance = dist * 3;
    if (!animate){ controls.target.copy(toTarget); camera.position.copy(toPos); controls.update(); return; }
    anim = { t: 0, dur: 0.7, fromT: controls.target.clone(), toT: toTarget, fromP: camera.position.clone(), toP: toPos };
    requestRender();
  }

  // ---------- Switching with crossfade ----------
  function setOpacity(obj, a){
    obj.traverse(o => { if (o.isMesh){ (Array.isArray(o.material)?o.material:[o.material]).forEach(m => {
      const fading = a < 0.999;
      m.transparent = fading || m.userData.baseTransparent; m.opacity = (m.userData.baseOpacity ?? 1) * a; m.depthWrite = !fading || a > 0.5; m.needsUpdate = true; }); o.castShadow = a > 0.5; } });
  }
  function show(name){
    document.querySelectorAll('.mv-tab').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.model === name)));
    $('mvLabel').innerHTML = 'Viewing: <b>' + LABELS[name] + '</b>';
    if (!models[name]){ pendingSwitch = name; $('mvLoading').classList.remove('done'); return; }
    $('mvLoading').classList.add('done');
    if (name === current) { frame(name, true, true); return; }
    const from = models[current], to = models[name];
    current = name;
    to.visible = true;
    fades = [{ obj: to, from: 0, to: 1 }, { obj: from, from: 1, to: 0 }];
    fadeT = 0;
    setOpacity(to, 0);
    frame(name, true, true);
    requestRender();
  }

  document.querySelectorAll('.mv-tab').forEach(b => b.addEventListener('click', () => show(b.dataset.model)));
  stage.addEventListener('keydown', e => {
    if (e.key === '1' || e.key === '2' || e.key === '3') show(ORDER[+e.key - 1]);
    if (e.key === 'r' || e.key === 'R') frame(current, true);
    if (e.key === 'f' || e.key === 'F') toggleFull();
    requestRender();
  });
  renderer.domElement.addEventListener('dblclick', () => frame(current, true));
  $('mvReset').addEventListener('click', () => frame(current, true));
  const rotBtn = $('mvRotate');
  rotBtn.addEventListener('click', () => { controls.autoRotate = !controls.autoRotate; rotBtn.setAttribute('aria-pressed', String(controls.autoRotate)); requestRender(); });
  function toggleFull(){
    if (document.fullscreenElement) document.exitFullscreen();
    else if (stage.requestFullscreen) stage.requestFullscreen().catch(()=>{});
    else if (stage.webkitRequestFullscreen) stage.webkitRequestFullscreen();
  }
  $('mvFull').addEventListener('click', toggleFull);

  // Hide the hint after first interaction
  controls.addEventListener('start', () => { stage.classList.add('grabbing'); if (!interacted){ interacted = true; setTimeout(()=>$('mvHint').style.opacity = '0', 1500); } if (anim) anim = null; });
  controls.addEventListener('end', () => stage.classList.remove('grabbing'));
  controls.addEventListener('change', requestRender);

  // ---------- Resize ----------
  function resize(){
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(DPR());
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (models[current] && !interacted) frame(current, false, true);
    requestRender();
  }
  new ResizeObserver(resize).observe(stage);
  window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener?.('change', resize);
  resize();

  // ---------- Render loop: only while something is changing & visible ----------
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) requestRender(); }, { rootMargin: '100px' }).observe(stage);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) requestRender(); });
  function requestRender(){ needs = true; if (!running){ running = true; last = performance.now(); requestAnimationFrame(tick); } }
  const ease = t => t<.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
  function tick(now){
    const dt = Math.min((now - last)/1000, 0.05); last = now;
    let busy = false;
    if (anim){
      anim.t += dt / anim.dur; const k = ease(Math.min(anim.t, 1));
      controls.target.lerpVectors(anim.fromT, anim.toT, k);
      camera.position.lerpVectors(anim.fromP, anim.toP, k);
      if (anim.t >= 1) anim = null; busy = true;
    }
    if (fadeT < 1){
      fadeT = Math.min(fadeT + dt/0.45, 1); const k = ease(fadeT);
      fades.forEach(f => setOpacity(f.obj, f.from + (f.to - f.from)*k));
      if (fadeT >= 1) fades.forEach(f => { if (f.to === 0) f.obj.visible = false; else setOpacity(f.obj, 1); });
      busy = true;
    }
    const moved = controls.update(dt);
    if (controls.autoRotate) busy = true;
    if (visible && (needs || busy || moved)) { renderer.render(scene, camera); needs = false; }
    if (busy || moved || needs) requestAnimationFrame(tick); else running = false;
  }

  // Recover from GPU context loss (e.g. driver reset on Windows)
  renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); });
  renderer.domElement.addEventListener('webglcontextrestored', () => requestRender());
}
