import * as THREE from 'three';

/**
 * NavCube: interactive 3D cube with 6 labeled faces.
 * Swipe to rotate, tap a face to select.
 */
export class NavCube {
  constructor({ container, faces, onSelect }) {
    this.container = container;
    this.faces = faces; // length 6
    this.onSelect = onSelect;
    this.selectedIndex = 0;

    this._init();
    this._initInteraction();
    this._snapToSelected();
  }

  _init() {
    const { clientWidth: w, clientHeight: h } = this.container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this.camera.position.set(0, 0, 4);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    this.container.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const d = new THREE.DirectionalLight(0xffffff, 0.8);
    d.position.set(2, 3, 4);
    this.scene.add(d);

    this.cube = this._buildCube();
    this.scene.add(this.cube);

    this._resizeObserver = new ResizeObserver(() => this._onResize());
    this._resizeObserver.observe(this.container);

    this._animate();
  }

  _buildCube() {
    const group = new THREE.Group();
    const size = 1.6;
    const geom = new THREE.BoxGeometry(size, size, size);

    // Face order for BoxGeometry materials: +X, -X, +Y, -Y, +Z, -Z
    const materials = this.faces.map((f, i) => this._makeFaceMaterial(f, i === this.selectedIndex));

    const mesh = new THREE.Mesh(geom, materials);
    mesh.userData.faceMaterials = materials;
    group.add(mesh);
    this.cubeMesh = mesh;

    // Soft edges
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geom),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 })
    );
    group.add(edges);
    return group;
  }

  _makeFaceMaterial(face, selected) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Background
    const base = face.color || '#6ea8ff';
    ctx.fillStyle = selected ? base : shade(base, -0.35);
    ctx.fillRect(0, 0, 256, 256);

    // Inner highlight if selected
    if (selected) {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 10;
      ctx.strokeRect(12, 12, 232, 232);
    }

    // Label
    ctx.fillStyle = selected ? '#0b0d12' : '#e6e9ef';
    ctx.font = '600 34px -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(face.label.toUpperCase(), 128, 128);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.05 });
  }

  _refreshMaterials() {
    const mats = this.cubeMesh.userData.faceMaterials;
    mats.forEach((m) => { m.map?.dispose(); m.dispose(); });
    const newMats = this.faces.map((f, i) => this._makeFaceMaterial(f, i === this.selectedIndex));
    this.cubeMesh.userData.faceMaterials = newMats;
    this.cubeMesh.material = newMats;
  }

  selectIndex(i) {
    if (i < 0 || i >= this.faces.length) return;
    this.selectedIndex = i;
    this._refreshMaterials();
    this._snapToSelected();
    this.onSelect?.(this.faces[i]);
  }

  // Rotate cube so the selected face points toward the camera (+Z)
  _snapToSelected() {
    // Map face index -> rotation that brings that face to face the camera
    const rots = [
      { x: 0, y: -Math.PI / 2 }, // +X
      { x: 0, y:  Math.PI / 2 }, // -X
      { x: -Math.PI / 2, y: 0 }, // +Y
      { x:  Math.PI / 2, y: 0 }, // -Y
      { x: 0, y: 0 },            // +Z
      { x: 0, y: Math.PI },      // -Z
    ];
    const r = rots[this.selectedIndex];
    this._targetRot = { x: r.x, y: r.y };
  }

  _onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  _animate = () => {
    requestAnimationFrame(this._animate);
    if (this._targetRot && !this._dragging) {
      this.cube.rotation.x += (this._targetRot.x - this.cube.rotation.x) * 0.15;
      this.cube.rotation.y += (this._targetRot.y - this.cube.rotation.y) * 0.15;
    }
    this.renderer.render(this.scene, this.camera);
  };

  // ---- Interaction: swipe to rotate, tap to select face ----
  _initInteraction() {
    const el = this.renderer.domElement;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    let startX = 0, startY = 0, startTime = 0;
    let startRotX = 0, startRotY = 0;
    let moved = false;

    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      startX = e.clientX; startY = e.clientY;
      startRotX = this.cube.rotation.x;
      startRotY = this.cube.rotation.y;
      startTime = performance.now();
      moved = false;
      this._dragging = true;
      this._targetRot = null;
    });

    el.addEventListener('pointermove', (e) => {
      if (!this._dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.hypot(dx, dy) > 6) moved = true;
      this.cube.rotation.y = startRotY + dx * 0.01;
      this.cube.rotation.x = startRotX + dy * 0.01;
    });

    const end = (e) => {
      if (!this._dragging) return;
      this._dragging = false;
      const dt = performance.now() - startTime;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!moved && dt < 300) {
        // Tap -> raycast to pick a face
        const rect = el.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, this.camera);
        const hits = raycaster.intersectObject(this.cubeMesh);
        if (hits.length) {
          const faceIdx = Math.floor(hits[0].faceIndex / 2);
          this.selectIndex(faceIdx);
        } else {
          this._snapToSelected();
        }
      } else {
        // Snap to nearest face after drag
        this._snapToNearest();
      }
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  _snapToNearest() {
    // Find which face is most aligned with +Z (toward camera)
    const normals = [
      new THREE.Vector3( 1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3( 0, 1, 0),
      new THREE.Vector3( 0,-1, 0),
      new THREE.Vector3( 0, 0, 1),
      new THREE.Vector3( 0, 0,-1),
    ];
    const camDir = new THREE.Vector3(0, 0, 1);
    const m = new THREE.Matrix4().extractRotation(this.cube.matrixWorld);
    let best = 0, bestDot = -Infinity;
    normals.forEach((n, i) => {
      const wn = n.clone().applyMatrix4(m);
      const d = wn.dot(camDir);
      if (d > bestDot) { bestDot = d; best = i; }
    });
    this.selectIndex(best);
  }
}

function shade(hex, percent) {
  const c = hex.replace('#', '');
  const num = parseInt(c, 16);
  let r = (num >> 16) & 0xff, g = (num >> 8) & 0xff, b = num & 0xff;
  r = Math.max(0, Math.min(255, Math.round(r + 255 * percent)));
  g = Math.max(0, Math.min(255, Math.round(g + 255 * percent)));
  b = Math.max(0, Math.min(255, Math.round(b + 255 * percent)));
  return `rgb(${r},${g},${b})`;
}
