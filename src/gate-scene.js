import * as THREE from "./vendor/three.mjs";
const landscapeUrl = new URL("./assets/mountain-world.webp", import.meta.url).href;
const travelerUrl = new URL("./assets/traveler.webp", import.meta.url).href;
import { TravelerRig } from "./traveler.js";
const clamp = (v) => Math.max(0, Math.min(1, v));
const smooth = (a, b, v) => {
  const x = clamp((v - a) / (b - a));
  return x * x * (3 - 2 * x);
};
function surface(kind) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = kind === "wood" ? "#805d3d" : "#807b63";
  ctx.fillRect(0, 0, 512, 512);
  const pixels = ctx.getImageData(0, 0, 512, 512);
  let seed = 2871;
  const random = () => {
    seed = seed * 1664525 + 1013904223 >>> 0;
    return seed / 4294967296;
  };
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const i = (y * 512 + x) * 4, grain = kind === "wood" ? Math.sin(x * 0.3 + Math.sin(y * 0.017) * 3 + Math.sin(y * 0.053) * 0.4) * 12 : Math.sin(x * 0.06 + y * 0.027) * 7;
    const n = (random() - 0.5) * 35 + grain;
    for (let k = 0; k < 3; k++) pixels.data[i + k] += n;
  }
  ctx.putImageData(pixels, 0, 0);
  if (kind === "wood") for (let i = 0; i < 390; i++) {
    const x = random() * 512;
    ctx.strokeStyle = `rgba(14,10,5,${0.05 + random() * 0.28})`;
    ctx.lineWidth = 0.4 + random() * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    for (let y = 0; y <= 512; y += 8) ctx.lineTo(x + Math.sin(y * 0.018 + i) * 2 + Math.sin(y * 0.051) * 0.7, y);
    ctx.stroke();
  }
  else for (let i = 0; i < 1100; i++) {
    ctx.fillStyle = i % 3 === 0 ? "#34413233" : "#14120c22";
    const x = random() * 512, y = random() * 512, r = random() * 8;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.3, random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}
