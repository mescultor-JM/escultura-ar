import { ARView } from './ar-view.js';
import { NavCube } from './nav-cube.js';

// Each face of the navigation cube maps to a section.
// Only "sculpture" loads a real model now; others are placeholders
// so the architecture is ready to extend.
const SECTIONS = [
  { id: 'sculpture', label: 'Sculpture', color: '#6ea8ff', model: 'escultura.glb' },
  { id: 'gallery',   label: 'Gallery',   color: '#b07bff' },
  { id: 'about',     label: 'About',     color: '#ff7b9c' },
  { id: 'info',      label: 'Info',      color: '#ffd166' },
  { id: 'settings',  label: 'Settings',  color: '#4ade80' },
  { id: 'share',     label: 'Share',     color: '#f472b6' },
];

class App {
  constructor() {
    this.arView = new ARView({
      canvasContainer: document.getElementById('ar-canvas-container'),
      video: document.getElementById('camera-video'),
      loading: document.getElementById('loading'),
      fallback: document.getElementById('fallback'),
    });

    this.navCube = new NavCube({
      container: document.getElementById('nav-cube-container'),
      faces: SECTIONS,
      onSelect: (section) => this.handleSelect(section),
    });

    document.getElementById('nav-label').textContent = SECTIONS[0].label;
  }

  async start() {
    try {
      await this.arView.start();
    } catch (err) {
      console.error(err);
    }
    // Default selection
    this.navCube.selectIndex(0);
    this.handleSelect(SECTIONS[0]);
  }

  handleSelect(section) {
    document.getElementById('nav-label').textContent = section.label;
    if (section.model) {
      this.arView.loadModel(section.model);
    } else {
      this.arView.clearModel();
      this.arView.showPlaceholder(`${section.label}\nComing soon`);
    }
  }
}

const app = new App();
app.start();