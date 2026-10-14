// Change the values here to tune the game. Each number controls one game feel detail.
const CONFIG = {
  width: 900, // Game canvas width in pixels.
  height: 600, // Game canvas height in pixels.
  trackWidth: 560, // Width of the drivable road.
  playerSpeed: 270, // Normal forward speed in pixels per second.
  boostSpeed: 430, // Forward speed while the boost is held.
  steerSpeed: 360, // Sideways steering speed in pixels per second.
  boostSeconds: 1.2, // How long one boost can last.
  boostRecharge: 2.5, // Seconds needed to recharge the boost.
  levelSeconds: 30, // Length of the one short level.
  spawnEvery: 1.35, // Seconds between new obstacles.
  obstacleSpeed: 130, // Extra downward motion for hazards.
  collisionSlow: 1.1, // Seconds lost after hitting a hazard.
  hazardWidth: 54, // Width of cones, puddles, and rival cars.
  hazardHeight: 54, // Height of cones, puddles, and rival cars.
  roadStripeHeight: 54, // Height of each moving road stripe.
  roadStripeGap: 42, // Gap between moving road stripes.
  topScoreKey: "lonnster-sonion-top-score" // Browser storage key for the best time.
};

const COLORS = { sky: 0x1d2954, grass: 0x273d4a, road: 0x30364c, edge: 0xffcb5c, stripe: 0x8f9bc9, player: 0x62e6c9, rival: 0xff6b8a, cone: 0xff9b54, puddle: 0x52b4e8, ink: "#f7f4ff", muted: "#aeb7d7", panel: 0x151b35 };

class RaceScene extends Phaser.Scene {
  constructor() { super("RaceScene"); }

  create() {
    this.bestTime = Number(localStorage.getItem(CONFIG.topScoreKey)) || null;
    this.keys = this.input.keyboard.addKeys("LEFT,RIGHT,SPACE");
    this.touch = { left: false, right: false, boost: false };
    this.state = "menu";
    this.makeTrack();
    this.makeHud();
    this.makeTouchControls();
    this.showMenu();
  }

  makeTrack() {
    const center = CONFIG.width / 2;
    this.add.rectangle(center, CONFIG.height / 2, CONFIG.trackWidth + 30, CONFIG.height, COLORS.grass).setDepth(0);
    this.add.rectangle(center, CONFIG.height / 2, CONFIG.trackWidth, CONFIG.height, COLORS.road).setDepth(0);
    this.add.rectangle(center - CONFIG.trackWidth / 2 - 7, CONFIG.height / 2, 7, CONFIG.height, COLORS.edge).setDepth(1);
    this.add.rectangle(center + CONFIG.trackWidth / 2 + 7, CONFIG.height / 2, 7, CONFIG.height, COLORS.edge).setDepth(1);
    this.stripes = [];
    const stripeSpacing = CONFIG.roadStripeHeight + CONFIG.roadStripeGap;
    for (let y = -stripeSpacing; y < CONFIG.height + stripeSpacing; y += stripeSpacing) {
      this.stripes.push(this.add.rectangle(center, y, 8, CONFIG.roadStripeHeight, COLORS.stripe).setDepth(1).setAlpha(0.7));
    }
  }

  makeHud() {
    this.hud = this.add.container(0, 0).setDepth(10);
    this.timerText = this.add.text(24, 20, "TIME 00.0", { fontFamily: "Trebuchet MS", fontSize: "24px", fontStyle: "bold", color: COLORS.ink }).setScrollFactor(0);
    this.bestText = this.add.text(CONFIG.width - 24, 22, "BEST --", { fontFamily: "Trebuchet MS", fontSize: "18px", fontStyle: "bold", color: "#ffcb5c" }).setOrigin(1, 0);
    this.boostText = this.add.text(24, 52, "BOOST READY", { fontFamily: "Trebuchet MS", fontSize: "14px", fontStyle: "bold", color: "#62e6c9" });
    this.progressText = this.add.text(CONFIG.width / 2, 24, "START LINE", { fontFamily: "Trebuchet MS", fontSize: "14px", fontStyle: "bold", color: COLORS.muted }).setOrigin(0.5, 0);
    this.hud.add([this.timerText, this.bestText, this.boostText, this.progressText]);
  }

