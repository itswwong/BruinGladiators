import * as THREE from 'three';
import { initGame, gameLoop } from './game';

// Set up the scene
const scene = new THREE.Scene();

// Get initial window dimensions
const width = window.innerWidth;
const height = window.innerHeight;
const aspectRatio = width / height;
const viewSize = 5;

// Set up camera with fixed dimensions
const camera = new THREE.OrthographicCamera(
  -aspectRatio * viewSize, aspectRatio * viewSize, 
  viewSize, -viewSize, 
  0.1, 100
);
camera.position.set(0, 0, 10);

// Renderer setup with fixed size
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);

// Prevent window scrolling and ensure full coverage
const style = document.createElement('style');
style.textContent = `
  body {
    margin: 0;
    padding: 0;
    overflow: hidden;
    width: 100vw;
    height: 100vh;
    position: fixed;
  }
  canvas {
    width: 100vw !important;
    height: 100vh !important;
    display: block;
  }
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

// Load the background texture
const loader = new THREE.TextureLoader();
loader.load('assets/colosseum.png', (texture) => {
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.NearestFilter;

    const backgroundGeometry = new THREE.PlaneGeometry(viewSize * 2 * aspectRatio, viewSize * 2);
    const backgroundMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide
    });
    
    const backgroundMesh = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    backgroundMesh.position.z = -5;
    scene.add(backgroundMesh);
});

// Create HP display elements
const hpContainer = document.createElement('div');
hpContainer.id = 'hpContainer';
hpContainer.innerHTML = `
  <div>HP</div>
  <div id="hpText">100 / 100</div>
`;
document.body.appendChild(hpContainer);

// Add game over screen
const gameOverScreen = document.createElement('div');
gameOverScreen.id = 'gameOverScreen';
gameOverScreen.innerHTML = `
  <h1>GAME OVER</h1>
  <button id="restartButton">Restart Game</button>
`;
document.body.appendChild(gameOverScreen);

// Add restart functionality
document.getElementById('restartButton').addEventListener('click', () => {
  location.reload();
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
    
    if (currentHealth <= 0) {
      document.getElementById('gameOverScreen').style.display = 'flex';
    }
    
    healthBar.position.x = camera.left + 2;
    healthBar.position.y = camera.top - 0.5;
  }

  // Render the scene
  renderer.render(scene, camera);
}
animate();