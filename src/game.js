import * as THREE from 'three';
const loader = new THREE.TextureLoader();

let player, platforms = [], clippingPlaneArr = [], keys = {}, enemies = [], doubleClaws = [], fastClaws = [], twoSidedClaws = [], fishes = [];
let playerVelocityY = 0;   // Track vertical velocity for jumping and falling
const gravity = -0.005;    // Gravity strength
const jumpStrength = 0.15; // Jump strength
const mapBounds = { left: -10, right: 10, bottom: -5 }; // Define map boundaries

let canAttack = true;
let cooldown = 1000;
let lastAttack = 0;
// The player direction
let facingRight = true;

let hitstun = false;
let knockbackVelX = -0.1;
const dampingConst = 0.95;
let hitstunTimer = 0;

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

// Shadow geometry function
function createShadow(pos){
  const shadowGeom = new THREE.CircleGeometry(0.5, 32);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.5,
    clippingPlanes: clippingPlaneArr,
  });
  const shadow = new THREE.Mesh(shadowGeom, shadowMat);
  shadow.position.set(pos.x, pos.y-0.7, pos.z + 3);
  shadow.scale.set(1, 0.5, 1);
  shadow.layers.set(1);
  //console.log(clippingPlaneArr)
  //console.log("clipping planes");
  //console.log(shadow.material.clippingPlanes);
  return shadow;
}

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

//
let playerShadow = null;

// Add at the top with other variables
let gameActive = true;

// Initialize the game
export function initGame(scene) {
    gameActive = true;  // Reset game state
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
        // Create the player shadow
        playerShadow = createShadow({x: 0, y: 0, z: 0});
        scene.add(playerShadow);
        console.log(playerShadow.position);
        playerShadow.renderOrder = 1;
    });
    
    //const helper = new THREE.PlaneHelper(clippingPlaneArr[0], 10, 0x00ff00);
    //scene.add(helper);

    // Create three different collectible claws, one of each type
    createClaw(scene, -3.5, -1.75, 1);
    createClaw(scene, 2, -0.75, 2);
    createClaw(scene, 5.5, -0.75, 3);

    // Create dummy to test the player's combat
    //createEnemy(scene, 2, -3.8);

    // Create ground platform
    createGround(scene, 0, mapBounds.bottom + 0.5, mapBounds.right - mapBounds.left, 1);

    // Create sun
    //createSun(scene);

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
function createClaw(scene, xCoord, yCoord, type) {
  const clawWidth = 1; // Default claw width
  const clawHeight = 1; // Default claw height

  if (type == 1) {
    loader.load('assets/long_claw.png', (texture) => {
      texture.magFilter = THREE.NearestFilter;

      const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
      const geometry = new THREE.PlaneGeometry(clawWidth, clawHeight);

      const clawMesh = new THREE.Mesh(geometry, material);
      clawMesh.position.set(xCoord, yCoord, 0);
      doubleClaws.push(clawMesh);
      scene.add(clawMesh);
    });
  }
  if (type == 2) {
    loader.load('assets/fast_claw.png', (texture) => {
      texture.magFilter = THREE.NearestFilter;

      const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
      const geometry = new THREE.PlaneGeometry(clawWidth, clawHeight);

      const clawMesh = new THREE.Mesh(geometry, material);
      clawMesh.position.set(xCoord, yCoord, 0);
      fastClaws.push(clawMesh);
      scene.add(clawMesh);
    });
  }
  if (type == 3) {
    loader.load('assets/dual_claws.png', (texture) => {
      texture.magFilter = THREE.NearestFilter;

      const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
      const geometry = new THREE.PlaneGeometry(clawWidth, clawHeight);

      const clawMesh = new THREE.Mesh(geometry, material);
      clawMesh.position.set(xCoord, yCoord, 0);
      twoSidedClaws.push(clawMesh);
      scene.add(clawMesh);
    });
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
        enemy.shadow = createShadow({x: xCoord, y: yCoord, z: 0});
        enemies.push(enemy);
        scene.add(enemyMesh);
        scene.add(enemy.shadow);
        
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
        
        const clippingPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), -y - height);
        platform.renderOrder = 0;
        platforms.push(platform);
        console.log("pushing plane");
        clippingPlaneArr.push(clippingPlane);
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
      
      const clippingPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), -y - height);
      platform.renderOrder = 0;
      platforms.push(platform);
      console.log("pushing plane");
      clippingPlaneArr.push(clippingPlane);
      scene.add(platform);
    });
}

