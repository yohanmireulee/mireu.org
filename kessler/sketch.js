// TITLE: Kessler
// NOTE: Runs on p5.js 1.11 instead of 2.0 so preload() still works the same way as my other projects. Needs a keyboard.

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// PSEUDOCODE

// 1. SETUP
// - Define Variables: Images, fonts, game state, object arrays, level table, and every tuning number in one spot
// - Preload: Load the Jost font weights and all the PNGs exported from Visual_Assets.ai
// - Canvas Setup: 1280x720, degree mode, center image mode, generate background stars

// 2. MAIN DRAW LOOP
// - Environment: Stars, dashed orbit rings, and Earth (shared across all states)
// - State Machine Routing:
//   - State 0: Title screen
//   - State 1: Active gameplay (ship, laser, engine push, orbits, collisions, power ups, win/lose checks)
//   - State 2: Paused
//   - State 3: Contract complete (level won)
//   - State 4: Mission failed
// - HUD: Cash, target, level, hull, laser battery, and radio messages drawn on top of the world

// 3. DRAW COMPONENTS
// - Environment: Twinkling stars, orbit rings, Earth
// - HUD: Cash panel, level badge, hull/laser panel, radio bubble
// - Menus: Pause overlay, results panel, buttons
// - Helpers: Letter spaced text, outlined text, money formatting

// 4. CLASSES
// - Spaceship: Rotate, thrust with no brakes, engine flame, laser nose position, hull and invincibility frames
// - SpaceObject: Debris, satellites, the ISS, and power ups. Rides its orbit until something knocks it loose, then gravity takes over
// - Particle Classes: Laser sparks, debris chunks, explosions, and floating cash text

// 5. INTERACTIVITY & LOGIC
// - Keyboard Inputs: A/D rotate, W thrust, Spacebar laser, P pause, Enter/M on the results screen
// - Mouse Inputs: Title screen and results panel buttons
// - Laser Logic: Raycast from the nose and burn whatever it hits first
// - Engine Push Logic: Anything inside the flame gets shoved away from the ship
// - Collision Logic: Ship vs objects, objects vs objects, anything vs the ISS
// - Game Logic: Cash, level loading, win/lose triggers, resets

// 6. COMMENTARY

// 7. CREDITS
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// ==========================================
// --- SECTION 1: SETUP ---
// ==========================================

// ******************************************
// --- SUBSECTION: DEFINE VARIABLES ---
// ******************************************
// Asset Variables
let fontMedium, fontBold, fontHeavy; // Jost font weights
let imgTitle, imgEarth; // Title screen and Earth
let imgShip, imgShipDamaged; // Spaceship normal and damaged states
let imgMissionControl, imgAstronaut; // Radio portraits for the HUD
let sndTitleMusic, sndGameMusic; // Music
let sndLaser, sndThrust; // Loops that play constantly at 0% volume and get turned up while you hold the key
let sndDebris, sndSatExplode, sndBigExplode, sndCollision; // Destruction sounds
let sndPowerUp, sndRadio, sndClick, sndPenalty; // Feedback sounds
let sndWin, sndLose; // Jingles for the results screens
let lastBumpSound = 0; // Frame of the last object vs object clang, so a pileup doesn't play 20 clangs at once

// Game State Variables
let gameState = 0; // 0 = Title, 1 = Playing, 2 = Paused, 3 = Contract Complete, 4 = Mission Failed
let stateTimer = 0; // Counts frames since the last state change so a held key doesn't skip the results screen
let level = 0; // Index of the current level in the levels array
let cash = 0; // Current cash
let target = 0; // Cash target for the current level
let debrisCleared = 0; // Debris destroyed or pushed out this level
let satellitesHit = 0; // Satellites damaged or destroyed this level
let failReason = ""; // Line of text on the mission failed screen
let shipExploded = false; // Hides the ship after the hull runs out
let shakeTimer = 0; // Frames of screen shake left
let powerUpTimer = 0; // Frames until the next power up drops

// Object Variables
let ship; // The player
let iss; // The International Space Station
let objects = []; // Everything in orbit (debris, satellites, ISS, power ups)
let sparks = []; // Laser impact sparks
let chunks = []; // Little bits that fly off destroyed debris
let explosionParticles = []; // Fireballs for satellites and big crashes
let floatingTexts = []; // Cash popups
let stars = []; // Background stars

// Radio Variables
let radioWho = "mc"; // "mc" = Mission Control, "astro" = ISS Astronaut
let radioText = ""; // What they're saying
let radioTimer = 0; // How many frames the message stays up
let astroCooldown = 0; // Stops the astronaut from yelling every single frame
let warnedBatteryLow = false; // One time warning flags so mission control doesn't repeat itself
let warnedBatteryDead = false;
let warnedHull = false;
let warnedKessler = false;
let warnedBurnUp = false;

// Layout Variables
let earthX = 640; // Earth center X
let earthY = 360; // Earth center Y
let earthR = 120; // Earth radius, not counting the atmosphere glow
let issOrbit = 330; // The ISS always flies the outermost orbit, so anything pushed off screen has to cross it
let orbitRings = [190, 260, 330]; // Dashed guide rings

// Tuning Variables (all the numbers from the GDD values table live here so balancing is just editing numbers)
let gravity = 269; // Gravity strength (GM). Higher = faster orbits and harder pull back toward Earth
let startCash = 500; // Every level starts at $500
let hullMax = 5; // Hull segments
let batteryMax = 1200; // 20 seconds of laser at 60fps
let satDamageCost = 250; // First hit on a working satellite
let satDestroyCost = 500; // Extra cost when it's destroyed (250 + 500 = 750 total, matches the GDD)
let turnSpeed = 3.5; // Degrees per frame for A and D
let thrustPower = 0.06; // Acceleration per frame while holding W
let maxSpeed = 4.5; // Speed cap for the ship
let flameLength = 58; // How far the engine flame reaches, which is also the push range
let pushForce = 0.12; // How hard the flame shoves things (divided by the object's mass)
let maxObjects = 120; // Cap so a chain reaction can't melt the browser
let orbitDecay = 0.9993; // Velocity kept per frame for loose objects (1 = no drag, lower = junk falls into the atmosphere faster)
let issLaserGrace = 30; // Laser grace window on the ISS, about half a second (0 = instant fail, but sweeping across it for one frame felt unfair)

let types = { // Everything that can be in orbit. r = hit radius, hp = seconds of laser to destroy, value = cash
  shard:   { file: 'Debris_Shard',          r: 13, hp: 1,   value: 100,  mass: 1,   group: 'debris' },
  panel:   { file: 'Debris_Solar_Panel',    r: 19, hp: 1,   value: 100,  mass: 1,   group: 'debris' },
  hull:    { file: 'Debris_Hull_Fragment',  r: 19, hp: 1,   value: 100,  mass: 1,   group: 'debris' },
  booster: { file: 'Debris_Rocket_Booster', r: 15, hp: 1,   value: 100,  mass: 1,   group: 'debris' },
  medium:  { file: 'Debris_Cluster_Medium', r: 29, hp: 2,   value: 300,  mass: 2.5, group: 'debris' },
  large:   { file: 'Debris_Cluster_Large',  r: 40, hp: 3.5, value: 600,  mass: 4,   group: 'debris' },
  huge:    { file: 'Debris_Cluster_Huge',   r: 52, hp: 5,   value: 1000, mass: 7,   group: 'debris' },
  dead:    { file: null,                    r: 31, hp: 2,   value: 200,  mass: 2,   group: 'debris' }, // Destroyed satellite, borrows the damaged satellite image
  gps:     { file: 'Satellite_GPS',   dmg: 'Satellite_GPS_Damaged',   r: 31, hp: 2, value: 0, mass: 2, group: 'satellite' },
  comms:   { file: 'Satellite_Comms', dmg: 'Satellite_Comms_Damaged', r: 32, hp: 2, value: 0, mass: 2, group: 'satellite' },
  iss:     { file: 'ISS',             dmg: 'ISS_Damaged',             r: 46, hp: 1, value: 0, mass: 50, group: 'iss' },
  battery: { file: 'PowerUp_Battery_Refill', r: 21, hp: 1, value: 0, mass: 1, group: 'powerup' },
  repair:  { file: 'PowerUp_Hull_Repair',    r: 21, hp: 1, value: 0, mass: 1, group: 'powerup' }
}; // End types object

let levels = [ // Only the amount of junk and satellites changes between levels, the laser battery stays the same
  { target: 2000, small: 8,  medium: 3, large: 2, huge: 0, satellites: 2 }, // Level 1: enough battery to win with just the laser
  { target: 2500, small: 10, medium: 4, large: 2, huge: 1, satellites: 3 }, // Level 2
  { target: 3000, small: 12, medium: 5, large: 3, huge: 1, satellites: 4 }, // Level 3: pushing starts to matter
  { target: 3500, small: 10, medium: 5, large: 3, huge: 1, satellites: 4 }, // Level 4
  { target: 4000, small: 12, medium: 6, large: 3, huge: 2, satellites: 5 }  // Level 5: crowded
]; // End levels array

