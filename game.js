// Change the values here to tune the game. Each number controls one game feel detail.
const CONFIG = {
  width: 900, // 3D render width in pixels.
  height: 600, // 3D render height in pixels.
  roadWidth: 10, // Width of the road in world units.
  roadLength: 220, // Length of the visible 3D road.
  cameraHeight: 1.65, // Height of the first-person camera.
  cameraFov: 68, // Camera field of view.
  playerSpeed: 15, // Normal forward speed in world units per second.
  boostSpeed: 22, // Forward speed while the boost is active.
  steerSpeed: 7.5, // Sideways steering speed in world units per second.
  boostSeconds: 0.9, // How long one boost can last.
  boostRecharge: 3.4, // Seconds needed to recharge the boost.
  levelSeconds: 35, // Length of the one short level.
  spawnEvery: 0.95, // Seconds between new 3D hazards.
  hazardSpeed: 5, // Extra forward motion for hazards.
  collisionSlow: 1.8, // Seconds lost after hitting a hazard.
  hazardSize: 1.15, // Size of cones, puddles, and rival cars.
  dashLength: 3, // Length of each center-line dash.
  dashGap: 7, // Distance between center-line dashes.
  topScoreKey: "lonnster-sonion-top-score" // Browser storage key for the best time.
};

const COLORS = { road: 0x30364c, shoulder: 0x273d4a, edge: 0xffcb5c, dash: 0x9fa9d2, player: 0x62e6c9, rival: 0xff6b8a, cone: 0xff9b54, puddle: 0x52b4e8 };
const root = document.getElementById("game-root");
let scene, camera, renderer, roadDashes, playerCar, playerX, hazards = [];
let elapsed = 0, spawnTimer = 0, boostLeft = 0, boostCooldown = 0, state = "menu";
let bestTime = Number(localStorage.getItem(CONFIG.topScoreKey)) || null;
const input = { left: false, right: false, boost: false };

root.innerHTML = `
  <div class="hud" aria-live="polite">
    <div class="hud-top"><span class="hud-time">TIME 00.0s</span><span class="hud-best">BEST --</span></div>
    <div class="hud-boost">BOOST READY</div><div class="hud-progress">START LINE</div>
  </div>
  <div class="touch-controls"><button data-control="left">◀ LEFT</button><button class="boost-button" data-control="boost">BOOST</button><button data-control="right">RIGHT ▶</button></div>
  <div class="overlay"></div>`;

const hudTime = root.querySelector(".hud-time");
const hudBest = root.querySelector(".hud-best");
const hudBoost = root.querySelector(".hud-boost");
const hudProgress = root.querySelector(".hud-progress");
const overlay = root.querySelector(".overlay");

function formatTime(time) { return `${time.toFixed(1).padStart(4, "0")}s`; }
function makeMaterial(color, roughness = 0.82) { return new THREE.MeshStandardMaterial({ color, roughness }); }

function init3D() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87bdf0);
  scene.fog = new THREE.Fog(0x87bdf0, 45, 180);
  camera = new THREE.PerspectiveCamera(CONFIG.cameraFov, CONFIG.width / CONFIG.height, 0.1, 300);
  camera.position.set(0, CONFIG.cameraHeight, 4);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(CONFIG.width, CONFIG.height);
  renderer.shadowMap.enabled = true;
  root.insertBefore(renderer.domElement, root.firstChild);

  scene.add(new THREE.HemisphereLight(0xd8f1ff, 0x314252, 2.4));
  const sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(-25, 35, 15); sun.castShadow = true; scene.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, CONFIG.roadLength), makeMaterial(COLORS.shoulder));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.08, -CONFIG.roadLength / 2 + 8); ground.receiveShadow = true; scene.add(ground);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.roadWidth, CONFIG.roadLength), makeMaterial(COLORS.road));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -CONFIG.roadLength / 2 + 8); road.receiveShadow = true; scene.add(road);
  [-CONFIG.roadWidth / 2 - 0.22, CONFIG.roadWidth / 2 + 0.22].forEach(x => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, CONFIG.roadLength), makeMaterial(COLORS.edge));
    rail.position.set(x, 0.07, -CONFIG.roadLength / 2 + 8); rail.castShadow = true; scene.add(rail);
  });
  roadDashes = [];
  for (let z = 0; z > -CONFIG.roadLength; z -= CONFIG.dashLength + CONFIG.dashGap) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, CONFIG.dashLength), makeMaterial(COLORS.dash));
    dash.position.set(0, 0.03, z); scene.add(dash); roadDashes.push(dash);
  }
  playerCar = makePlayerCar(); scene.add(playerCar);
  addEventListeners(); resize(); showMenu(); animate(0);
}