function attack(scene, clawLength) {
  let time = Date.now();

  if (canAttack && time - lastAttack >= cooldown) {
    canAttack = false;
    lastAttack = time;

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
      if (twoSidedClawEnabled) {
        scene.add(claw2);
      }
      
      // Create arrays to store enemies to remove
      const enemiesToRemove = [];
      
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
          enemiesToRemove.push({
            enemy: enemy,
            position: {
              x: enemy.mesh.position.x,
              y: enemy.mesh.position.y
            }
          });
        }
      });

      // Remove enemies and spawn fish after collision checks are complete
      enemiesToRemove.forEach(({enemy, position}) => {
        scene.remove(enemy.mesh);
        scene.remove(enemy.shadow);
        enemies.splice(enemies.indexOf(enemy), 1);
        score++;
        updateScore();

        // 20% chance to spawn a fish
        if (Math.random() < 0.2) {
          createFish(scene, position.x, position.y - 0.2);
        }
      });

      // Remove the claws after attack duration
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

// Knock the player back when they take damage,
// by updating some fields that will be reflected in animate()
function knockPlayer(){

  //Check the direction that the player is facing;
  // they should be knocked away from the enemy they collided with
  if(facingRight){
    knockbackVelX = -0.1;
    facingRight = false;
  }
  else{
    knockbackVelX = 0.1;
    facingRight = true;
  }

  hitstun=true;
  hitstunTimer = 0;
  playerVelocityY = jumpStrength;
}


