import * as THREE from 'three';
const loader = new THREE.TextureLoader();

let player, platforms = [], clippingPlaneArr = [], keys = {}, enemies = [], fishes = [];
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
// The default length is 1.5
let clawLength = 1.5;

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
  shadow.position.set(pos.x, pos.y - 0.4, pos.z + 3);
  shadow.scale.set(1, 0.5, 1);
  shadow.layers.set(1);
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

// Add at the top with other variables
export let isPaused = false;

// Add at the top with other variables
export let gameOver = false;

// Update pause/unpause function
export function togglePause() {
    // Only allow pausing if the game is active
    if (gameActive) {
        isPaused = !isPaused;
    }
}

// Add at the top with other variables
export let currentRound = 1;
let enemiesRemainingInRound = 3; // Start with 3 enemies in round 1
let roundActive = true;
let roundCompleteTime = 0;
const ROUND_TRANSITION_DELAY = 3000; // 3 seconds between rounds

// Add at the top with other variables
const SPAWN_DELAY = 1000; // 1 second between enemy spawns
let lastEnemySpawnTime = 0;

// Add inventory system variables
export let unlockedClaws = {
    default: true,
    fast: false,
    dual: false,
    long: false
};

let currentClaw = 'default';

// Add these variables at the top with other state variables
const BOSS_ROUNDS_INTERVAL = 3; // Boss appears every 4 rounds
const BASE_BOSS_HEALTH = 8; // Base health for first boss
let isBossRound = false;
let bossSpawned = false; // New flag to prevent multiple boss spawns

// Update the sprite storage at the top
let playerAttackSprites = {
    attack1: null,
    attack2: null
};

let enemyAttackSprites = {
    spartan: {
        attack1: null,
        attack2: null
    },
    boss: {
        attack1: null,
        attack2: null
    }
};

// Update the preload function
function preloadAttackSprites() {
    // Load player (bear) attack sprites
    loader.load('assets/bear_punch1.png', (texture) => {
        texture.magFilter = THREE.NearestFilter;
        playerAttackSprites.attack1 = texture;
    });
    loader.load('assets/bear_punch2.png', (texture) => {
        texture.magFilter = THREE.NearestFilter;
        playerAttackSprites.attack2 = texture;
    });
    
    // Load spartan attack sprites
    loader.load('assets/spartan_attack1.png', (texture) => {
        texture.magFilter = THREE.NearestFilter;
        enemyAttackSprites.spartan.attack1 = texture;
    });
    loader.load('assets/spartan_attack2.png', (texture) => {
        texture.magFilter = THREE.NearestFilter;
        enemyAttackSprites.spartan.attack2 = texture;
    });
    
    // Load boss attack sprites
    loader.load('assets/minotaur_attack1.png', (texture) => {
        texture.magFilter = THREE.NearestFilter;
        enemyAttackSprites.boss.attack1 = texture;
    });
    loader.load('assets/minotaur_attack2.png', (texture) => {
        texture.magFilter = THREE.NearestFilter;
        enemyAttackSprites.boss.attack2 = texture;
    });
}

