/* Orbit Breaker - one-touch orbit runner MVP */

const WORLD_W = 390;
const WORLD_H = 844;
const START_PLANET_X = 188;
const START_PLANET_Y = 628;
const BASE_SCROLL_SPEED = 74;
const MAX_SCROLL_SPEED = 176;
const SPEED_RAMP_MS = 70000;
const BASE_CAPTURE_RADIUS = 72;
const MIN_CAPTURE_RADIUS = 55;
const LAUNCH_SPEED = 462;
const BASE_DANGER_Y = WORLD_H - 28;
const MIN_DANGER_Y = WORLD_H - 142;
const DANGER_RAMP_MS = 90000;
const METEOR_START_MS = 12000;
const METEOR_WARN_MS = 720;
const PLANET_SPACING_MIN = 224;
const PLANET_SPACING_MAX = 286;
const SHARD_VALUE = 16;
const CLEAN_CAPTURE_BONUS = 24;
const DISTANCE_SCORE_SCALE = 0.12;
const MIN_UPGRADE_SCORE = 260;
const RECORD_KEY = "ob-best";
const MUTED_KEY = "ob-muted";
const VERSION = "0.1.4";

const LANES = [82, 153, 226, 306];

const UPGRADE_POOL = [
  { id: "wider_capture", name: "Wider Capture", desc: "+18% capture rings" },
  { id: "slower_collapse", name: "Slow Collapse", desc: "Danger edge falls back" },
  { id: "shard_magnet", name: "Shard Magnet", desc: "Pull nearby shards" },
  { id: "emergency_blink", name: "Emergency Blink", desc: "One missed well snaps in" },
  { id: "combo_boost", name: "Combo Boost", desc: "Bigger chain bonuses" },
  { id: "shield", name: "Shield", desc: "Survive one hit" },
];

const PLANET_STYLES = [
  {
    id: "gas_banded",
    base: 0x14233d,
    primaries: [0x00b7ff, 0x38ffd6, 0x7ea7ff],
    secondaries: [0x184c6f, 0x136b80, 0x253a83],
    accents: [0xffdc4a, 0x9af7ff, 0xffffff],
  },
  {
    id: "cratered_rock",
    base: 0x2d2630,
    primaries: [0xff9a3c, 0xb98d66, 0xf05c5c],
    secondaries: [0x513a31, 0x4b4250, 0x62332d],
    accents: [0xffdc4a, 0xffffff, 0xff7bdc],
  },
  {
    id: "icy_ringed",
    base: 0x102641,
    primaries: [0x8dffca, 0x9af7ff, 0xb7c7ff],
    secondaries: [0x1b4b63, 0x193e52, 0x243760],
    accents: [0xffffff, 0x00e5ff, 0xffdc4a],
  },
  {
    id: "molten_core",
    base: 0x28172a,
    primaries: [0xff4a6d, 0xff7a32, 0xffdc4a],
    secondaries: [0x421826, 0x4a2315, 0x39220f],
    accents: [0xffdc4a, 0xff9a3c, 0xffffff],
  },
  {
    id: "neon_ocean",
    base: 0x101f39,
    primaries: [0x00e5ff, 0x00b7ff, 0x8dffca],
    secondaries: [0x123c58, 0x102f68, 0x0d4d56],
    accents: [0xff4fd8, 0xffffff, 0xffdc4a],
  },
  {
    id: "dark_unstable",
    base: 0x18172f,
    primaries: [0x9c7dff, 0xff4fd8, 0x6cecff],
    secondaries: [0x241848, 0x33183c, 0x142a45],
    accents: [0xff4a6d, 0xffdc4a, 0xffffff],
  },
];

class OrbitBreaker extends Phaser.Scene {
  constructor() {
    super("OrbitBreaker");
  }

  init(data) {
    this.activeUpgrades = Array.isArray(data?.upgrades) ? data.upgrades : [];
    this.elapsed = 0;
    this.runElapsed = 0;
    this.distance = 0;
    this.distScore = 0;
    this.bonusScore = 0;
    this.chain = 0;
    this.best = this.loadBest();
    this.isGameOver = false;
    this.isDead = false;
    this.mode = "orbit";
    this.planets = [];
    this.shards = [];
    this.asteroids = [];
    this.missiles = [];
    this.meteorites = [];
    this.shootingStars = [];
    this.pulses = [];
    this.trail = [];
    this.currentPlanet = null;
    this.hasLaunchedOnce = false;
    this.nextSpawnY = START_PLANET_Y;
    this.lastLane = 1;
    this.orbitAngle = -Math.PI / 2;
    this.orbitDir = 1;
    this.freeVelocity = new Phaser.Math.Vector2(0, 0);
    this.launchedAt = 0;
    this.dangerPulseTimer = 0;
    this.missileTimer = 0;
    this.meteorTimer = Phaser.Math.Between(2600, 4200);
    this.shootingStarTimer = Phaser.Math.Between(700, 1700);
    this.shieldReady = this.hasUpgrade("shield");
    this.blinkReady = this.hasUpgrade("emergency_blink");
    this.awaitingUpgrade = false;
    this.retryReady = false;
    this.muted = this.loadMuted();
    this.audioCtx = null;
  }

  create() {
    this.cameras.main.setBackgroundColor("#050712");
    this.createTextures();

    this.bgLayer = this.add.layer();
    this.worldLayer = this.add.layer();
    this.fxLayer = this.add.layer();
    this.playerLayer = this.add.layer();
    this.uiLayer = this.add.layer();
    this.overlayLayer = this.add.layer();

    this.createBackground();
    this.createWorld();
    this.createPlayer();
    this.createUI();

    this.input.on("pointerdown", this.handleTap, this);
  }

  createTextures() {
    if (!this.textures.exists("ship")) {
      const g = this.add.graphics();
      g.fillStyle(0xf8fdff, 1);
      g.fillTriangle(18, 0, 34, 38, 18, 30);
      g.fillTriangle(18, 0, 2, 38, 18, 30);
      g.fillStyle(0x00e5ff, 0.95);
      g.fillTriangle(18, 9, 27, 31, 18, 25);
      g.fillTriangle(18, 9, 9, 31, 18, 25);
      g.lineStyle(3, 0x61f4ff, 1);
      g.strokeTriangle(18, 0, 34, 38, 18, 30);
      g.strokeTriangle(18, 0, 2, 38, 18, 30);
      g.generateTexture("ship", 36, 42);
      g.destroy();
    }

    if (!this.textures.exists("shard")) {
      const g = this.add.graphics();
      g.fillStyle(0xffdc4a, 1);
      g.fillTriangle(9, 0, 18, 10, 9, 22);
      g.fillTriangle(9, 22, 0, 10, 9, 0);
      g.lineStyle(2, 0xffffff, 0.65);
      g.strokeTriangle(9, 0, 18, 10, 9, 22);
      g.strokeTriangle(9, 22, 0, 10, 9, 0);
      g.generateTexture("shard", 18, 22);
      g.destroy();
    }
  }

