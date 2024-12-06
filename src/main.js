import * as THREE from 'three';
import { initGame, gameLoop, isPaused, togglePause, currentRound, switchClaw } from './game';

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
camera.layers.enable(1);

// Setup the day/night cycle via an elapsed time variable
let elapsedTime = 0;

// The layer to simulate lighting changes
const dayOverlay = new THREE.Mesh(
  new THREE.PlaneGeometry(viewSize * 2 * aspectRatio, viewSize * 2),
  new THREE.MeshBasicMaterial({color: 0x000000, transparent: true, opacity: 0})
);
scene.add(dayOverlay);


// Renderer setup with fixed size
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
renderer.localClippingEnabled = true;
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
    top: 13px;
    left: 20px;
    color: black;
    font-family: Arial, sans-serif;
    font-size: 10px;
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
  #pauseScreen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    display: none;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: white;
    font-family: Arial, sans-serif;
    z-index: 1000;
  }
  #pauseScreen h1 {
    font-size: 48px;
    margin-bottom: 20px;
  }
  #resumeButton {
    padding: 10px 20px;
    font-size: 20px;
    background-color: #44ff44;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.3s;
    margin: 10px;
  }
  #resumeButton:hover {
    background-color: #66ff66;
  }
  #roundContainer {
    position: fixed;
    top: 40px;
    left: 14px;
    color: black;
    font-family: Arial, sans-serif;
    font-size: 24px;
    user-select: none;
  }
  #clawInventory {
    position: fixed;
    bottom: 20px;
    left: 20px;
    display: flex;
    gap: 10px;
  }
  .claw-slot {
    width: 40px;
    height: 40px;
    background: rgba(0, 0, 0, 0.5);
    border: 2px solid #fff;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: Arial, sans-serif;
  }
  .claw-slot.locked {
    opacity: 0.5;
    border-color: #666;
  }
  #weaponDisplay {
    position: fixed;
    top: 20px;
    right: 20px;
    color: black;
    font-family: Arial, sans-serif;
    font-size: 18px;
    user-select: none;
    z-index: 1000;
    background-color: rgba(255, 255, 255, 0.7);
    padding: 5px 10px;
    border-radius: 5px;
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
  <div id="finalRound" style="font-size: 24px; margin-bottom: 20px;">Round: 1</div>
  <button id="restartButton">Restart Game</button>
`;
document.body.appendChild(gameOverScreen);

// Add pause screen
const pauseScreen = document.createElement('div');
pauseScreen.id = 'pauseScreen';
pauseScreen.innerHTML = `
  <h1>PAUSED</h1>
  <button id="resumeButton">Resume Game</button>
`;
document.body.appendChild(pauseScreen);

// Add restart functionality
document.getElementById('restartButton').addEventListener('click', () => {
  location.reload();
});

// Add pause functionality
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' || event.key === 'p') {
        togglePause();
        const pauseScreen = document.getElementById('pauseScreen');
        if (pauseScreen) {
            pauseScreen.style.display = isPaused ? 'flex' : 'none';
        }
    }
    // Number keys 1-4 for switching claws
    if (event.key === '1') switchClaw('default');
    if (event.key === '2') switchClaw('fast');
    if (event.key === '3') switchClaw('dual');
    if (event.key === '4') switchClaw('long');
});

// Add resume button functionality
document.getElementById('resumeButton').addEventListener('click', () => {
    togglePause();
    document.getElementById('pauseScreen').style.display = 'none';
});

// Add round container
const roundContainer = document.createElement('div');
roundContainer.id = 'roundContainer';
roundContainer.innerHTML = `<div id="roundText">Round 1</div>`;
document.body.appendChild(roundContainer);

// Game initialization
initGame(scene, camera);

// Create weapon display
const weaponDisplay = document.createElement('div');
weaponDisplay.id = 'weaponDisplay';
weaponDisplay.textContent = 'Default Claw';
document.body.appendChild(weaponDisplay);
console.log('Weapon display created:', document.getElementById('weaponDisplay'));

// Render loop
function animate() {
    let timeDelta = 0.01;
    let dayNightFactor = 0.75;  // Default value
    
    // Only update time and day/night cycle if game is not paused
    if (!isPaused) {
        dayNightFactor = 0.75 * Math.sin(elapsedTime * 0.05) + 0.25;
        dayOverlay.material.opacity = 0.5 * (1-dayNightFactor);
        elapsedTime = (elapsedTime % (40*Math.PI)) + timeDelta;
    }

    requestAnimationFrame(animate);

    // Game loop and rendering continue even when paused
    gameLoop(scene, dayNightFactor);
    renderer.render(scene, camera);

    // Update HP text
    const healthBar = scene.children.find(child => 
        child.geometry?.type === 'PlaneGeometry' && 
        child.material.color.getHex() === 0xff0000
    );
    if (healthBar) {
        const currentHealth = Math.round(healthBar.scale.x * 100);
        document.getElementById('hpText').textContent = `${currentHealth} / 100`;
        
        if (currentHealth <= 0) {
            document.getElementById('gameOverScreen').style.display = 'flex';
            document.getElementById('finalRound').textContent = `You Survived Until Round ${currentRound}`;
        }
        
        healthBar.position.x = camera.left + .2;
        healthBar.position.y = camera.top - 0.4;
    }
}
animate();

// Add UI for showing unlocked claws (optional)
const clawInventory = document.createElement('div');
clawInventory.id = 'clawInventory';
clawInventory.innerHTML = `
    <div class="claw-slot" data-claw="default">1</div>
    <div class="claw-slot locked" data-claw="fast">2</div>
    <div class="claw-slot locked" data-claw="dual">3</div>
    <div class="claw-slot locked" data-claw="long">4</div>
`;
document.body.appendChild(clawInventory);