function makePlayerCar() {
  const car = new THREE.Group(); car.position.set(0, 0.42, 2.7);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.35, 1.7), makeMaterial(COLORS.player)); hood.position.set(0, 0, 0.25); hood.castShadow = true; car.add(hood);
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.55, 0.12), makeMaterial(0x1c294d, 0.35)); windshield.position.set(0, 0.38, -0.25); windshield.rotation.x = -0.2; car.add(windshield);
  const light = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 0.08), makeMaterial(0xeaffff)); light.position.set(0, 0.08, -0.62); car.add(light);
  return car;
}

function makeHazard(kind) {
  const group = new THREE.Group(); group.userData.kind = kind; group.userData.hit = false;
  const s = CONFIG.hazardSize;
  if (kind === "cone") {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(s * 0.46, s * 1.2, 8), makeMaterial(COLORS.cone)); cone.position.y = s * 0.6; cone.castShadow = true; group.add(cone);
    const base = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.14, s), makeMaterial(0xffd078)); base.position.y = 0.07; group.add(base);
  } else if (kind === "puddle") {
    const puddle = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.7, s * 0.7, 0.04, 24), makeMaterial(COLORS.puddle, 0.3)); puddle.position.y = 0.03; puddle.scale.z = 1.5; group.add(puddle);
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(s * 1.15, s * 0.55, s * 1.5), makeMaterial(COLORS.rival)); body.position.y = s * 0.36; body.castShadow = true; group.add(body);
    const top = new THREE.Mesh(new THREE.BoxGeometry(s * 0.72, s * 0.38, s * 0.62), makeMaterial(0x252c50, 0.35)); top.position.set(0, s * 0.78, -s * 0.08); group.add(top);
  }
  return group;
}