// Modify the initGame function to initialize round variables
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
        player.health = 100;
        player.isPlayer = true;
        scene.add(player);
        // Create the player shadow
        playerShadow = createShadow({x: 0, y: 0, z: 0});
        scene.add(playerShadow);
        console.log(playerShadow.position);
        playerShadow.renderOrder = 1;
    });
    
    //const helper = new THREE.PlaneHelper(clippingPlaneArr[0], 10, 0x00ff00);
    //scene.add(helper);

    // Reset claw unlocks and UI
    unlockedClaws = {
        default: true,
        fast: false,
        dual: false,
        long: false
    };
    currentClaw = 'default';
    switchClaw('default');

    // Reset claw slots UI
    const slots = document.querySelectorAll('.claw-slot');
    slots.forEach(slot => {
        if (slot.dataset.claw === 'default') {
            slot.classList.remove('locked');
            slot.classList.add('active');
        } else {
            slot.classList.add('locked');
            slot.classList.remove('active');
        }
    });

    // Create ground platform
    createGround(scene, 0, mapBounds.bottom + 0.5, mapBounds.right - mapBounds.left, 1);

    // Create sun
    //createSun(scene);

    // Create floating platforms
    createPlatform(scene, -5, -2.5, 2, 0.5);
    createPlatform(scene, 0, -2.5, 2, 0.5);
    createPlatform(scene, 5, -2.5, 2, 0.5);

    // Create health bar
    // const healthBarGeometry = new THREE.PlaneGeometry(2, 0.2);
    // const healthBarMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    // healthBar = new THREE.Mesh(healthBarGeometry, healthBarMaterial);
    
    // // Set the pivot point to the left side of the health bar
    // healthBarGeometry.translate(1, 0, 0);
    
    // // Position health bar in top-left corner of the screen
    // healthBar.position.set(-8, 4, 1);
    // scene.add(healthBar);

    // Handle keyboard input
    document.addEventListener('keydown', (event) => keys[event.key] = true);
    document.addEventListener('keyup', (event) => keys[event.key] = false);

    currentRound = 1;
    enemiesRemainingInRound = 3; // Start with 3 enemies
    roundActive = true;
    roundCompleteTime = 0;
    
    // Remove the existing enemy spawn code since we'll handle it in spawnRoundEnemies
    spawnRoundEnemies(scene);

    // Preload attack sprites
    preloadAttackSprites();
}

