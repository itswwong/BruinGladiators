import * as THREE from 'three';
const loader = new THREE.TextureLoader();

let player, platforms = [], keys = {}, enemies = [], doubleClaws = [], fastClaws = [], twoSidedClaws = [];
let playerVelocityY = 0;   // Track vertical velocity for jumping and falling
const gravity = -0.005;    // Gravity strength
const jumpStrength = 0.15; // Jump strength
const mapBounds = { left: -10, right: 10, bottom: -5 }; // Define map boundaries

let canAttack = true;
let cooldown = 1000;
let lastAttack = 0;
let facingRight = true;

// Length, material, and mesh of claw
// The possible claws besides the default one are:
// 1. A claw with double the range of the default
// 2. A claw with half the cooldown of the default
// 3. A claw that allows the player to attack in both directions 
let doubleClawEnabled = false;
let fastClawEnabled = false;
let twoSidedClawEnabled = false;

// length, material, and mesh of claw
// The default length is 3
let clawLength = 3;

// Add health-related variables
let playerHealth = 100;
let lastDamageTime = 0;
const damageInterval = 1000; // 1 second in milliseconds
let healthBar;

// Collision helper functions
function getObjectBounds(obj) {
    const width = obj.geometry.parameters.width;
    const height = obj.geometry.parameters.height;
    return {
        left: obj.position.x - width / 2,
        right: obj.position.x + width / 2,
        top: obj.position.y + height / 2,
        bottom: obj.position.y - height / 2
    };
}

function checkCollision(bounds1, bounds2) {
    return !(
        bounds1.left > bounds2.right ||
        bounds1.right < bounds2.left ||
        bounds1.top < bounds2.bottom ||
        bounds1.bottom > bounds2.top
    );
}

// Initialize the game
export function initGame(scene) {
    // Reset health on game init
    playerHealth = 100;
    lastDamageTime = 0;

    // Load player texture and create player with texture material
    loader.load('assets/bear_default.png', (texture) => {
        // Configure texture settings if needed
        texture.magFilter = THREE.NearestFilter; // Keep pixelated style if the sprite is pixel art

        // Create a material using the loaded texture
        const playerMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
        const playerGeometry = new THREE.PlaneGeometry(1, 1);

        // Create the player mesh and apply the texture
        player = new THREE.Mesh(playerGeometry, playerMaterial);
        player.position.set(0, 0, 0);
        scene.add(player);
    });
    
    // Create three different collectible claws, one of each type
    createClaw(scene, -3.5, -2.5, 1);
    createClaw(scene, 3.5, -1.5, 2);
    createClaw(scene, 2.2, -1.5, 3);

    // Create dummy to test the player's combat
    createEnemy(scene, 2, -3.8);

    // Create ground platform
    createPlatform(scene, 0, mapBounds.bottom + 0.5, mapBounds.right - mapBounds.left, 1);

    // Create floating platforms
    createPlatform(scene, -3, -3, 2, 0.5);
    createPlatform(scene, 3, -2, 2, 0.5);
    createPlatform(scene, 0, -2, 2, 0.5);

    // Create health bar
    const healthBarGeometry = new THREE.PlaneGeometry(2, 0.2);
    const healthBarMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    healthBar = new THREE.Mesh(healthBarGeometry, healthBarMaterial);
    
    // Set the pivot point to the left side of the health bar
    healthBarGeometry.translate(1, 0, 0);
    
    // Position health bar in top-left corner of the screen
    healthBar.position.set(-8, 4, 1);
    scene.add(healthBar);

    // Handle keyboard input
    document.addEventListener('keydown', (event) => keys[event.key] = true);
    document.addEventListener('keyup', (event) => keys[event.key] = false);
}

// Types:
// 1 for the double range claw
// 2 for the quick attack claw
function createClaw(scene, xCoord, yCoord, type){
  const clawG = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  if (type == 1){
    const clawMat = new THREE.MeshBasicMaterial({color: 0xff0000});
    const clawMesh = new THREE.Mesh(clawG, clawMat);
    clawMesh.position.set(xCoord, yCoord, 0);
    doubleClaws.push(clawMesh);
    scene.add(clawMesh);
  }
  if(type == 2){
    const clawMat = new THREE.MeshBasicMaterial({color: 0xffff00});
    const clawMesh = new THREE.Mesh(clawG, clawMat);
    clawMesh.position.set(xCoord, yCoord, 0);
    fastClaws.push(clawMesh);
    scene.add(clawMesh);
  }
  if(type == 3){
    const clawMat = new THREE.MeshBasicMaterial({color: 0xff00f0});
    const clawMesh = new THREE.Mesh(clawG, clawMat);
    clawMesh.position.set(xCoord, yCoord, 0);
    twoSidedClaws.push(clawMesh);
    scene.add(clawMesh);
  }
}

