import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// Bone outline (dogs) or round disc (cats), with a hole for the split ring.
// Bone = a bar plus four overlapping lobes; each arc runs between its two junction points.
const BONE = { cx: 1.05, cy: 0.42, r: 0.5, h: 0.36 };

function tagShape(kind) {
  const s = new THREE.Shape();
  let hole;
  if (kind === "round") {
    s.absarc(0, 0, 1.15, 0, Math.PI * 2, false);
    hole = [0, 0.86];
  } else {
    const { cx, cy, r, h } = BONE;
    const jx = Math.sqrt(r * r - (h - cy) ** 2); // lobe meets bar edge
    const ox = Math.sqrt(r * r - cy * cy); // upper and lower lobes meet on the x axis
    const a = Math.atan2;
    s.absarc(cx, cy, r, a(-cy, ox), a(h - cy, -jx), false);
    s.absarc(-cx, cy, r, a(h - cy, jx), a(-cy, -ox), false);
    s.absarc(-cx, -cy, r, a(cy, -ox), a(cy - h, jx), false);
    s.absarc(cx, -cy, r, a(cy - h, -jx), a(cy, ox), false);
    hole = [-cx - 0.05, 0];
  }
  const p = new THREE.Path();
  p.absarc(hole[0], hole[1], 0.09, 0, Math.PI * 2, true);
  s.holes.push(p);
  return { shape: s, hole };
}

function faceTexture(draw) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const g = c.getContext("2d");
  draw(g);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function buildTag(pet) {
  const group = new THREE.Group();
  const { shape, hole } = tagShape(pet.tagShape);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 6,
    curveSegments: 48,
  });
  geo.translate(0, 0, -0.07); // centre the extrusion depth; the outline is already centred
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a44c, metalness: 1, roughness: 0.28 });
  const enamel = new THREE.MeshPhysicalMaterial({
    color: pet.enamel,
    metalness: 0.1,
    roughness: 0.35,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 0.35,
  });
  // ExtrudeGeometry groups: 0 = front/back caps, 1 = sides.
  group.add(new THREE.Mesh(geo, [enamel, brass]));

  const isRound = pet.tagShape === "round";
  const faceW = isRound ? 1.7 : 1.9;
  const faceH = faceW / 2;
  const front = faceTexture((g) => {
    g.fillStyle = "#f6f1df";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = `600 ${pet.name.length > 4 ? 190 : 220}px Fraunces, Georgia, serif`;
    g.fillText(pet.name, 512, 220);
    g.font = "500 58px 'Instrument Sans', sans-serif";
    g.globalAlpha = 0.75;
    g.fillText(pet.tagLine, 512, 400);
  });
  const back = faceTexture((g) => {
    g.fillStyle = "#f6f1df";
    // A stylised scan code: deterministic blocks seeded from the pet name.
    let seed = [...pet.name].reduce((a, ch) => a + ch.charCodeAt(0), 7);
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        seed = (seed * 9301 + 49297) % 233280;
        const corner = (x < 3 && y < 3) || (x > 5 && y < 3) || (x < 3 && y > 5);
        if (corner ? (x % 3 !== 1 || y % 3 !== 1) : seed / 233280 > 0.5) {
          g.fillRect(140 + x * 30, 120 + y * 30, 26, 26);
        }
      }
    }
    g.textBaseline = "middle";
    g.font = "600 60px 'Instrument Sans', sans-serif";
    g.fillText("Scan for", 470, 210);
    g.fillText("medical file", 470, 290);
  });
  const planeGeo = new THREE.PlaneGeometry(faceW, faceH);
  const mk = (map) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false });
  const frontPlane = new THREE.Mesh(planeGeo, mk(front));
  frontPlane.position.set(isRound ? 0 : 0.15, isRound ? -0.1 : 0, 0.123);
  const backPlane = new THREE.Mesh(planeGeo, mk(back));
  backPlane.position.set(isRound ? 0 : 0.15, isRound ? -0.1 : 0, -0.123);
  backPlane.rotation.y = Math.PI;
  group.add(frontPlane, backPlane);

  // Split ring threaded through the hole, its plane perpendicular to the tag.
  const R = 0.3;
  const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(R, 0.035, 16, 64), brass);
  if (isRound) {
    ringMesh.position.set(hole[0], hole[1] + R, 0);
    ringMesh.rotation.y = Math.PI / 2;
  } else {
    ringMesh.position.set(hole[0] - R, hole[1], 0);
    ringMesh.rotation.x = Math.PI / 2;
  }
  group.add(ringMesh);

  group.userData.dispose = () => {
    geo.dispose();
    planeGeo.dispose();
    ringMesh.geometry.dispose();
    front.dispose();
    back.dispose();
    [brass, enamel, frontPlane.material, backPlane.material].forEach((m) => m.dispose());
  };
  return group;
}

