import * as THREE from "./vendor/three.mjs";
const smooth = (a, b, v) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
class TravelerRig {
  root = new THREE.Group();
  mesh;
  bones = [];
  hip;
  spine;
  chest;
  head;
  arms = [];
  legs = [];
  cloth = { uClothTime: { value: 0 }, uWalk: { value: 0 } };
  constructor(texture) {
    const add = (name, parent, x, y, z = 0) => {
      const b = new THREE.Bone();
      b.name = name;
      b.position.set(x, y, z);
      b.userData.index = this.bones.length;
      this.bones.push(b);
      parent?.add(b);
      return b;
    };
    const rootBone = add("ground", null, 0, 0);
    this.hip = add("pelvis", rootBone, 0, 1.9);
    this.spine = add("waist", this.hip, 0, 0.15);
    this.chest = add("shoulders", this.spine, 0, 0.53);
    const neck = add("neck", this.chest, 0, 0.33);
    this.head = add("head", neck, 0, 0.18);
    for (const side of [-1, 1]) {
      const shoulder = add(`shoulder-${side}`, this.chest, side * 0.37, 0.09);
      const elbow = add(`elbow-${side}`, shoulder, side * 0.3, -0.39);
      const hand = add(`palm-${side}`, elbow, side * 0.19, 0.18);
      this.arms.push({ shoulder, elbow, hand });
      const thigh = add(`hip-${side}`, this.hip, side * 0.15, -0.08);
      const knee = add(`knee-${side}`, thigh, 0, -0.84);
      const foot = add(`ankle-${side}`, knee, side * 0.015, -0.82);
      this.legs.push({ thigh, knee, foot });
    }
    const geometry = new THREE.PlaneGeometry(2.25, 3.375, 80, 128);
    geometry.translate(0, 1.6875, 0);
    const position = geometry.getAttribute("position"), indices = [], weights = [];
    const id = (b) => b.userData.index;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), y = position.getY(i), a = Math.abs(x);
      position.setZ(i, 0.095 * Math.exp(-x * x / 0.12) * smooth(1, 1.8, y) * (1 - smooth(2.8, 3.1, y)));
      const blend = /* @__PURE__ */ new Map();
      const put = (b, w) => blend.set(id(b), (blend.get(id(b)) ?? 0) + w);
      if (y > 2.82) {
        const h = smooth(2.82, 3.05, y);
        put(this.head, h);
        put(this.chest, 1 - h);
      } else if (y > 1.94) {
        const c = smooth(2.12, 2.53, y);
        put(this.chest, c);
        put(this.spine, 1 - c);
      } else {
        const leg = this.legs[x < 0.035 ? 0 : 1], strength = (1 - smooth(1, 1.9, y)) * (a > 0.3 ? 0.28 : 1);
        put(this.hip, 1 - strength);
        const knee = smooth(0.38, 1.3, y);
        put(leg.thigh, knee * strength);
        put(leg.knee, (1 - knee) * strength);
        if (y < 0.44) {
          blend.clear();
          put(leg.foot, 1);
        }
      }
      const armMask = smooth(0.29, 0.45, a) * smooth(1.78, 2, y) * (1 - smooth(2.78, 2.96, y));
      if (armMask > 1e-3) {
        for (const [b, w] of blend) blend.set(b, w * (1 - armMask));
        const arm = this.arms[x < 0 ? 0 : 1], elbow = smooth(0.42, 0.67, a), palm = smooth(0.72, 0.86, a);
        put(arm.shoulder, (1 - elbow) * armMask);
        put(arm.elbow, elbow * (1 - palm) * armMask);
        put(arm.hand, elbow * palm * armMask);
      }
      const sorted = [...blend].filter(([, w]) => w > 0).sort((a2, b) => b[1] - a2[1]).slice(0, 4), sum = sorted.reduce((s, [, w]) => s + w, 0);
      for (let k = 0; k < 4; k++) {
        indices.push(sorted[k]?.[0] ?? 0);
        weights.push((sorted[k]?.[1] ?? 0) / sum);
      }
    }
    geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(indices, 4));
    geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(weights, 4));
    geometry.computeVertexNormals();
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: true, alphaTest: 0.035, color: 14010285, side: THREE.DoubleSide });
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.cloth);
      shader.vertexShader = `uniform float uClothTime,uWalk;
${shader.vertexShader}`.replace("#include <begin_vertex>", `#include <begin_vertex>
float hem=smoothstep(.15,.5,abs(position.x))*(1.-smoothstep(1.7,2.1,position.y));transformed.z+=sin(position.y*8.+position.x*9.+uClothTime*2.1)*hem*(.018+uWalk*.045);transformed.x+=sin(position.y*6.-uClothTime*1.7)*hem*.012;`);
    };
    this.mesh = new THREE.SkinnedMesh(geometry, material);
    this.mesh.add(rootBone);
    this.root.add(this.mesh);
    this.mesh.bind(new THREE.Skeleton(this.bones));
    this.mesh.frustumCulled = false;
  }
  solveArm(arm, target) {
    this.root.updateMatrixWorld(true);
    const s = arm.shoulder.getWorldPosition(new THREE.Vector3()), to = target.clone().sub(s), upper = arm.elbow.position.length(), lower = arm.hand.position.length(), distance = Math.max(0.05, Math.min(upper + lower - 3e-3, to.length())), direction = to.normalize();
    const bend = new THREE.Vector3(0, -1, 0.32);
    bend.addScaledVector(direction, -bend.dot(direction)).normalize();
    const along = (upper * upper + distance * distance - lower * lower) / (2 * distance), height = Math.sqrt(Math.max(0, upper * upper - along * along));
    const elbow = s.clone().addScaledVector(direction, along).addScaledVector(bend, height);
    const parentQ = arm.shoulder.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    arm.shoulder.quaternion.setFromUnitVectors(arm.elbow.position.clone().normalize(), elbow.clone().sub(s).normalize().applyQuaternion(parentQ));
    this.root.updateMatrixWorld(true);
    const elbowWorld = arm.elbow.getWorldPosition(new THREE.Vector3()), shoulderQ = arm.shoulder.getWorldQuaternion(new THREE.Quaternion()).invert();
    arm.elbow.quaternion.setFromUnitVectors(arm.hand.position.clone().normalize(), target.clone().sub(elbowWorld).normalize().applyQuaternion(shoulderQ));
  }
  update(progress, time, door) {
    const brace = smooth(0.025, 0.16, progress) * (1 - smooth(0.53, 0.69, progress)), force = smooth(0.12, 0.3, progress) * (1 - smooth(0.49, 0.68, progress)), walk = smooth(0.62, 0.73, progress), phase = (progress - 0.62) * 45;
    this.root.position.set(Math.sin(time * 0.65) * 0.012 * (1 - walk) + Math.sin(phase) * 0.025 * walk, -0.2, 0.68 - smooth(0.07, 0.3, progress) * 0.22 - smooth(0.3, 0.65, progress) * 0.8 - smooth(0.65, 0.99, progress) * 4.6);
    this.hip.position.y = 1.9 - force * 0.055 + Math.sin(phase * 2) * 0.025 * walk;
    this.hip.rotation.z = Math.sin(phase) * 0.016 * walk;
    this.spine.rotation.x = -0.015 - brace * 0.17 - force * 0.06;
    this.spine.rotation.z = -brace * 0.025 + Math.sin(time * 1.7) * 6e-3 * force;
    this.spine.rotation.y = Math.sin(time * 0.52) * 0.018 + Math.sin(phase) * 0.025 * walk;
    this.chest.rotation.x = -force * 0.035;
    this.head.rotation.x = -brace * 0.075 + Math.sin(time * 0.7) * 0.012;
    this.head.rotation.z = -brace * 0.045;
    this.head.position.y = 0.18 - force * 0.035;
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1, swing = Math.sin(phase + (i ? Math.PI : 0));
      this.legs[i].thigh.rotation.x = swing * 0.39 * walk + (i ? -0.045 : 0.1) * force;
      this.legs[i].knee.rotation.x = -Math.max(0, swing) * 1.1 * walk;
      this.legs[i].foot.rotation.x = swing * 0.18 * walk;
      const contact = smooth(0.025, 0.16, progress) * (1 - smooth(i === 0 ? 0.54 : 0.51, i === 0 ? 0.69 : 0.65, progress));
      const onDoor = new THREE.Vector3(side * (2.06 - 1.16 * Math.cos(door)), 2.48, -1.16 * Math.sin(door) + 0.18 * Math.cos(door));
      const rest = new THREE.Vector3(side * (0.86 - 0.48 * walk), 2.42 - 0.49 * walk, this.root.position.z - 0.12 + Math.sin(phase + (i ? Math.PI : 0)) * 0.15 * walk);
      const target = rest.lerp(onDoor, contact);
      this.solveArm(this.arms[i], target);
      this.arms[i].hand.rotation.x = -force * 0.12;
    }
    this.cloth.uClothTime.value = time;
    this.cloth.uWalk.value = walk;
    this.root.updateMatrixWorld(true);
  }
  joints() {
    this.root.updateMatrixWorld(true);
    return { leftHand: this.arms[0].hand.getWorldPosition(new THREE.Vector3()), rightHand: this.arms[1].hand.getWorldPosition(new THREE.Vector3()), leftFoot: this.legs[0].foot.getWorldPosition(new THREE.Vector3()), rightFoot: this.legs[1].foot.getWorldPosition(new THREE.Vector3()), lean: this.spine.rotation.x };
  }
  setOpacity(value) {
    this.mesh.material.opacity = value;
  }
  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.skeleton.dispose();
  }
}
export {
  TravelerRig
};