// Create enemies at the specified coordinates for the given scene
function createEnemy(scene, xCoord, yCoord){
    const enemyG = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const enemyMat = new THREE.MeshBasicMaterial({color: 0xffffff});
    const enemyMesh = new THREE.Mesh(enemyG, enemyMat);
    enemyMesh.position.set(xCoord, yCoord, 0);
    enemies.push(enemyMesh);
    scene.add(enemyMesh);
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

// The rest of your game logic remains the same


function attack(scene, clawLength){
  let time = Date.now();
  
  if(canAttack && time - lastAttack >= cooldown){
    canAttack = false;
    lastAttack = time;

    // Create the claw to be displayed when the player attacks
    const clawG = new THREE.CylinderGeometry(0.05, 0.05, clawLength, 8);
    const clawMat = new THREE.MeshBasicMaterial({color: 0xff0000});
    const claw = new THREE.Mesh(clawG, clawMat);
    console.log("start attacking");
    claw.position.set(player.position.x + (facingRight ? 0.5 : -0.5), player.position.y, player.position.z);
    claw.rotation.z = Math.PI / 2;

    // Set the positions of the first and second claws
    // Note: the second claw is only displayed if the player has the double sided claw powerup
    let claw2Pos = player.position.x;
    if(facingRight){
      if(doubleClawEnabled){
        claw.position.x += 3.0;
      }
      else{
        claw.position.x += 1.5;
      }
      claw2Pos -= 2;
    }
    else{
      if(doubleClawEnabled){
        claw.position.x -= 3.0;
      }
      else{
        claw.position.x -= 1.5;
      }
      claw2Pos += 2;
    }

    // Add the second claw to the scene if the player has the corresponding powerup
    const claw2 = claw.clone();
    if(twoSidedClawEnabled){
      claw2.position.set(claw2Pos, player.position.y, player.position.z);
      scene.add(claw2);
    }
    scene.add(claw);
    console.log("claw now attacking");

    // Register that the enemy has been hit by the claw
    enemies.forEach(enemy => {
            const enemyBounds = getObjectBounds(enemy);
            const clawBounds = {
                left: claw.position.x - clawLength/2,
                right: claw.position.x + clawLength/2,
                top: claw.position.y + 0.05,
                bottom: claw.position.y - 0.05
            };
            const clawBounds2 = {
              left: claw2.position.x - clawLength/2,
              right: claw2.position.x + clawLength/2,
              top: claw2.position.y + 0.05,
              bottom: claw2.position.y - 0.05
            };
            if(checkCollision(enemyBounds, clawBounds) || checkCollision(enemyBounds, clawBounds2)){
                console.log("hit enemy");
            }
        });

    // Stop rendering the claw when the attack is done
    setTimeout(() => {
      scene.remove(claw);
      if(twoSidedClawEnabled){
        scene.remove(claw2);
      }
      canAttack = true;
    }, 200);
  }
}

// Add damage handling function
function handleDamage() {
    const currentTime = Date.now();
    if (currentTime - lastDamageTime >= damageInterval) {
        playerHealth = Math.max(0, playerHealth - 10);
        lastDamageTime = currentTime;
        
        healthBar.scale.x = playerHealth / 100;
        
        const hpText = document.getElementById('hpText');
        if (hpText) {
            hpText.textContent = `${playerHealth} / 100`;
        }
        
        if (playerHealth <= 0) {
            console.log("Game Over!");
            const gameOverScreen = document.getElementById('gameOverScreen');
            if (gameOverScreen) {
                gameOverScreen.style.display = 'flex';
            }
        }
    }
}

function checkClaws(scene){
  // Check if the player is touching a claw's hit box
  // If so, the claw should disappear and give them its ability
  // Abilities cannot stack; the player can only have one ability on them at once
  doubleClaws.forEach(claw => {
    const dist = player.position.distanceTo(claw.position);
    if(dist < 1){
      console.log("Collected double claw");
      scene.remove(claw);
      doubleClawEnabled = true;
      fastClawEnabled = false;
      twoSidedClawEnabled = false;

      clawLength = 6;
      cooldown = 1000;

      let index = doubleClaws.indexOf(claw);
      doubleClaws.splice(index, 1);
    }
  })

  fastClaws.forEach(claw => {
    const dist = player.position.distanceTo(claw.position);
    if(dist < 1){
      console.log("Collected fast claw");
      scene.remove(claw);
      doubleClawEnabled = false;
      fastClawEnabled = true;
      twoSidedClawEnabled = false;

      clawLength = 3;
      cooldown = 500;

      let index = fastClaws.indexOf(claw);
      fastClaws.splice(index, 1);
    }
  })

  twoSidedClaws.forEach(claw => {
    const dist = player.position.distanceTo(claw.position);
    if(dist < 1){
      console.log("Collected two sided claw");
      scene.remove(claw);
      doubleClawEnabled = false;
      fastClawEnabled = false;
      twoSidedClawEnabled = true;

      clawLength = 3;
      cooldown = 1000;
      
      let index = twoSidedClaws.indexOf(claw);
      twoSidedClaws.splice(index, 1);
    }
  })
}

// Game loop logic, to be called in animate
export function gameLoop(scene) {
    // Horizontal movement
    if ((keys['ArrowLeft'] || keys['a']) && player.position.x > mapBounds.left) {
        player.position.x -= 0.05;
        facingRight = false;
    }
    if ((keys['ArrowRight'] || keys['d']) && player.position.x < mapBounds.right) {
        player.position.x += 0.05;
        facingRight = true;
    }

    // Check for enemy collisions using hitboxes
    enemies.forEach(enemy => {
        const playerBounds = getObjectBounds(player);
        const enemyBounds = getObjectBounds(enemy);
        
        if (checkCollision(playerBounds, enemyBounds)) {
            handleDamage();
        }
    });

    // Apply gravity
    playerVelocityY += gravity;
    
    // Calculate next position
    const nextY = player.position.y + playerVelocityY;
    
    // Get current player bounds for next position
    const playerBounds = getObjectBounds(player);
    const nextPlayerBounds = {
        ...playerBounds,
        bottom: nextY - player.geometry.parameters.height / 2,
        top: nextY + player.geometry.parameters.height / 2
    };

    // Check platform collisions
    let onGround = false;
    let hitCeiling = false;

    for (const platform of platforms) {
        const platformBounds = getObjectBounds(platform);
        
        // Check if player is horizontally aligned with platform
        const horizontalOverlap = !(
            playerBounds.left > platformBounds.right ||
            playerBounds.right < platformBounds.left
        );

        if (horizontalOverlap) {
            // Check for collision from above
            if (playerVelocityY < 0 && // Moving down
                nextPlayerBounds.bottom <= platformBounds.top &&
                playerBounds.bottom >= platformBounds.top) {
                player.position.y = platformBounds.top + player.geometry.parameters.height / 2;
                playerVelocityY = 0;
                onGround = true;
            }
            // Check for collision from below
            else if (playerVelocityY > 0 && // Moving up
                    nextPlayerBounds.top >= platformBounds.bottom &&
                    playerBounds.top <= platformBounds.bottom) {
                player.position.y = platformBounds.bottom - player.geometry.parameters.height / 2;
                playerVelocityY = 0;
                hitCeiling = true;
            }
        }
    }

    // If no collision, apply vertical movement
    if (!onGround && !hitCeiling) {
        player.position.y = nextY;
    }

    // Prevent falling below the map
    if (player.position.y < mapBounds.bottom) {
        player.position.y = mapBounds.bottom;
        playerVelocityY = 0;
        onGround = true;
    }

    checkClaws(scene);

    // Apply gravity
    playerVelocityY += gravity;
    player.position.y += playerVelocityY;

    // Collision detection and platform landing
    platforms.forEach(platform => {
      if (player.position.y <= platform.position.y + platform.geometry.parameters.height / 2 &&
        player.position.y > platform.position.y &&
        player.position.x > platform.position.x - platform.geometry.parameters.width / 2 &&
        player.position.x < platform.position.x + platform.geometry.parameters.width / 2) {
      player.position.y = platform.position.y + platform.geometry.parameters.height / 2;  // Land on platform
      playerVelocityY = 0;  // Reset velocity when on ground
      onGround = true;
    }})

    // Jump if space is pressed and player is on the ground
    if ((keys[' '] || keys['w'] || keys['ArrowUp']) && onGround) {
        playerVelocityY = jumpStrength;
    }

    // Attack Button
    if((keys['y'] || keys['u'])){
        attack(scene, clawLength);
    }
}

// Add getter for player health
export function getPlayerHealth() {
    return playerHealth;
}