class GateScene {
  constructor(host) {
    this.host = host;
    this.renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.3));
    this.renderer.setClearColor(1512718);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    host.prepend(this.renderer.domElement);
    this.scene.fog = new THREE.FogExp2(2695961, 0.013);
    this.camera.position.set(-0.2, 3.4, 13.5);
    this.camera.lookAt(0, 3.2, 0);
    const wood = surface("wood"), stone = surface("stone");
    this.textures.push(wood, stone);
    const woodMat = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.96, color: 12692102 });
    const stoneMat = new THREE.MeshStandardMaterial({ map: stone, roughness: 1, color: 9209708 });
    const bronze = new THREE.MeshStandardMaterial({ color: 6705452, roughness: 0.82, metalness: 0.55 });
    const dark = new THREE.MeshStandardMaterial({ map: stone, color: 3750188, roughness: 1 });
    this.mats.push(woodMat, stoneMat, bronze, dark);
    const box = (w, h, d, x, y, z, mat, parent = this.scene) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      parent.add(m);
      return m;
    };
    box(23, 30, 1, -14, 3.6, -0.7, dark);
    box(23, 30, 1, 14, 3.6, -0.7, dark);
    box(8, 16, 1, 0, 15.1, -0.7, dark);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const block = box(0.84, 1.37, 1.12, side * 2.48, 0.67 + i * 1.38, -0.12, stoneMat);
        block.rotation.z = side * (i % 2 ? 6e-3 : -8e-3);
      }
      box(1.14, 0.36, 1.45, side * 2.48, 0.05, 0, stoneMat);
      box(1.06, 0.28, 1.3, side * 2.48, 6.87, -0.1, stoneMat);
    }
    box(6.18, 0.67, 1.2, 0, 7.16, -0.12, stoneMat);
    box(6.65, 0.22, 1.47, 0, 7.55, -0.14, woodMat);
    box(4.25, 0.24, 1.1, 0, -0.02, 0.02, stoneMat);
    this.left.position.x = -2.06;
    this.right.position.x = 2.06;
    this.scene.add(this.left, this.right);
    [this.left, this.right].forEach((leaf, index) => {
      const side = index === 0 ? 1 : -1;
      for (let i = 0; i < 7; i++) {
        const board = box(0.286, 6.55, 0.27, side * (0.17 + i * 0.292), 3.33, 0, woodMat, leaf);
        board.rotation.z = i % 2 ? 1e-3 : -15e-4;
      }
      for (const y of [0.63, 3, 5.96]) {
        box(2.04, 0.19, 0.13, side * 1.03, y, 0.19, woodMat, leaf);
        for (let i = 0; i < 5; i++) {
          const nail = new THREE.Mesh(new THREE.SphereGeometry(0.036, 6, 5), bronze);
          nail.scale.z = 0.4;
          nail.position.set(side * (0.2 + i * 0.4), y, 0.28);
          leaf.add(nail);
        }
      }
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.055, 12), bronze);
      plate.rotation.x = Math.PI / 2;
      plate.position.set(side * 1.58, 3.11, 0.21);
      leaf.add(plate);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.031, 8, 24), bronze);
      ring.position.set(side * 1.58, 2.94, 0.31);
      leaf.add(ring);
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 38, 1, 1), new THREE.MeshStandardMaterial({ map: stone, roughness: 1, color: 4539188 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -0.17, 19);
    this.scene.add(floor);
    this.mats.push(floor.material);
    for (let i = 0; i < 8; i++) box(4.4, 0.035, 0.8, i % 2 * 0.13 - 0.06, -0.13, 1 + i * 1.1, stoneMat);
    const manager = new THREE.LoadingManager(() => {
      this.loaded = true;
    });
    const loader = new THREE.TextureLoader(manager);
    const landscape = loader.load(landscapeUrl);
    landscape.colorSpace = THREE.SRGBColorSpace;
    this.textures.push(landscape);
    const worldMat = new THREE.MeshBasicMaterial({ map: landscape, fog: false });
    this.mats.push(worldMat);
    const world = new THREE.Mesh(new THREE.PlaneGeometry(70, 39.4), worldMat);
    world.position.set(0, 7.5, -32);
    this.scene.add(world);
    const person = loader.load(travelerUrl);
    person.colorSpace = THREE.SRGBColorSpace;
    this.textures.push(person);
    this.figure = new TravelerRig(person);
    this.scene.add(this.figure.root);
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = shadowCanvas.height = 128;
    const shadowCtx = shadowCanvas.getContext("2d"), gradient = shadowCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "#080604b0");
    gradient.addColorStop(1, "#08060400");
    shadowCtx.fillStyle = gradient;
    shadowCtx.fillRect(0, 0, 128, 128);
    const shadowMap = new THREE.CanvasTexture(shadowCanvas);
    this.textures.push(shadowMap);
    const shadowMat = new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false });
    this.mats.push(shadowMat);
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.2), shadowMat);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = -0.1;
    this.scene.add(this.shadow);
    this.scene.add(new THREE.AmbientLight(12166785, 0.95));
    const front = new THREE.DirectionalLight(14072193, 2.3);
    front.position.set(-4, 7, 9);
    this.scene.add(front);
    const back = new THREE.PointLight(16766091, 70, 25, 2);
    back.position.set(0, 3, -2);
    this.scene.add(back);
    this.buildBeams();
    this.buildParticles();
    this.buildCurrents();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
  }
  host;
  renderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(44, 1, 0.1, 110);
  left = new THREE.Group();
  right = new THREE.Group();
  figure;
  beams = new THREE.Group();
  observer;
  textures = [];
  mats = [];
  loaded = false;
  frames = 0;
  get ready() {
    return this.loaded && this.frames > 2;
  }
  shadow;
  uniforms = { uTime: { value: 0 }, uBurst: { value: 0 }, uPixel: { value: 1 } };
  buildBeams() {
    for (let i = 0; i < 5; i++) {
      const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, uniforms: { uGlow: { value: 0 } }, vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`, fragmentShader: `varying vec2 vUv;uniform float uGlow;void main(){float x=abs(vUv.x-.5)*2.;float ray=pow(max(0.,1.-x),3.5)*sin(vUv.y*3.14159);gl_FragColor=vec4(.91,.69,.32,ray*uGlow);}` });
      this.mats.push(mat);
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.18 + i * 0.6, 14), mat);
      plane.position.set((i - 2) * 0.2, 3.3, 1 + i * 0.15);
      plane.rotation.z = (i - 2) * 0.16;
      this.beams.add(plane);
    }
    this.scene.add(this.beams);
  }
  buildParticles() {
    const count = innerWidth < 700 ? 3800 : 1e4, p = new Float32Array(count * 3), seeds = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p.set([0, 0, 0], i * 3);
      seeds.set([Math.random(), Math.random(), Math.random()], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 3));
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, uniforms: this.uniforms, vertexShader: `attribute vec3 aSeed;uniform float uTime,uBurst,uPixel;varying float vAlpha;varying vec3 vColor;void main(){float angle=aSeed.x*31.4159+uTime*(.18+aSeed.z*.3);float r=.025+(aSeed.y*1.1)*uBurst*8.;float z=-2.+fract(aSeed.z+uTime*.09)*15.*uBurst;vec3 p=vec3(sin(angle)*r,mix(aSeed.y*6.5,3.1+cos(angle+uTime*.18)*r*.66,uBurst),z);p.x+=sin(p.y*.8+uTime)*uBurst;vAlpha=(.025+uBurst*.8)*(.3+.7*aSeed.y);vColor=mix(vec3(.95,.66,.26),vec3(.46,.68,.55),aSeed.z);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);gl_PointSize=(1.+aSeed.y*2.)*uPixel;}`, fragmentShader: `varying float vAlpha;varying vec3 vColor;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(vColor,(1.-d)*vAlpha);}` });
    this.mats.push(mat);
    this.scene.add(new THREE.Points(g, mat));
  }
  buildCurrents() {
    for (let i = 0; i < 9; i++) {
      const p = [], s = [], index = [];
      for (let j = 0; j <= 200; j++) {
        p.push(j / 200, i, 0, j / 200, i, 0);
        s.push(-1, 1);
        if (j < 200) {
          const k = j * 2;
          index.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
      g.setAttribute("aSide", new THREE.Float32BufferAttribute(s, 1));
      g.setIndex(index);
      const m = new THREE.ShaderMaterial({ uniforms: this.uniforms, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, vertexShader: `attribute float aSide;uniform float uTime,uBurst;varying float vSide,vT,vSeed;void main(){float t=position.x,s=position.y;float a=t*10.+s*.73-uTime*.37;float r=(.25+t*13.)*uBurst;vec3 p=vec3(sin(a)*r,3.1+cos(a)*r*.61,1.+uBurst*3.+sin(t*8.+s));p.xy+=vec2(cos(a),-sin(a))*aSide*(.055+t*.4)*uBurst;vSide=aSide;vT=t;vSeed=s;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`, fragmentShader: `uniform float uTime,uBurst;varying float vSide,vT,vSeed;void main(){float edge=pow(max(0.,1.-abs(vSide)),2.);float core=pow(max(0.,1.-abs(vSide)),19.);float flow=.55+.45*pow(.5+.5*sin(vT*25.-uTime*.7+vSeed),2.);vec3 color=mix(vec3(.95,.75,.39),vec3(.45,.68,.55),mod(vSeed,3.)/2.);gl_FragColor=vec4(color,(edge*.30+core*.55)*flow*uBurst*(1.-vT*.6));}` });
      this.mats.push(m);
      this.scene.add(new THREE.Mesh(g, m));
    }
  }
  resize() {
    const { width, height } = this.host.getBoundingClientRect();
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.fov = width / height < 0.8 ? 55 : 44;
    this.camera.updateProjectionMatrix();
    this.uniforms.uPixel.value = this.renderer.getPixelRatio();
  }
  render(progress, time) {
    const opening = 0.08 * smooth(0.2, 0.36, progress) + 0.92 * Math.pow(smooth(0.3, 0.76, progress), 1.3), cross = smooth(0.55, 0.995, progress);
    this.left.rotation.y = opening * 1.48;
    this.right.rotation.y = -opening * 1.48;
    this.figure.update(progress, time, opening * 1.48);
    this.figure.setOpacity(1 - smooth(0.88, 0.99, progress));
    this.shadow.position.z = this.figure.root.position.z;
    this.shadow.visible = this.figure.root.position.z > 0.08;
    this.camera.position.set(-0.2 * (1 - cross), 3.4 + cross * 0.22, 13.5 - smooth(0, 0.15, progress) * 2.3 - cross * 13.8);
    this.camera.lookAt(0, 3.2, -10);
    this.beams.children.forEach((m) => {
      m.material.uniforms.uGlow.value = smooth(0.22, 0.5, progress) * (1 - smooth(0.8, 0.98, progress)) * 0.42;
    });
    this.uniforms.uTime.value = time;
    this.uniforms.uBurst.value = smooth(0.28, 0.75, progress);
    this.renderer.render(this.scene, this.camera);
    this.frames++;
  }
  info() {
    return { calls: this.renderer.info.render.calls, points: this.renderer.info.render.points, triangles: this.renderer.info.render.triangles };
  }
  dispose() {
    this.observer.disconnect();
    this.scene.remove(this.figure.root);
    this.figure.dispose();
    this.scene.traverse((o) => {
      const m = o;
      if (m.geometry) m.geometry.dispose();
    });
    this.mats.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
export {
  GateScene
};