// ******************************************
// --- SUBSECTION: PRELOAD ---
// ******************************************
function preload() { // Load everything before setup so nothing pops in late
  fontMedium = loadFont('assets/Jost-Medium.ttf'); // Body text
  fontBold = loadFont('assets/Jost-Bold.ttf'); // Labels and buttons
  fontHeavy = loadFont('assets/Jost-ExtraBold.ttf'); // Big numbers and titles

  imgTitle = loadImage('assets/Title_Screen.jpg'); // Title screen artboard
  imgEarth = loadImage('assets/Earth.png'); // Earth cropped out of the HUD artboard
  imgShip = loadImage('assets/Spaceship.png'); // Spaceship without the flame (flame is drawn in code)
  imgShipDamaged = loadImage('assets/Spaceship_Damaged.png'); // Damaged spaceship
  imgMissionControl = loadImage('assets/Mission_Control.png'); // Mission Control portrait
  imgAstronaut = loadImage('assets/Astronaut.png'); // ISS Astronaut portrait

  sndTitleMusic = loadSound('assets/Title_Music.mp3'); // Slow spacey title theme
  sndGameMusic = loadSound('assets/Gameplay_Music.mp3'); // Chill chiptune for gameplay
  sndLaser = loadSound('assets/Laser_Beam.wav'); // Laser hum loop
  sndThrust = loadSound('assets/Engine_Thrust.wav'); // Engine loop
  sndDebris = loadSound('assets/Debris_Destroyed.wav'); // Debris breaking apart
  sndSatExplode = loadSound('assets/Satellite_Explosion.wav'); // Satellite blowing up
  sndBigExplode = loadSound('assets/Big_Explosion.wav'); // ISS hit or ship destroyed
  sndCollision = loadSound('assets/Collision.wav'); // Metal clang
  sndPowerUp = loadSound('assets/PowerUp.wav'); // Grabbing a power up
  sndRadio = loadSound('assets/Radio_Blip.wav'); // Radio message blip
  sndClick = loadSound('assets/Button_Click.wav'); // Menu button
  sndPenalty = loadSound('assets/Penalty.wav'); // Losing money on a satellite
  sndWin = loadSound('assets/Win_Jingle.wav'); // Contract complete
  sndLose = loadSound('assets/Lose_Jingle.wav'); // Mission failed

  for (let key in types) { // Loops through every object type
    let t = types[key]; // Shorthand
    if (t.file) t.img = loadImage('assets/' + t.file + '.png'); // Normal image
    if (t.dmg) t.dmgImg = loadImage('assets/' + t.dmg + '.png'); // Damaged image if it has one
  } // End image loop
} // End preload function

// ******************************************
// --- SUBSECTION: CANVAS SETUP ---
// ******************************************
function setup() { // Initializes the canvas and core game settings
  createCanvas(1280, 720); // Same size as the artboards in Illustrator
  angleMode(DEGREES); // Degrees, because radians are still bad
  imageMode(CENTER); // All the sprites are exported centered on their pivot point

  for (let i = 0; i < 220; i++) { // Generates 220 background stars once
    stars.push({ // Adds a star to the array
      x: random(width), // Random X
      y: random(height), // Random Y
      baseSize: random(1, 2.6), // Base size in pixels
      speed: random(1, 3), // Twinkle speed (same trick as my clock homework)
      offset: random(360), // Random start so they don't all pulse together
      sparkle: random(1) < 0.03 // About 3% get drawn as the 4 point sparkles from the mockup
    }); // End star object
  } // End star loop

  ship = new Spaceship(); // Placeholder ship so nothing is undefined before the first level loads

  sndTitleMusic.setVolume(0.35); // Title music at 35%
  sndGameMusic.setVolume(0.2); // Gameplay music at 20% so the sound effects can cut through
  sndLaser.setVolume(0); // Starts at 0, turned up while firing (same trick as my NYC commute game so the loop never restarts with a gap)
  sndThrust.setVolume(0); // Starts at 0, turned up while thrusting
  sndDebris.setVolume(0.35); // Debris breaking at 35%
  sndSatExplode.setVolume(0.5); // Satellite explosion at 50%
  sndBigExplode.setVolume(0.6); // Big explosion at 60%
  sndCollision.setVolume(0.4); // Clang at 40%
  sndPowerUp.setVolume(0.4); // Power up at 40%
  sndRadio.setVolume(0.15); // Radio blip at 15% (it plays a lot)
  sndClick.setVolume(0.3); // Button at 30%
  sndPenalty.setVolume(0.3); // Penalty buzz at 30%
  sndWin.setVolume(0.5); // Win jingle at 50%
  sndLose.setVolume(0.5); // Lose jingle at 50%

  sndTitleMusic.loop(); // Title music (browsers hold it until the first click or key press, then it starts)
} // End setup function


// ==========================================
// --- SECTION 2: MAIN DRAW LOOP ---
// ==========================================
function draw() { // Main game loop that runs 60 times a second
  background(11, 16, 38); // Dark navy space

  if (gameState === 0) { // Title screen
    image(imgTitle, width / 2, height / 2, width, height); // The title artboard already has the logo, controls, and start prompt on it
    drawTitleCredits(); // Music and sound effect credits along the bottom
    stateTimer++; // Counts frames on the title screen
    return; // Nothing else to draw
  } // End title screen

  if (gameState === 1) { // Only update physics while actually playing
    updateGame(); // Moves everything, fires the laser, checks collisions, checks win/lose
  } // End gameplay update

  // 1. WORLD (gets shaken, HUD does not)
  push(); // World container
  if (shakeTimer > 0) { // If something just crashed
    translate(random(-4, 4), random(-4, 4)); // Jitters the whole world a few pixels
    if (gameState === 1) shakeTimer--; // Counts down (frozen when paused or on results)
  } // End shake
  drawStars(); // Twinkling stars
  drawOrbitRings(); // Dashed guide rings
  image(imgEarth, earthX, earthY, imgEarth.width / 2, imgEarth.height / 2); // Earth (exported at 2x for retina screens)

  for (let o of objects) o.show(); // Draws everything in orbit
  drawLaser(); // Laser beam goes under the ship but over the objects
  if (!shipExploded) ship.show(); // Ship disappears if it blew up

  for (let s of sparks) s.show(); // Laser sparks
  for (let c of chunks) c.show(); // Debris chunks
  for (let e of explosionParticles) e.show(); // Explosions
  for (let f of floatingTexts) f.show(); // Cash popups
  pop(); // End world container

  // 2. HUD
  drawHUD(); // Cash, level, hull, battery, radio

  // 3. OVERLAYS
  if (gameState === 2) drawPauseOverlay(); // Paused
  if (gameState === 3) drawResultsPanel(true); // Contract complete
  if (gameState === 4) drawResultsPanel(false); // Mission failed

  stateTimer++; // Counts frames in the current state
} // End draw loop

function updateGame() { // Everything that happens in one frame of gameplay
  // Ship
  ship.update(); // Rotation, thrust, edges, Earth bounce

  // Laser
  ship.isFiring = keyIsDown(32) && ship.battery > 0; // Spacebar fires only if there's battery left
  sndLaser.setVolume(ship.isFiring ? 0.25 : 0, 0.05); // Fades the laser hum in and out
  ship.beamEnd = null; // Clears last frame's beam
  if (ship.isFiring) { // If firing
    ship.battery--; // Drains one frame of battery
    fireLaser(); // Raycast and damage
  } // End laser check

  if (iss.hp < issLaserGrace) iss.hp += 0.25; // The laser grace window slowly refills when the beam isn't on the station

  // Engine push
  if (ship.isThrusting) applyEnginePush(); // The flame shoves anything it touches

  // Objects
  for (let i = objects.length - 1; i >= 0; i--) { // Backwards so splice doesn't skip anything
    let o = objects[i]; // Shorthand
    if (!o.dead) o.update(); // Orbit or drift

    if (!o.dead && !o.onRail) { // Only loose objects can fall or fly away
      let d = dist(o.pos.x, o.pos.y, earthX, earthY); // Distance to Earth center
      if (d < earthR + o.r * 0.3) { // Hit the atmosphere
        burnUp(o); // Burns up on reentry
      } else if (o.pos.x < -80 || o.pos.x > width + 80 || o.pos.y < -80 || o.pos.y > height + 80) { // Way off screen
        leftOrbit(o); // Gone for good
      } // End removal checks
    } // End loose object checks

    if (o.dead) objects.splice(i, 1); // Removes anything flagged as dead
  } // End objects loop

  checkCollisions(); // Ship vs objects and objects vs objects
  checkISSProximity(); // Astronaut yells if stuff gets too close

  // Particles
  updateParticles(sparks); // Laser sparks
  updateParticles(chunks); // Debris chunks
  updateParticles(explosionParticles); // Explosions
  updateParticles(floatingTexts); // Cash popups

  // Power ups
  powerUpTimer--; // Counts down to the next drop
  if (powerUpTimer <= 0) { // Time for a new one
    let count = objects.filter(o => o.info.group === 'powerup').length; // How many are out there already
    if (count < 2) { // Max 2 at a time
      spawnOnOrbit(random(1) < 0.65 ? 'battery' : 'repair'); // Random power up (batteries are a little more common since the laser is the main tool)
      radio('mc', "Dropped a power-up in orbit for you."); // Lets the player know
    } // End count check
    powerUpTimer = 1200; // Next drop in 20 seconds
  } // End power up timer

  // Radio timers
  if (radioTimer > 0) radioTimer--; // Message countdown
  if (astroCooldown > 0) astroCooldown--; // Astronaut cooldown

  // Warnings
  if (!warnedBatteryLow && ship.battery < batteryMax * 0.25 && ship.battery > 0) { // Under 25%
    radio('mc', "Laser battery's getting low."); // Heads up
    warnedBatteryLow = true; // Only once
  } // End low battery warning
  if (!warnedBatteryDead && ship.battery <= 0) { // Empty
    radio('mc', "Laser's dead. Use your engine to push stuff."); // Hint to use the push
    warnedBatteryDead = true; // Only once
  } // End dead battery warning
  if (!warnedHull && ship.hull === 1) { // One segment left
    radio('mc', "Hull's barely holding together. Find a hull repair."); // Hint to grab a power up
    warnedHull = true; // Only once
  } // End hull warning

  // Win / Lose
  if (cash >= target) levelComplete(); // Hit the cash target
  else if (cash < 0) missionFailed('broke'); // Went broke
  else if (ship.hull <= 0) missionFailed('hull'); // Ship's done
} // End update game function


// ==========================================
// --- SECTION 3: DRAW COMPONENTS ---
// ==========================================