function showUnlockNotification(clawName, description) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <h2>New Claw Unlocked!</h2>
        <p>${clawName}</p>
        <p>${description}</p>
    `;
    
    const container = document.getElementById('notificationContainer');
    if (container) {
        container.appendChild(notification);
        // Remove the notification after animation completes
        setTimeout(() => {
            notification.remove();
        }, 3000);
    } else {
        console.error('Notification container not found!');
    }
}

function checkClawUnlocks() {
    console.log('Checking unlocks for round:', currentRound); // Debug log

    if (currentRound === 4 && !unlockedClaws.fast) {
        unlockedClaws.fast = true;
        console.log("Fast Claw unlocked!");
        const fastOption = document.querySelector('.weapon-option[data-claw="fast"]');
        if (fastOption) {
            fastOption.classList.remove('locked');
        }
        showUnlockNotification(
            "Fast Claw", 
            "Attack twice as fast with reduced cooldown!"
        );
    }
    if (currentRound === 7 && !unlockedClaws.dual) {
        unlockedClaws.dual = true;
        console.log("Dual Claw unlocked!");
        const dualOption = document.querySelector('.weapon-option[data-claw="dual"]');
        if (dualOption) {
            dualOption.classList.remove('locked');
        }
        showUnlockNotification(
            "Dual Claw", 
            "Attack in both directions simultaneously!"
        );
    }
    if (currentRound === 10 && !unlockedClaws.long) {
        unlockedClaws.long = true;
        console.log("Long Claw unlocked!");
        const longOption = document.querySelector('.weapon-option[data-claw="long"]');
        if (longOption) {
            longOption.classList.remove('locked');
        }
        showUnlockNotification(
            "Long Claw", 
            "Extended reach for greater attack range!"
        );
    }
}

// Add function to switch claws
export function switchClaw(clawType) {
    if (!unlockedClaws[clawType]) return;

    // Update UI
    const weaponOptions = document.querySelectorAll('.weapon-option');
    weaponOptions.forEach(option => option.classList.remove('active'));
    const activeOption = document.querySelector(`.weapon-option[data-claw="${clawType}"]`);
    if (activeOption) {
        activeOption.classList.add('active');
    }

    currentClaw = clawType;
    switch (clawType) {
        case 'default':
            doubleClawEnabled = false;
            fastClawEnabled = false;
            twoSidedClawEnabled = false;
            clawLength = 1.5;
            cooldown = 1000;
            break;
        case 'fast':
            doubleClawEnabled = false;
            fastClawEnabled = true;
            twoSidedClawEnabled = false;
            clawLength = 1.5;
            cooldown = 500;
            break;
        case 'dual':
            doubleClawEnabled = false;
            fastClawEnabled = false;
            twoSidedClawEnabled = true;
            clawLength = 1.5;
            cooldown = 1000;
            break;
        case 'long':
            doubleClawEnabled = true;
            fastClawEnabled = false;
            twoSidedClawEnabled = false;
            clawLength = 3;
            cooldown = 1000;
            break;
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
    if (isBossRound && !bossSpawned) {
        console.log('Creating boss enemy');
        loader.load('assets/minotaur.png', (texture) => {
            texture.magFilter = THREE.NearestFilter;
            
            const enemyMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
            const enemyGeometry = new THREE.PlaneGeometry(2, 2);

            const enemyMesh = new THREE.Mesh(enemyGeometry, enemyMaterial);
            enemyMesh.position.set(xCoord, yCoord, 0);
            enemyMesh.isBoss = true;
            // Calculate boss health based on round number
            enemyMesh.health = calculateBossHealth();
            console.log(`Boss spawned with ${enemyMesh.health} health`);

            const enemy = new Enemy(enemyMesh);
            
            // Create shadow with adjusted position for boss
            const bossShadow = createShadow({
                x: xCoord, 
                y: yCoord - 0.4, // Adjusted to be closer to the ground
                z: 0
            });
            bossShadow.scale.set(2.5, 1.25, 1);
            
            enemy.shadow = bossShadow;
            enemies.push(enemy);
            scene.add(enemyMesh);
            scene.add(bossShadow);
            bossSpawned = true;
        });
    } else if (!isBossRound) {
        // Regular enemy spawning logic
        loader.load('assets/spartan.png', (texture) => {
            texture.magFilter = THREE.NearestFilter;
            
            const enemyMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
            const enemyGeometry = new THREE.PlaneGeometry(1, 1);

            const enemyMesh = new THREE.Mesh(enemyGeometry, enemyMaterial);
            enemyMesh.position.set(xCoord, yCoord + 0.3, 0);

            const enemy = new Enemy(enemyMesh);
            enemy.shadow = createShadow({x: xCoord, y: yCoord, z: 0});
            enemies.push(enemy);
            scene.add(enemyMesh);
            scene.add(enemy.shadow);
        });
    }
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

// Update the attack function to use player sprites
function attack(scene, clawLength) {
    let time = Date.now();

    if (canAttack && time - lastAttack >= cooldown) {
        canAttack = false;
        lastAttack = time;

        // Duration for each frame
        const frameDuration = 100; // 100ms per frame
        const startTime = Date.now();
        
        // Save original texture and facing direction at start of attack
        const originalTexture = player.material.map;
        const attackDirection = facingRight; // Lock in attack direction

        // Create the slash effect
        loader.load('assets/claw_animation.png', (clawTexture) => {
            clawTexture.magFilter = THREE.NearestFilter;
            
            const clawMat = new THREE.MeshBasicMaterial({ 
                map: clawTexture, 
                transparent: true 
            });

            const clawG = new THREE.BoxGeometry(clawLength, 0.3, 0.3);
            const claw = new THREE.Mesh(clawG, clawMat);
            
            // Set initial claw direction
            if (!attackDirection) {
                claw.scale.x = -1;
            }
            
            // Position the claw relative to player
            claw.position.set(
                player.position.x + (attackDirection ? clawLength/2 + 0.1 : -(clawLength/2 + 0.1)),
                player.position.y + 0.2,
                player.position.z
            );

            scene.add(claw);

            // Animate both the player and the claw
            function animateAttack() {
                const now = Date.now();
                const elapsed = now - startTime;

                // Player punch animation - maintain attack direction
                if (elapsed < frameDuration) {
                    if (playerAttackSprites.attack1) {
                        player.material.map = playerAttackSprites.attack1;
                        player.scale.x = attackDirection ? 1 : -1;
                    }
                } else if (elapsed < frameDuration * 2) {
                    if (playerAttackSprites.attack2) {
                        player.material.map = playerAttackSprites.attack2;
                        player.scale.x = attackDirection ? 1 : -1;
                    }
                } else if (elapsed < frameDuration * 3) {
                    player.material.map = originalTexture;
                    player.scale.x = facingRight ? 1 : -1; // Return to current facing direction
                }

                // Claw slash animation - maintain attack direction
                if (elapsed < frameDuration * 3) {
                    claw.position.x = player.position.x + (attackDirection ? clawLength/2 + 0.5 : -(clawLength/2 + 0.5));
                    claw.position.y = player.position.y + 0.2;
                    requestAnimationFrame(animateAttack);
                } else {
                    scene.remove(claw);
                    canAttack = true;
                }
            }

            animateAttack();
            checkAttackCollisions(player, claw, scene);
        });
    }
}

// Separate collision checking into its own function
function checkAttackCollisions(attacker, unused, scene) {
    const enemiesToRemove = [];
    
    enemies.forEach(enemy => {
        const enemyBounds = getObjectBounds(enemy.mesh);
        const attackerBounds = getObjectBounds(attacker);
        
        // Extend the attack bounds in the direction the player is facing
        if (facingRight) {
            attackerBounds.right += clawLength;
        } else {
            attackerBounds.left -= clawLength;
        }

        if (checkCollision(enemyBounds, attackerBounds)) {
            if (enemy.mesh.isBoss) {
                enemy.mesh.health--;
                if (enemy.mesh.health <= 0) {
                    enemiesToRemove.push({
                        enemy: enemy,
                        position: {
                            x: enemy.mesh.position.x,
                            y: enemy.mesh.position.y
                        }
                    });
                    isBossRound = false;
                    bossSpawned = false;
                }
            } else {
                enemiesToRemove.push({
                    enemy: enemy,
                    position: {
                        x: enemy.mesh.position.x,
                        y: enemy.mesh.position.y
                    }
                });
            }
        }
    });

    // Handle enemy removal and fish spawning
    enemiesToRemove.forEach(({enemy, position}) => {
        scene.remove(enemy.mesh);
        scene.remove(enemy.shadow);
        enemies.splice(enemies.indexOf(enemy), 1);
        score++;
        updateScore();

        if (enemies.length === 0) {
            roundActive = false;
            roundCompleteTime = Date.now();
            currentRound++;
            const roundText = document.getElementById('roundText');
            if (roundText) {
                roundText.textContent = `Round ${currentRound}`;
            }
        }

        if (Math.random() < 0.2) {
            createFish(scene, position.x, position.y - 0.2);
        }
    });
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


// Update the animation function to handle both enemy types
function playEnemyAttackAnimation(enemy) {
    if (!enemy.isAttacking) {
        enemy.isAttacking = true;
        const originalTexture = enemy.mesh.material.map;
        const startTime = Date.now();
        const frameDuration = 150; // 150ms per frame
        
        // Determine which sprite set to use
        const sprites = enemy.mesh.isBoss ? 
            enemyAttackSprites.boss : 
            enemyAttackSprites.spartan;

        function animateAttack() {
            const elapsed = Date.now() - startTime;

            if (elapsed < frameDuration) {
                if (sprites.attack1) {
                    enemy.mesh.material.map = sprites.attack1;
                }
            } else if (elapsed < frameDuration * 2) {
                if (sprites.attack2) {
                    enemy.mesh.material.map = sprites.attack2;
                }
            } else {
                enemy.mesh.material.map = originalTexture;
                enemy.isAttacking = false;
                return;
            }

            requestAnimationFrame(animateAttack);
        }

        animateAttack();
    }
}

// Update the handleDamage function
function handleDamage(enemy = null) {
    const currentTime = Date.now();
    if (currentTime - lastDamageTime >= damageInterval) {
        // Play attack animation for any enemy type
        if (enemy) {
            playEnemyAttackAnimation(enemy);
        }

        playerHealth = Math.max(0, playerHealth - 10);
        player.health = playerHealth;
        lastDamageTime = currentTime;
        knockPlayer();
        
        healthBar.scale.x = playerHealth / 100;
        
        const hpText = document.getElementById('hpText');
        if (hpText) {
            hpText.textContent = `${playerHealth} / 100`;
        }
        
        if (playerHealth <= 0) {
            gameOver = true;
            gameActive = false;
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
      player.health = playerHealth;
      
      const hpText = document.getElementById('hpText');
      if (hpText) {
        hpText.textContent = `${playerHealth}`;
      }
      
      fishes.splice(fishes.indexOf(fish), 1);
    }
  })
}

// Enhanced shadow update function
function updateShadows(dayNightFactor) {
    const MAX_SHADOW_DISTANCE = 5; // Maximum distance for shadow visibility
    const MIN_SHADOW_SCALE = 0.5;  // Minimum shadow scale when unit is high up
    const MAX_SHADOW_SCALE = 1.2;  // Maximum shadow scale when unit is on ground
    const MIN_SHADOW_OPACITY = 0.2; // Minimum shadow opacity when unit is high up
    const MAX_SHADOW_OPACITY = 0.5; // Maximum shadow opacity when unit is on ground

    // Project shadows onto the nearest surface below each unit
    function findShadowY(unitX, unitY) {
        // Start with the map bottom as default
        let shadowY = mapBounds.bottom;
        let nearestDistance = Infinity;
        
        // Check all platforms to find the highest one below the unit's X position
        platforms.forEach(platform => {
            const platformBounds = getObjectBounds(platform);
            // Only check platforms that are directly below the unit's X position
            if (unitX >= platformBounds.left && unitX <= platformBounds.right) {
                const platformTop = platformBounds.top;
                const distance = unitY - platformTop;
                if (distance > 0 && distance < nearestDistance) {
                    shadowY = platformTop;
                    nearestDistance = distance;
                }
            }
        });
        
        return { y: shadowY, distance: nearestDistance };
    }

    // Calculate shadow properties based on height
    function calculateShadowProperties(heightDiff) {
        const normalizedHeight = Math.min(heightDiff, MAX_SHADOW_DISTANCE) / MAX_SHADOW_DISTANCE;
        
        // Calculate scale (smaller when higher up)
        const scale = MAX_SHADOW_SCALE - (normalizedHeight * (MAX_SHADOW_SCALE - MIN_SHADOW_SCALE));
        
        // Calculate opacity (more transparent when higher up)
        const baseOpacity = MAX_SHADOW_OPACITY - (normalizedHeight * (MAX_SHADOW_OPACITY - MIN_SHADOW_OPACITY));
        const opacity = baseOpacity * dayNightFactor;
        
        // Calculate blur (more blurry when higher up)
        // Note: Three.js doesn't support runtime blur, but we can simulate it with scale
        const stretch = 1 + (normalizedHeight * 0.5); // Stretch the shadow horizontally when higher up
        
        return { scale, opacity, stretch };
    }

    // Update player shadow
    if (playerShadow && player) {
        const { y: shadowY, distance: playerHeight } = findShadowY(player.position.x, player.position.y);
        const { scale, opacity, stretch } = calculateShadowProperties(playerHeight);
        
        playerShadow.position.set(
            player.position.x,
            shadowY - 0.28, // Slight offset to prevent z-fighting
            player.position.z
        );
        playerShadow.scale.set(scale * stretch, scale * 0.5, 1);
        playerShadow.material.opacity = opacity;
    }

    // Update enemy shadows
    enemies.forEach(enemy => {
        const enemyShadow = enemy.shadow;
        if (enemyShadow) {
            const { y: shadowY, distance: enemyHeight } = findShadowY(
                enemy.mesh.position.x, 
                enemy.mesh.position.y
            );
            
            let { scale, opacity, stretch } = calculateShadowProperties(enemyHeight);
            
            // Adjust scale and position for boss enemies
            if (enemy.mesh.isBoss) {
                scale *= 2.5;
                stretch *= 1.2;
                // Position the shadow lower for the boss
                enemyShadow.position.set(
                    enemy.mesh.position.x,
                    shadowY - 0.65, // Keep slight offset to prevent z-fighting
                    enemy.mesh.position.z
                );
            } else {
                enemyShadow.position.set(
                    enemy.mesh.position.x,
                    shadowY -0.28,
                    enemy.mesh.position.z
                );
            }
            
            enemyShadow.scale.set(scale * stretch, scale * 0.5, 1);
            enemyShadow.material.opacity = opacity;
        }
    });
}

// Game loop logic, to be called in animate
export function gameLoop(scene, dayNightFactor) {
    if (gameOver || isPaused) return;
    
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
            handleDamage(enemy); // Pass the enemy to handleDamage
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

    // Check fish collection
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

    // Handle round progression
    if (!roundActive) {
        const currentTime = Date.now();
        if (currentTime - roundCompleteTime > ROUND_TRANSITION_DELAY) {
            spawnRoundEnemies(scene);
        }
    } else if (roundActive && !isBossRound && enemiesRemainingInRound > 0) {
        const currentTime = Date.now();
        if (currentTime - lastEnemySpawnTime >= SPAWN_DELAY) {
            const spawnX = getValidSpawnPosition();
            createEnemy(scene, spawnX, -3.8);
            enemiesRemainingInRound--;
            lastEnemySpawnTime = currentTime;
        }
    }

    // Update shadows for the player and enemies
    updateShadows(dayNightFactor);

    // Check for claw unlocks
    checkClawUnlocks();
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

// Add a new function for boss notifications
function showBossNotification() {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <h2>Boss Round!</h2>
        <p>Defeat the mighty Minotaur!</p>
    `;
    
    const container = document.getElementById('notificationContainer');
    if (container) {
        container.appendChild(notification);
        setTimeout(() => {
            notification.remove();
        }, 3000);
    } else {
        console.error('Notification container not found!');
    }
}