  makeTouchControls() {
    const buttonY = CONFIG.height - 48;
    this.touchButtons = [
      this.add.rectangle(90, buttonY, 120, 58, 0x485685, 0.8).setDepth(12).setInteractive(),
      this.add.rectangle(810, buttonY, 120, 58, 0x485685, 0.8).setDepth(12).setInteractive(),
      this.add.rectangle(CONFIG.width / 2, buttonY, 150, 58, 0xffcb5c, 0.92).setDepth(12).setInteractive()
    ];
    this.touchLabels = [
      this.add.text(90, buttonY, "◀ LEFT", { fontSize: "18px", fontStyle: "bold", color: COLORS.ink }).setOrigin(0.5).setDepth(13),
      this.add.text(810, buttonY, "RIGHT ▶", { fontSize: "18px", fontStyle: "bold", color: COLORS.ink }).setOrigin(0.5).setDepth(13),
      this.add.text(CONFIG.width / 2, buttonY, "BOOST", { fontSize: "18px", fontStyle: "bold", color: "#151b35" }).setOrigin(0.5).setDepth(13)
    ];
    const bind = (button, key) => {
      button.on("pointerdown", () => { this.touch[key] = true; });
      button.on("pointerup", () => { this.touch[key] = false; });
      button.on("pointerout", () => { this.touch[key] = false; });
    };
    bind(this.touchButtons[0], "left"); bind(this.touchButtons[1], "right"); bind(this.touchButtons[2], "boost");
  }

  showMenu() {
    this.clearOverlay();
    this.overlay = this.add.container(0, 0).setDepth(20);
    const panel = this.add.rectangle(CONFIG.width / 2, CONFIG.height / 2, 570, 310, COLORS.panel, 0.97).setStrokeStyle(2, 0x596bb0);
    const title = this.add.text(CONFIG.width / 2, 185, "LONNSTER SONION", { fontSize: "38px", fontStyle: "bold", color: "#62e6c9" }).setOrigin(0.5);
    const copy = this.add.text(CONFIG.width / 2, 245, "Race one quick track.\nBeat your best time.", { fontSize: "21px", align: "center", color: COLORS.ink, lineSpacing: 8 }).setOrigin(0.5);
    const button = this.add.rectangle(CONFIG.width / 2, 350, 230, 60, 0xffcb5c).setInteractive({ useHandCursor: true });
    const buttonText = this.add.text(CONFIG.width / 2, 350, "START RACE", { fontSize: "20px", fontStyle: "bold", color: "#151b35" }).setOrigin(0.5);
    button.on("pointerdown", () => this.startRace());
    const best = this.add.text(CONFIG.width / 2, 405, this.bestTime ? `TOP SCORE  ${this.formatTime(this.bestTime)}` : "TOP SCORE  --", { fontSize: "16px", fontStyle: "bold", color: "#ffcb5c" }).setOrigin(0.5);
    this.overlay.add([panel, title, copy, button, buttonText, best]);
    this.setRaceVisible(false);
  }

  startRace() {
    this.clearOverlay();
    this.state = "racing";
    this.elapsed = 0; this.spawnTimer = 0; this.boostLeft = 0; this.boostCooldown = 0; this.flash = 0;
    this.playerX = CONFIG.width / 2; this.playerY = CONFIG.height - 130;
    this.player = this.add.rectangle(this.playerX, this.playerY, 42, 66, COLORS.player).setDepth(4);
    this.playerGlow = this.add.rectangle(this.playerX, this.playerY + 30, 26, 10, 0xd8fff5).setDepth(3);
    this.hazards = [];
    this.setRaceVisible(true);
    this.updateHud();
  }

  update(_time, delta) {
    if (this.state !== "racing") return;
    const dt = Math.min(delta / 1000, 0.04);
    this.elapsed += dt;
    this.boostCooldown = Math.max(0, this.boostCooldown - dt);
    if (this.keys.SPACE.isDown || this.touch.boost) {
      if (this.boostCooldown === 0 && this.boostLeft === 0) this.boostLeft = CONFIG.boostSeconds;
    }
    this.boostLeft = Math.max(0, this.boostLeft - dt);
    if (this.boostLeft === 0 && this.boostCooldown === 0 && (this.keys.SPACE.isDown || this.touch.boost)) this.boostCooldown = CONFIG.boostRecharge;
    const steering = (this.keys.LEFT.isDown || this.touch.left ? -1 : 0) + (this.keys.RIGHT.isDown || this.touch.right ? 1 : 0);
    this.playerX = Phaser.Math.Clamp(this.playerX + steering * CONFIG.steerSpeed * dt, CONFIG.width / 2 - CONFIG.trackWidth / 2 + 38, CONFIG.width / 2 + CONFIG.trackWidth / 2 - 38);
    this.player.x = this.playerX; this.playerGlow.x = this.playerX;
    const forwardSpeed = this.boostLeft > 0 ? CONFIG.boostSpeed : CONFIG.playerSpeed;
    this.stripes.forEach(stripe => { stripe.y += forwardSpeed * dt; if (stripe.y > CONFIG.height + 80) stripe.y -= (CONFIG.height + 80 + CONFIG.roadStripeHeight + CONFIG.roadStripeGap); });
    this.spawnTimer += dt;
    const currentSpawn = Math.max(0.7, CONFIG.spawnEvery - this.elapsed * 0.012);
    if (this.spawnTimer >= currentSpawn && this.elapsed < CONFIG.levelSeconds - 1) { this.spawnTimer = 0; this.spawnHazard(); }
    this.moveHazards(dt, forwardSpeed);
    this.updateHud();
    if (this.elapsed >= CONFIG.levelSeconds) this.finishRace();
  }

