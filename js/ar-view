import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * ARView: camera passthrough + transparent Three.js overlay + GLB model.
 * Works on any mobile browser that supports getUserMedia.
 */
export class ARView {
  constructor({ canvasContainer, video, loading, fallback }) {
    this.container = canvasContainer;
    this.video = video;
    this.loadingEl = loading;
    this.fallbackEl = fallback;

    this.stream = null;
    this.model = null;
    this.placeholder = null;

    this._initThree();
    this._initInteraction();
  }

  _initThree() {
    this.scene = new THREE.Scene();

    const { clientWidth: w, clientHeight: h } = this.container;
    this.camera = new THREE.PerspectiveCamera(60, w / h, 0.01, 100);
    this.camera.position.set(0, 0.6, 2.2);
    this.camera.lookAt(0, 0.4, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.container.appendChild(this.renderer.domElement);

    // Lighting: neutral, works well with PBR GLB materials
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x444466, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(2, 3, 2);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xaaccff, 0.4);
    fill.position.set(-2, 1, -1);
    this.scene.add(fill);

    // Pivot for model transforms (rotate/scale/translate together)
    this.pivot = new THREE.Group();
    this.scene.add(this.pivot);

    window.addEventListener('resize', () => this._onResize());
    this._onResize();
    this._animate();
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
    // Gentle idle rotation when the user isn't interacting
    if (this.model && !this._userInteracting) {
      this.pivot.rotation.y += 0.0025;
    }
    this.renderer.render(this.scene, this.camera);
  };

  async start() {
    this._showLoading('Starting camera…');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API not available in this browser.');
      }
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      this.video.srcObject = this.stream;
      await this.video.play();
      this._hideLoading();
    } catch (err) {
      this._showFallback(
        'Camera unavailable.\n' +
        (err.name === 'NotAllowedError'
          ? 'Please allow camera access and reload.'
          : err.message || String(err))
      );
      throw err;
    }
  }

  async loadModel(url) {
    this._showLoading('Loading model…');
    this.clearModel();
    this.hidePlaceholder();

    const loader = new GLTFLoader();
    try {
      const gltf = await loader.loadAsync(url);
      const model = gltf.scene;

      // Normalize size & center
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3()).length();
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);
      const targetSize = 1.0;
      const scale = targetSize / size;
      model.scale.setScalar(scale);

      this.model = model;
      this.pivot.add(model);
      this.pivot.rotation.set(0, 0, 0);
      this.pivot.scale.setScalar(1);
      this.pivot.position.set(0, 0, 0);
      this._hideLoading();
    } catch (err) {
      console.error(err);
      this._showFallback('Failed to load model: ' + (err.message || url));
    }
  }

  clearModel() {
    if (this.model) {
      this.pivot.remove(this.model);
      this.model.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m.dispose());
        }
      });
      this.model = null;
    }
  }

  showPlaceholder(text) {
    this.hidePlaceholder();
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(20,24,34,0.85)';
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#e6e9ef';
    ctx.font = '600 36px sans-serif';
    ctx.textAlign = 'center';
    const lines = text.split('\n');
    lines.forEach((line, i) => ctx.fillText(line, 256, 110 + i * 48));
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), mat);
    mesh.position.set(0, 0.5, 0);
    this.placeholder = mesh;
    this.scene.add(mesh);
  }

  hidePlaceholder() {
    if (this.placeholder) {
      this.scene.remove(this.placeholder);
      this.placeholder.geometry.dispose();
      this.placeholder.material.map?.dispose();
      this.placeholder.material.dispose();
      this.placeholder = null;
    }
  }

  _showLoading(msg) {
    this.loadingEl.querySelector('div:last-child').textContent = msg;
    this.loadingEl.classList.remove('hidden');
    this.fallbackEl.classList.add('hidden');
  }
  _hideLoading() { this.loadingEl.classList.add('hidden'); }
  _showFallback(msg) {
    this.fallbackEl.textContent = msg;
    this.fallbackEl.classList.remove('hidden');
    this.loadingEl.classList.add('hidden');
  }

  // ---- Touch interaction: 1-finger rotate, 2-finger pinch + pan ----
  _initInteraction() {
    const el = this.renderer.domElement;
    let pointers = new Map();
    let startAngle = 0, startScale = 1, startPos = new THREE.Vector2();
    let startRotY = 0, startPivotScale = 1, startPivotPos = new THREE.Vector3();

    const updatePinch = () => {
      if (pointers.size < 2) return;
      const pts = [...pointers.values()];
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      return { dist: Math.hypot(dx, dy), cx: (pts[0].x + pts[1].x) / 2, cy: (pts[0].y + pts[1].y) / 2 };
    };

    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this._userInteracting = true;
      if (pointers.size === 1) {
        startAngle = e.clientX;
        startRotY = this.pivot.rotation.y;
      } else if (pointers.size === 2) {
        const p = updatePinch();
        startScale = p.dist;
        startPivotScale = this.pivot.scale.x;
        startPos.set(p.cx, p.cy);
        startPivotPos.copy(this.pivot.position);
      }
    });

    el.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 1) {
        const delta = (e.clientX - startAngle) * 0.01;
        this.pivot.rotation.y = startRotY + delta;
      } else if (pointers.size === 2) {
        const p = updatePinch();
        const ratio = p.dist / startScale;
        const newScale = THREE.MathUtils.clamp(startPivotScale * ratio, 0.3, 3.0);
        this.pivot.scale.setScalar(newScale);

        // Pan in camera space
        const dx = (p.cx - startPos.x) * 0.003;
        const dy = (p.cy - startPos.y) * 0.003;
        this.pivot.position.x = startPivotPos.x - dx;
        this.pivot.position.y = startPivotPos.y + dy;
      }
    });

    const endPointer = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) this._userInteracting = false;
    };
    el.addEventListener('pointerup', endPointer);
    el.addEventListener('pointercancel', endPointer);
    el.addEventListener('pointerleave', endPointer);
  }
}
