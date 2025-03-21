var requestAnimFrame = (function(){
  return window.requestAnimationFrame       ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame    ||
    window.oRequestAnimationFrame      ||
    window.msRequestAnimationFrame     ||
    function(callback){
      window.setTimeout(callback, 1000 / 60);
    };
})();

//create the canvas
var canvas = document.createElement("canvas");
var ctx = canvas.getContext('2d');
var updateables = [];
var fireballs = [];
var player = new Mario.Player([0,0]);

// Check if we're on a mobile device
var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

//we might have to get the size and calculate the scaling
//but this method should let us make it however big.
//Cool!
//TODO: Automatically scale the game to work and look good on widescreen.
//TODO: fiddling with scaled sprites looks BETTER, but not perfect. Hmm.
canvas.width = 762;
canvas.height = 720;
ctx.scale(3,3);
document.body.appendChild(canvas);

// Add mobile-friendly canvas attributes
if (isMobile) {
  // Remove canvas from body
  if (canvas.parentNode === document.body) {
    document.body.removeChild(canvas);
  }
  
  // Wait for DOM to be fully loaded
  function addCanvasToContainer() {
    var gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
      // Add canvas to container
      gameContainer.insertBefore(canvas, gameContainer.firstChild);
      
      // Set basic canvas styles
      canvas.style.display = 'block';
      canvas.style.margin = '0 auto';
      canvas.style.maxWidth = '100%';
      canvas.style.maxHeight = 'calc(100vh - 100px)';
      canvas.style.height = 'auto';
      canvas.style.width = 'auto';
      canvas.style.objectFit = 'contain';
      
      // Add score display
      var scoreDisplay = document.createElement('div');
      scoreDisplay.className = 'score-display';
      
      // Create score row
      var scoreRow = document.createElement('div');
      scoreRow.className = 'score-row';
      scoreRow.innerHTML = 'SCORE: <span id="score-value">0</span>';
      
      // Create coins row
      var coinsRow = document.createElement('div');
      coinsRow.className = 'score-row';
      var coinIcon = document.createElement('span');
      coinIcon.className = 'score-icon coin-icon';
      coinsRow.appendChild(coinIcon);
      coinsRow.innerHTML += '<span id="coins-value">0</span>';
      
      // Create lives row
      var livesRow = document.createElement('div');
      livesRow.className = 'score-row';
      livesRow.innerHTML = 'LIVES: <span id="lives-value">3</span>';
      
      // Add rows to score display
      scoreDisplay.appendChild(scoreRow);
      scoreDisplay.appendChild(coinsRow);
      scoreDisplay.appendChild(livesRow);
      
      // Add score display to game container
      gameContainer.appendChild(scoreDisplay);
      
      // Load high score from localStorage
      try {
        var savedHighScore = localStorage.getItem('marioHighScore');
        if (savedHighScore) {
          gameScore.highScore = parseInt(savedHighScore, 10);
        }
      } catch (e) {
        console.log('Could not load high score');
      }
      
      // Add screen adjustment controls
      var screenAdjust = document.createElement('div');
      screenAdjust.className = 'screen-adjust';
      
      var zoomInBtn = document.createElement('button');
      zoomInBtn.className = 'screen-adjust-btn';
      zoomInBtn.textContent = '+';
      zoomInBtn.setAttribute('aria-label', 'Zoom In');
      
      var zoomOutBtn = document.createElement('button');
      zoomOutBtn.className = 'screen-adjust-btn';
      zoomOutBtn.textContent = '-';
      zoomOutBtn.setAttribute('aria-label', 'Zoom Out');
      
      var resetBtn = document.createElement('button');
      resetBtn.className = 'screen-adjust-btn';
      resetBtn.textContent = '↺';
      resetBtn.setAttribute('aria-label', 'Reset Zoom');
      
      screenAdjust.appendChild(zoomInBtn);
      screenAdjust.appendChild(resetBtn);
      screenAdjust.appendChild(zoomOutBtn);
      gameContainer.appendChild(screenAdjust);
      
      // Current zoom level
      var currentZoom = 1;
      var minZoom = 0.6;
      var maxZoom = 1.5;
      var zoomStep = 0.1;
      
      // Apply zoom function
      function applyZoom(zoom) {
        currentZoom = zoom;
        canvas.style.transform = 'scale(' + zoom + ')';
        canvas.style.transformOrigin = 'center center';
        
        // Save user preference
        try {
          localStorage.setItem('marioCanvasZoom', zoom);
        } catch (e) {
          console.log('Could not save zoom preference');
        }
      }
      
      // Load saved zoom preference
      try {
        var savedZoom = localStorage.getItem('marioCanvasZoom');
        if (savedZoom) {
          currentZoom = parseFloat(savedZoom);
          applyZoom(currentZoom);
        }
      } catch (e) {
        console.log('Could not load zoom preference');
      }
      
      // Add event listeners for zoom controls
      zoomInBtn.addEventListener('click', function() {
        if (currentZoom < maxZoom) {
          applyZoom(Math.min(maxZoom, currentZoom + zoomStep));
        }
      });
      
      zoomOutBtn.addEventListener('click', function() {
        if (currentZoom > minZoom) {
          applyZoom(Math.max(minZoom, currentZoom - zoomStep));
        }
      });
      
      resetBtn.addEventListener('click', function() {
        applyZoom(1);
      });
      
      // Set up resize handler
      function resizeCanvas() {
        var windowWidth = window.innerWidth;
        var windowHeight = window.innerHeight;
        var controlsHeight = windowHeight > 500 ? 100 : 70;
        
        // Calculate dimensions maintaining aspect ratio
        var aspectRatio = canvas.width / canvas.height;
        var availableHeight = windowHeight - controlsHeight;
        var availableWidth = windowWidth * 0.9; // Use 90% of screen width
        
        if (windowWidth / availableHeight > aspectRatio) {
          // Height is the limiting factor
          canvas.style.height = availableHeight + 'px';
          canvas.style.width = 'auto';
        } else {
          // Width is the limiting factor
          canvas.style.width = availableWidth + 'px';
          canvas.style.height = 'auto';
        }
      }
      
      // Initial resize and add event listeners
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      window.addEventListener('orientationchange', function() {
        // Add slight delay to ensure orientation change is complete
        setTimeout(resizeCanvas, 100);
      });
      
      console.log("Canvas positioned with self-adjustable controls");
    } else {
      // If container not found yet, try again in a moment
      setTimeout(addCanvasToContainer, 100);
    }
  }
  
  // Start the process of adding canvas to container
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    addCanvasToContainer();
  } else {
    document.addEventListener('DOMContentLoaded', addCanvasToContainer);
  }
}