// ******************************************
// --- SUBSECTION: ENVIRONMENT ---
// ******************************************
function drawStars() { // Twinkling background stars
  push(); // Stars container
  noStroke(); // No outlines
  for (let s of stars) { // Loops through every star
    let size = s.baseSize + sin(frameCount * s.speed + s.offset) * 0.8; // Sine wave pulse
    fill(255, 255, 255, s.sparkle ? 230 : 150); // Sparkles are brighter
    if (s.sparkle) { // 4 point sparkle
      let r = size * 3; // Sparkle arm length
      beginShape(); // Sparkle shape
      vertex(s.x, s.y - r); // Top point
      vertex(s.x + r * 0.25, s.y - r * 0.25); // Inner corner
      vertex(s.x + r, s.y); // Right point
      vertex(s.x + r * 0.25, s.y + r * 0.25); // Inner corner
      vertex(s.x, s.y + r); // Bottom point
      vertex(s.x - r * 0.25, s.y + r * 0.25); // Inner corner
      vertex(s.x - r, s.y); // Left point
      vertex(s.x - r * 0.25, s.y - r * 0.25); // Inner corner
      endShape(CLOSE); // Closes the sparkle
    } else { // Normal dot star
      circle(s.x, s.y, max(0.5, size)); // Minimum 0.5 so they never fully disappear
    } // End star type
  } // End star loop
  pop(); // End stars container
} // End draw stars function

function drawOrbitRings() { // Dashed rings around Earth like the mockup
  push(); // Ring container
  noFill(); // Hollow circles
  stroke(38, 48, 92); // Faint navy blue
  strokeWeight(2); // Thin
  drawingContext.setLineDash([4, 14]); // Dashed line
  for (let r of orbitRings) circle(earthX, earthY, r * 2); // One ring per radius
  drawingContext.setLineDash([]); // Resets the dash so it doesn't leak into other shapes
  pop(); // End ring container
} // End orbit rings function

function drawLaser() { // Draws the beam from the nose to whatever it hit
  if (!ship.isFiring || !ship.beamEnd) return; // Nothing to draw
  let nose = ship.nosePos(); // Start point
  let pulse = sin(frameCount * 40) * 1.5; // Little shimmer in the beam width

  push(); // Laser container
  strokeCap(ROUND); // Rounded ends
  stroke(61, 225, 255, 70); // Outer glow, translucent cyan
  strokeWeight(10 + pulse); // Wide
  line(nose.x, nose.y, ship.beamEnd.x, ship.beamEnd.y); // Glow line
  stroke(61, 225, 255); // Solid cyan
  strokeWeight(5); // Medium
  line(nose.x, nose.y, ship.beamEnd.x, ship.beamEnd.y); // Main beam
  stroke(255); // White core
  strokeWeight(2); // Thin
  line(nose.x, nose.y, ship.beamEnd.x, ship.beamEnd.y); // Core line

  noStroke(); // Impact glow at the end of the beam
  fill(61, 225, 255, 90); // Translucent cyan
  circle(ship.beamEnd.x, ship.beamEnd.y, 18 + pulse * 2); // Outer glow
  fill(255); // White
  circle(ship.beamEnd.x, ship.beamEnd.y, 7); // Hot spot
  pop(); // End laser container
} // End draw laser function

// ******************************************
// --- SUBSECTION: HUD ---
// ******************************************
function drawHUD() { // Everything that sits on top of the game
  push(); // HUD container

  // Cash panel (top left)
  hudPanel(24, 22, 380, 95); // Panel background
  fill(175, 185, 215); // Light gray blue labels
  noStroke(); // No outline on text
  textFont(fontBold); // Bold labels
  textSize(17); // Label size
  spacedText("CASH", 46, 48, 2, LEFT); // Cash label
  spacedText("TARGET " + money(target), 382, 48, 2, RIGHT); // Target label
  fill(cash < 0 ? color(255, 110, 90) : 255); // Turns red if negative
  textFont(fontHeavy); // Heavy numbers
  textSize(40); // Big
  textAlign(LEFT, BASELINE); // Baseline aligned
  text(money(cash), 44, 98); // Cash amount

  let barX = 198; // Progress bar X
  let barW = 184; // Progress bar width
  fill(42, 54, 100); // Empty track
  rect(barX, 70, barW, 16, 8); // Track
  let progress = constrain(cash / target, 0, 1); // How close to the target
  fill(91, 227, 125); // Green fill
  if (progress > 0) rect(barX, 70, max(16, barW * progress), 16, 8); // Fill (min 16 so the rounded ends don't look weird)

  // Level badge (top right)
  hudPanel(1096, 22, 160, 60); // Badge background
  fill(255); // White
  textFont(fontBold); // Bold
  textSize(28); // Size
  spacedText("LEVEL " + (level + 1), 1176, 62, 2, CENTER); // Level number

  // Hull and laser panel (bottom left)
  hudPanel(24, 593, 380, 107); // Panel background
  fill(175, 185, 215); // Label color
  textFont(fontBold); // Bold
  textSize(17); // Label size
  spacedText("HULL", 46, 632, 2, LEFT); // Hull label
  spacedText("LASER", 46, 678, 2, LEFT); // Laser label

  let segW = 50; // Width of one hull segment
  for (let i = 0; i < hullMax; i++) { // One segment per hull point
    let filled = i < ship.hull; // Is this segment still there
    fill(filled ? color(228, 87, 46) : color(42, 54, 100)); // Orange red if filled, track color if not
    let corners = [i === 0 ? 10 : 0, i === hullMax - 1 ? 10 : 0]; // Only the outer ends get rounded
    rect(132 + i * segW, 616, segW, 20, corners[0], corners[1], corners[1], corners[0]); // Segment
  } // End hull loop
  stroke(28, 33, 48); // Dark divider lines between segments
  strokeWeight(2); // Thin
  for (let i = 1; i < hullMax; i++) line(132 + i * segW, 616, 132 + i * segW, 636); // Dividers
  noStroke(); // Back to no stroke

  fill(42, 54, 100); // Laser track
  rect(132, 662, 250, 20, 10); // Track
  let charge = ship.battery / batteryMax; // Battery percentage
  let lowBlink = charge < 0.25 && frameCount % 30 < 15; // Blinks when low
  fill(lowBlink ? color(255, 110, 90) : color(61, 225, 255)); // Cyan, or red when blinking
  if (charge > 0) rect(132, 662, max(20, 250 * charge), 20, 10); // Battery fill

  // Radio message (bottom right)
  if (radioTimer > 0) drawRadio(); // Only when someone is talking

  pop(); // End HUD container
} // End draw HUD function

function hudPanel(x, y, w, h) { // Dark rounded panel with the teal border
  fill(19, 26, 56); // Panel fill
  stroke(38, 140, 170); // Teal border
  strokeWeight(3); // Border thickness
  rect(x, y, w, h, 14); // Rounded rectangle
  noStroke(); // Resets stroke for whatever comes next
} // End HUD panel function

function drawRadio() { // Speech bubble with a portrait
  let fade = min(1, radioTimer / 20); // Fades out over the last 20 frames
  push(); // Radio container
  drawingContext.globalAlpha = fade; // Applies the fade to everything in here

  fill(242, 244, 247); // Off white bubble
  stroke(28, 33, 48); // Dark outline
  strokeWeight(4); // Outline thickness
  rect(790, 607, 370, 74, 14); // Bubble

  noStroke(); // Text has no stroke
  fill(228, 87, 46); // Orange header
  textFont(fontBold); // Bold
  textSize(14); // Small
  spacedText(radioWho === 'astro' ? "ISS ASTRONAUT" : "MISSION CONTROL", 808, 632, 2, LEFT); // Who's talking

  fill(28, 33, 48); // Dark text
  textFont(fontMedium); // Regular weight
  let size = 17; // Message size
  textSize(size); // Starts at 17
  while (textWidth(radioText) > 336 && size > 12) { size--; textSize(size); } // Shrinks long messages until they fit in the bubble
  textAlign(LEFT, BASELINE); // Baseline aligned
  text(radioText, 808, 661); // Message

  fill(28, 33, 48); // Dark ring behind the portrait
  circle(1200, 645, 96); // Portrait backing
  image(radioWho === 'astro' ? imgAstronaut : imgMissionControl, 1200, 645, 90, 90); // Portrait
  pop(); // End radio container
} // End radio function

// ******************************************
// --- SUBSECTION: MENUS ---
// ******************************************
function drawPauseOverlay() { // Paused screen
  push(); // Pause container
  fill(11, 16, 38, 180); // Dims the game
  noStroke(); // No outline
  rect(0, 0, width, height); // Full screen
  fill(255); // White
  textFont(fontHeavy); // Heavy
  textSize(64); // Big
  spacedText("PAUSED", width / 2, height / 2, 6, CENTER); // Title
  fill(175, 185, 215); // Gray blue
  textFont(fontMedium); // Regular
  textSize(20); // Small
  textAlign(CENTER, BASELINE); // Centered
  text("Press P to keep flying", width / 2, height / 2 + 44); // Hint
  pop(); // End pause container
} // End pause overlay function

