import { Assets, Rectangle, Texture } from "pixi.js";
import {
  BUILDING_KEYS,
  type BuildingKind,
  type FacingDir,
  type PropKind,
} from "./types.ts";

export type CharacterFrames = Record<FacingDir, Texture[]>;

export interface WorldAtlas {
  tiles: {
    grass: Texture[];
    meadow: Texture[];
    forest: Texture[];
    sand: Texture[];
    dirt: Texture[];
    dirtEdges: {
      tl: Texture;
      t: Texture;
      tr: Texture;
      l: Texture;
      c: Texture;
      r: Texture;
      bl: Texture;
      b: Texture;
      br: Texture;
    };
    stone: Texture[];
    water: Texture[];
    road: Texture[];
    sidewalk: Texture[];
  };
  props: Record<PropKind, Texture>;
  buildings: Record<BuildingKind, Texture>;
  chestClosed: Texture;
  chestOpen: Texture;
  lilypads: Texture[];
  leafFrames: Texture[];
  shadow: Texture;
  lpcLayers: Record<string, CharacterFrames>;
}

function sliceCell(base: Texture, col: number, row: number, cols = 1, rows = 1): Texture {
  return new Texture({
    source: base.source,
    frame: new Rectangle(col * 16, row * 16, cols * 16, rows * 16),
  });
}

function sliceCityCell(base: Texture, col: number, row: number): Texture {
  return new Texture({
    source: base.source,
    frame: new Rectangle(col * 17, row * 17, 16, 16),
  });
}

const BUILDING_ASSET_ALIAS: Partial<Record<BuildingKind, string>> = {
  city_clothing_shop: "bld-city_arcade_house",
  city_hair_salon: "bld-city_flower_shop",
  city_pharmacy: "bld-city_post_office",
  city_police_station: "bld-city_fire_station",
  city_home_house: "bld-city_terrace_houses",
  city_collection_hall: "bld-city_museum",
  city_airport: "bld-city_museum",
};

const LPC_WALK_KEYS = [
  "body_male",
  "head_male",
  "body_female",
  "head_female",
  "hair_bangs",
  "hair_natural",
  "hair_bob",
  "hair_long_straight",
  "hair_curly_long",
  "hair_pixie",
  "torso_tshirt",
  "torso_tshirt_female",
  "torso_polo",
  "torso_polo_female",
  "torso_longsleeve",
  "torso_jacket_navy",
  "torso_jacket_brown",
  "torso_trench",
  "legs_pants",
  "legs_pants_female",
  "legs_formal",
  "legs_shorts",
  "legs_shorts_female",
  "legs_skirt_plain",
  "feet_shoes",
  "feet_shoes_female",
  "feet_boots",
  "feet_boots_female",
  "hat_cap",
  "hat_bandana",
  "hat_bowler",
  "hat_hood",
  "acc_shades",
  "acc_scarf",
  "acc_cape_fg",
  "acc_cape_bg",
] as const;

function sliceLpcWalkSheet(base: Texture): CharacterFrames {
  base.source.scaleMode = "nearest";
  // Standard LPC walk sheet: 576x256 (9 cols of 64x64, rows 0=up, 1=left, 2=down, 3=right)
  const rowDirs: FacingDir[] = ["up", "left", "down", "right"];
  const frames: CharacterFrames = { down: [], up: [], left: [], right: [] };

  for (let row = 0; row < rowDirs.length; row++) {
    const dir = rowDirs[row];
    for (let col = 0; col < 9; col++) {
      frames[dir].push(
        new Texture({
          source: base.source,
          frame: new Rectangle(col * 64, row * 64, 64, 64),
        }),
      );
    }
  }

  return frames;
}