  createBackground() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x071426, 0x071426, 0x050712, 0x050712, 1, 1, 1, 1);
    bg.fillRect(0, 0, WORLD_W, WORLD_H);
    bg.fillStyle(0x16264a, 0.24);
    bg.fillCircle(WORLD_W * 0.3, WORLD_H * 0.22, 190);
    bg.fillStyle(0x33183c, 0.18);
    bg.fillCircle(WORLD_W * 0.86, WORLD_H * 0.68, 220);
    this.bgLayer.add(bg);

    this.stars = [];
    const starColors = [0x8beeff, 0xffffff, 0xffe58f, 0xff7bdc];
    for (let i = 0; i < 86; i++) {
      const star = this.add.circle(
        Phaser.Math.Between(0, WORLD_W),
        Phaser.Math.Between(0, WORLD_H),
        Phaser.Math.FloatBetween(0.7, 1.9),
        Phaser.Utils.Array.GetRandom(starColors),
        Phaser.Math.FloatBetween(0.35, 0.88)
      );
      star.speedFactor = Phaser.Math.FloatBetween(0.12, 0.34);
      this.stars.push(star);
      this.bgLayer.add(star);
    }

    this.nebulaLines = this.add.graphics();
    this.bgLayer.add(this.nebulaLines);
  }

  createWorld() {
    const start = this.spawnPlanet({
      x: START_PLANET_X,
      y: START_PLANET_Y,
      radius: 33,
      captureRadius: 88,
      orbitRadius: 70,
      orbitSpeed: 1.52,
      style: PLANET_STYLES.find((style) => style.id === "neon_ocean"),
      primaryColor: 0x00b7ff,
      secondaryColor: 0x123c58,
      accentColor: 0xff4fd8,
      unstable: false,
      asteroid: false,
    });
    this.currentPlanet = start;
    this.nextSpawnY = START_PLANET_Y - 252;
    this.lastLane = 1;

    while (this.nextSpawnY > -360) {
      this.spawnNextPlanet();
    }
  }

  createPlayer() {
    this.ship = this.add.image(START_PLANET_X, START_PLANET_Y - 70, "ship").setOrigin(0.5);
    this.ship.setDepth(20);
    this.playerLayer.add(this.ship);

    this.shipGlow = this.add.circle(this.ship.x, this.ship.y, 24, 0x00e5ff, 0.18);
    this.shipGlow.setDepth(18);
    this.playerLayer.add(this.shipGlow);

    if (this.shieldReady) {
      this.shieldRing = this.add.circle(this.ship.x, this.ship.y, 28);
      this.shieldRing.setStrokeStyle(3, 0xffdc4a, 0.9);
      this.playerLayer.add(this.shieldRing);
      this.tweens.add({ targets: this.shieldRing, alpha: 0.28, duration: 520, yoyo: true, repeat: -1 });
    }
  }

  createUI() {
    this.scoreText = this.add.text(WORLD_W / 2, 20, "0", {
      color: "#f8fdff",
      fontSize: "38px",
      fontStyle: "900",
      stroke: "#050712",
      strokeThickness: 7,
    }).setOrigin(0.5, 0);

    this.bestText = this.add.text(WORLD_W - 14, 16, `Best ${this.best}`, {
      color: "#7fcfff",
      fontSize: "15px",
      fontStyle: "800",
      stroke: "#050712",
      strokeThickness: 5,
    }).setOrigin(1, 0);

    this.chainText = this.add.text(14, 17, "", {
      color: "#ffdc4a",
      fontSize: "14px",
      fontStyle: "800",
      stroke: "#050712",
      strokeThickness: 5,
    }).setOrigin(0, 0);

    this.hintText = this.add.text(WORLD_W / 2, WORLD_H * 0.74, "TAP TO LAUNCH", {
      color: "#9af7ff",
      fontSize: "20px",
      fontStyle: "900",
      stroke: "#050712",
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.upgradeText = this.add.text(14, 42, "", {
      color: "#8dffca",
      fontSize: "11px",
      lineSpacing: 2,
      stroke: "#050712",
      strokeThickness: 4,
    }).setOrigin(0, 0);
    this.refreshUpgradeText();

    this.muteButton = this.add.text(WORLD_W - 14, WORLD_H - 14, this.muted ? "SFX OFF" : "SFX ON", {
      color: "#6d8fb8",
      fontSize: "12px",
      fontStyle: "800",
      stroke: "#050712",
      strokeThickness: 4,
    }).setOrigin(1, 1).setInteractive({ useHandCursor: true });
    this.muteButton.on("pointerdown", (_pointer, _x, _y, event) => {
      event?.stopPropagation();
      this.toggleMuted();
    });

    const version = this.add.text(14, WORLD_H - 14, `v${VERSION}`, {
      color: "#31435c",
      fontSize: "12px",
      fontStyle: "700",
    }).setOrigin(0, 1);

    this.uiLayer.add([
      this.scoreText,
      this.bestText,
      this.chainText,
      this.hintText,
      this.upgradeText,
      this.muteButton,
      version,
    ]);
  }

  spawnNextPlanet() {
    const progress = this.getDifficulty();
    const laneChoices = LANES
      .map((x, i) => ({ x, i, weight: i === this.lastLane ? 0.35 : 1 }))
      .filter((lane) => Math.abs(lane.x - LANES[this.lastLane]) <= 170 || progress < 0.55);
    const pick = this.weightedLane(laneChoices);
    this.lastLane = pick.i;

    const radius = Phaser.Math.Between(22, Math.round(32 - progress * 5));
    const capBase = Phaser.Math.Linear(BASE_CAPTURE_RADIUS, MIN_CAPTURE_RADIUS, progress);
    const captureRadius = capBase * (this.hasUpgrade("wider_capture") ? 1.18 : 1);
    const orbitRadius = radius + Phaser.Math.Between(34, 42);
    const orbitSpeed = Phaser.Math.FloatBetween(1.18 + progress * 0.24, 1.72 + progress * 0.38);
    const style = Phaser.Utils.Array.GetRandom(PLANET_STYLES);
    const unstable = this.runElapsed > 18000 && Math.random() < 0.16 + progress * 0.22;
    const asteroid = this.runElapsed > 13000 && Math.random() < 0.18 + progress * 0.26;

    this.spawnPlanet({
      x: pick.x + Phaser.Math.Between(-14, 14),
      y: this.nextSpawnY,
      radius,
      captureRadius,
      orbitRadius,
      orbitSpeed,
      style,
      unstable,
      asteroid,
    });

    if (Math.random() < 0.72) {
      this.spawnShard(pick.x + Phaser.Math.Between(-42, 42), this.nextSpawnY + Phaser.Math.Between(74, 116));
    }

    const spacing = Phaser.Math.Linear(PLANET_SPACING_MIN, PLANET_SPACING_MAX, progress);
    this.nextSpawnY -= spacing + Phaser.Math.Between(-18, 22);
  }

  spawnPlanet(config) {
    const style = typeof config.style === "string"
      ? PLANET_STYLES.find((candidate) => candidate.id === config.style) || Phaser.Utils.Array.GetRandom(PLANET_STYLES)
      : config.style || Phaser.Utils.Array.GetRandom(PLANET_STYLES);
    const primaryColor = config.primaryColor ?? config.color ?? Phaser.Utils.Array.GetRandom(style.primaries);
    const secondaryColor = config.secondaryColor ?? Phaser.Utils.Array.GetRandom(style.secondaries);
    const accentColor = config.accentColor ?? Phaser.Utils.Array.GetRandom(style.accents);
    const planet = {
      x: config.x,
      y: config.y,
      radius: config.radius,
      captureRadius: config.captureRadius,
      orbitRadius: config.orbitRadius,
      orbitSpeed: config.orbitSpeed,
      style,
      primaryColor,
      secondaryColor,
      accentColor,
      unstable: config.unstable,
      unstableTime: config.unstable ? Phaser.Math.FloatBetween(1.4, 2.1) : Infinity,
      capturedAt: -1,
      depleted: false,
      details: this.createPlanetDetails(style, config.radius),
      gfx: this.add.graphics(),
      ring: this.add.graphics(),
      dangerRing: this.add.graphics(),
    };

    this.worldLayer.add([planet.ring, planet.gfx, planet.dangerRing]);
    this.planets.push(planet);
    this.redrawPlanet(planet);

    if (config.asteroid) {
      this.spawnAsteroid(planet);
    }

    return planet;
  }

  createPlanetDetails(style, radius) {
    const details = { bands: [], craters: [], fissures: [], spots: [], arcs: [] };

    if (style.id === "gas_banded") {
      for (let i = 0; i < 5; i++) {
        details.bands.push({
          dy: Phaser.Math.Linear(-radius * 0.55, radius * 0.5, i / 4) + Phaser.Math.Between(-3, 3),
          h: Phaser.Math.Between(4, 8),
          alpha: Phaser.Math.FloatBetween(0.16, 0.34),
          useAccent: i % 2 === 0,
        });
      }
    }

    if (style.id === "cratered_rock") {
      for (let i = 0; i < 6; i++) details.craters.push(this.randomPlanetPoint(radius, 0.74, Phaser.Math.Between(3, 7)));
    }

    if (style.id === "icy_ringed") {
      details.arcs.push({ rx: radius * 1.75, ry: radius * 0.55, tilt: -0.38, alpha: 0.52 });
      for (let i = 0; i < 4; i++) details.spots.push(this.randomPlanetPoint(radius, 0.62, Phaser.Math.Between(2, 4)));
    }

    if (style.id === "molten_core") {
      details.spots.push({ x: 0, y: 0, r: radius * 0.34 });
      for (let i = 0; i < 5; i++) {
        const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const inner = radius * Phaser.Math.FloatBetween(0.08, 0.28);
        const outer = radius * Phaser.Math.FloatBetween(0.48, 0.78);
        details.fissures.push({
          x1: Math.cos(a) * inner,
          y1: Math.sin(a) * inner,
          x2: Math.cos(a + Phaser.Math.FloatBetween(-0.35, 0.35)) * outer,
          y2: Math.sin(a + Phaser.Math.FloatBetween(-0.35, 0.35)) * outer,
        });
      }
    }

    if (style.id === "neon_ocean") {
      for (let i = 0; i < 5; i++) details.spots.push(this.randomPlanetPoint(radius, 0.72, Phaser.Math.Between(2, 5)));
      details.arcs.push({ rx: radius * 0.78, ry: radius * 0.28, tilt: 0.5, alpha: 0.34 });
    }

    if (style.id === "dark_unstable") {
      for (let i = 0; i < 4; i++) details.craters.push(this.randomPlanetPoint(radius, 0.68, Phaser.Math.Between(4, 8)));
      for (let i = 0; i < 3; i++) details.fissures.push({
        x1: Phaser.Math.FloatBetween(-radius * 0.45, radius * 0.25),
        y1: Phaser.Math.FloatBetween(-radius * 0.45, radius * 0.45),
        x2: Phaser.Math.FloatBetween(-radius * 0.15, radius * 0.55),
        y2: Phaser.Math.FloatBetween(-radius * 0.45, radius * 0.45),
      });
    }

    return details;
  }

  randomPlanetPoint(radius, maxDist, pointRadius) {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const dist = radius * Phaser.Math.FloatBetween(0.12, maxDist);
    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      r: pointRadius,
    };
  }

  redrawPlanet(planet) {
    planet.ring.clear();
    planet.ring.lineStyle(2, planet.accentColor, 0.24);
    planet.ring.strokeCircle(planet.x, planet.y, planet.captureRadius);
    planet.ring.lineStyle(1, 0xffffff, 0.12);
    planet.ring.strokeCircle(planet.x, planet.y, planet.orbitRadius);

    planet.gfx.clear();
    if (planet.style.id === "icy_ringed") {
      this.drawTiltedEllipse(planet.gfx, planet.x, planet.y, planet.radius * 1.78, planet.radius * 0.56, -0.38, planet.accentColor, planet.depleted ? 0.16 : 0.44, 4);
      this.drawTiltedEllipse(planet.gfx, planet.x, planet.y, planet.radius * 1.38, planet.radius * 0.42, -0.38, 0xffffff, planet.depleted ? 0.08 : 0.18, 1.5);
    }

    planet.gfx.fillStyle(planet.primaryColor, planet.depleted ? 0.07 : 0.17);
    planet.gfx.fillCircle(planet.x, planet.y, planet.radius + 16);
    planet.gfx.fillStyle(planet.style.base, 1);
    planet.gfx.fillCircle(planet.x, planet.y, planet.radius);
    planet.gfx.fillStyle(planet.secondaryColor, planet.depleted ? 0.18 : 0.42);
    planet.gfx.fillCircle(planet.x, planet.y, planet.radius * 0.72);
    this.drawPlanetSurface(planet);
    planet.gfx.lineStyle(4, planet.primaryColor, planet.depleted ? 0.35 : 0.95);
    planet.gfx.strokeCircle(planet.x, planet.y, planet.radius);
    planet.gfx.fillStyle(0xffffff, 0.38);
    planet.gfx.fillCircle(planet.x - planet.radius * 0.34, planet.y - planet.radius * 0.34, Math.max(4, planet.radius * 0.18));

    planet.dangerRing.clear();
    if (planet.unstable) {
      planet.dangerRing.lineStyle(3, 0xff4a6d, 0.76);
      planet.dangerRing.strokeCircle(planet.x, planet.y, planet.radius + 9);
      planet.dangerRing.lineStyle(2, 0xff9a3c, 0.42);
      planet.dangerRing.strokeCircle(planet.x, planet.y, planet.radius + 17);
    }
  }

  drawPlanetSurface(planet) {
    const g = planet.gfx;
    const r = planet.radius;
    const alphaScale = planet.depleted ? 0.45 : 1;

    for (const band of planet.details.bands) {
      const dy = Phaser.Math.Clamp(band.dy, -r + 3, r - 3);
      const chord = Math.sqrt(Math.max(0, r * r - dy * dy));
      g.fillStyle(band.useAccent ? planet.accentColor : planet.primaryColor, band.alpha * alphaScale);
      g.fillRect(planet.x - chord, planet.y + dy - band.h / 2, chord * 2, band.h);
    }

    for (const spot of planet.details.spots) {
      g.fillStyle(planet.accentColor, 0.2 * alphaScale);
      g.fillCircle(planet.x + spot.x, planet.y + spot.y, spot.r + 4);
      g.fillStyle(planet.primaryColor, 0.55 * alphaScale);
      g.fillCircle(planet.x + spot.x, planet.y + spot.y, spot.r);
    }

    for (const crater of planet.details.craters) {
      g.fillStyle(0x050712, 0.32 * alphaScale);
      g.fillCircle(planet.x + crater.x, planet.y + crater.y, crater.r);
      g.lineStyle(1.5, planet.accentColor, 0.35 * alphaScale);
      g.strokeCircle(planet.x + crater.x, planet.y + crater.y, crater.r + 1);
    }

    for (const fissure of planet.details.fissures) {
      g.lineStyle(3, planet.accentColor, 0.62 * alphaScale);
      g.lineBetween(planet.x + fissure.x1, planet.y + fissure.y1, planet.x + fissure.x2, planet.y + fissure.y2);
      g.lineStyle(1, 0xffffff, 0.2 * alphaScale);
      g.lineBetween(planet.x + fissure.x1, planet.y + fissure.y1, planet.x + fissure.x2, planet.y + fissure.y2);
    }

    for (const arc of planet.details.arcs) {
      this.drawTiltedEllipse(g, planet.x, planet.y, arc.rx, arc.ry, arc.tilt, planet.accentColor, arc.alpha * alphaScale, 2);
    }
  }

  drawTiltedEllipse(g, cx, cy, rx, ry, tilt, color, alpha, width, start = 0, end = Math.PI * 2) {
    g.lineStyle(width, color, alpha);
    const steps = 40;
    let prev = null;
    for (let i = 0; i <= steps; i++) {
      const t = start + (end - start) * (i / steps);
      const x = Math.cos(t) * rx;
      const y = Math.sin(t) * ry;
      const px = cx + x * Math.cos(tilt) - y * Math.sin(tilt);
      const py = cy + x * Math.sin(tilt) + y * Math.cos(tilt);
      if (prev) g.lineBetween(prev.x, prev.y, px, py);
      prev = { x: px, y: py };
    }
  }

  spawnAsteroid(planet) {
    const asteroid = {
      planet,
      angle: Phaser.Math.FloatBetween(0, Math.PI * 2),
      radius: planet.orbitRadius + Phaser.Math.Between(26, 40),
      speed: Phaser.Math.FloatBetween(0.85, 1.35) * (Math.random() < 0.5 ? -1 : 1),
      bodyRadius: Phaser.Math.Between(8, 12),
      gfx: this.add.graphics(),
      warning: this.add.graphics(),
    };
    this.worldLayer.add([asteroid.warning, asteroid.gfx]);
    this.asteroids.push(asteroid);
  }

  spawnShard(x, y) {
    const shard = this.add.image(x, y, "shard");
    shard.setDepth(8);
    shard.spin = Phaser.Math.FloatBetween(-2.2, 2.2);
    this.shards.push(shard);
    this.worldLayer.add(shard);
  }

  handleTap(pointer) {
    this.ensureAudio();

    if (this.isGameOver) {
      if (this.awaitingUpgrade || !this.retryReady) return;
      this.scene.restart({ upgrades: this.activeUpgrades });
      return;
    }

    if (this.isDead) return;

    if (this.mode !== "orbit") {
      this.tryManualBlink();
      return;
    }

    this.hintText.setVisible(false);
    this.launchShip();
  }

  launchShip() {
    const tangent = this.getOrbitTangent();
    if (tangent.y > -0.16) {
      tangent.y = -0.42;
      tangent.normalize();
    }

    this.mode = "free";
    this.hasLaunchedOnce = true;
    this.launchedAt = this.elapsed;
    this.freeVelocity.copy(tangent.scale(LAUNCH_SPEED));
    this.pointShipAlong(this.freeVelocity);
    this.currentPlanet.depleted = true;
    this.redrawPlanet(this.currentPlanet);
    this.currentPlanet = null;
    this.updateChainText();
    this.addPulse(this.ship.x, this.ship.y, 30, 0x00e5ff);
    this.cameras.main.shake(70, 0.004);
    this.playSfx("launch");
  }

  tryManualBlink() {
    if (!this.blinkReady) return;
    const planet = this.findNearestPlanet(this.ship.x, this.ship.y, 138);
    if (!planet) return;
    this.blinkReady = false;
    this.capturePlanet(planet, true);
  }

  update(_, delta) {
    if (this.isGameOver) return;
    const dt = Math.min(delta / 1000, 0.034);
    this.elapsed += delta;
    if (this.hasLaunchedOnce) this.runElapsed += delta;

    const scroll = this.hasLaunchedOnce ? this.getScrollSpeed() * dt : 0;
    this.distance += scroll;
    this.scrollBackground(scroll, dt);
    this.updateShootingStars(dt, delta);
    this.scrollWorld(scroll);

    this.updateMode(dt);
    this.updateHazards(dt);
    this.updateShards(dt);
    this.updateTrail(dt);
    this.updatePulses(dt);
    this.updateMissiles(dt);
    this.updateMeteorites(dt);
    this.updateScore();
    this.updateDangerEdge(dt);
    this.recycleWorld();

    if (this.runElapsed > METEOR_START_MS) this.maybeSpawnMeteorite(delta);
    if (this.runElapsed > 36000) this.maybeSpawnMissile(delta);
  }

  updateMode(dt) {
    if (this.mode === "orbit" && this.currentPlanet) {
      const p = this.currentPlanet;
      this.orbitAngle += p.orbitSpeed * this.orbitDir * dt;
      this.ship.x = p.x + Math.cos(this.orbitAngle) * p.orbitRadius;
      this.ship.y = p.y + Math.sin(this.orbitAngle) * p.orbitRadius;
      this.pointShipAlong(this.getOrbitTangent());

      if (p.unstable && p.capturedAt >= 0) {
        const held = (this.elapsed - p.capturedAt) / 1000;
        const remaining = Math.max(0, p.unstableTime - held);
        p.dangerRing.alpha = Phaser.Math.Clamp(remaining / p.unstableTime, 0.25, 1);
        if (remaining <= 0) {
          this.killPlayer("Unstable gravity well");
        }
      }
    } else {
      this.ship.x += this.freeVelocity.x * dt;
      this.ship.y += this.freeVelocity.y * dt;
      this.freeVelocity.y += 18 * dt;
      this.pointShipAlong(this.freeVelocity);
      this.checkCapture();
      this.checkMiss();
    }

    this.shipGlow.x = this.ship.x;
    this.shipGlow.y = this.ship.y;
    if (this.shieldRing) {
      this.shieldRing.x = this.ship.x;
      this.shieldRing.y = this.ship.y;
    }
  }

  getOrbitTangent() {
    return new Phaser.Math.Vector2(
      -Math.sin(this.orbitAngle) * this.orbitDir,
      Math.cos(this.orbitAngle) * this.orbitDir
    );
  }

  pointShipAlong(direction) {
    if (!direction || (direction.x === 0 && direction.y === 0)) return;
    this.ship.rotation = Math.atan2(direction.y, direction.x) + Math.PI / 2;
  }

  checkCapture() {
    const planet = this.findNearestPlanet(this.ship.x, this.ship.y, 999);
    if (!planet) return;
    const dist = Phaser.Math.Distance.Between(this.ship.x, this.ship.y, planet.x, planet.y);
    if (dist <= planet.captureRadius && !planet.depleted) {
      this.capturePlanet(planet, false);
    }
  }

  capturePlanet(planet, blinked) {
    const dx = this.ship.x - planet.x;
    const dy = this.ship.y - planet.y;
    this.orbitAngle = Math.atan2(dy, dx);
    this.orbitDir = Math.random() < 0.5 ? -1 : 1;
    this.mode = "orbit";
    this.currentPlanet = planet;
    planet.capturedAt = this.elapsed;

    const flightMs = Math.max(1, this.elapsed - this.launchedAt);
    const clean = !blinked && flightMs < 1500;
    this.chain = clean ? this.chain + 1 : Math.max(1, this.chain);
    const combo = this.hasUpgrade("combo_boost") ? 1.65 : 1;
    this.bonusScore += Math.round(CLEAN_CAPTURE_BONUS * this.chain * combo);
    this.updateChainText();

    this.addPulse(planet.x, planet.y, planet.captureRadius, blinked ? 0x8dffca : 0xffdc4a);
    this.cameras.main.shake(blinked ? 130 : 80, blinked ? 0.012 : 0.006);
    this.playSfx(blinked ? "blink" : "capture");
  }

  checkMiss() {
    if (this.ship.x < -58 || this.ship.x > WORLD_W + 58 || this.ship.y < -96 || this.ship.y > WORLD_H + 80) {
      if (this.tryAutoBlink()) return;
      this.killPlayer("Lost trajectory");
    }
  }

  tryAutoBlink() {
    if (!this.blinkReady) return false;
    const planet = this.findNearestPlanet(this.ship.x, this.ship.y, 168);
    if (!planet) return false;
    this.blinkReady = false;
    this.capturePlanet(planet, true);
    return true;
  }

  findNearestPlanet(x, y, maxRange) {
    let best = null;
    let bestDist = maxRange;
    for (const planet of this.planets) {
      if (planet.depleted) continue;
      const d = Phaser.Math.Distance.Between(x, y, planet.x, planet.y);
      if (d < bestDist) {
        bestDist = d;
        best = planet;
      }
    }
    return best;
  }

  updateHazards(dt) {
    for (const asteroid of this.asteroids) {
      const p = asteroid.planet;
      asteroid.angle += asteroid.speed * dt;
      const x = p.x + Math.cos(asteroid.angle) * asteroid.radius;
      const y = p.y + Math.sin(asteroid.angle) * asteroid.radius;

      asteroid.warning.clear();
      asteroid.warning.lineStyle(2, 0xff4a6d, 0.28);
      asteroid.warning.strokeCircle(p.x, p.y, asteroid.radius);

      asteroid.gfx.clear();
      asteroid.gfx.fillStyle(0xff4a6d, 0.22);
      asteroid.gfx.fillCircle(x, y, asteroid.bodyRadius + 8);
      asteroid.gfx.fillStyle(0xff9a3c, 1);
      asteroid.gfx.fillCircle(x, y, asteroid.bodyRadius);
      asteroid.gfx.lineStyle(2, 0xffffff, 0.4);
      asteroid.gfx.strokeCircle(x, y, asteroid.bodyRadius);

      if (Phaser.Math.Distance.Between(this.ship.x, this.ship.y, x, y) < asteroid.bodyRadius + 13) {
        this.killPlayer("Asteroid impact");
      }
    }
  }

  updateShards(dt) {
    const magnet = this.hasUpgrade("shard_magnet");
    for (const shard of this.shards) {
      if (!shard.active) continue;
      shard.rotation += shard.spin * dt;
      shard.setScale(1 + Math.sin((this.elapsed + shard.x * 7) * 0.008) * 0.08);

      if (magnet) {
        const d = Phaser.Math.Distance.Between(this.ship.x, this.ship.y, shard.x, shard.y);
        if (d < 92 && d > 2) {
          shard.x += ((this.ship.x - shard.x) / d) * 180 * dt;
          shard.y += ((this.ship.y - shard.y) / d) * 180 * dt;
        }
      }

      if (Phaser.Math.Distance.Between(this.ship.x, this.ship.y, shard.x, shard.y) < 28) {
        this.collectShard(shard);
      }
    }
  }

  collectShard(shard) {
    if (!shard.active) return;
    shard.destroy();
    const combo = this.hasUpgrade("combo_boost") ? 1.35 : 1;
    this.bonusScore += Math.round(SHARD_VALUE * combo);
    this.addPulse(shard.x, shard.y, 22, 0xffdc4a);
    this.tweens.add({ targets: this.scoreText, scaleX: 1.18, scaleY: 1.18, duration: 70, yoyo: true });
    this.playSfx("shard");
  }

  maybeSpawnMissile(delta) {
    this.missileTimer -= delta;
    if (this.missileTimer > 0) return;
    const progress = this.getDifficulty();
    this.missileTimer = Phaser.Math.Between(3400, 5600) - progress * 1400;
    if (Math.random() > 0.35 + progress * 0.24) return;

    const fromLeft = Math.random() < 0.5;
    const y = Phaser.Math.Clamp(this.ship.y + Phaser.Math.Between(-80, 80), 108, WORLD_H - 205);
    const warning = this.add.graphics();
    const missile = {
      x: fromLeft ? -46 : WORLD_W + 46,
      y,
      vx: fromLeft ? 265 + progress * 75 : -265 - progress * 75,
      armedIn: 720,
      warning,
      body: this.add.graphics(),
    };
    this.worldLayer.add([warning, missile.body]);
    this.missiles.push(missile);
    this.playSfx("warning");
  }

  updateMissiles(dt) {
    for (const missile of this.missiles) {
      missile.armedIn -= dt * 1000;
      missile.warning.clear();
      if (missile.armedIn > 0) {
        const alpha = 0.28 + Math.sin(this.elapsed * 0.03) * 0.18;
        missile.warning.lineStyle(3, 0xff4a6d, alpha);
        missile.warning.lineBetween(0, missile.y, WORLD_W, missile.y);
        continue;
      }

      missile.x += missile.vx * dt;
      missile.body.clear();
      missile.body.fillStyle(0xff4a6d, 1);
      missile.body.fillTriangle(missile.x, missile.y, missile.x - Math.sign(missile.vx) * 28, missile.y - 10, missile.x - Math.sign(missile.vx) * 28, missile.y + 10);
      missile.body.fillStyle(0xffdc4a, 0.85);
      missile.body.fillCircle(missile.x - Math.sign(missile.vx) * 25, missile.y, 6);
      missile.body.lineStyle(2, 0xffffff, 0.4);
      missile.body.strokeCircle(missile.x, missile.y, 13);

      if (Phaser.Math.Distance.Between(this.ship.x, this.ship.y, missile.x, missile.y) < 26) {
        this.killPlayer("Missile strike");
      }
    }
  }

  maybeSpawnMeteorite(delta) {
    this.meteorTimer -= delta;
    if (this.meteorTimer > 0) return;

    const progress = this.getDifficulty();
    this.meteorTimer = Math.max(1900, Phaser.Math.Between(5200, 7600) - progress * 2700);
    this.spawnMeteorite(progress);
  }

  spawnMeteorite(progress) {
    const edge = Phaser.Math.Between(0, 2);
    const targetX = Phaser.Math.Clamp(this.ship.x + Phaser.Math.Between(-95, 95), 46, WORLD_W - 46);
    const targetY = Phaser.Math.Clamp(this.ship.y + Phaser.Math.Between(-150, 120), 96, WORLD_H - 210);
    let startX = 0;
    let startY = 0;

    if (edge === 0) {
      startX = Phaser.Math.Between(-30, WORLD_W + 30);
      startY = -72;
    } else if (edge === 1) {
      startX = -76;
      startY = Phaser.Math.Between(80, WORLD_H - 260);
    } else {
      startX = WORLD_W + 76;
      startY = Phaser.Math.Between(80, WORLD_H - 260);
    }

    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const speed = Phaser.Math.FloatBetween(230, 295) + progress * 115;
    const meteorite = {
      x: startX,
      y: startY,
      startX,
      startY,
      targetX,
      targetY,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      dirX: dx / dist,
      dirY: dy / dist,
      warnMs: METEOR_WARN_MS,
      bodyRadius: Phaser.Math.Between(11, 15),
      warning: this.add.graphics(),
      body: this.add.graphics(),
      done: false,
    };
    this.worldLayer.add([meteorite.warning, meteorite.body]);
    this.meteorites.push(meteorite);
    this.playSfx("warning");
  }

  updateMeteorites(dt) {
    for (const meteorite of this.meteorites) {
      if (meteorite.warnMs > 0) {
        meteorite.warnMs -= dt * 1000;
        this.drawMeteoriteWarning(meteorite);
        if (meteorite.warnMs <= 0) meteorite.warning.clear();
        continue;
      }

      meteorite.x += meteorite.vx * dt;
      meteorite.y += meteorite.vy * dt;
      this.drawMeteorite(meteorite);

      if (Phaser.Math.Distance.Between(this.ship.x, this.ship.y, meteorite.x, meteorite.y) < meteorite.bodyRadius + 14) {
        if (this.shieldReady) meteorite.done = true;
        this.killPlayer("Meteorite impact");
      }

      if (
        meteorite.x < -130 ||
        meteorite.x > WORLD_W + 130 ||
        meteorite.y < -130 ||
        meteorite.y > WORLD_H + 130
      ) {
        meteorite.done = true;
      }
    }

    this.meteorites = this.meteorites.filter((meteorite) => {
      if (!meteorite.done) return true;
      meteorite.warning.destroy();
      meteorite.body.destroy();
      return false;
    });
  }

  drawMeteoriteWarning(meteorite) {
    const alpha = 0.28 + Math.sin(this.elapsed * 0.035) * 0.16;
    meteorite.warning.clear();
    meteorite.warning.lineStyle(5, 0xff9a3c, alpha);
    meteorite.warning.lineBetween(meteorite.startX, meteorite.startY, meteorite.targetX, meteorite.targetY);
    meteorite.warning.lineStyle(2, 0xffffff, alpha * 0.7);
    meteorite.warning.lineBetween(meteorite.startX, meteorite.startY, meteorite.targetX, meteorite.targetY);
  }

  drawMeteorite(meteorite) {
    const g = meteorite.body;
    const tail = meteorite.bodyRadius * 5;
    const rearX = meteorite.x - meteorite.dirX * tail;
    const rearY = meteorite.y - meteorite.dirY * tail;

    g.clear();
    g.lineStyle(meteorite.bodyRadius * 1.2, 0xff4a6d, 0.23);
    g.lineBetween(rearX, rearY, meteorite.x, meteorite.y);
    g.lineStyle(meteorite.bodyRadius * 0.62, 0xff9a3c, 0.42);
    g.lineBetween(
      meteorite.x - meteorite.dirX * tail * 0.68,
      meteorite.y - meteorite.dirY * tail * 0.68,
      meteorite.x,
      meteorite.y
    );
    g.fillStyle(0xff9a3c, 0.18);
    g.fillCircle(meteorite.x, meteorite.y, meteorite.bodyRadius + 10);
    g.fillStyle(0x3b2d32, 1);
    g.fillCircle(meteorite.x, meteorite.y, meteorite.bodyRadius);
    g.fillStyle(0xffdc4a, 0.78);
    g.fillCircle(meteorite.x - meteorite.dirX * 4, meteorite.y - meteorite.dirY * 4, Math.max(3, meteorite.bodyRadius * 0.32));
    g.lineStyle(2, 0xff4a6d, 0.88);
    g.strokeCircle(meteorite.x, meteorite.y, meteorite.bodyRadius);
  }

  updateTrail(dt) {
    this.trail.push({
      x: this.ship.x,
      y: this.ship.y,
      r: this.mode === "orbit" ? 8 : 11,
      life: 0.42,
      maxLife: 0.42,
    });

    for (const t of this.trail) t.life -= dt;
    this.trail = this.trail.filter((t) => t.life > 0);

    if (!this.trailGfx) {
      this.trailGfx = this.add.graphics();
      this.fxLayer.add(this.trailGfx);
    }
    this.trailGfx.clear();
    for (const t of this.trail) {
      const a = Phaser.Math.Clamp(t.life / t.maxLife, 0, 1);
      this.trailGfx.fillStyle(this.mode === "orbit" ? 0x00e5ff : 0xff4fd8, a * 0.2);
      this.trailGfx.fillCircle(t.x, t.y, t.r * a);
    }
  }

  addPulse(x, y, radius, color) {
    this.pulses.push({ x, y, radius, color, life: 0.34, maxLife: 0.34 });
  }

  updatePulses(dt) {
    if (!this.pulseGfx) {
      this.pulseGfx = this.add.graphics();
      this.fxLayer.add(this.pulseGfx);
    }
    for (const p of this.pulses) p.life -= dt;
    this.pulses = this.pulses.filter((p) => p.life > 0);

    this.pulseGfx.clear();
    for (const p of this.pulses) {
      const t = 1 - p.life / p.maxLife;
      this.pulseGfx.lineStyle(4, p.color, (1 - t) * 0.75);
      this.pulseGfx.strokeCircle(p.x, p.y, p.radius * (0.35 + t * 0.9));
    }
  }

  updateScore() {
    this.distScore = Math.floor(this.distance * DISTANCE_SCORE_SCALE);
    const total = this.getScore();
    this.scoreText.setText(String(total));
    if (total > this.best) this.bestText.setText(`Best ${total}`);
  }

  updateChainText() {
    this.chainText.setText(this.chain > 1 ? `x${this.chain} CHAIN` : "");
  }

  updateDangerEdge(dt) {
    if (!this.dangerGfx) {
      this.dangerGfx = this.add.graphics();
      this.fxLayer.add(this.dangerGfx);
    }

    if (!this.hasLaunchedOnce) {
      this.dangerGfx.clear();
      return;
    }

    const targetY = this.getDangerY();
    this.dangerPulseTimer += dt;
    const pulse = 0.45 + Math.sin(this.dangerPulseTimer * 6) * 0.14;
    this.dangerGfx.clear();
    this.dangerGfx.fillStyle(0xff274d, 0.24);
    this.dangerGfx.fillRect(0, targetY, WORLD_W, WORLD_H - targetY);
    this.dangerGfx.lineStyle(5, 0xff4a6d, pulse);
    this.dangerGfx.lineBetween(0, targetY, WORLD_W, targetY);
    this.dangerGfx.lineStyle(2, 0xffdc4a, 0.38);
    this.dangerGfx.lineBetween(0, targetY + 13, WORLD_W, targetY + 13);

    if (this.ship.y > targetY - 8) {
      if (this.tryAutoBlink()) return;
      this.killPlayer("Collapsed starfield");
    }
  }

  updateShootingStars(dt, delta) {
    this.shootingStarTimer -= delta;
    if (this.shootingStarTimer <= 0) {
      this.spawnShootingStar();
      this.shootingStarTimer = Phaser.Math.Between(2500, 6000);
    }

    for (const star of this.shootingStars) {
      star.life -= dt;
      star.x += star.vx * dt;
      star.y += star.vy * dt;
      this.drawShootingStar(star);

      if (
        star.life <= 0 ||
        star.x < -140 ||
        star.x > WORLD_W + 140 ||
        star.y < -140 ||
        star.y > WORLD_H + 140
      ) {
        star.done = true;
      }
    }

    this.shootingStars = this.shootingStars.filter((star) => {
      if (!star.done) return true;
      star.gfx.destroy();
      return false;
    });
  }

  spawnShootingStar() {
    const edge = Phaser.Math.Between(0, 2);
    let startX = 0;
    let startY = 0;
    let targetX = 0;
    let targetY = 0;

    if (edge === 0) {
      startX = Phaser.Math.Between(-30, WORLD_W + 30);
      startY = -42;
      targetX = Phaser.Math.Between(20, WORLD_W - 20);
      targetY = WORLD_H + 70;
    } else if (edge === 1) {
      startX = -60;
      startY = Phaser.Math.Between(30, Math.round(WORLD_H * 0.72));
      targetX = WORLD_W + 80;
      targetY = startY + Phaser.Math.Between(90, 330);
    } else {
      startX = WORLD_W + 60;
      startY = Phaser.Math.Between(30, Math.round(WORLD_H * 0.72));
      targetX = -80;
      targetY = startY + Phaser.Math.Between(90, 330);
    }

    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const speed = Phaser.Math.FloatBetween(250, 430);
    const colors = [0x9af7ff, 0xffffff, 0xffdc4a, 0xff7bdc];
    const star = {
      x: startX,
      y: startY,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      dirX: dx / dist,
      dirY: dy / dist,
      life: Phaser.Math.FloatBetween(1.25, 1.95),
      maxLife: 1.95,
      length: Phaser.Math.Between(42, 92),
      width: Phaser.Math.FloatBetween(1.4, 2.8),
      color: Phaser.Utils.Array.GetRandom(colors),
      gfx: this.add.graphics(),
      done: false,
    };
    star.maxLife = star.life;
    this.bgLayer.add(star.gfx);
    this.shootingStars.push(star);
  }

  drawShootingStar(star) {
    const alpha = Phaser.Math.Clamp(star.life / star.maxLife, 0, 1);
    star.gfx.clear();
    star.gfx.lineStyle(star.width + 2, star.color, 0.12 * alpha);
    star.gfx.lineBetween(star.x - star.dirX * star.length * 1.25, star.y - star.dirY * star.length * 1.25, star.x, star.y);
    star.gfx.lineStyle(star.width, star.color, 0.72 * alpha);
    star.gfx.lineBetween(star.x - star.dirX * star.length, star.y - star.dirY * star.length, star.x, star.y);
    star.gfx.fillStyle(0xffffff, 0.85 * alpha);
    star.gfx.fillCircle(star.x, star.y, star.width + 1);
  }

  scrollBackground(scroll) {
    for (const star of this.stars) {
      star.y += scroll * star.speedFactor;
      if (star.y > WORLD_H + 5) {
        star.y = -5;
        star.x = Phaser.Math.Between(0, WORLD_W);
      }
    }

    this.nebulaLines.clear();
    this.nebulaLines.lineStyle(1, 0x31a9ff, 0.08);
    const off = (this.distance * 0.18) % 92;
    for (let y = -off; y < WORLD_H + 92; y += 92) {
      this.nebulaLines.lineBetween(0, y, WORLD_W, y + 36);
    }
  }

  scrollWorld(scroll) {
    this.nextSpawnY += scroll;

    for (const planet of this.planets) {
      planet.y += scroll;
      this.redrawPlanet(planet);
    }

    for (const shard of this.shards) {
      if (shard.active) shard.y += scroll;
    }
  }

  recycleWorld() {
    while (this.nextSpawnY > -350) {
      this.spawnNextPlanet();
    }

    this.planets = this.planets.filter((planet) => {
      if (planet === this.currentPlanet) return true;
      if (planet.y < WORLD_H + 160) return true;
      planet.gfx.destroy();
      planet.ring.destroy();
      planet.dangerRing.destroy();
      return false;
    });

    this.shards = this.shards.filter((shard) => {
      if (!shard.active) return false;
      if (shard.y < WORLD_H + 80) return true;
      shard.destroy();
      return false;
    });

    this.asteroids = this.asteroids.filter((asteroid) => {
      if (this.planets.includes(asteroid.planet)) return true;
      asteroid.gfx.destroy();
      asteroid.warning.destroy();
      return false;
    });

    this.missiles = this.missiles.filter((missile) => {
      if (missile.x > -90 && missile.x < WORLD_W + 90) return true;
      missile.warning.destroy();
      missile.body.destroy();
      return false;
    });
  }

  killPlayer(reason) {
    if (this.isDead || this.isGameOver) return;

    if (this.shieldReady) {
      this.shieldReady = false;
      this.shieldRing?.destroy();
      this.shieldRing = null;
      this.cameras.main.shake(220, 0.016);
      this.ship.setTint(0xffdc4a);
      this.time.delayedCall(360, () => this.ship.clearTint());
      this.addPulse(this.ship.x, this.ship.y, 46, 0xffdc4a);
      this.playSfx("shield");
      return;
    }

    this.isDead = true;
    this.isGameOver = true;
    const finalScore = this.getScore();
    const newBest = this.saveBest(finalScore);
    this.ship.setTint(0xff4a6d);
    this.cameras.main.shake(340, 0.025);
    this.addPulse(this.ship.x, this.ship.y, 72, 0xff4a6d);
    this.tweens.add({ targets: this.ship, scaleX: 1.6, scaleY: 0.25, duration: 170, ease: "Back.easeIn" });
    this.playSfx("death");
    this.time.delayedCall(620, () => this.showGameOver(finalScore, newBest, reason));
  }

  showGameOver(finalScore, newBest, reason) {
    const veil = this.add.rectangle(0, 0, WORLD_W, WORLD_H, 0x02040b, 0.86).setOrigin(0);
    const title = this.add.text(WORLD_W / 2, 72, "ORBIT BREAKER", {
      color: "#f8fdff",
      fontSize: "28px",
      fontStyle: "900",
      stroke: "#050712",
      strokeThickness: 7,
    }).setOrigin(0.5);

    const score = this.add.text(WORLD_W / 2, 116, newBest ? `${finalScore}  NEW BEST` : `Score  ${finalScore}`, {
      color: newBest ? "#ffdc4a" : "#9af7ff",
      fontSize: "22px",
      fontStyle: "900",
      stroke: "#050712",
      strokeThickness: 5,
    }).setOrigin(0.5);

    const why = this.add.text(WORLD_W / 2, 150, reason || "Run ended", {
      color: "#6d8fb8",
      fontSize: "13px",
      fontStyle: "800",
    }).setOrigin(0.5);

    this.overlayLayer.add([veil, title, score, why]);
    this.awaitingUpgrade = false;
    this.retryReady = false;

    if (finalScore < MIN_UPGRADE_SCORE) {
      const need = MIN_UPGRADE_SCORE - finalScore;
      const msg = this.add.text(WORLD_W / 2, WORLD_H * 0.43, `Need ${need} more for upgrades`, {
        color: "#6d8fb8",
        fontSize: "17px",
        fontStyle: "800",
      }).setOrigin(0.5);
      const retry = this.add.text(WORLD_W / 2, WORLD_H * 0.56, "TAP TO RETRY", {
        color: "#ff4fd8",
        fontSize: "20px",
        fontStyle: "900",
        stroke: "#050712",
        strokeThickness: 5,
      }).setOrigin(0.5);
      this.overlayLayer.add([msg, retry]);
      this.retryReady = true;
      return;
    }

    const available = UPGRADE_POOL.filter((upgrade) => !this.activeUpgrades.includes(upgrade.id));
    Phaser.Utils.Array.Shuffle(available);
    const picks = available.slice(0, Math.min(3, available.length));

    if (!picks.length) {
      const maxed = this.add.text(WORLD_W / 2, WORLD_H * 0.48, "ALL SYSTEMS MAXED\nTAP TO RETRY", {
        color: "#9af7ff",
        fontSize: "21px",
        fontStyle: "900",
        align: "center",
        stroke: "#050712",
        strokeThickness: 5,
      }).setOrigin(0.5);
      this.overlayLayer.add(maxed);
      this.awaitingUpgrade = false;
      this.retryReady = true;
      return;
    }

    const pick = this.add.text(WORLD_W / 2, 186, "PICK NEXT RUN UPGRADE", {
      color: "#8dffca",
      fontSize: "14px",
      fontStyle: "900",
      stroke: "#050712",
      strokeThickness: 4,
    }).setOrigin(0.5);
    this.overlayLayer.add(pick);
    this.awaitingUpgrade = true;

    const cardW = 312;
    const cardH = 82;
    const startY = 238;
    const gap = 96;

    picks.forEach((upgrade, i) => {
      const y = startY + i * gap;
      const card = this.add.rectangle(WORLD_W / 2, y, cardW, cardH, 0x0d1b30, 1)
        .setStrokeStyle(2, 0x00e5ff, 0.85)
        .setInteractive({ useHandCursor: true });
      const name = this.add.text(WORLD_W / 2, y - 18, upgrade.name, {
        color: "#f8fdff",
        fontSize: "18px",
        fontStyle: "900",
      }).setOrigin(0.5);
      const desc = this.add.text(WORLD_W / 2, y + 13, upgrade.desc, {
        color: "#8fb7d9",
        fontSize: "14px",
        fontStyle: "700",
      }).setOrigin(0.5);

      card.on("pointerover", () => card.setFillStyle(0x112945));
      card.on("pointerout", () => card.setFillStyle(0x0d1b30));
      card.on("pointerdown", (_pointer, _x, _y, event) => {
        event?.stopPropagation();
        this.playSfx("upgrade");
        this.scene.restart({ upgrades: [...this.activeUpgrades, upgrade.id] });
      });

      this.overlayLayer.add([card, name, desc]);
    });

    const skip = this.add.text(WORLD_W / 2, startY + picks.length * gap + 10, "SKIP", {
      color: "#6d8fb8",
      fontSize: "15px",
      fontStyle: "900",
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    skip.on("pointerdown", (_pointer, _x, _y, event) => {
      event?.stopPropagation();
      this.scene.restart({ upgrades: this.activeUpgrades });
    });
    this.overlayLayer.add(skip);
  }

  getScrollSpeed() {
    const t = Math.min(this.runElapsed / SPEED_RAMP_MS, 1);
    return Phaser.Math.Linear(BASE_SCROLL_SPEED, MAX_SCROLL_SPEED, t * t);
  }

  getDangerY() {
    const t = Math.min(this.runElapsed / DANGER_RAMP_MS, 1);
    const base = Phaser.Math.Linear(BASE_DANGER_Y, MIN_DANGER_Y, t);
    return this.hasUpgrade("slower_collapse") ? Math.min(WORLD_H - 18, base + 64) : base;
  }

  getDifficulty() {
    return Math.min(this.runElapsed / 78000, 1);
  }

  getScore() {
    return this.distScore + this.bonusScore;
  }

  hasUpgrade(id) {
    return this.activeUpgrades.includes(id);
  }

  refreshUpgradeText() {
    if (!this.upgradeText) return;
    const names = this.activeUpgrades
      .map((id) => UPGRADE_POOL.find((u) => u.id === id)?.name || id)
      .join("\n");
    this.upgradeText.setText(names);
  }

  weightedLane(lanes) {
    const total = lanes.reduce((sum, lane) => sum + lane.weight, 0);
    let roll = Math.random() * total;
    for (const lane of lanes) {
      roll -= lane.weight;
      if (roll <= 0) return lane;
    }
    return lanes[lanes.length - 1];
  }

  loadBest() {
    try {
      const value = parseInt(localStorage.getItem(RECORD_KEY) || "0", 10);
      return Number.isFinite(value) ? value : 0;
    } catch (_) {
      return 0;
    }
  }

  saveBest(score) {
    if (score <= this.best) return false;
    this.best = score;
    try {
      localStorage.setItem(RECORD_KEY, String(score));
    } catch (_) {}
    return true;
  }

  loadMuted() {
    try {
      return localStorage.getItem(MUTED_KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  toggleMuted() {
    this.muted = !this.muted;
    this.muteButton.setText(this.muted ? "SFX OFF" : "SFX ON");
    try {
      localStorage.setItem(MUTED_KEY, this.muted ? "1" : "0");
    } catch (_) {}
  }

  ensureAudio() {
    if (this.muted || this.audioCtx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.audioCtx = new AudioContext();
    this.audioCtx.resume?.();
  }

  playSfx(type) {
    if (this.muted) return;
    this.ensureAudio();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const master = this.audioCtx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.09, now + 0.018);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    master.connect(this.audioCtx.destination);

    const osc = this.audioCtx.createOscillator();
    osc.type = type === "death" ? "sawtooth" : "triangle";
    const map = {
      launch: [180, 420, 0.18],
      capture: [520, 760, 0.16],
      shard: [880, 1320, 0.12],
      warning: [160, 120, 0.28],
      blink: [300, 920, 0.2],
      shield: [240, 620, 0.22],
      upgrade: [420, 980, 0.2],
      death: [180, 55, 0.34],
    };
    const [a, b, dur] = map[type] || map.launch;
    osc.frequency.setValueAtTime(a, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, b), now + dur);
    osc.connect(master);
    osc.start(now);
    osc.stop(now + dur + 0.04);
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#050712",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: WORLD_W,
    height: WORLD_H,
  },
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 0 }, debug: false },
  },
  render: { antialias: true, pixelArt: false, clearBeforeRender: true },
  scene: OrbitBreaker,
});

let wasLandscape = window.innerWidth >= window.innerHeight;
window.addEventListener("resize", () => {
  const isLandscape = window.innerWidth >= window.innerHeight;
  if (isLandscape !== wasLandscape) {
    window.location.reload();
    return;
  }
  game.scale.refresh();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}