function drawResultsPanel(won) { // Contract complete / mission failed card
  let lastLevel = level === levels.length - 1; // Is this the final level
  let px = 400; // Panel left
  let py = 160; // Panel top
  let pw = 480; // Panel width
  let ph = 400; // Panel height
  let headerColor = won ? color(63, 166, 107) : color(228, 87, 46); // Green or orange red

  push(); // Results container
  fill(11, 16, 38, 170); // Dims the frozen game behind the card
  noStroke(); // No outline
  rect(0, 0, width, height); // Full screen

  // Card
  fill(242, 244, 247); // Off white body
  stroke(28, 33, 48); // Dark outline
  strokeWeight(4); // Outline thickness
  rect(px, py, pw, ph, 22); // Card body
  fill(headerColor); // Header color
  rect(px, py, pw, 105, 22, 22, 0, 0); // Header (only top corners rounded)

  // Icon badge on the top edge
  fill(won ? color(232, 179, 58) : headerColor); // Gold star badge or red X badge
  circle(width / 2, py, 64); // Badge circle
  if (won) { // Star
    fill(255, 244, 194); // Pale yellow star
    strokeWeight(3); // Star outline
    beginShape(); // 5 point star
    for (let i = 0; i < 10; i++) { // 10 points, alternating outer and inner
      let r = i % 2 === 0 ? 20 : 9; // Outer or inner radius
      vertex(width / 2 + cos(-90 + i * 36) * r, py + sin(-90 + i * 36) * r); // Star point
    } // End star loop
    endShape(CLOSE); // Close star
  } else { // X
    stroke(255); // White X
    strokeWeight(5); // Thick
    line(width / 2 - 12, py - 12, width / 2 + 12, py + 12); // Slash
    line(width / 2 - 12, py + 12, width / 2 + 12, py - 12); // Backslash
  } // End icon

  // Title
  textFont(fontHeavy); // Heavy
  textSize(won ? 33 : 38); // Contract complete is a longer title so it gets a smaller size
  outlinedText(won ? (lastLevel ? "ALL CONTRACTS DONE" : "CONTRACT COMPLETE") : "MISSION FAILED", width / 2, py + 78); // White text with dark outline

  // Subtitle
  noStroke(); // No outline
  fill(74, 81, 96); // Gray text
  textFont(fontMedium); // Regular
  textSize(19); // Size
  textAlign(CENTER, BASELINE); // Centered
  let subtitle = failReason; // Losing line
  if (won) subtitle = lastLevel ? "That was the last contract. Orbit owes you one." : "The sky's a little cleaner. Nice flying."; // Winning line
  text(subtitle, width / 2, py + 148); // Subtitle

  // Stat rows
  let rows = [ // Label and value pairs
    [won ? "Cash earned" : "Cash", won ? money(cash - startCash) : money(cash) + " / " + money(target)], // Cash row
    ["Debris cleared", debrisCleared], // Debris row
    ["Satellites hit", satellitesHit] // Satellites row
  ]; // End rows array
  for (let i = 0; i < rows.length; i++) { // One row at a time
    let y = py + 195 + i * 42; // Row baseline
    fill(74, 81, 96); // Gray label
    textFont(fontMedium); // Regular
    textSize(20); // Size
    textAlign(LEFT, BASELINE); // Left
    text(rows[i][0], px + 44, y); // Label
    fill(28, 33, 48); // Dark value
    textFont(fontHeavy); // Heavy
    textSize(22); // Size
    textAlign(RIGHT, BASELINE); // Right
    text(rows[i][1], px + pw - 44, y); // Value
    if (i < rows.length - 1) { // Divider under every row except the last
      stroke(213, 218, 227); // Light gray
      strokeWeight(2); // Thin
      line(px + 44, y + 15, px + pw - 44, y + 15); // Divider
      noStroke(); // Reset
    } // End divider
  } // End rows loop

  // Buttons
  let primaryLabel = won ? (lastLevel ? "PLAY AGAIN" : "NEXT LEVEL") : "RETRY"; // Primary button label
  drawButton(primaryLabel, 535, py + 335, 200, 54, true); // Primary (filled)
  drawButton("MENU", 760, py + 335, 170, 54, false); // Secondary (outlined)
  pop(); // End results container
} // End results panel function

function drawButton(label, cx, cy, w, h, primary) { // Pill button
  let hover = mouseX > cx - w / 2 && mouseX < cx + w / 2 && mouseY > cy - h / 2 && mouseY < cy + h / 2; // Mouse over check
  push(); // Button container
  rectMode(CENTER); // Draw from center
  stroke(28, 33, 48); // Dark outline
  strokeWeight(3); // Outline thickness
  if (primary) fill(hover ? color(240, 110, 70) : color(228, 87, 46)); // Orange, lighter on hover
  else fill(hover ? color(225, 229, 236) : 255); // White, slightly gray on hover
  rect(cx, cy, w, h, h / 2); // Pill shape
  noStroke(); // No outline on text
  fill(primary ? 255 : color(28, 33, 48)); // White text on orange, dark text on white
  textFont(fontBold); // Bold
  textSize(20); // Size
  spacedText(label, cx, cy + 7, 3, CENTER); // Label
  pop(); // End button container
} // End button function

// ******************************************
// --- SUBSECTION: HELPERS ---
// ******************************************
function spacedText(str, x, y, spacing, align) { // p5 doesn't have letter spacing for loaded fonts, so this draws one letter at a time
  let total = 0; // Total width of the string with spacing
  for (let c of str) total += textWidth(c) + spacing; // Adds up every character
  total -= spacing; // No spacing after the last letter
  let startX = x; // Left aligned by default
  if (align === CENTER) startX = x - total / 2; // Centered
  if (align === RIGHT) startX = x - total; // Right aligned
  textAlign(LEFT, BASELINE); // Draw each character from its left edge
  for (let c of str) { // One character at a time
    text(c, startX, y); // Draws the character
    startX += textWidth(c) + spacing; // Moves over for the next one
  } // End character loop
} // End spaced text function

function outlinedText(str, x, y) { // White title text with a thick dark outline like the results artboards
  textAlign(CENTER, BASELINE); // Centered
  stroke(28, 33, 48); // Dark outline
  strokeWeight(9); // Thick
  strokeJoin(ROUND); // Rounded corners on the outline
  noFill(); // Outline pass only
  text(str, x, y); // Outline
  noStroke(); // Fill pass only (doing it in two passes so the stroke doesn't eat into the letters)
  fill(242, 244, 247); // Off white
  text(str, x, y); // Fill
} // End outlined text function

function drawTitleCredits() { // Credits for the music and sound effects on the title screen
  push(); // Credits container
  textFont(fontMedium); // Regular weight
  textSize(14); // Small
  textAlign(CENTER, BASELINE); // Centered
  let lines = [ // One line for music, one for everything else
    'Music: "Echoes of a Space Age" by Sorth and "Asteroids" by HoliznaCC0, both CC0 via OpenGameArt',
    'Sound effects: Kenney (kenney.nl), CC0  ·  Typeface: Jost by indestructible type*, SIL Open Font License'
  ]; // End lines array
  for (let i = 0; i < lines.length; i++) { // Draws each line
    let y = height - 30 + i * 19; // Line position
    stroke(11, 16, 38, 200); // Dark outline so it reads over the Earth art
    strokeWeight(4); // Outline thickness
    strokeJoin(ROUND); // Smooth outline corners
    noFill(); // Outline pass
    text(lines[i], width / 2, y); // Outline
    noStroke(); // Fill pass
    fill(242, 244, 247, 230); // Off white
    text(lines[i], width / 2, y); // Text
  } // End lines loop
  pop(); // End credits container
} // End title credits function

function money(n) { // Turns 1250 into $1,250 and -250 into -$250
  return (n < 0 ? "-$" : "$") + Math.abs(round(n)).toLocaleString('en-US'); // Adds commas
} // End money function

function radio(who, msg) { // Shows a message in the bottom right bubble
  radioWho = who; // Mission Control or the astronaut
  radioText = msg; // Message
  radioTimer = 210; // 3.5 seconds
  sndRadio.play(); // Little blip so you look at the bubble
} // End radio function


// ==========================================
// --- SECTION 4: CLASSES ---
// ==========================================

// ******************************************
// --- SUBSECTION: SPACESHIP CLASS ---
// ******************************************
class Spaceship { // The player
  constructor() { // Initializes ship properties
    this.pos = createVector(140, 360); // Starts on the left side, outside every orbit and clear of the HUD panels
    this.vel = createVector(0, 0); // Not moving
    this.heading = 90; // Degrees, 0 = nose pointing up, so 90 points right at Earth
    this.hull = hullMax; // Full hull
    this.battery = batteryMax; // Full laser battery
    this.invincible = 0; // Frames of invincibility after getting hit
    this.isThrusting = false; // Holding W
    this.isFiring = false; // Holding spacebar
    this.beamEnd = null; // Where the laser stops this frame
    this.flameSize = 0; // 0 to 1, ramps up so the flame doesn't just pop in
    this.r = 15; // Hit radius for each of the two hit circles
  } // End constructor

  forward() { // Unit vector pointing out of the nose
    return createVector(sin(this.heading), -cos(this.heading)); // 0 degrees = up
  } // End forward method

  nosePos() { // Tip of the nose, where the laser comes out
    return p5.Vector.add(this.pos, p5.Vector.mult(this.forward(), 34)); // 34px ahead of center
  } // End nose method

  nozzlePos() { // Bottom of the engine, where the flame starts
    return p5.Vector.add(this.pos, p5.Vector.mult(this.forward(), -34)); // 34px behind center
  } // End nozzle method

  hitCircles() { // Two circles cover the long body better than one big one
    let f = this.forward(); // Forward direction
    return [p5.Vector.add(this.pos, p5.Vector.mult(f, 14)), p5.Vector.add(this.pos, p5.Vector.mult(f, -14))]; // Front and back circle centers
  } // End hit circles method

  update() { // Physics and input logic
    if (keyIsDown(65)) this.heading -= turnSpeed; // A rotates left
    if (keyIsDown(68)) this.heading += turnSpeed; // D rotates right

    this.isThrusting = keyIsDown(87); // W thrusts
    if (this.isThrusting) { // If thrusting
      this.vel.add(p5.Vector.mult(this.forward(), thrustPower)); // Accelerates in the direction the nose is pointing
      this.vel.limit(maxSpeed); // Speed cap
    } // End thrust
    this.flameSize = lerp(this.flameSize, this.isThrusting ? 1 : 0, 0.3); // Flame grows and shrinks smoothly
    sndThrust.setVolume(this.isThrusting ? 0.3 : 0, 0.05); // Fades the engine loop in and out

    this.pos.add(this.vel); // No friction in space, so no brakes. Rotate 180 and burn to slow down.

    // Screen edges act like walls so you can't fly off and get lost
    if (this.pos.x < 20) { this.pos.x = 20; this.vel.x *= -0.5; } // Left wall
    if (this.pos.x > width - 20) { this.pos.x = width - 20; this.vel.x *= -0.5; } // Right wall
    if (this.pos.y < 20) { this.pos.y = 20; this.vel.y *= -0.5; } // Top wall
    if (this.pos.y > height - 20) { this.pos.y = height - 20; this.vel.y *= -0.5; } // Bottom wall

    // Earth is solid
    let toShip = createVector(this.pos.x - earthX, this.pos.y - earthY); // Earth to ship
    if (toShip.mag() < earthR + 20) { // Touching the planet
      let n = toShip.copy().normalize(); // Direction straight out from Earth
      this.pos = createVector(earthX, earthY).add(p5.Vector.mult(n, earthR + 20)); // Pushes the ship back out
      let vn = this.vel.dot(n); // How fast it was moving into the planet
      if (vn < 0) this.vel.sub(p5.Vector.mult(n, vn * 1.6)); // Bounces off
      if (vn < -1) damageShip(); // Only a real crash hurts, gently bumping the atmosphere is fine
    } // End Earth check

    if (this.invincible > 0) this.invincible--; // Counts down invincibility
  } // End update method