//viewport
var vX = 0,
    vY = 0,
    vWidth = 256,
    vHeight = 240;

// Extended viewport for mobile devices
var extendedViewWidth = 384; // 50% wider than standard viewport

// Function to get current viewport width based on device
function getViewportWidth() {
  return isMobile ? extendedViewWidth : vWidth;
}

//load our images
resources.load([
  'sprites/player.png',
  'sprites/enemy.png',
  'sprites/tiles.png',
  'sprites/playerl.png',
  'sprites/items.png',
  'sprites/enemyr.png',
]);

resources.onReady(init);
var level;
var sounds;
var music;

// Add scoring system variables
var gameScore = {
  points: 0,
  coins: 0,
  lives: 3,
  highScore: 0,
  // Point values for different actions
  values: {
    coin: 200,
    goomba: 100,
    koopa: 200,
    breakBlock: 50,
    powerup: 1000,
    flag: 2000
  }
};

//initialize
var lastTime;
function init() {
  music = {
    overworld: new Audio('sounds/aboveground_bgm.ogg'),
    underground: new Audio('sounds/underground_bgm.ogg'),
    clear: new Audio('sounds/stage_clear.wav'),
    death: new Audio('sounds/mariodie.wav')
  };
  sounds = {
    smallJump: new Audio('sounds/jump-small.wav'),
    bigJump: new Audio('sounds/jump-super.wav'),
    breakBlock: new Audio('sounds/breakblock.wav'),
    bump: new Audio('sounds/bump.wav'),
    coin: new Audio('sounds/coin.wav'),
    fireball: new Audio('sounds/fireball.wav'),
    flagpole: new Audio('sounds/flagpole.wav'),
    kick: new Audio('sounds/kick.wav'),
    pipe: new Audio('sounds/pipe.wav'),
    itemAppear: new Audio('sounds/itemAppear.wav'),
    powerup: new Audio('sounds/powerup.wav'),
    stomp: new Audio('sounds/stomp.wav')
  };
  
  // Initialize audio for mobile (needs user interaction)
  if (isMobile) {
    // Preload and set up audio for mobile
    Object.values(music).forEach(audio => {
      audio.load();
      audio.volume = 0.7;
    });
    
    Object.values(sounds).forEach(audio => {
      audio.load();
      audio.volume = 0.7;
    });
    
    // Add touch event to start audio
    document.addEventListener('touchstart', function initAudio() {
      // Play and immediately pause to enable audio
      music.overworld.play().then(() => {
        music.overworld.pause();
        music.overworld.currentTime = 0;
        
        // Start the game music after user interaction
        setTimeout(() => {
          music.overworld.play().catch(e => console.log("Audio play failed:", e));
        }, 1000);
      }).catch(e => console.log("Audio play failed:", e));
      
      // Remove the event listener after first touch
      document.removeEventListener('touchstart', initAudio);
    }, { once: true });
    
    // Handle visibility changes for audio
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        // Pause all audio when game is not visible
        Object.values(music).forEach(audio => {
          if (!audio.paused) audio.pause();
        });
      } else {
        // Resume music when game becomes visible again
        if (music.overworld.paused && gameTime > 0) {
          music.overworld.play().catch(e => console.log("Audio resume failed:", e));
        }
      }
    });
  }
  
  Mario.oneone();
  lastTime = Date.now();
  main();
  
  // Initialize score display
  updateScoreDisplay();
  
  // For mobile: check orientation on init
  if (isMobile) {
    checkOrientation();
  }
}

