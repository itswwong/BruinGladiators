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
    top: 56px;
    left: 120px;
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
  #gameOverScreen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.8);
    display: none;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: white;
    font-family: Arial, sans-serif;
    z-index: 1000;
  }
  #gameOverScreen h1 {
    font-size: 48px;
    margin-bottom: 20px;
  }
  #restartButton {
    padding: 10px 20px;
    font-size: 20px;
    background-color: #ff4444;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  #restartButton:hover {
    background-color: #ff6666;
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

// Add after the hpContainer creation
const gameOverScreen = document.createElement('div');
gameOverScreen.id = 'gameOverScreen';
gameOverScreen.innerHTML = `
  <h1>GAME OVER</h1>
  <button id="restartButton">Restart Game</button>
`;
document.body.appendChild(gameOverScreen);

// Add restart functionality
document.getElementById('restartButton').addEventListener('click', () => {
  location.reload(); // Reload the page to restart the game
});

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
    
    // Show game over screen when health reaches 0
    if (currentHealth <= 0) {
      document.getElementById('gameOverScreen').style.display = 'flex';
    }
    
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