  show() { // Draws the ship
    push(); // Ship container
    translate(this.pos.x, this.pos.y); // Move to ship
    rotate(this.heading); // Point the nose
    if (this.flameSize > 0.05) this.drawFlame(); // Flame goes under the ship
    let blink = this.invincible > 0 && frameCount % 8 < 4; // Flickers while invincible
    if (!blink) { // Skips drawing on blink frames
      let img = this.hull <= 2 ? imgShipDamaged : imgShip; // Swaps to the damaged art when the hull is low
      image(img, 0, 0, img.width / 2, img.height / 2); // Draws the sprite at half size (exported at 2x)
    } // End blink check
    pop(); // End ship container
  } // End show method

  drawFlame() { // Engine flame, drawn in code so it can flicker and grow
    let flicker = random(0.85, 1.1); // Random length every frame
    let len = flameLength * this.flameSize * flicker; // Current flame length
    noStroke(); // No outlines
    fill(255, 138, 31); // Outer orange
    this.flameShape(8.5, len); // Outer layer
    fill(255, 194, 61); // Middle yellow
    this.flameShape(6, len * 0.72); // Middle layer
    fill(255, 244, 194); // Pale core
    this.flameShape(3.3, len * 0.45); // Inner core
  } // End flame method

  flameShape(halfW, len) { // Teardrop shape hanging off the nozzle
    let y0 = 31; // Nozzle bottom in local coordinates
    beginShape(); // Teardrop
    vertex(-halfW * 0.8, y0); // Left edge at the nozzle
    bezierVertex(-halfW * 1.25, y0 + len * 0.35, -halfW * 0.5, y0 + len * 0.75, 0, y0 + len); // Curves down to the tip
    bezierVertex(halfW * 0.5, y0 + len * 0.75, halfW * 1.25, y0 + len * 0.35, halfW * 0.8, y0); // Curves back up the right side
    endShape(CLOSE); // Closes the teardrop
  } // End flame shape method
} // End spaceship class

// ******************************************
// --- SUBSECTION: SPACE OBJECT CLASS ---
// ******************************************
class SpaceObject { // Debris, satellites, the ISS, and power ups all use this
  constructor(type, orbitR, angle) { // Initializes object properties
    this.type = type; // Key in the types object
    this.info = types[type]; // Shorthand for the type info
    this.r = this.info.r; // Hit radius
    this.hp = this.info.hp * 60; // Laser health in frames
    this.mass = this.info.mass; // Heavier = harder to push

    this.onRail = true; // Starts locked to a perfect circular orbit
    this.orbitR = orbitR; // Distance from Earth
    this.angle = angle; // Position around Earth in degrees
    this.omega = sqrt(gravity / pow(orbitR, 3)) * 180 / PI; // Orbit speed in degrees per frame (closer = faster, like real orbits)
    this.pos = createVector(0, 0); // Position
    this.vel = createVector(0, 0); // Velocity
    this.setRailPosition(); // Puts it on its orbit

    this.damaged = false; // Swaps to the damaged image
    this.dead = false; // Flag to remove it from the array
    this.counted = false; // So a satellite only counts once in satellitesHit
    this.imgOverride = null; // Used by dead satellites to borrow the damaged satellite image
    this.threat = false; // True when it's drifting toward the ISS
    this.grace = 0; // Frames where it can't hit other objects (stops brand new shards from instantly crashing into their parents)
    this.spinSpeed = this.info.group === 'debris' ? random(-0.6, 0.6) : 0; // Debris tumbles, satellites and the ISS don't
    this.spin = this.info.group === 'debris' ? random(360) : this.angle + 90; // Satellites face along their orbit
  } // End constructor

  setRailPosition() { // Calculates position and velocity on a circular orbit
    this.pos.set(earthX + cos(this.angle) * this.orbitR, earthY + sin(this.angle) * this.orbitR); // Point on the circle
    let speed = this.omega * PI / 180 * this.orbitR; // Converts degrees per frame into pixels per frame
    this.vel.set(-sin(this.angle) * speed, cos(this.angle) * speed); // Tangent to the circle
  } // End rail position method

  knockFree() { // Something hit or pushed it, so now real gravity takes over
    if (!this.onRail) return; // Already loose
    this.onRail = false; // Off the rail (velocity carries over from the orbit, so it keeps going the same way)
    if (this.info.group !== 'debris') this.spinSpeed = random(-1.5, 1.5); // Satellites start tumbling once they get knocked loose
  } // End knock free method

  update() { // Physics update
    if (this.onRail) { // Still on its perfect orbit
      this.angle += this.omega; // Moves around Earth
      this.setRailPosition(); // Updates position
      if (this.info.group !== 'debris' && this.info.group !== 'powerup') this.spin = this.angle + 90; // Keeps satellites lined up with the orbit
    } else { // Loose
      let pull = createVector(earthX - this.pos.x, earthY - this.pos.y); // Points at Earth
      let d = max(pull.mag(), 20); // Distance (min 20 so it never divides by zero)
      pull.setMag(gravity / (d * d)); // Gravity gets weaker with distance squared
      this.vel.add(pull); // Applies gravity
      this.vel.mult(orbitDecay); // A tiny bit of drag from the upper atmosphere, so loose junk slowly spirals down and burns up instead of bouncing around forever
      this.vel.limit(7); // Speed cap so crazy collisions don't launch stuff at light speed
      this.pos.add(this.vel); // Moves
    } // End rail check
    this.spin += this.spinSpeed; // Tumble
    if (this.grace > 0) this.grace--; // Counts down the grace period
  } // End update method

  show() { // Draws the object
    let img = this.imgOverride || (this.damaged && this.info.dmgImg ? this.info.dmgImg : this.info.img); // Picks the right image
    push(); // Object container
    translate(this.pos.x, this.pos.y); // Move to object
    rotate(this.spin); // Tumble or orbit alignment
    let s = 1; // Size multiplier
    if (this.info.group === 'powerup') s = 1 + sin(frameCount * 6) * 0.08; // Power ups pulse so they stand out
    if (this.type === 'dead') tint(150, 150, 170); // Dead satellites get grayed out
    image(img, 0, 0, img.width / 2 * s, img.height / 2 * s); // Draws at half size (exported at 2x)
    pop(); // End object container

    if (this.threat) { // Heading for the ISS
      push(); // Warning ring container
      noFill(); // Hollow ring
      stroke(255, 77, 77, 150 + sin(frameCount * 15) * 100); // Blinking red
      strokeWeight(3); // Thick enough to notice
      drawingContext.setLineDash([8, 6]); // Dashed
      circle(this.pos.x, this.pos.y, this.r * 2 + 16); // Ring around the object
      drawingContext.setLineDash([]); // Resets the dash
      pop(); // End warning ring container
    } // End threat ring
  } // End show method
} // End space object class

// ******************************************
// --- SUBSECTION: PARTICLE CLASSES ---
// ******************************************
class Spark { // Tiny bright bits where the laser hits
  constructor(x, y) { // Spark properties
    this.x = x; // Start X
    this.y = y; // Start Y
    let a = random(360); // Random direction
    let s = random(1, 3.5); // Random speed
    this.vx = cos(a) * s; // X velocity
    this.vy = sin(a) * s; // Y velocity
    this.alpha = 255; // Fully visible
    this.size = random(2, 4); // Size
  } // End constructor

  update() { // Physics update
    this.x += this.vx; // Move X
    this.y += this.vy; // Move Y
    this.alpha -= 18; // Fades fast
  } // End update

  show() { // Render
    noStroke(); // No outline
    fill(255, 240, 150, this.alpha); // Hot yellow white
    circle(this.x, this.y, this.size); // Spark
  } // End show
} // End spark class

class Chunk { // Gray bits that fly off when debris gets destroyed
  constructor(x, y, vx, vy) { // Chunk properties
    this.x = x + random(-8, 8); // Start X with some spread
    this.y = y + random(-8, 8); // Start Y with some spread
    let a = random(360); // Random direction
    let s = random(0.5, 2.5); // Random speed
    this.vx = vx + cos(a) * s; // Inherits the debris velocity plus a burst
    this.vy = vy + sin(a) * s; // Same for Y
    this.rot = random(360); // Starting rotation
    this.rotSpeed = random(-8, 8); // Spin
    this.size = random(3, 7); // Size
    this.alpha = 255; // Fully visible
    this.col = random([color(138, 147, 166), color(213, 218, 227), color(74, 81, 96)]); // Same grays as the debris art
  } // End constructor

  update() { // Physics update
    this.x += this.vx; // Move X
    this.y += this.vy; // Move Y
    this.rot += this.rotSpeed; // Spin
    this.alpha -= 5; // Fade
  } // End update

  show() { // Render
    push(); // Chunk container
    translate(this.x, this.y); // Move to chunk
    rotate(this.rot); // Spin
    noStroke(); // No outline
    this.col.setAlpha(this.alpha); // Fades the color
    fill(this.col); // Gray
    rect(-this.size / 2, -this.size / 2, this.size, this.size * 0.7); // Little rectangle
    pop(); // End chunk container
  } // End show
} // End chunk class