// Function to check and handle orientation for mobile
function checkOrientation() {
  if (!isMobile) return;
  
  const orientationMessage = document.querySelector('.orientation-message');
  const gameContainer = document.querySelector('.game-container');
  
  if (window.innerWidth < window.innerHeight) {
    // Portrait mode
    if (orientationMessage) orientationMessage.style.display = 'flex';
    if (gameContainer) gameContainer.style.display = 'none';
    
    // Pause game in portrait mode
    if (music && music.overworld && !music.overworld.paused) {
      music.overworld.pause();
    }
  } else {
    // Landscape mode
    if (orientationMessage) orientationMessage.style.display = 'none';
    if (gameContainer) gameContainer.style.display = 'block';
    
    // Resume game in landscape mode
    if (music && music.overworld && music.overworld.paused && gameTime > 0) {
      music.overworld.play().catch(e => {});
    }
  }
}

// Function to ensure level data is loaded for extended viewport
function ensureLevelDataLoaded() {
  if (!level || !level.statics) return;
  
  // Calculate how many tiles ahead we need to ensure are loaded
  var currentViewWidth = getViewportWidth();
  var tilesAhead = Math.ceil(currentViewWidth / 16) + 5; // Add buffer
  
  // Current position in tiles
  var currentTileX = Math.floor(vX / 16);
  
  // Check if we need to preload any entities
  for (var i = 0; i < 15; i++) {
    for (var j = currentTileX; j < currentTileX + tilesAhead; j++) {
      // Ensure enemies and items in this range are active if they should be
      if (level.enemies) {
        level.enemies.forEach(function(enemy) {
          var enemyTileX = Math.floor(enemy.pos[0] / 16);
          if (enemyTileX >= currentTileX && enemyTileX < currentTileX + tilesAhead) {
            // Ensure enemy is active if it's in our extended viewport
            if (enemy.active === false && enemy.pos[0] > vX && 
                enemy.pos[0] < vX + currentViewWidth) {
              // Only reactivate if it was deactivated due to being off-screen
              if (enemy.deactivatedByViewport) {
                enemy.active = true;
                enemy.deactivatedByViewport = false;
              }
            }
          }
        });
      }
    }
  }
}

var gameTime = 0;

//set up the game loop
function main() {
  var now = Date.now();
  var dt = (now - lastTime) / 1000.0;

  update(dt);
  render();
  
  // Ensure level data is loaded for extended viewport
  if (isMobile) {
    ensureLevelDataLoaded();
  }

  lastTime = now;
  requestAnimFrame(main);
}

function update(dt) {
  gameTime += dt;

  handleInput(dt);
  updateEntities(dt, gameTime);

  checkCollisions();
}

function handleInput(dt) {
  if (player.piping || player.dying || player.noInput) return; //don't accept input

  if (input.isDown('RUN')){
    player.run();
  } else {
    player.noRun();
  }
  if (input.isDown('JUMP')) {
    player.jump();
  } else {
    //we need this to handle the timing for how long you hold it
    player.noJump();
  }

  if (input.isDown('DOWN')) {
    player.crouch();
  } else {
    player.noCrouch();
  }

  if (input.isDown('LEFT')) { // 'd' or left arrow
    player.moveLeft();
  }
  else if (input.isDown('RIGHT')) { // 'k' or right arrow
    player.moveRight();
  } else {
    player.noWalk();
  }
}

//update all the moving stuff
function updateEntities(dt, gameTime) {
  player.update(dt, vX);
  updateables.forEach (function(ent) {
    ent.update(dt, gameTime);
  });

  //This should stop the jump when he switches sides on the flag.
  if (player.exiting) {
    if (player.pos[0] > vX + 96)
      vX = player.pos[0] - 96
  }else if (level.scrolling && player.pos[0] > vX + 80) {
    // For mobile, position the player more to the left side of the screen
    // to show more of the level ahead
    if (isMobile) {
      // Position player at about 1/3 of the screen width
      var playerScreenPos = Math.floor(getViewportWidth() / 3);
      if (player.pos[0] > vX + playerScreenPos) {
        vX = player.pos[0] - playerScreenPos;
      }
    } else {
      // Original behavior for non-mobile
      vX = player.pos[0] - 80;
    }
  }

  if (player.powering.length !== 0 || player.dying) { return; }
  level.items.forEach (function(ent) {
    ent.update(dt);
  });

  level.enemies.forEach (function(ent) {
    ent.update(dt, vX);
  });

  fireballs.forEach(function(fireball) {
    fireball.update(dt);
  });
  level.pipes.forEach (function(pipe) {
    pipe.update(dt);
  });
}