function addEventListeners() {
  window.addEventListener("resize", resize);
  window.addEventListener("keydown", event => {
    if (["ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
    if (event.code === "ArrowLeft") input.left = true;
    if (event.code === "ArrowRight") input.right = true;
    if (event.code === "Space") input.boost = true;
  });
  window.addEventListener("keyup", event => {
    if (event.code === "ArrowLeft") input.left = false;
    if (event.code === "ArrowRight") input.right = false;
    if (event.code === "Space") input.boost = false;
  });
  root.querySelectorAll("[data-control]").forEach(button => {
    const key = button.dataset.control;
    const down = event => { event.preventDefault(); input[key] = true; };
    const up = event => { event.preventDefault(); input[key] = false; };
    button.addEventListener("pointerdown", down); button.addEventListener("pointerup", up); button.addEventListener("pointerleave", up); button.addEventListener("pointercancel", up);
  });
}

function resize() { if (!renderer) return; const width = root.clientWidth; renderer.setSize(width, width * CONFIG.height / CONFIG.width, false); camera.aspect = CONFIG.width / CONFIG.height; camera.updateProjectionMatrix(); }
function showMenu() { showOverlay("LONNSTER SONION", "Race one quick 3D track.\nBeat your best time.", "START RACE", bestTime ? `TOP SCORE  ${formatTime(bestTime)}` : "TOP SCORE  --", startRace); setHudVisible(false); }
function showGameOver(finalTime, isBest) { showOverlay("FINISH LINE!", `${isBest ? "NEW TOP SCORE" : "RACE COMPLETE"}\nYour time  ${formatTime(finalTime)}\nTop score  ${formatTime(bestTime)}`, "PLAY AGAIN", "", startRace); setHudVisible(false); }
function showOverlay(title, copy, buttonText, score, action) { overlay.innerHTML = `<div class="overlay-card"><h2>${title}</h2><p>${copy}</p><button>${buttonText}</button><div class="score">${score}</div></div>`; overlay.hidden = false; overlay.querySelector("button").addEventListener("click", action); }
function setHudVisible(visible) { root.querySelector(".hud").hidden = !visible; root.querySelector(".touch-controls").hidden = !visible; }

function startRace() {
  hazards.forEach(item => scene.remove(item.mesh)); hazards = []; playerX = 0; elapsed = 0; spawnTimer = 0; boostLeft = 0; boostCooldown = 0; state = "racing";
  playerCar.position.x = 0; overlay.hidden = true; setHudVisible(true); updateHud();
}

function spawnHazard() {
  const types = ["cone", "rival", "puddle"]; const kind = types[Math.floor(Math.random() * types.length)];
  const lanes = [-CONFIG.roadWidth * 0.31, 0, CONFIG.roadWidth * 0.31];
  const mesh = makeHazard(kind); mesh.position.set(lanes[Math.floor(Math.random() * lanes.length)], 0, -CONFIG.roadLength + 5); scene.add(mesh); hazards.push({ mesh, kind });
}

function update(delta) {
  if (state !== "racing") return;
  const dt = Math.min(delta / 1000, 0.04); elapsed += dt; boostCooldown = Math.max(0, boostCooldown - dt);
  if (input.boost && boostCooldown === 0 && boostLeft === 0) boostLeft = CONFIG.boostSeconds;
  boostLeft = Math.max(0, boostLeft - dt); if (boostLeft === 0 && input.boost && boostCooldown === 0) boostCooldown = CONFIG.boostRecharge;
  const steering = (input.left ? -1 : 0) + (input.right ? 1 : 0); playerX = THREE.MathUtils.clamp(playerX + steering * CONFIG.steerSpeed * dt, -CONFIG.roadWidth / 2 + 1.2, CONFIG.roadWidth / 2 - 1.2);
  playerCar.position.x += (playerX - playerCar.position.x) * Math.min(1, dt * 12); playerCar.rotation.z = -steering * 0.045;
  const speed = boostLeft > 0 ? CONFIG.boostSpeed : CONFIG.playerSpeed;
  roadDashes.forEach(dash => { dash.position.z += speed * dt; if (dash.position.z > 8) dash.position.z -= CONFIG.roadLength; });
  spawnTimer += dt; const spawnRate = Math.max(0.65, CONFIG.spawnEvery - elapsed * 0.012); if (spawnTimer >= spawnRate && elapsed < CONFIG.levelSeconds - 1) { spawnTimer = 0; spawnHazard(); }
  hazards = hazards.filter(item => {
    item.mesh.position.z += (speed + CONFIG.hazardSpeed) * dt;
    if (!item.mesh.userData.hit && item.mesh.position.z > 1.4 && item.mesh.position.z < 4 && Math.abs(item.mesh.position.x - playerX) < 1.35) { item.mesh.userData.hit = true; elapsed = Math.min(CONFIG.levelSeconds, elapsed + CONFIG.collisionSlow); item.mesh.scale.setScalar(0.7); }
    if (item.mesh.position.z > 8) { scene.remove(item.mesh); return false; } return true;
  });
  updateHud(); if (elapsed >= CONFIG.levelSeconds) finishRace();
}

function updateHud() { hudTime.textContent = `TIME ${formatTime(elapsed)}`; hudBest.textContent = `BEST ${bestTime ? formatTime(bestTime) : "--"}`; hudBoost.textContent = boostLeft > 0 ? "BOOSTING!" : boostCooldown > 0 ? `BOOST ${boostCooldown.toFixed(1)}s` : "BOOST READY"; hudProgress.textContent = elapsed > CONFIG.levelSeconds * 0.72 ? "FINAL SPRINT" : elapsed > CONFIG.levelSeconds * 0.38 ? "BUSY SECTION" : "START LINE"; }
function finishRace() { state = "finished"; const finalTime = elapsed; const isBest = !bestTime || finalTime < bestTime; if (isBest) { bestTime = finalTime; localStorage.setItem(CONFIG.topScoreKey, String(finalTime)); } hazards.forEach(item => scene.remove(item.mesh)); hazards = []; showGameOver(finalTime, isBest); }
function animate(time) { requestAnimationFrame(animate); update(time - (animate.lastTime || time)); animate.lastTime = time; camera.lookAt(playerCar.position.x * 0.12, 1, -25); renderer.render(scene, camera); }

async function boot() {
  try { await window.THREE_READY; init3D(); }
  catch (error) { showOverlay("3D LOAD ISSUE", "The 3D engine did not start.\nRefresh once the CDN is reachable.", "TRY AGAIN", "", () => window.location.reload()); console.error(error); }
}
boot();
