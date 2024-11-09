import * as THREE from 'three';
import { initGame, gameLoop } from './game';

// Set up the scene
const scene = new THREE.Scene();

// Calculate aspect ratio and adjust camera
const aspectRatio = window.innerWidth / window.innerHeight;
const viewSize = 5; // This value can be adjusted to zoom in/out
const camera = new THREE.OrthographicCamera(
  -aspectRatio * viewSize, aspectRatio * viewSize, 
  viewSize, -viewSize, 
  0.1, 100
);
camera.position.set(0, 0, 10);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Game initialization
initGame(scene, camera);

// Render loop
function animate() {
  requestAnimationFrame(animate);

  // Call game loop for logic updates
  gameLoop();

  // Render the scene
  renderer.render(scene, camera);
}
animate();

// Handle window resize
window.addEventListener('resize', () => {
  const aspectRatio = window.innerWidth / window.innerHeight;
  camera.left = -aspectRatio * viewSize;
  camera.right = aspectRatio * viewSize;
  camera.top = viewSize;
  camera.bottom = -viewSize;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});