//scan for collisions
function checkCollisions() {
  if (player.powering.length !== 0 || player.dying) { return; }
  player.checkCollisions();

  //Apparently for each will just skip indices where things were deleted.
  level.items.forEach(function(item) {
    // Add points for collecting items
    var oldState = item.active;
    item.checkCollisions();
    
    // If item was collected (became inactive), add points
    if (oldState && !item.active) {
      // Check item type
      if (item.constructor.name === 'Coin' || item.constructor.name === 'BCoin') {
        addCoin();
      } else if (item.constructor.name === 'Mushroom' || 
                item.constructor.name === 'FireFlower' || 
                item.constructor.name === 'Star') {
        addPoints(gameScore.values.powerup);
      }
    }
  });
  
  level.enemies.forEach(function(ent) {
    // Add points for defeating enemies
    var oldState = ent.active;
    ent.checkCollisions();
    
    // If enemy was defeated (became inactive), add points
    if (oldState && !ent.active) {
      // Check enemy type
      if (ent.constructor.name === 'Goomba') {
        addPoints(gameScore.values.goomba);
      } else if (ent.constructor.name === 'Koopa') {
        addPoints(gameScore.values.koopa);
      }
    }
  });
  
  fireballs.forEach(function(fireball){
    fireball.checkCollisions();
  });
  
  level.pipes.forEach(function(pipe) {
    pipe.checkCollisions();
  });
}

//draw the game!
function render() {
  updateables = [];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = level.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Get current viewport width
  var currentViewWidth = getViewportWidth();
  
  // Calculate how many tiles to render based on viewport width
  var tilesToRender = Math.ceil(currentViewWidth / 16) + 2; // Add 2 for buffer

  //scenery gets drawn first to get layering right.
  for(var i = 0; i < 15; i++) {
    for (var j = Math.floor(vX / 16) - 1; j < Math.floor(vX / 16) + tilesToRender; j++){
      if (level.scenery[i][j]) {
        renderEntity(level.scenery[i][j]);
      }
    }
  }

  //then items
  level.items.forEach (function (item) {
    renderEntity(item);
  });

  level.enemies.forEach (function(enemy) {
    renderEntity(enemy);
  });



  fireballs.forEach(function(fireball) {
    renderEntity(fireball);
  })

  //then we draw every static object.
  for(var i = 0; i < 15; i++) {
    for (var j = Math.floor(vX / 16) - 1; j < Math.floor(vX / 16) + tilesToRender; j++){
      if (level.statics[i][j]) {
        renderEntity(level.statics[i][j]);
      }
      if (level.blocks[i][j]) {
        renderEntity(level.blocks[i][j]);
        updateables.push(level.blocks[i][j]);
      }
    }
  }

  //then the player
  if (player.invincibility % 2 === 0) {
    renderEntity(player);
  }

  //Mario goes INTO pipes, so naturally they go after.
  level.pipes.forEach (function(pipe) {
    renderEntity(pipe);
  });
}

function renderEntity(entity) {
  entity.render(ctx, vX, vY);
}

// Function to update score display
function updateScoreDisplay() {
  var scoreValue = document.getElementById('score-value');
  var coinsValue = document.getElementById('coins-value');
  var livesValue = document.getElementById('lives-value');
  
  if (scoreValue) scoreValue.textContent = gameScore.points;
  if (coinsValue) coinsValue.textContent = gameScore.coins;
  if (livesValue) livesValue.textContent = gameScore.lives;
}

// Function to add points to score
function addPoints(points) {
  gameScore.points += points;
  
  // Update high score if needed
  if (gameScore.points > gameScore.highScore) {
    gameScore.highScore = gameScore.points;
    // Save high score to localStorage
    try {
      localStorage.setItem('marioHighScore', gameScore.highScore);
    } catch (e) {
      console.log('Could not save high score');
    }
  }
  
  updateScoreDisplay();
}

// Function to add coins
function addCoin() {
  gameScore.coins++;
  addPoints(gameScore.values.coin);
  
  // Extra life for every 100 coins
  if (gameScore.coins % 100 === 0) {
    gameScore.lives++;
    updateScoreDisplay();
  }
}