class ExplosionParticle { // Fireballs for satellites, burn ups, and crashes
  constructor(x, y, power = 1) { // Explosion properties
    this.x = x + random(-10, 10); // Random spread X
    this.y = y + random(-10, 10); // Random spread Y
    let a = random(360); // Random direction
    let s = random(1, 5) * power; // Random speed
    this.vx = cos(a) * s; // X velocity
    this.vy = sin(a) * s; // Y velocity
    this.alpha = 255; // Fully visible
    this.r = random(8, 22) * power; // Size
    this.col = random([color(255, 200, 0), color(255, 120, 30), color(228, 87, 46)]); // Yellow, orange, red
  } // End constructor

  update() { // Physics update
    this.x += this.vx; // Move X
    this.y += this.vy; // Move Y
    this.vx *= 0.92; // Friction so it slows down
    this.vy *= 0.92; // Friction so it slows down
    this.alpha -= 6; // Fade
    this.r *= 0.96; // Shrink
  } // End update

  show() { // Render
    noStroke(); // No outline
    this.col.setAlpha(this.alpha); // Fades the color
    fill(this.col); // Fire color
    circle(this.x, this.y, this.r); // Fireball
  } // End show
} // End explosion class

class FloatingText { // "+$100" popups that float up and fade
  constructor(str, x, y, col) { // Text properties
    this.str = str; // What it says
    this.x = x; // X
    this.y = y; // Y
    this.col = col; // Color
    this.alpha = 255; // Fully visible
  } // End constructor

  update() { // Float up and fade
    this.y -= 0.7; // Drifts up
    this.alpha -= 4; // Fades out over about a second
  } // End update

  show() { // Render
    push(); // Text container
    textFont(fontHeavy); // Heavy
    textSize(20); // Size
    textAlign(CENTER, CENTER); // Centered
    stroke(11, 16, 38, this.alpha); // Dark outline so it reads over anything
    strokeWeight(4); // Outline thickness
    noFill(); // Outline pass
    text(this.str, this.x, this.y); // Outline
    noStroke(); // Fill pass
    this.col.setAlpha(this.alpha); // Fades the color
    fill(this.col); // Text color
    text(this.str, this.x, this.y); // Text
    pop(); // End text container
  } // End show
} // End floating text class


// ==========================================
// --- SECTION 5: INTERACTIVITY & LOGIC ---
// ==========================================

// ******************************************
// --- SUBSECTION: KEYBOARD INPUTS ---
// ******************************************
function keyPressed() { // Runs once every time a key goes down (W/A/D/Spacebar are checked every frame with keyIsDown instead)
  userStartAudio(); // Browsers block sound until the player presses something
  let k = key.toLowerCase(); // Caps lock proof

  if (gameState === 0) { // Title screen
    if (keyCode === 32) startLevel(0); // Spacebar starts level 1
  } else if (gameState === 1 || gameState === 2) { // Playing or paused
    if (k === 'p') { // Pause key
      gameState = gameState === 1 ? 2 : 1; // Toggles pause
      sndClick.play(); // Click
      if (gameState === 2) silenceLoops(); // Cuts the laser and engine while paused
    } // End pause key
  } else if (stateTimer > 40) { // Results screens (short delay so a held key doesn't skip it)
    if (keyCode === ENTER) pressPrimary(); // Enter = next level / retry
    if (k === 'm') goToMenu(); // M = menu
  } // End state check

  if (keyCode === 32) return false; // Stops the spacebar from scrolling the page
} // End key pressed function

// ******************************************
// --- SUBSECTION: MOUSE INPUTS ---
// ******************************************
function mousePressed() { // Runs every time the mouse clicks
  userStartAudio(); // Browsers block sound until the player clicks something
  if (gameState === 0) { // Title screen
    startLevel(0); // Clicking also starts the game (also gives the canvas keyboard focus when it's embedded)
  } else if ((gameState === 3 || gameState === 4) && stateTimer > 40) { // Results screen
    let py = 160 + 335; // Button row center Y
    if (abs(mouseY - py) < 27) { // Mouse is on the button row
      if (abs(mouseX - 535) < 100) pressPrimary(); // Primary button
      if (abs(mouseX - 760) < 85) goToMenu(); // Menu button
    } // End row check
  } // End state check
} // End mouse pressed function

function pressPrimary() { // Next level, play again, or retry
  sndClick.play(); // Click
  if (gameState === 3) startLevel(level === levels.length - 1 ? 0 : level + 1); // Won: next level (or back to 1 after the last one)
  else startLevel(level); // Lost: same level again
} // End primary button function

function goToMenu() { // Back to the title screen
  sndClick.play(); // Click
  silenceLoops(); // Laser and engine off
  sndGameMusic.stop(); // Stops gameplay music
  if (!sndTitleMusic.isPlaying()) sndTitleMusic.loop(); // Title music back on
  gameState = 0; // Title state
  stateTimer = 0; // Resets the state timer
} // End menu function

// ******************************************
// --- SUBSECTION: LASER LOGIC ---
// ******************************************
function fireLaser() { // Shoots a straight line out of the nose and finds the first thing it touches
  let nose = ship.nosePos(); // Beam start
  let dir = ship.forward(); // Beam direction
  let best = 1600; // Longest the beam can be (past the edge of the screen)
  let hitObject = null; // What the beam hits

  for (let o of objects) { // Checks every object
    if (o.dead || o.info.group === 'powerup') continue; // Beam passes through power ups
    let t = rayCircle(nose, dir, o.pos, o.r); // Distance along the beam to this object
    if (t >= 0 && t < best) { // Closer than anything so far
      best = t; // New closest
      hitObject = o; // New target
    } // End closest check
  } // End object loop

  let tEarth = rayCircle(nose, dir, createVector(earthX, earthY), earthR); // Earth blocks the beam too
  if (tEarth >= 0 && tEarth < best) { // Earth is in the way
    best = tEarth; // Beam stops at Earth
    hitObject = null; // Earth doesn't take damage
  } // End Earth check

  ship.beamEnd = p5.Vector.add(nose, p5.Vector.mult(dir, best)); // Where the beam ends this frame
  if (hitObject) laserHit(hitObject, ship.beamEnd); // Damage whatever got hit
} // End fire laser function

function rayCircle(origin, dir, center, r) { // Returns how far along the ray it touches the circle, or -1 for a miss
  let oc = p5.Vector.sub(center, origin); // Ray start to circle center
  let along = oc.dot(dir); // How far along the ray the center is
  if (along < 0) return -1; // Behind the ship
  let perpSq = oc.magSq() - along * along; // Squared distance from the center to the ray (Pythagoras)
  if (perpSq > r * r) return -1; // Ray misses the circle
  return max(0, along - sqrt(r * r - perpSq)); // Distance to the front edge of the circle
} // End ray circle function

function laserHit(o, pt) { // Damage from the laser
  if (frameCount % 2 === 0) sparks.push(new Spark(pt.x, pt.y)); // Sparks at the impact point
  sparks.push(new Spark(pt.x, pt.y)); // More sparks

  if (o.info.group === 'iss') { // Lasered the space station
    o.hp -= 1.25; // Uses the ISS hp as a tiny grace window (minus the 0.25 it refills every frame)
    if (astroCooldown <= 0) { radio('astro', "Hey! Get that laser off the station!"); astroCooldown = 300; } // Panics
    if (o.hp <= 0) missionFailed('iss laser'); // Held it there too long
  } else if (o.info.group === 'satellite') { // Hit a working satellite (usually the beam overshooting debris)
    if (!o.damaged) { // First hit
      damageSatellite(o); // Costs money
      radio('mc', "Careful, there's a satellite behind that!"); // Line from the HUD mockup
    } // End first hit
    o.hp--; // Burns it
    if (o.hp <= 0) destroySatellite(o); // Too far gone
  } else { // Debris
    o.hp--; // Burns it
    if (o.hp <= 0) clearDebris(o, false); // Destroyed
  } // End group check
} // End laser hit function

// ******************************************
// --- SUBSECTION: ENGINE PUSH LOGIC ---
// ******************************************
function applyEnginePush() { // Anything inside the flame gets shoved away from the ship
  let back = p5.Vector.mult(ship.forward(), -1); // Direction the flame points
  let nozzle = ship.nozzlePos(); // Where the flame starts
  let reach = flameLength * ship.flameSize; // Current flame length

  for (let o of objects) { // Checks every object
    if (o.dead || o.info.group === 'iss' || o.info.group === 'powerup') continue; // The ISS is too heavy and power ups are collected instead
    let rel = p5.Vector.sub(o.pos, nozzle); // Nozzle to object
    let along = rel.dot(back); // How far down the flame it is
    if (along < -o.r || along > reach + o.r) continue; // Not in front of the flame or too far
    let side = p5.Vector.sub(rel, p5.Vector.mult(back, along)).mag(); // Sideways distance from the flame's center line
    let flameHalfWidth = 8 + 5 * constrain(along / flameLength, 0, 1); // Flame gets a little wider toward the tip
    if (side > flameHalfWidth + o.r) continue; // Off to the side, the flame isn't touching it

    let strength = pushForce * (1 - constrain(along / (reach + o.r), 0, 1)) / o.mass; // Stronger up close, weaker for heavy stuff
    o.knockFree(); // Off its orbit
    o.vel.add(p5.Vector.mult(back, strength)); // Shove

    if (o.info.group === 'satellite' && !o.damaged) { // Pushed a working satellite off its orbit
      damageSatellite(o); // Displacing a satellite costs money too
      radio('mc', "That's a working satellite! Don't push those."); // Scolding
    } // End satellite check
  } // End object loop
} // End engine push function

