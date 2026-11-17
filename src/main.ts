import "@pixi/sound";
import { Application, Assets } from "pixi.js";

import { assets } from "./assets.ts";
import { gameReady, initPlatform, setLoadingProgress } from "./platform.ts";
import { Hud } from "./ui/Hud.ts";
import { generateOpenWorld } from "./world/WorldGenerator.ts";
import { WorldScene } from "./world/WorldScene.ts";

await initPlatform();

const app = new Application();

await app.init({
  background: "#0b191d",
  resizeTo: window,
  // Capped at 2: preserves Retina sharpness while keeping mobile GPU usage smooth
  resolution: Math.min(window.devicePixelRatio, 2),
  autoDensity: true,
  antialias: true,
});

document.getElementById("pixi-container")!.appendChild(app.canvas);

await Assets.load(assets, setLoadingProgress);

const worldData = generateOpenWorld(202611);

let hud: Hud | null = null;

const worldScene = new WorldScene(app, worldData, {
  onLandmarkDiscovered: (lm) => {
    hud?.showDiscoveryToast(`Khám Phá: ${lm.name}`, lm.subtitle);
  },
});

app.stage.addChild(worldScene.worldContainer);

hud = new Hud(worldScene);

app.ticker.add((ticker) => {
  const dtSeconds = ticker.deltaMS / 1000;
  worldScene.update(dtSeconds);
  hud?.update(dtSeconds);
});

gameReady(app);
