import { useEffect, useRef } from "react";
import * as THREE from "three";

// Interactive 3D preview using vanilla three.js. Renders a procedural mesh (torus knot,
// icosahedron, dodecahedron, cylinder, cone, sphere, box, octahedron) tinted for the
// selected filament colour(s). Users drag to orbit, scroll to zoom.
export default function ModelPreview({
  shape = "torusknot",
  colors = ["#FF6B00"],           // 1..8 hex strings
  quality = "regular",             // "draft" | "regular" | "hi"
  nozzleMm = 0.4,
  wireframe = false,
  autoRotate = true,
  height = 380,
}) {
  const mountRef = useRef(null);
  const stateRef = useRef({});

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const w = mount.clientWidth, h = height;

    const scene = new THREE.Scene();
    scene.background = null;
    const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
    camera.position.set(3.4, 2.4, 4.6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // Warm rim + key + fill lighting for that "warm industrial tech" feel
    scene.add(new THREE.HemisphereLight(0xEDEDF0, 0x1C1C21, 0.5));
    const key = new THREE.DirectionalLight(0xFF9944, 1.2); key.position.set(4, 5, 3); scene.add(key);
    const rim = new THREE.DirectionalLight(0x00F0FF, 0.7); rim.position.set(-3, 2, -2); scene.add(rim);
    const fill = new THREE.PointLight(0xFF6B00, 0.6, 20); fill.position.set(0, -2, 2); scene.add(fill);

    // Print bed
    const bed = new THREE.Mesh(
      new THREE.CircleGeometry(3, 64),
      new THREE.MeshStandardMaterial({ color: 0x141417, metalness: 0.3, roughness: 0.8 })
    );
    bed.rotation.x = -Math.PI / 2;
    bed.position.y = -1.4;
    scene.add(bed);

    // Bed grid
    const grid = new THREE.GridHelper(5, 20, 0x2A2A30, 0x2A2A30);
    grid.position.y = -1.39;
    scene.add(grid);

    // Build primary geometry based on shape choice
    const layer = quality === "hi" ? 0.12 : quality === "draft" ? 0.28 : 0.20;
    const detail = Math.max(0, Math.round((0.4 / nozzleMm) * (quality === "hi" ? 2.5 : quality === "draft" ? 0.5 : 1.5)));
    const segs = quality === "hi" ? 128 : quality === "draft" ? 24 : 64;

    const geometry = (() => {
      switch (shape) {
        case "torusknot":    return new THREE.TorusKnotGeometry(0.9, 0.30, Math.max(48, segs*2), Math.max(8, segs/6));
        case "sphere":       return new THREE.SphereGeometry(1.15, segs, Math.floor(segs*0.7));
        case "icosahedron":  return new THREE.IcosahedronGeometry(1.2, detail);
        case "dodecahedron": return new THREE.DodecahedronGeometry(1.2, Math.min(detail, 2));
        case "octahedron":   return new THREE.OctahedronGeometry(1.25, detail);
        case "cone":         return new THREE.ConeGeometry(1.0, 1.8, Math.max(6, segs/2));
        case "cylinder":     return new THREE.CylinderGeometry(0.9, 0.9, 1.6, Math.max(6, segs/2), 1, false);
        case "box":          return new THREE.BoxGeometry(1.6, 1.6, 1.6, 2, 2, 2);
        default:             return new THREE.TorusKnotGeometry(0.9, 0.3, 96, 12);
      }
    })();

    // Multi-colour banded material — simulates multi-filament printing by tinting layer bands.
    // We do this by generating a canvas-based gradient texture with N colour bands and mapping V.
    const paletteToTexture = (palette) => {
      const c = document.createElement("canvas");
      c.width = 16; c.height = 256;
      const ctx = c.getContext("2d");
      const bands = palette.length;
      for (let i = 0; i < bands; i++) {
        ctx.fillStyle = palette[i];
        ctx.fillRect(0, (i / bands) * 256, 16, 256 / bands + 1);
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      // repeat to simulate layer bands based on quality
      tex.repeat.set(1, Math.max(1, Math.round(1 / layer)));
      return tex;
    };
    const tex = paletteToTexture(colors && colors.length ? colors : ["#FF6B00"]);

    const material = new THREE.MeshStandardMaterial({
      map: tex,
      metalness: 0.18,
      roughness: quality === "hi" ? 0.35 : quality === "draft" ? 0.9 : 0.55,
      wireframe,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0.05;
    scene.add(mesh);

    // Layer-line overlay (rings) — cosmetic — density from nozzle & quality
    const linesGroup = new THREE.Group();
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00F0FF, transparent: true, opacity: 0.18 });
    const rings = Math.min(60, Math.max(8, Math.round(2.4 / layer)));
    for (let i = 0; i < rings; i++) {
      const y = -1.35 + (i / rings) * 2.6;
      const ringGeo = new THREE.RingGeometry(1.35 + Math.sin(i) * 0.02, 1.38, 64);
      const ring = new THREE.LineSegments(new THREE.EdgesGeometry(ringGeo), lineMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = y;
      linesGroup.add(ring);
    }
    scene.add(linesGroup);

    // Interaction: manual orbit (no OrbitControls dep)
    const s = stateRef.current;
    s.mesh = mesh;
    s.dragging = false;
    s.rotX = 0.35; s.rotY = 0.7;
    s.lastX = 0; s.lastY = 0;
    s.dist = 5.6;
    s.auto = autoRotate;

    const onDown = (e) => { s.dragging = true; s.auto = false; s.lastX = e.clientX; s.lastY = e.clientY; };
    const onMove = (e) => {
      if (!s.dragging) return;
      const dx = e.clientX - s.lastX; const dy = e.clientY - s.lastY;
      s.lastX = e.clientX; s.lastY = e.clientY;
      s.rotY += dx * 0.008;
      s.rotX = Math.max(-1.2, Math.min(1.2, s.rotX + dy * 0.006));
    };
    const onUp = () => { s.dragging = false; };
    const onWheel = (e) => { e.preventDefault(); s.dist = Math.max(3.2, Math.min(9.5, s.dist + e.deltaY * 0.004)); };

    renderer.domElement.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    let raf;
    const clock = new THREE.Clock();
    const animate = () => {
      const dt = clock.getDelta();
      if (s.auto) s.rotY += dt * 0.35;
      camera.position.x = Math.cos(s.rotY) * s.dist;
      camera.position.z = Math.sin(s.rotY) * s.dist;
      camera.position.y = 1.2 + s.rotX * 2.2;
      camera.lookAt(0, 0.1, 0);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      const nw = mount.clientWidth;
      renderer.setSize(nw, h);
      camera.aspect = nw / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      tex.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, [shape, colors.join(","), quality, nozzleMm, wireframe, autoRotate, height]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-forge-border bg-forge-elevated" data-testid="model-preview">
      <div ref={mountRef} style={{ width: "100%", height }} />
      <div className="absolute top-3 left-3 flex gap-1.5 pointer-events-none">
        <span className="chip chip-tech">3D · LIVE</span>
        <span className="chip">{shape.toUpperCase()}</span>
      </div>
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <span className="font-mono text-[10px] uppercase tracking-widest text-forge-muted">drag · rotate</span>
        <div className="flex gap-1">
          {colors.map((c,i)=><span key={i} className="w-4 h-4 rounded-full border border-forge-border" style={{background:c}} title={c}/>) }
        </div>
      </div>
    </div>
  );
}