// ******************************************
// --- SUBSECTION: COLLISION LOGIC ---
// ******************************************
function checkCollisions() { // Ship vs objects and objects vs objects
  let shipCircles = ship.hitCircles(); // Front and back circles

  // Ship vs objects
  for (let o of objects) { // Every object
    if (o.dead) continue; // Skips anything already removed
    if (o.info.group === 'powerup') { // Power ups get collected, not crashed into
      if (dist(ship.pos.x, ship.pos.y, o.pos.x, o.pos.y) < 26 + o.r) collectPowerUp(o); // Close enough to grab
      continue; // Next object
    } // End power up check

    for (let c of shipCircles) { // Both ship circles
      if (dist(c.x, c.y, o.pos.x, o.pos.y) < ship.r + o.r) { // Overlapping
        if (o.info.group === 'iss') { missionFailed('iss ship'); return; } // Flew into the ISS
        shipHitObject(o, c); // Bounce and damage
        break; // One hit per object per frame
      } // End overlap check
    } // End circle loop
  } // End ship loop

  // Objects vs objects
  for (let i = 0; i < objects.length; i++) { // Every object
    for (let j = i + 1; j < objects.length; j++) { // Against every object after it so pairs only get checked once
      let a = objects[i]; // First object
      let b = objects[j]; // Second object
      if (a.dead || b.dead) continue; // Skips removed objects
      if (a.grace > 0 || b.grace > 0) continue; // Skips brand new debris for a few frames
      if (a.onRail && b.onRail) continue; // Two objects on clean orbits never hit each other
      if (a.info.group === 'powerup' || b.info.group === 'powerup') continue; // Power ups don't collide
      if (dist(a.pos.x, a.pos.y, b.pos.x, b.pos.y) > a.r + b.r) continue; // Not touching

      if (a.info.group === 'iss' || b.info.group === 'iss') { missionFailed('iss debris'); return; } // Anything hitting the ISS is an automatic fail
      bump(a, b); // Bounce off each other
    } // End inner loop
  } // End outer loop
} // End check collisions function

function shipHitObject(o, c) { // Ship crashed into something
  let n = createVector(o.pos.x - c.x, o.pos.y - c.y).normalize(); // Direction from ship to object
  o.knockFree(); // Knocked off its orbit
  o.pos = p5.Vector.add(c, p5.Vector.mult(n, ship.r + o.r + 1)); // Moves it out so they're not stuck together

  let shipMass = 3; // Ship counts as about 3 small debris
  let closing = p5.Vector.sub(ship.vel, o.vel).dot(n); // How fast they're moving into each other
  if (closing > 0) { // Only bounce if they're actually moving toward each other
    o.vel.add(p5.Vector.mult(n, closing * 1.2 * shipMass / (shipMass + o.mass))); // Object gets nudged away (toned down so bumping stuff doesn't launch it across the map)
    ship.vel.sub(p5.Vector.mult(n, closing * 1.2 * o.mass / (shipMass + o.mass))); // Ship bounces back
  } // End bounce

  if (ship.invincible === 0 && closing > 1.2) { // Only a real crash counts (and not while the ship is still flashing from the last hit)
    damageShip(); // Hull damage
    if (o.info.group === 'satellite') { // Rammed a satellite
      if (!o.damaged) damageSatellite(o); // First hit damages it
      else destroySatellite(o); // Second hit kills it
    } // End satellite check
  } // End invincible check
} // End ship hit function

function bump(a, b) { // Two objects hit each other
  a.knockFree(); // Both come off their orbits
  b.knockFree();

  let n = createVector(b.pos.x - a.pos.x, b.pos.y - a.pos.y).normalize(); // Direction from a to b
  let overlap = a.r + b.r - dist(a.pos.x, a.pos.y, b.pos.x, b.pos.y); // How far they're overlapping
  a.pos.sub(p5.Vector.mult(n, overlap / 2)); // Pushes them apart
  b.pos.add(p5.Vector.mult(n, overlap / 2));

  let closing = p5.Vector.sub(a.vel, b.vel).dot(n); // How fast they're moving into each other
  if (closing <= 0) return; // Already moving apart
  if (frameCount - lastBumpSound > 10) { // Max one clang every 10 frames
    sndCollision.play(0, random(1.1, 1.4), 0.2); // Quieter, higher clang for junk hitting junk
    lastBumpSound = frameCount; // Remembers when
  } // End clang check
  let impulse = closing * 1.4 / (a.mass + b.mass); // Not very bouncy, space junk is mostly crumpled metal
  a.vel.sub(p5.Vector.mult(n, impulse * b.mass)); // Heavier things push lighter things harder
  b.vel.add(p5.Vector.mult(n, impulse * a.mass));

  for (let s of [a, b]) { // Checks both for satellites
    if (s.info.group === 'satellite') { // Working satellite got hit by junk
      if (!s.damaged) damageSatellite(s); // First hit damages it
      else destroySatellite(s); // Second hit kills it
    } // End satellite check
  } // End both loop

  if (closing > 1.8 && objects.length < maxObjects) { // Hard enough hit breaks off more junk
    let mid = p5.Vector.lerp(a.pos, b.pos, 0.5); // Impact point
    spawnLoose(random(['shard', 'panel', 'hull']), mid, p5.Vector.lerp(a.vel, b.vel, 0.5).add(p5.Vector.random2D().mult(1))); // New piece of debris
    if (!warnedKessler) { // First time only
      radio('mc', "Crashes make more junk. That's the Kessler effect."); // Explains the title of the game
      warnedKessler = true; // Only once
    } // End warning
  } // End new junk check
} // End bump function

function checkISSProximity() { // Marks anything heading for the station and has the astronaut yell about it
  let close = dist(ship.pos.x, ship.pos.y, iss.pos.x, iss.pos.y) < iss.r + 70; // Ship too close
  for (let o of objects) { // Checks loose objects too
    o.threat = false; // Resets every frame
    if (o.onRail || o.dead || o.info.group === 'iss') continue; // Only loose stuff can drift into the station
    let toISS = p5.Vector.sub(iss.pos, o.pos); // Object to station
    let gap = toISS.mag() - iss.r - o.r; // Space between them
    let closingSpeed = p5.Vector.sub(o.vel, iss.vel).dot(toISS.normalize()); // How fast it's coming at the station
    if (gap < 170 && closingSpeed > 0.1) { // Close and getting closer
      o.threat = true; // Gets a red warning ring so the player has time to laser it or push it away
      if (gap < 110) close = true; // Close enough for the astronaut to freak out
    } // End threat check
  } // End object loop
  if (close && astroCooldown <= 0) { // Something is too close
    radio('astro', "Whoa! That's way too close to the station!"); // Astronaut panics
    astroCooldown = 300; // 5 second cooldown
  } // End close check
} // End proximity function

// ******************************************
// --- SUBSECTION: GAME LOGIC ---
// ******************************************
function addCash(amount, x, y) { // Changes cash and shows a popup
  cash += amount; // Adds or subtracts
  let col = amount >= 0 ? color(91, 227, 125) : color(255, 110, 90); // Green for money in, red for money out
  floatingTexts.push(new FloatingText((amount >= 0 ? "+" : "") + money(amount), x, y - 20, col)); // Popup above the object
} // End add cash function

function clearDebris(o, burned) { // Debris destroyed, pushed out, or burned up
  o.dead = true; // Flags for removal
  debrisCleared++; // Stat for the results screen
  addCash(o.info.value, o.pos.x, o.pos.y); // Gets paid
  sndDebris.play(0, random(0.85, 1.15), burned ? 0.15 : 0.35); // Crunch with a slightly random pitch so it doesn't get repetitive (quieter for burn ups)
  if (burned) { // Burned up in the atmosphere
    for (let i = 0; i < 12; i++) explosionParticles.push(new ExplosionParticle(o.pos.x, o.pos.y, 0.6)); // Small orange flash
  } else { // Lasered
    for (let i = 0; i < 10 + o.r; i++) chunks.push(new Chunk(o.pos.x, o.pos.y, o.vel.x, o.vel.y)); // Bigger debris = more chunks
  } // End effect check
} // End clear debris function

function burnUp(o) { // Loose object fell into Earth's atmosphere
  if (o.info.group === 'satellite') { // Lost a working satellite
    loseSatellite(o); // Costs money
    for (let i = 0; i < 12; i++) explosionParticles.push(new ExplosionParticle(o.pos.x, o.pos.y, 0.6)); // Burn flash
  } else { // Debris
    clearDebris(o, true); // Counts as cleaned up (deorbiting is a real cleanup method)
    if (!warnedBurnUp) { // First time only
      radio('mc', "Nice, that one burned up on reentry."); // Positive feedback
      warnedBurnUp = true; // Only once
    } // End message
  } // End group check
} // End burn up function

function leftOrbit(o) { // Loose object flew off the screen
  if (o.info.group === 'satellite') loseSatellite(o); // Pushed a satellite away, costs money
  else { // Debris
    o.dead = true; // Flags for removal
    debrisCleared++; // Counts as cleared
    addCash(o.info.value, constrain(o.pos.x, 60, width - 60), constrain(o.pos.y, 60, height - 60)); // Popup at the screen edge so you can actually see it
  } // End group check
} // End left orbit function

function damageSatellite(s) { // First hit on a working satellite
  s.damaged = true; // Swaps to the damaged image
  addCash(-satDamageCost, s.pos.x, s.pos.y); // Costs $250
  sndPenalty.play(); // Error buzz so you know you just lost money
  if (!s.counted) { satellitesHit++; s.counted = true; } // Counts it once for the results screen
} // End damage satellite function

function loseSatellite(s) { // Satellite is gone (burned up or flew away)
  if (!s.damaged) damageSatellite(s); // Charges the damage cost first if it wasn't already damaged
  s.dead = true; // Flags for removal
  addCash(-satDestroyCost, constrain(s.pos.x, 60, width - 60), constrain(s.pos.y, 60, height - 60)); // Costs the rest
  radio('mc', "We just lost a satellite. That's coming out of your pay."); // Scolding
} // End lose satellite function

