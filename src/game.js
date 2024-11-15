import * as THREE from 'three';
const loader = new THREE.TextureLoader();

let player, platforms = [], keys = {}, enemies = [], doubleClaws = [], fastClaws = [], twoSidedClaws = [], fishes = [];
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

// Add at the top with other variables
let lastSpawnTime = Date.now();
const SPAWN_INTERVAL = 1000; // 10 seconds in milliseconds
let score = 0;

// Initialize the game
export function initGame(scene) {
    score = 0; // Reset score when game starts
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
    createClaw(scene, -3.5, -2, 1);
    createClaw(scene, 4.8, -1, 2);
    createClaw(scene, 5.5, -1, 3);

    // Create dummy to test the player's combat
    createEnemy(scene, 2, -3.8);

    // Create ground platform
    createGround(scene, 0, mapBounds.bottom + 0.5, mapBounds.right - mapBounds.left, 1);

    // Create floating platforms
    createPlatform(scene, -3, -2.5, 2, 0.5);
    createPlatform(scene, 5, -1.5, 2, 0.5);
    createPlatform(scene, 2, -1.5, 2, 0.5);

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

function createFish(scene, xCoord, yCoord){
  // Load fish texture
  loader.load('assets/fish.png', (texture) => {
    texture.magFilter = THREE.NearestFilter; // Keep pixelated style if the sprite is pixel art
    
    const fishG = new THREE.PlaneGeometry(0.5, 0.5);
    const fishMat = new THREE.MeshBasicMaterial({ 
      map: texture,
      transparent: true 
    });
    const fishMesh = new THREE.Mesh(fishG, fishMat);
    fishMesh.position.set(xCoord, yCoord, 0);
    fishes.push(fishMesh);
    scene.add(fishMesh);
  });
}
// Create enemies at the specified coordinates for the given scene
function createEnemy(scene, xCoord, yCoord) {
    // Load Spartan texture and apply it to enemy material
    loader.load('assets/spartan.png', (texture) => {
        texture.magFilter = THREE.NearestFilter; // Keeps pixelation if the texture is pixel art
        
        const enemyMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
        const enemyGeometry = new THREE.PlaneGeometry(1, 1); // Adjust dimensions to suit the image size

        const enemyMesh = new THREE.Mesh(enemyGeometry, enemyMaterial);
        enemyMesh.position.set(xCoord, yCoord + 0.3, 0);

        const enemy = new Enemy(enemyMesh);
        enemies.push(enemy);
        scene.add(enemyMesh);
    });
}


// Function to create platforms
function createPlatform(scene, x, y, width, height) {
    // Load platform texture and apply it to platform material
    loader.load('assets/platform.png', (texture) => {
        texture.magFilter = THREE.NearestFilter;
        // texture.wrapT = THREE.RepeatWrapping;
        
        // Scale texture to fit the platform dimensions
        // texture.repeat.set(width, height);

        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
        const geometry = new THREE.PlaneGeometry(width, height);

        const platform = new THREE.Mesh(geometry, material);
        platform.position.set(x, y, 0);
        platforms.push(platform);
        scene.add(platform);
    });
}

function createGround(scene, x, y, width, height) {
    // Load platform texture and apply it to platform material
    loader.load('assets/ground.png', (texture) => {
      texture.magFilter = THREE.NearestFilter;

      const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
      const geometry = new THREE.PlaneGeometry(width, height);

      const platform = new THREE.Mesh(geometry, material);
      platform.position.set(x, y, 0);
      platforms.push(platform);
      scene.add(platform);
    });
}

function attack(scene, clawLength) {
  let time = Date.now();

  if (canAttack && time - lastAttack >= cooldown) {
    canAttack = false;
    lastAttack = time;

    // Load the claw texture
    loader.load('assets/claw_animation.png', (clawTexture) => {
      // Configure the texture for the main (first) claw
      clawTexture.wrapS = THREE.ClampToEdgeWrapping;
      clawTexture.wrapT = THREE.ClampToEdgeWrapping;
      clawTexture.repeat.set(1, 1);  // Prevent repeating

      // Flip texture for left-facing attacks
      if (!facingRight) {
        clawTexture.repeat.x = -1;  // Flip horizontally
        clawTexture.offset.x = 1;   // Offset to correct position after flip
      } else {
        clawTexture.repeat.x = 1;
        clawTexture.offset.x = 0;
      }

      // Create the claw material using the loaded texture
      const clawMat = new THREE.MeshBasicMaterial({ map: clawTexture, transparent: true });

      // Create the first claw geometry as a Box
      const clawG = new THREE.BoxGeometry(clawLength, 0.3, 0.3);
      const claw = new THREE.Mesh(clawG, clawMat);
      claw.position.set(player.position.x + (facingRight ? 0.5 : -0.5), player.position.y, player.position.z);
      claw.rotation.z = 0;  // Align the claw horizontally

      // Position adjustments for double and two-sided claws
      let claw2Pos = player.position.x;
      if (facingRight) {
        claw.position.x += doubleClawEnabled ? 3.0 : 1.5;
        claw2Pos -= 2;
      } else {
        claw.position.x -= doubleClawEnabled ? 3.0 : 1.5;
        claw2Pos += 2;
      }

      // Clone and position the second claw if enabled
      const claw2 = claw.clone();

      // Adjust the texture for the second claw if the player is using a two-sided claw
      if (twoSidedClawEnabled) {
        claw2.position.set(claw2Pos, player.position.y, player.position.z);

        // Flip the texture for the second claw to face the opposite direction
        claw2.material = clawMat.clone();  // Use a separate material to avoid shared texture state
        if (facingRight) {
          claw2.material.map.repeat.x = -1;  // Flip to face left
          claw2.material.map.offset.x = 1;   // Adjust offset for the flip
        } else {
          claw2.material.map.repeat.x = 1;   // Face right as normal
          claw2.material.map.offset.x = 0;
        }

        scene.add(claw2);
      }

      scene.add(claw);
      console.log("claw now attacking");

      // Check for collisions with enemies
      enemies.forEach((enemy, index) => {
        const enemyBounds = getObjectBounds(enemy.mesh);
        const clawBounds = {
          left: claw.position.x - clawLength / 2,
          right: claw.position.x + clawLength / 2,
          top: claw.position.y + 0.05,
          bottom: claw.position.y - 0.05,
        };
        const clawBounds2 = {
          left: claw2.position.x - clawLength / 2,
          right: claw2.position.x + clawLength / 2,
          top: claw2.position.y + 0.05,
          bottom: claw2.position.y - 0.05,
        };

        if (checkCollision(enemyBounds, clawBounds) || checkCollision(enemyBounds, clawBounds2)) {
          console.log("hit enemy");
          // Store enemy position before removing it
          const enemyPos = {
            x: enemy.mesh.position.x,
            y: enemy.mesh.position.y
          };
          
          scene.remove(enemy.mesh);  // Remove enemy from scene
          enemies.splice(index, 1);  // Remove enemy from array
          score++; // Increment score when enemy is defeated
          updateScore(); // Update the score display

          // 10% chance to spawn a fish
          if (Math.random() < 0.2) {
            createFish(scene, enemyPos.x, enemyPos.y - 0.2);
          }
        }
      });

      // Remove the claws from the scene after the attack duration
      setTimeout(() => {
        scene.remove(claw);
        if (twoSidedClawEnabled) {
          scene.remove(claw2);
        }
        canAttack = true;
      }, 200);
    });
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

function checkFish(scene){
  fishes.forEach(fish => {
    const dist = player.position.distanceTo(fish.position);
    if(dist < 1){
      console.log("Collected fish");
      scene.remove(fish);
      playerHealth = Math.min(100, playerHealth + 10);
      const healthBar = scene.children.find(child => 
        child.geometry?.type === 'PlaneGeometry' && 
        child.material.color.getHex() === 0xff0000
      );
      if (healthBar) {
        healthBar.scale.x = playerHealth / 100;
      }
      fishes.splice(fishes.indexOf(fish), 1);
    }
  })
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
        const enemyBounds = getObjectBounds(enemy.mesh);
        
        if (checkCollision(playerBounds, enemyBounds)) {
            handleDamage();
        }
    });

    // Apply gravity
    playerVelocityY += gravity;
    const nextY = player.position.y + playerVelocityY;

    // Get the player's projected bounds for the next frame
    const playerBounds = getObjectBounds(player);
    const nextPlayerBounds = {
        ...playerBounds,
        bottom: nextY - player.geometry.parameters.height / 2,
        top: nextY + player.geometry.parameters.height / 2
    };

    let onGround = false;
    let hitCeiling = false;

    for (const platform of platforms) {
        const platformBounds = getObjectBounds(platform);

        // Check if the player is horizontally within the platform bounds
        const horizontallyAligned = playerBounds.right > platformBounds.left && playerBounds.left < platformBounds.right;

        // Check for landing on top of the platform
        if (playerVelocityY < 0 && horizontallyAligned &&
            nextPlayerBounds.bottom <= platformBounds.top && playerBounds.bottom >= platformBounds.top) {
            // Stop at the platform's top and reset vertical velocity
            player.position.y = platformBounds.top + player.geometry.parameters.height / 2;
            playerVelocityY = 0;
            onGround = true;
        }
        // Check for hitting the platform from below
        else if (playerVelocityY > 0 && horizontallyAligned &&
            nextPlayerBounds.top >= platformBounds.bottom && playerBounds.top <= platformBounds.bottom) {
            // Stop at the platform's bottom and reset vertical velocity
            player.position.y = platformBounds.bottom - player.geometry.parameters.height / 2;
            playerVelocityY = 0;
            hitCeiling = true;
        }
    }

    // Apply the vertical movement if no collisions detected
    if (!onGround && !hitCeiling) {
        player.position.y = nextY;
    }

    // Prevent player from falling below the map bounds
    if (player.position.y < mapBounds.bottom) {
        player.position.y = mapBounds.bottom;
        playerVelocityY = 0;
        onGround = true;
    }

    // Check claw collection
    checkClaws(scene);
    checkFish(scene);

    // Jump if space is pressed and player is on the ground
    if ((keys[' '] || keys['w'] || keys['ArrowUp']) && onGround) {
        playerVelocityY = jumpStrength;
    }

    // Attack Button
    if ((keys['y'] || keys['u'])) {
        attack(scene, clawLength);
    }

    // Update enemy positions
    updateEnemies();

    // Check if it's time to spawn a new enemy
    const currentTime = Date.now();
    if (currentTime - lastSpawnTime > SPAWN_INTERVAL) {
        // Spawn enemy at a random x position between map bounds
        const randomX = Math.random() * (mapBounds.right - mapBounds.left) + mapBounds.left;
        createEnemy(scene, randomX, -3.8);
        lastSpawnTime = currentTime;
    }
}


// Add getter for player health
export function getPlayerHealth() {
    return playerHealth;
}

// Add these variables near the top with other global variables
const ENEMY_SPEED = 0.02;
const ENEMY_DETECTION_RANGE = 3;
const ENEMY_PATROL_RANGE = 2;

// Add this new class for enemy management
class Enemy {
  constructor(mesh) {
    this.mesh = mesh;
    this.startX = mesh.position.x;
    this.direction = 1;
    this.state = 'patrol'; // 'patrol' or 'chase'
  }
}

// Update the enemies array to store Enemy objects instead of just meshes
// let enemies = [];

// Add this new function to handle enemy movement
function updateEnemies() {
    if (!player) return;

    enemies.forEach(enemy => {
        const distanceToPlayer = enemy.mesh.position.distanceTo(player.position);
        
        // Check if player is within detection range
        if (distanceToPlayer < ENEMY_DETECTION_RANGE) {
            enemy.state = 'chase';
        } else {
            enemy.state = 'patrol';
        }

        if (enemy.state === 'chase') {
            // Move towards player, but respect map bounds
            const directionX = player.position.x - enemy.mesh.position.x;
            const newX = enemy.mesh.position.x + Math.sign(directionX) * ENEMY_SPEED;
            
            // Flip sprite based on chase direction
            enemy.mesh.scale.x = directionX > 0 ? -1 : 1;
            
            // Only move if within bounds
            if (newX >= mapBounds.left && newX <= mapBounds.right) {
                enemy.mesh.position.x = newX;
            }
        } else {
            // Patrol back and forth within bounds
            const newX = enemy.mesh.position.x + ENEMY_SPEED * enemy.direction;
            
            // Flip sprite based on patrol direction
            enemy.mesh.scale.x = enemy.direction > 0 ? -1 : 1;
            
            // Check if enemy would exceed map bounds or patrol range
            if (newX <= mapBounds.left || newX >= mapBounds.right || 
                Math.abs(newX - enemy.startX) > ENEMY_PATROL_RANGE) {
                enemy.direction *= -1; // Reverse direction
            } else {
                enemy.mesh.position.x = newX;
            }
        }
    });
}

// Add new function to update score display
function updateScore() {
    const scoreElement = document.getElementById('scoreText');
    if (scoreElement) {
        scoreElement.textContent = `Score: ${score}`;
    }
}