export function createWorldAtlas(): WorldAtlas {
  const floorTex = Assets.get<Texture>("tileset-floor");
  const plazaTex = Assets.get<Texture>("tileset-plaza");
  const villageTex = Assets.get<Texture>("tileset-village");
  const animTex = Assets.get<Texture>("tileset-animated");
  const cityTex = Assets.get<Texture>("tileset-city");
  const urbanTex = Assets.get<Texture>("tileset-urban");
  const leafTex = Assets.get<Texture>("particle-leaf");
  const shadowTex = Assets.get<Texture>("char-shadow");

  floorTex.source.scaleMode = "nearest";
  plazaTex.source.scaleMode = "nearest";
  villageTex.source.scaleMode = "nearest";
  animTex.source.scaleMode = "nearest";
  cityTex.source.scaleMode = "nearest";
  urbanTex.source.scaleMode = "nearest";
  leafTex.source.scaleMode = "nearest";
  shadowTex.source.scaleMode = "nearest";

  const leafFrames: Texture[] = [];
  for (let i = 0; i < 6; i++) {
    leafFrames.push(
      new Texture({
        source: leafTex.source,
        frame: new Rectangle(i * 12, 0, 12, 7),
      }),
    );
  }

  const buildings = {} as Record<BuildingKind, Texture>;
  for (const key of BUILDING_KEYS) {
    const alias = BUILDING_ASSET_ALIAS[key] ?? `bld-${key}`;
    const tex = Assets.get<Texture>(alias);
    tex.source.scaleMode = "nearest";
    buildings[key] = tex;
  }

  const baseProps = {
    oak_warm: sliceCell(villageTex, 0, 6, 4, 3),
    oak_moss: sliceCell(villageTex, 0, 9, 4, 3),
    tree_small_warm: sliceCell(villageTex, 4, 6, 2, 2),
    tree_small_moss: sliceCell(villageTex, 4, 9, 2, 2),
    bush_a: sliceCell(villageTex, 4, 5, 1, 1),
    bush_b: sliceCell(villageTex, 5, 5, 1, 1),
    boulder: sliceCell(villageTex, 7, 5, 2, 2),
    frog_statue: sliceCell(villageTex, 9, 5, 2, 2),
    golem_statue: sliceCell(villageTex, 0, 3, 2, 3),
    ruin_pillar: sliceCell(villageTex, 2, 3, 1, 3),
    shrine_ruin: sliceCell(villageTex, 0, 0, 4, 3),
    hut: sliceCell(villageTex, 11, 0, 3, 3),
    watchtower: sliceCell(villageTex, 14, 0, 3, 5),
    lodge: sliceCell(villageTex, 16, 5, 4, 5),
    stump: sliceCell(villageTex, 7, 7, 1, 1),
    stone_small: sliceCell(villageTex, 3, 5, 1, 1),
    city_tree: sliceCell(urbanTex, 16, 8, 1, 2),
    city_tree_warm: sliceCell(villageTex, 4, 6, 2, 2),
    park_lantern: sliceCell(urbanTex, 7, 6, 1, 2),
    street_lamp: sliceCell(urbanTex, 3, 6, 1, 2),
    traffic_light: sliceCell(urbanTex, 3, 15, 1, 1),
    bench: sliceCell(urbanTex, 3, 14, 1, 1),
    hydrant: sliceCityCell(cityTex, 15, 14),
    trash_bin: sliceCell(urbanTex, 9, 9, 1, 1),
    food_cart: sliceCell(urbanTex, 6, 10, 1, 1),
  };

  const chestClosed = Assets.get<Texture>("chest-closed");
  const chestOpen = Assets.get<Texture>("chest-open");
  chestClosed.source.scaleMode = "nearest";
  chestOpen.source.scaleMode = "nearest";

  const lpcLayers: Record<string, CharacterFrames> = {};
  for (const key of LPC_WALK_KEYS) {
    const tex = Assets.get<Texture>(`lpc-${key}`);
    lpcLayers[key] = sliceLpcWalkSheet(tex);
  }

  return {
    tiles: {
      grass: [
        sliceCell(floorTex, 11, 12),
        sliceCell(floorTex, 11, 12),
        sliceCell(floorTex, 11, 12),
        sliceCell(floorTex, 12, 12),
        sliceCell(floorTex, 13, 12),
        sliceCell(floorTex, 14, 12),
        sliceCell(floorTex, 15, 12),
      ],
      meadow: [
        sliceCell(floorTex, 0, 12),
        sliceCell(floorTex, 0, 12),
        sliceCell(floorTex, 0, 12),
        sliceCell(floorTex, 1, 12),
        sliceCell(floorTex, 2, 12),
        sliceCell(floorTex, 3, 12),
        sliceCell(floorTex, 4, 12),
      ],
      forest: [
        sliceCell(floorTex, 11, 12),
        sliceCell(floorTex, 12, 12),
        sliceCell(floorTex, 13, 12),
      ],
      sand: [
        sliceCell(floorTex, 1, 1),
        sliceCell(floorTex, 1, 1),
        sliceCell(floorTex, 0, 5),
        sliceCell(floorTex, 1, 5),
        sliceCell(floorTex, 2, 5),
        sliceCell(floorTex, 3, 5),
      ],
      dirt: [
        sliceCell(floorTex, 12, 8),
        sliceCell(floorTex, 16, 8),
        sliceCell(floorTex, 11, 11),
      ],
      dirtEdges: {
        tl: sliceCell(floorTex, 11, 7),
        t: sliceCell(floorTex, 12, 7),
        tr: sliceCell(floorTex, 13, 7),
        l: sliceCell(floorTex, 11, 8),
        c: sliceCell(floorTex, 12, 8),
        r: sliceCell(floorTex, 13, 8),
        bl: sliceCell(floorTex, 11, 9),
        b: sliceCell(floorTex, 12, 9),
        br: sliceCell(floorTex, 13, 9),
      },
      stone: [
        sliceCell(plazaTex, 12, 7),
        sliceCell(plazaTex, 12, 7),
        sliceCell(plazaTex, 12, 7),
        sliceCell(plazaTex, 12, 7),
        sliceCell(plazaTex, 11, 10),
        sliceCell(plazaTex, 14, 11),
      ],
      water: [
        sliceCell(floorTex, 1, 22),
        sliceCell(floorTex, 1, 22),
        sliceCell(floorTex, 5, 22),
        sliceCell(floorTex, 6, 22),
      ],
      road: [
        sliceCityCell(cityTex, 11, 19),
        sliceCityCell(cityTex, 10, 24),
      ],
      sidewalk: [
        sliceCityCell(cityTex, 6, 20),
        sliceCityCell(cityTex, 7, 20),
        sliceCityCell(cityTex, 6, 21),
        sliceCityCell(cityTex, 7, 21),
      ],
    },
    props: {
      ...baseProps,
      ...buildings,
    },
    buildings,
    chestClosed,
    chestOpen,
    lilypads: [
      sliceCell(animTex, 0, 0, 1, 1),
      sliceCell(animTex, 1, 0, 1, 1),
      sliceCell(animTex, 2, 0, 1, 1),
      sliceCell(animTex, 3, 0, 1, 1),
    ],
    leafFrames,
    shadow: shadowTex,
    lpcLayers,
  };
}