  spawnHazard() {
    const types = ["cone", "rival", "puddle"];
    const type = Phaser.Utils.Array.GetRandom(types);
    const x = Phaser.Math.Between(CONFIG.width / 2 - CONFIG.trackWidth / 2 + 40, CONFIG.width / 2 + CONFIG.trackWidth / 2 - 40);
    const color = type === "cone" ? COLORS.cone : type === "rival" ? COLORS.rival : COLORS.puddle;
    const hazard = this.add.rectangle(x, -50, CONFIG.hazardWidth, CONFIG.hazardHeight, color).setDepth(3);
    hazard.kind = type; hazard.hit = false; this.hazards.push(hazard);
  }

  moveHazards(dt, forwardSpeed) {
    this.hazards = this.hazards.filter(hazard => {
      hazard.y += (forwardSpeed + CONFIG.obstacleSpeed) * dt;
      if (!hazard.hit && Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), hazard.getBounds())) {
        hazard.hit = true; this.elapsed = Math.min(CONFIG.levelSeconds, this.elapsed + CONFIG.collisionSlow); this.flash = 0.15; hazard.setAlpha(0.35);
      }
      if (hazard.y > CONFIG.height + 80) { hazard.destroy(); return false; }
      return true;
    });
    if (this.flash > 0) { this.flash -= dt; this.player.setFillStyle(this.flash > 0 ? 0xffffff : COLORS.player); }
  }

  finishRace() {
    this.state = "finished";
    const finalTime = this.elapsed;
    const isBest = !this.bestTime || finalTime < this.bestTime;
    if (isBest) { this.bestTime = finalTime; localStorage.setItem(CONFIG.topScoreKey, String(finalTime)); }
    this.hazards.forEach(hazard => hazard.destroy()); this.hazards = [];
    this.showGameOver(finalTime, isBest);
  }

  showGameOver(finalTime, isBest) {
    this.clearOverlay();
    this.overlay = this.add.container(0, 0).setDepth(20);
    const panel = this.add.rectangle(CONFIG.width / 2, CONFIG.height / 2, 570, 330, COLORS.panel, 0.98).setStrokeStyle(2, isBest ? 0xffcb5c : 0x596bb0);
    const title = this.add.text(CONFIG.width / 2, 175, "FINISH LINE!", { fontSize: "39px", fontStyle: "bold", color: isBest ? "#ffcb5c" : "#62e6c9" }).setOrigin(0.5);
    const copy = this.add.text(CONFIG.width / 2, 236, `${isBest ? "NEW TOP SCORE" : "RACE COMPLETE"}\nYour time  ${this.formatTime(finalTime)}\nTop score  ${this.formatTime(this.bestTime)}`, { fontSize: "21px", align: "center", color: COLORS.ink, lineSpacing: 9 }).setOrigin(0.5);
    const button = this.add.rectangle(CONFIG.width / 2, 365, 250, 60, 0xffcb5c).setInteractive({ useHandCursor: true });
    const buttonText = this.add.text(CONFIG.width / 2, 365, "PLAY AGAIN", { fontSize: "20px", fontStyle: "bold", color: "#151b35" }).setOrigin(0.5);
    button.on("pointerdown", () => this.startRace());
    this.overlay.add([panel, title, copy, button, buttonText]);
    this.setRaceVisible(false);
  }

  updateHud() {
    this.timerText.setText(`TIME ${this.formatTime(this.elapsed)}`);
    this.bestText.setText(`BEST ${this.bestTime ? this.formatTime(this.bestTime) : "--"}`);
    this.boostText.setText(this.boostLeft > 0 ? "BOOSTING!" : this.boostCooldown > 0 ? `BOOST ${this.boostCooldown.toFixed(1)}s` : "BOOST READY");
    this.boostText.setColor(this.boostLeft > 0 ? "#ffcb5c" : "#62e6c9");
    this.progressText.setText(this.elapsed > CONFIG.levelSeconds * 0.72 ? "FINAL SPRINT" : this.elapsed > CONFIG.levelSeconds * 0.38 ? "BUSY SECTION" : "START LINE");
  }

  setRaceVisible(visible) { [this.timerText, this.bestText, this.boostText, this.progressText, ...this.touchButtons, ...this.touchLabels].forEach(item => item.setVisible(visible)); }
  clearOverlay() { if (this.overlay) this.overlay.destroy(true); }
  formatTime(time) { return `${time.toFixed(1).padStart(4, "0")}s`; }
}

new Phaser.Game({ type: Phaser.AUTO, parent: "game-root", width: CONFIG.width, height: CONFIG.height, backgroundColor: "#1d2954", scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: RaceScene });