function destroySatellite(s) { // Satellite blown up, turns into more debris
  if (s.dead) return; // Already handled
  loseSatellite(s); // Costs money and removes it
  shakeTimer = 15; // Big shake
  sndSatExplode.play(); // Boom
  for (let i = 0; i < 40; i++) explosionParticles.push(new ExplosionParticle(s.pos.x, s.pos.y)); // Explosion

  let wreck = spawnLoose('dead', s.pos, s.vel.copy().add(p5.Vector.random2D().mult(0.4))); // Leaves a dead satellite behind
  if (wreck) { // If there was room for it
    wreck.imgOverride = s.info.dmgImg; // Uses the damaged satellite art
    wreck.spin = s.spin; // Keeps the same rotation
    wreck.spinSpeed = random(-1.5, 1.5); // Tumbling
  } // End wreck setup
  for (let i = 0; i < 2; i++) spawnLoose('shard', s.pos, s.vel.copy().add(p5.Vector.random2D().mult(0.5))); // Plus a couple of shards (slow, so they don't fly straight into the ISS)
} // End destroy satellite function

function damageShip() { // Ship takes a hit
  if (ship.invincible > 0) return; // Still flashing from the last hit
  ship.hull--; // Loses a segment
  ship.invincible = 60; // 1 second of invincibility
  sndCollision.play(); // Clang
  shakeTimer = 10; // Shake
  for (let i = 0; i < 8; i++) sparks.push(new Spark(ship.pos.x, ship.pos.y)); // Sparks off the hull
} // End damage ship function

function collectPowerUp(p) { // Ship grabbed a power up
  p.dead = true; // Flags for removal
  sndPowerUp.play(); // Power up sound
  if (p.type === 'battery') { // Battery refill
    ship.battery = min(batteryMax, ship.battery + batteryMax / 2); // Recharges half the battery
    warnedBatteryLow = false; // Lets the warnings happen again
    warnedBatteryDead = false;
    floatingTexts.push(new FloatingText("+ BATTERY", p.pos.x, p.pos.y - 20, color(61, 225, 255))); // Popup
  } else { // Hull repair
    ship.hull = min(hullMax, ship.hull + 2); // Restores 2 hull segments
    warnedHull = false; // Lets the warning happen again
    floatingTexts.push(new FloatingText("+ HULL", p.pos.x, p.pos.y - 20, color(91, 227, 125))); // Popup
  } // End type check
} // End collect power up function

function spawnOnOrbit(type) { // Puts a new object on a random orbit without overlapping anything
  let info = types[type]; // Type info
  let minR = earthR + 20 + info.r; // Closest orbit allowed (bigger stuff has to orbit higher so it doesn't overlap Earth)
  let maxR = issOrbit - types.iss.r - info.r - 40; // Farthest orbit allowed (stays well inside the ISS orbit, so one bump doesn't send it straight into the station)
  for (let attempts = 0; attempts < 200; attempts++) { // Safety counter so it can't loop forever
    let r = random(minR, maxR); // Random orbit radius
    let a = random(360); // Random spot around Earth
    let x = earthX + cos(a) * r; // Where that is
    let y = earthY + sin(a) * r;
    let overlap = objects.some(o => dist(x, y, o.pos.x, o.pos.y) < info.r + o.r + 10); // Too close to something
    let nearShip = dist(x, y, ship.pos.x, ship.pos.y) < 120; // Too close to the player
    if (!overlap && !nearShip) { // Spot is clear
      let o = new SpaceObject(type, r, a); // Makes the object
      objects.push(o); // Adds it
      return o; // Done
    } // End clear check
  } // End attempts loop
  let o = new SpaceObject(type, random(minR, maxR), random(360)); // Orbit is too crowded for a clean spot, so it just goes anywhere (on later levels that's kind of the point)
  objects.push(o); // Adds it
  return o; // Done
} // End spawn on orbit function

function spawnLoose(type, pos, vel) { // Adds an object that's already drifting (from crashes and explosions)
  if (objects.length >= maxObjects) return null; // Cap
  let o = new SpaceObject(type, 200, 0); // Orbit numbers don't matter since it starts loose
  o.onRail = false; // Loose right away
  o.pos = pos.copy().add(p5.Vector.random2D().mult(o.r)); // Starts near the impact point
  o.vel = vel.copy(); // Starting velocity
  o.grace = 30; // Half a second before it can hit anything else
  objects.push(o); // Adds it
  return o; // Returns it so the caller can tweak it
} // End spawn loose function

function startLevel(n) { // Loads a level from the levels array
  level = n; // Current level
  let L = levels[n]; // Shorthand

  objects = []; // Clears everything from the last run
  sparks = [];
  chunks = [];
  explosionParticles = [];
  floatingTexts = [];

  ship = new Spaceship(); // Fresh ship
  cash = startCash; // $500
  target = L.target; // Cash target
  debrisCleared = 0; // Resets stats
  satellitesHit = 0;
  failReason = "";
  shipExploded = false;
  shakeTimer = 0;
  powerUpTimer = 1200; // First extra power up after 20 seconds

  iss = new SpaceObject('iss', issOrbit, random(360)); // The ISS is always there
  iss.hp = issLaserGrace; // Laser grace window
  objects.push(iss); // Adds it first so everything else spawns around it

  for (let i = 0; i < L.satellites; i++) spawnOnOrbit(random(['gps', 'comms'])); // Satellites
  for (let i = 0; i < L.huge; i++) spawnOnOrbit('huge'); // Biggest stuff first so it has room
  for (let i = 0; i < L.large; i++) spawnOnOrbit('large');
  for (let i = 0; i < L.medium; i++) spawnOnOrbit('medium');
  for (let i = 0; i < L.small; i++) spawnOnOrbit(random(['shard', 'panel', 'hull', 'booster'])); // Mix of the 4 small types
  spawnOnOrbit('battery'); // One of each power up to start
  spawnOnOrbit('repair');

  warnedBatteryLow = false; // Resets one time warnings
  warnedBatteryDead = false;
  warnedHull = false;
  warnedKessler = false;
  warnedBurnUp = false;
  astroCooldown = 120; // Gives the astronaut a second before he starts yelling

  radio('mc', "Level " + (n + 1) + ". Clear " + money(target) + " worth of junk."); // Mission briefing
  sndTitleMusic.stop(); // Title music off
  sndGameMusic.setVolume(0.2, 0.3); // Brings the music back up if it was turned down on the results screen
  if (!sndGameMusic.isPlaying()) sndGameMusic.loop(); // Gameplay music (keeps going between levels instead of restarting)
  if (!sndLaser.isPlaying()) sndLaser.loop(); // Starts the silent laser loop
  if (!sndThrust.isPlaying()) sndThrust.loop(); // Starts the silent engine loop

  gameState = 1; // Playing
  stateTimer = 0; // Resets state timer
} // End start level function

function silenceLoops() { // Turns the laser and engine loops down to 0 without stopping them
  sndLaser.setVolume(0, 0.05); // Laser off
  sndThrust.setVolume(0, 0.05); // Engine off
} // End silence loops function

function levelComplete() { // Hit the cash target
  gameState = 3; // Contract complete
  stateTimer = 0; // Resets state timer
  ship.isFiring = false; // Stops drawing the beam on the results screen
  silenceLoops(); // Laser and engine off
  sndGameMusic.setVolume(0.06, 0.3); // Turns the music down so the jingle stands out
  sndWin.play(); // Win jingle
} // End level complete function

function missionFailed(reason) { // Something went wrong
  if (gameState !== 1) return; // Only fail once
  gameState = 4; // Mission failed
  stateTimer = 0; // Resets state timer
  ship.isFiring = false; // Stops drawing the beam
  shakeTimer = 20; // Big shake
  silenceLoops(); // Laser and engine off
  sndGameMusic.setVolume(0.06, 0.3); // Turns the music down
  if (reason !== 'broke') sndBigExplode.play(); // Big boom for the ISS or the ship blowing up
  sndLose.play(); // Lose jingle

  if (reason.indexOf('iss') === 0) { // Anything involving the ISS
    iss.damaged = true; // Shows the damaged ISS on the results screen
    for (let i = 0; i < 50; i++) explosionParticles.push(new ExplosionParticle(iss.pos.x, iss.pos.y)); // Explosion at the station
    if (reason === 'iss debris') failReason = "Debris hit the ISS. That's an automatic fail."; // Junk hit it
    else failReason = "You hit the ISS. That's an automatic fail."; // Player hit it
    radio('astro', "We've been hit! Mayday, mayday!"); // Astronaut panic
  } else if (reason === 'hull') { // Hull gone
    for (let i = 0; i < 50; i++) explosionParticles.push(new ExplosionParticle(ship.pos.x, ship.pos.y)); // Ship explodes
    failReason = "Your hull couldn't take any more hits."; // Results line
    shipExploded = true; // Hides the ship
  } else if (reason === 'broke') { // Cash below zero
    failReason = "You went broke. Satellites aren't cheap."; // Results line
  } // End reason check
} // End mission failed function

function updateParticles(arr) { // Updates any particle array and deletes the faded ones
  for (let i = arr.length - 1; i >= 0; i--) { // Backwards so splice doesn't skip anything
    arr[i].update(); // Move and fade
    if (arr[i].alpha <= 0) arr.splice(i, 1); // Deletes it once it's invisible
  } // End particle loop
} // End update particles function


// ==========================================
// --- SECTION 6: COMMENTARY ---
// ==========================================
//


// ==========================================
// --- SECTION 7: CREDITS ---
// ==========================================
// Title Music: "Echoes of a Space Age - Slow Sci-Fi Music" by Sorth (OpenGameArt, CC0)
// Gameplay Music: "Asteroids" from Chill Chiptunes by HoliznaCC0 (OpenGameArt, CC0)
// Laser, Engine, Explosion, and Collision SoundFX: Kenney, Sci-Fi Sounds pack (kenney.nl, CC0)
// Power Up and Radio SoundFX: Kenney, Digital Audio pack (kenney.nl, CC0)
// Button and Penalty SoundFX: Kenney, Interface Sounds pack (kenney.nl, CC0)
// Win and Lose Jingles: Kenney, Music Jingles pack (kenney.nl, CC0)
// Typeface: Jost, Owen Earl (indestructible type*), SIL Open Font License