// Add damage handling function
function handleDamage() {
    const currentTime = Date.now();
    if (currentTime - lastDamageTime >= damageInterval) {
        playerHealth = Math.max(0, playerHealth - 10);
        lastDamageTime = currentTime;
        knockPlayer();
        
        healthBar.scale.x = playerHealth / 100;
        
        const hpText = document.getElementById('hpText');
        if (hpText) {
            hpText.textContent = `${playerHealth} / 100`;
        }
        
        if (playerHealth <= 0) {
            console.log("Game Over!");
            gameActive = false;  // Stop the game
            const gameOverScreen = document.getElementById('gameOverScreen');
            const finalScore = document.getElementById('finalScore');
            if (gameOverScreen) {
                gameOverScreen.style.display = 'flex';
                if (finalScore) {
                    finalScore.textContent = `Score: ${score}`;
                }
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

function updateShadows(dayNightFactor){
  const shadowOpacity = 0.5 * dayNightFactor;

  playerShadow.position.set(player.position.x, player.position.y-0.7, player.position.z);
  playerShadow.material.opacity = shadowOpacity;
  console.log(playerShadow.material.clippingPlanes);
  

  enemies.forEach((enemy, index) => {
    let enemyshadow = enemies[index].shadow;
    enemyshadow.position.set(enemy.mesh.position.x, enemy.mesh.position.y-0.7, enemy.mesh.position.z);
    enemyshadow.material.opacity = shadowOpacity;
  })
}
// Game loop logic, to be called in animate
export function gameLoop(scene, dayNightFactor) {
    if (!gameActive) return;  // Stop game loop if game is not active
    
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

    let onGround = false;
    let hitCeiling = false;

    // Apply knockback if player is in hitstun
    if(hitstun){
      player.position.x += knockbackVelX;
      //console.log(hitstunTimer)
      knockbackVelX *= dampingConst;
      hitstunTimer += 16;
      if(hitstunTimer > 4000){
        hitstun = false;
      }
    }
    //console.log(hitstun);

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

    for (const platform of platforms) {

        //console.log(platform.position);
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

    // Update shadows for the player and enemies
    updateShadows(dayNightFactor);
}


// Add getter for player health
export function getPlayerHealth() {
    return playerHealth;
}

// Update ENEMY_STATS to remove retreat-related constants
const ENEMY_STATS = {
    SPEED: 0.02,
    DETECTION_RANGE: 3,
    PATROL_RANGE: 3,
    ATTACK_RANGE: 1.2,
    JUMP_STRENGTH: 0.15,
    ATTACK_COOLDOWN: 1500
};

// Enhanced Enemy class with more sophisticated behavior
class Enemy {
    constructor(mesh) {
        this.mesh = mesh;
        this.startX = mesh.position.x;
        this.direction = Math.random() < 0.5 ? -1 : 1;
        this.state = 'patrol';
        this.lastAttackTime = 0;
        this.velocityY = 0;
        this.isGrounded = false;
        this.jumpCooldown = 0;
        this.lastKnownPlayerPos = null;
        
        const maxPatrolDistance = ENEMY_STATS.PATROL_RANGE;
        this.patrolLeftBound = Math.max(mapBounds.left, this.startX - maxPatrolDistance);
        this.patrolRightBound = Math.min(mapBounds.right, this.startX + maxPatrolDistance);
    }

    calculateNextX(playerPos) {
        let nextX = this.mesh.position.x;
        
        switch (this.state) {
            case 'patrol':
                nextX = this.mesh.position.x + (ENEMY_STATS.SPEED * this.direction);
                
                if (nextX <= this.patrolLeftBound || nextX <= mapBounds.left) {
                    this.direction = 1;
                    nextX = Math.max(this.patrolLeftBound, mapBounds.left);
                } else if (nextX >= this.patrolRightBound || nextX >= mapBounds.right) {
                    this.direction = -1;
                    nextX = Math.min(this.patrolRightBound, mapBounds.right);
                }
                
                this.mesh.scale.x = this.direction > 0 ? -1 : 1;
                break;

            case 'chase':
                const directionX = playerPos.x - this.mesh.position.x;
                nextX = this.mesh.position.x + Math.sign(directionX) * ENEMY_STATS.SPEED;
                nextX = Math.max(mapBounds.left, Math.min(mapBounds.right, nextX));
                this.mesh.scale.x = directionX > 0 ? -1 : 1;
                break;
        }

        return nextX;
    }

    updateState(playerPos) {
        const distanceToPlayer = this.mesh.position.distanceTo(playerPos);
        const currentTime = Date.now();

        switch (this.state) {
            case 'patrol':
                if (distanceToPlayer < ENEMY_STATS.DETECTION_RANGE) {
                    this.state = 'chase';
                    this.lastKnownPlayerPos = playerPos.clone();
                }
                break;

            case 'chase':
                if (distanceToPlayer > ENEMY_STATS.DETECTION_RANGE) {
                    this.state = 'patrol';
                    if (this.mesh.position.x <= this.patrolLeftBound) {
                        this.direction = 1;
                    } else if (this.mesh.position.x >= this.patrolRightBound) {
                        this.direction = -1;
                    }
                } else {
                    this.lastKnownPlayerPos = playerPos.clone();
                    if (distanceToPlayer < ENEMY_STATS.ATTACK_RANGE) {
                        if (currentTime - this.lastAttackTime > ENEMY_STATS.ATTACK_COOLDOWN) {
                            this.lastAttackTime = currentTime;
                        }
                    }
                }
                break;
        }
    }

    move(playerPos, platforms) {
        // Always apply gravity first
        this.velocityY += gravity;

        // Store current position for collision checks
        const nextY = this.mesh.position.y + this.velocityY;
        const nextX = this.calculateNextX(playerPos);

        // Check and apply horizontal movement within bounds
        if (nextX >= mapBounds.left && nextX <= mapBounds.right) {
            this.mesh.position.x = nextX;
        }

        // Apply vertical movement and platform collisions
        this.handlePlatformCollisions(platforms, nextY);

        // Enforce map boundaries
        this.enforceMapBoundaries();

        // Handle jumping logic after position updates
        this.handleJumping(playerPos, platforms);
    }

    handlePlatformCollisions(platforms, nextY) {
        this.isGrounded = false;
        const enemyBounds = getObjectBounds(this.mesh);
        const nextEnemyBounds = {
            ...enemyBounds,
            top: nextY + this.mesh.geometry.parameters.height / 2,
            bottom: nextY - this.mesh.geometry.parameters.height / 2
        };

        let collision = false;

        for (const platform of platforms) {
            const platformBounds = getObjectBounds(platform);
            
            // Check if enemy is horizontally aligned with platform
            const horizontallyAligned = 
                enemyBounds.right > platformBounds.left && 
                enemyBounds.left < platformBounds.right;

            if (horizontallyAligned) {
                // Landing on platform
                if (this.velocityY < 0 && 
                    nextEnemyBounds.bottom <= platformBounds.top && 
                    enemyBounds.bottom >= platformBounds.top) {
                    this.mesh.position.y = platformBounds.top + this.mesh.geometry.parameters.height / 2;
                    this.velocityY = 0;
                    this.isGrounded = true;
                    collision = true;
                    break;
                }
                // Hitting ceiling
                else if (this.velocityY > 0 && 
                         nextEnemyBounds.top >= platformBounds.bottom && 
                         enemyBounds.top <= platformBounds.bottom) {
                    this.mesh.position.y = platformBounds.bottom - this.mesh.geometry.parameters.height / 2;
                    this.velocityY = 0;
                    collision = true;
                    break;
                }
            }
        }

        // If no collision, apply vertical movement
        if (!collision) {
            this.mesh.position.y = nextY;
        }
    }

    handleJumping(playerPos, platforms) {
        if (!this.isGrounded || this.jumpCooldown > 0) {
            this.jumpCooldown = Math.max(0, this.jumpCooldown - 1);
            return;
        }

        // Jump if player is above and in chase state
        if (playerPos.y > this.mesh.position.y + 1 && this.state === 'chase') {
            this.velocityY = ENEMY_STATS.JUMP_STRENGTH;
            this.jumpCooldown = 60;
            this.isGrounded = false;
        }

        // Jump over platforms while chasing
        if (this.state === 'chase') {
            const lookAheadX = this.mesh.position.x + Math.sign(playerPos.x - this.mesh.position.x) * 1;
            platforms.forEach(platform => {
                const platformBounds = getObjectBounds(platform);
                if (lookAheadX > platformBounds.left && 
                    lookAheadX < platformBounds.right && 
                    Math.abs(this.mesh.position.y - platformBounds.top) < 1) {
                    this.velocityY = ENEMY_STATS.JUMP_STRENGTH;
                    this.jumpCooldown = 60;
                    this.isGrounded = false;
                }
            });
        }
    }

    enforceMapBoundaries() {
        // Enforce horizontal boundaries and update direction if needed
        if (this.mesh.position.x <= mapBounds.left) {
            this.mesh.position.x = mapBounds.left;
            if (this.state === 'patrol') {
                this.direction = 1;
                this.mesh.scale.x = -1;
            }
        } else if (this.mesh.position.x >= mapBounds.right) {
            this.mesh.position.x = mapBounds.right;
            if (this.state === 'patrol') {
                this.direction = -1;
                this.mesh.scale.x = 1;
            }
        }

        // Enforce bottom boundary
        if (this.mesh.position.y < mapBounds.bottom) {
            this.mesh.position.y = mapBounds.bottom;
            this.velocityY = 0;
            this.isGrounded = true;
        }
    }
}

// Update the enemy movement function
function updateEnemies() {
    if (!player) return;

    enemies.forEach(enemy => {
        enemy.updateState(player.position);
        enemy.move(player.position, platforms);
    });
}

// Add new function to update score display
function updateScore() {
    const scoreElement = document.getElementById('scoreText');
    if (scoreElement) {
        scoreElement.textContent = `Score: ${score}`;
    }
}