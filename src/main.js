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

// Add CSS styles for HP display
const style = document.createElement('style');
style.textContent = `
  #hpContainer {
    position: fixed;
    top: 20px;
    left: 20px;
    color: white;
    font-family: Arial, sans-serif;
    font-size: 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    user-select: none;
  }
  #hpText {
    min-width: 80px;
  }
`;
document.head.appendChild(style);

// Create HP display elements
const hpContainer = document.createElement('div');
hpContainer.id = 'hpContainer';
hpContainer.innerHTML = `
  <div>HP</div>
  <div id="hpText">100 / 100</div>
`;
document.body.appendChild(hpContainer);

// Game initialization
initGame(scene, camera);

// Render loop
function animate() {
  requestAnimationFrame(animate);

  // Call game loop for logic updates
  gameLoop(scene);

  // Update HP text
  const healthBar = scene.children.find(child => child.geometry?.type === 'PlaneGeometry' && child.material.color.getHex() === 0xff0000);
  if (healthBar) {
    const currentHealth = Math.round(healthBar.scale.x * 100);
    document.getElementById('hpText').textContent = `${currentHealth} / 100`;
    
    // Update health bar position
    healthBar.position.x = camera.left + 2;
    healthBar.position.y = camera.top - 0.5;
  }

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