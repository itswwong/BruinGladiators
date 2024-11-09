import * as THREE from 'three';

let player, platforms = [], keys = {};
let playerVelocityY = 0;   // Track vertical velocity for jumping and falling
const gravity = -0.005;    // Gravity strength
const jumpStrength = 0.15; // Jump strength
let mapBounds; // To be defined based on camera

// Initialize the game
export function initGame(scene, camera) {
  // Define map bounds based on camera dimensions
  mapBounds = {
    left: camera.left,
    right: camera.right,
    bottom: camera.bottom
  };

  // Create player
  const playerGeometry = new THREE.PlaneGeometry(0.5, 0.5);
  const playerMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  player = new THREE.Mesh(playerGeometry, playerMaterial);
  player.position.set(0, 0, 0);
  scene.add(player);

  // Create ground platform
  createPlatform(scene, 0, mapBounds.bottom + 0.5, mapBounds.right - mapBounds.left, 1);

  // Create floating platforms
  createPlatform(scene, -3, -1, 2, 0.5);
  createPlatform(scene, 3, 1, 2, 0.5);

  // Handle keyboard input
  document.addEventListener('keydown', (event) => keys[event.key] = true);
  document.addEventListener('keyup', (event) => keys[event.key] = false);
}

// Function to create platforms
function createPlatform(scene, x, y, width, height) {
  const geometry = new THREE.PlaneGeometry(width, height);
  const material = new THREE.MeshBasicMaterial({ color: 0x654321 });
  const platform = new THREE.Mesh(geometry, material);
  platform.position.set(x, y, 0);
  platforms.push(platform);
  scene.add(platform);
}

// Game loop logic, to be called in animate
export function gameLoop() {
  // Horizontal movement
  if (keys['ArrowLeft'] && player.position.x > mapBounds.left) {
    player.position.x -= 0.05;
  }
  if (keys['ArrowRight'] && player.position.x < mapBounds.right) {
    player.position.x += 0.05;
  }

  // Apply gravity
  playerVelocityY += gravity;
  player.position.y += playerVelocityY;

  // Collision detection and platform landing
  let onGround = false;
  platforms.forEach(platform => {
    if (player.position.y <= platform.position.y + platform.geometry.parameters.height / 2 &&
        player.position.y > platform.position.y &&
        player.position.x > platform.position.x - platform.geometry.parameters.width / 2 &&
        player.position.x < platform.position.x + platform.geometry.parameters.width / 2) {
      player.position.y = platform.position.y + platform.geometry.parameters.height / 2;  // Land on platform
      playerVelocityY = 0;  // Reset velocity when on ground
      onGround = true;
    }
  });

  // Prevent falling below the map
  if (player.position.y < mapBounds.bottom) {
    player.position.y = mapBounds.bottom;
    playerVelocityY = 0;
    onGround = true;
  }

  // Jump if space is pressed and player is on the ground
  if (keys[' '] && onGround) {
    playerVelocityY = jumpStrength;
  }
}