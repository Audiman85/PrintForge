import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
import { FileBox, AlertTriangle } from "lucide-react";

// Renders an uploaded 3MF/STL/OBJ file in an interactive 3D viewer.
// Falls back to a friendly message for STEP/ZIP (unsupported client-side).
export default function StlPreview({ file, color = "#FF6B00", height = 320 }) {
  const mountRef = useRef(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!file || !mountRef.current) return;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!["stl", "obj", "3mf"].includes(ext)) {
      setError(`Preview supports 3MF, STL and OBJ only — you uploaded .${ext}. The file will still be printed.`);
      return;
    }
    setError(null);

    const mount = mountRef.current;
    const w = mount.clientWidth, h = height;

    const scene = new THREE.Scene();
    scene.background = null;
    const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 5000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xEDEDF0, 0x1C1C21, 0.6));
    const key = new THREE.DirectionalLight(0xFF9944, 1.3); key.position.set(4, 5, 3); scene.add(key);
    const rim = new THREE.DirectionalLight(0x00F0FF, 0.7); rim.position.set(-3, 2, -2); scene.add(rim);

    let mesh, geometry;
    const material = new THREE.MeshStandardMaterial({ color, metalness: 0.2, roughness: 0.55, side: THREE.DoubleSide });

    const state = { rotX: 0.35, rotY: 0.7, dist: 5, dragging: false, lastX: 0, lastY: 0, auto: true };

    const setup = (geo) => {
      geo.computeBoundingBox();
      geo.computeVertexNormals();
      const box = geo.boundingBox;
      const size = new THREE.Vector3().subVectors(box.max, box.min);
      const center = new THREE.Vector3().addVectors(box.max, box.min).multiplyScalar(0.5);
      geo.translate(-center.x, -center.y, -center.z);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const scale = 3 / maxDim;
      geo.scale(scale, scale, scale);
      geometry = geo;
      mesh = new THREE.Mesh(geo, material);
      scene.add(mesh);

      // Approximate volume via signed tetrahedra (positions attr)
      const pos = geo.attributes.position;
      let vol = 0;
      if (pos) {
        const count = pos.count;
        for (let i = 0; i < count; i += 3) {
          const ax = pos.getX(i), ay = pos.getY(i), az = pos.getZ(i);
          const bx = pos.getX(i+1), by = pos.getY(i+1), bz = pos.getZ(i+1);
          const cx = pos.getX(i+2), cy = pos.getY(i+2), cz = pos.getZ(i+2);
          vol += (ax * (by * cz - bz * cy) + bx * (cy * az - cz * ay) + cx * (ay * bz - az * by)) / 6;
        }
      }
      const volumeInternal = Math.abs(vol);
      // Convert internal (scaled) volume back to real by dividing by scale^3, then treat as cm3 (heuristic)
      const realVolCm3 = volumeInternal / Math.pow(scale, 3);
      // Assume mesh units are millimetres for STL — convert mm³ to cm³
      const estWeightGrams = (realVolCm3 / 1000) * 1.24;  // PLA density
      setStats({
        triangles: (pos?.count || 0) / 3 | 0,
        est_volume_cm3: realVolCm3 / 1000,
        est_weight_grams: estWeightGrams,
        dims_mm: { x: size.x.toFixed(1), y: size.y.toFixed(1), z: size.z.toFixed(1) },
      });

      camera.position.set(state.dist, 2.4, state.dist);
      camera.lookAt(0, 0, 0);
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target.result;
        if (ext === "stl") {
          const geo = new STLLoader().parse(buffer);
          setup(geo);
        } else if (ext === "3mf") {
          const group = new ThreeMFLoader().parse(buffer);
          const merged = new THREE.BufferGeometry();
          group.traverse(child => { if (child.isMesh && !merged.attributes.position) merged.copy(child.geometry); });
          if (!merged.attributes.position) throw new Error("No mesh data found in 3MF");
          setup(merged);
        } else {
          const text = new TextDecoder("utf-8").decode(new Uint8Array(buffer));
          const obj = new OBJLoader().parse(text);
          const merged = new THREE.BufferGeometry();
          obj.traverse(child => { if (child.isMesh && !merged.attributes.position) merged.copy(child.geometry); });
          if (!merged.attributes.position) throw new Error("No mesh data found in OBJ");
          setup(merged);
        }
      } catch (err) {
        setError(`Could not parse file: ${err.message}`);
      }
    };
    reader.onerror = () => setError("Failed to read file");
    reader.readAsArrayBuffer(file);

    // Interaction
    const onDown = (e) => { state.dragging = true; state.auto = false; state.lastX = e.clientX; state.lastY = e.clientY; };
    const onMove = (e) => {
      if (!state.dragging) return;
      state.rotY += (e.clientX - state.lastX) * 0.008;
      state.rotX = Math.max(-1.2, Math.min(1.2, state.rotX + (e.clientY - state.lastY) * 0.006));
      state.lastX = e.clientX; state.lastY = e.clientY;
    };
    const onUp = () => { state.dragging = false; };
    const onWheel = (e) => { e.preventDefault(); state.dist = Math.max(2.5, Math.min(12, state.dist + e.deltaY * 0.004)); };
    renderer.domElement.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    let raf; const clock = new THREE.Clock();
    const animate = () => {
      const dt = clock.getDelta();
      if (state.auto && mesh) state.rotY += dt * 0.4;
      camera.position.x = Math.cos(state.rotY) * state.dist;
      camera.position.z = Math.sin(state.rotY) * state.dist;
      camera.position.y = 1.2 + state.rotX * 2.2;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      const nw = mount.clientWidth;
      renderer.setSize(nw, h);
      camera.aspect = nw / h; camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("wheel", onWheel);
      if (geometry) geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, [file, color, height]);

  if (error) {
    return (
      <div className="rounded-xl overflow-hidden border border-forge-border bg-forge-elevated p-6 flex items-start gap-3" style={{ minHeight: height }} data-testid="stl-preview-error">
        <AlertTriangle className="w-5 h-5 text-forge-primary shrink-0 mt-1"/>
        <div>
          <p className="text-forge-text font-display text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-forge-border bg-forge-elevated" data-testid="stl-preview">
      <div ref={mountRef} style={{ width: "100%", height }} />
      <div className="absolute top-3 left-3 flex gap-1.5 pointer-events-none">
        <span className="chip chip-tech">STL · LIVE</span>
        {file && <span className="chip">{file.name.length > 24 ? file.name.slice(0,22)+"…" : file.name}</span>}
      </div>
      {stats && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <div className="glass rounded-md px-3 py-1.5 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-forge-muted">
            <span><FileBox className="inline w-3 h-3 mr-1 text-forge-tech"/>{stats.triangles.toLocaleString()} tri</span>
            <span>{stats.dims_mm.x}×{stats.dims_mm.y}×{stats.dims_mm.z}mm</span>
            <span className="text-forge-primary">~{stats.est_weight_grams.toFixed(0)}g</span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-forge-muted">drag · scroll</span>
        </div>
      )}
    </div>
  );
}