// Update the spawnRoundEnemies function
function spawnRoundEnemies(scene) {
    console.log(`Starting round ${currentRound}`);
    isBossRound = currentRound % BOSS_ROUNDS_INTERVAL === 0;
    bossSpawned = false;
    
    if (isBossRound) {
        console.log('This is a boss round!');
        enemiesRemainingInRound = 1;
        if (!bossSpawned) { // Only spawn if we haven't already
            console.log('Spawning boss'); // Debug log
            createEnemy(scene, 0, 0); // Spawn boss at center of screen
            bossSpawned = true;
        }
        showBossNotification();
    } else {
        const totalEnemies = currentRound * 3;
        enemiesRemainingInRound = totalEnemies;
        lastEnemySpawnTime = Date.now();
    }
    
    roundActive = true;
}

// Add this new helper function
function getValidSpawnPosition() {
    const MIN_DISTANCE = 4; // Minimum distance from player
    let spawnX;
    let attempts = 0;
    const MAX_ATTEMPTS = 10;

    do {
        spawnX = Math.random() * (mapBounds.right - mapBounds.left) + mapBounds.left;
        const distance = Math.abs(spawnX - player.position.x);
        if (distance >= MIN_DISTANCE) {
            return spawnX;
        }
        attempts++;
    } while (attempts < MAX_ATTEMPTS);

    // If we couldn't find a good position after max attempts,
    // spawn on the opposite side of the screen from the player
    return player.position.x > 0 ? mapBounds.left + 1 : mapBounds.right - 1;
}

// Add function to calculate boss health based on how many boss rounds have occurred
function calculateBossHealth() {
    // Since boss appears every BOSS_ROUNDS_INTERVAL rounds,
    // we can calculate which boss fight this is
    const bossNumber = Math.floor(currentRound / BOSS_ROUNDS_INTERVAL);
    // Each subsequent boss gets 4 more health than the previous
    return BASE_BOSS_HEALTH + (bossNumber - 1) * 4;
}