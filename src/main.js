import * as THREE from 'three';
import { initGame, gameLoop } from './game';

// Set up the scene
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-10, 10, 5, -5, 0.1, 100);
camera.position.set(0, 0, 10);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Game initialization
initGame(scene);

// Render loop
function animate() {
  requestAnimationFrame(animate);

  // Call game loop for logic updates
  gameLoop();

  // Render the scene
  renderer.render(scene, camera);
}
animate();