export default function CollarTag3D({ pet }) {
  const hostRef = useRef(null);
  const apiRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return; // No WebGL (disabled or blocked GPU): leave the empty placeholder, keep the page.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(2, 3, 4);
    scene.add(key);

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 0, 6.2);

    const pivot = new THREE.Group();
    scene.add(pivot);

    // Spin state: drag sets velocity, friction settles it, a soft spring pulls toward the nearest face.
    const st = { rotY: 0, velY: 0, tiltX: 0, targetTiltX: 0, dragging: false, lastX: 0, t: 0, tag: null };

    function setPet(p, flip) {
      if (st.tag) {
        pivot.remove(st.tag);
        st.tag.userData.dispose();
      }
      st.tag = buildTag(p);
      pivot.add(st.tag);
      if (flip && !reduceMotion) st.velY += 0.32;
    }
    apiRef.current = { setPet, nudge: (v) => (st.velY += v) };

    function resize() {
      const { width, height } = host.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    const el = renderer.domElement;
    const down = (e) => {
      st.dragging = true;
      st.lastX = e.clientX;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e) => {
      const r = el.getBoundingClientRect();
      st.targetTiltX = ((e.clientY - r.top) / r.height - 0.5) * 0.5;
      if (!st.dragging) return;
      const dx = e.clientX - st.lastX;
      st.lastX = e.clientX;
      st.rotY += dx * 0.012;
      st.velY = dx * 0.012;
    };
    const up = () => (st.dragging = false);
    const leave = () => (st.targetTiltX = 0);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", leave);

    let raf;
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(host);
    function frame() {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      st.t += 1 / 60;
      if (!st.dragging) {
        st.rotY += st.velY;
        st.velY *= 0.95;
        const nearest = Math.round(st.rotY / Math.PI) * Math.PI;
        if (Math.abs(st.velY) < 0.02) st.rotY += (nearest - st.rotY) * 0.06;
      }
      st.tiltX += (st.targetTiltX - st.tiltX) * 0.08;
      const sway = reduceMotion ? 0 : Math.sin(st.t * 1.3) * 0.05;
      pivot.rotation.set(st.tiltX, st.rotY + sway, sway * 0.6);
      pivot.position.y = reduceMotion ? 0 : Math.sin(st.t * 1.3 + 1) * 0.04;
      renderer.render(scene, camera);
    }
    frame();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      if (st.tag) st.tag.userData.dispose();
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      el.remove();
    };
  }, []);

  // Fonts may finish loading after first paint; rebuild once so the engraving uses Fraunces.
  const first = useRef(true);
  useEffect(() => {
    const flip = !first.current;
    first.current = false;
    apiRef.current?.setPet(pet, flip);
    document.fonts?.ready.then(() => apiRef.current?.setPet(pet, false));
  }, [pet]);

  function onKeyDown(e) {
    if (e.key === "ArrowLeft") apiRef.current?.nudge(-0.15);
    if (e.key === "ArrowRight") apiRef.current?.nudge(0.15);
  }

  return (
    <div
      ref={hostRef}
      className="pp-tag-canvas"
      role="img"
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label={`3D collar tag engraved "${pet.name}". Drag, or use the arrow keys, to turn it over.`}
    />
  );
}
