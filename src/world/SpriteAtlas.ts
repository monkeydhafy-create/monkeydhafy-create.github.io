import { Assets, Rectangle, Texture } from "pixi.js";
import type { CharacterSkinId, FacingDir, PropKind } from "./types.ts";

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
  };
  props: Record<PropKind, Texture>;
  lilypads: Texture[];
  leafFrames: Texture[];
  shadow: Texture;
  characters: Record<CharacterSkinId, CharacterFrames>;
}

function sliceCell(base: Texture, col: number, row: number, cols = 1, rows = 1): Texture {
  return new Texture({
    source: base.source,
    frame: new Rectangle(col * 16, row * 16, cols * 16, rows * 16),
  });
}

function sliceCharacter(base: Texture): CharacterFrames {
  base.source.scaleMode = "nearest";

  const dirs: FacingDir[] = ["down", "up", "left", "right"];
  const frames: CharacterFrames = {
    down: [],
    up: [],
    left: [],
    right: [],
  };

  for (let col = 0; col < dirs.length; col++) {
    const dir = dirs[col];
    for (let row = 0; row < 4; row++) {
      frames[dir].push(sliceCell(base, col, row, 1, 1));
    }
  }

  return frames;
}

export function createWorldAtlas(): WorldAtlas {
  const floorTex = Assets.get<Texture>("tileset-floor");
  const plazaTex = Assets.get<Texture>("tileset-plaza");
  const villageTex = Assets.get<Texture>("tileset-village");
  const animTex = Assets.get<Texture>("tileset-animated");
  const leafTex = Assets.get<Texture>("particle-leaf");
  const shadowTex = Assets.get<Texture>("char-shadow");

  floorTex.source.scaleMode = "nearest";
  plazaTex.source.scaleMode = "nearest";
  villageTex.source.scaleMode = "nearest";
  animTex.source.scaleMode = "nearest";
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

  return {
    tiles: {
      // Rich deep emerald grass (right-middle green block)
      grass: [
        sliceCell(floorTex, 11, 12),
        sliceCell(floorTex, 11, 12),
        sliceCell(floorTex, 11, 12),
        sliceCell(floorTex, 12, 12),
        sliceCell(floorTex, 13, 12),
        sliceCell(floorTex, 14, 12),
        sliceCell(floorTex, 15, 12),
      ],
      // Bright spring meadow grass (left-middle yellow-green block)
      meadow: [
        sliceCell(floorTex, 0, 12),
        sliceCell(floorTex, 0, 12),
        sliceCell(floorTex, 0, 12),
        sliceCell(floorTex, 1, 12),
        sliceCell(floorTex, 2, 12),
        sliceCell(floorTex, 3, 12),
        sliceCell(floorTex, 4, 12),
      ],
      // Shaded woodland moss grass
      forest: [
        sliceCell(floorTex, 11, 12),
        sliceCell(floorTex, 12, 12),
        sliceCell(floorTex, 13, 12),
      ],
      // Warm shoreline sand
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
      // Ancient cobblestone & mossy temple plaza slabs (tileset-plaza)
      stone: [
        sliceCell(plazaTex, 12, 7),
        sliceCell(plazaTex, 12, 7),
        sliceCell(plazaTex, 12, 7),
        sliceCell(plazaTex, 12, 7),
        sliceCell(plazaTex, 11, 10),
        sliceCell(plazaTex, 14, 11),
      ],
      // Blue crystal water
      water: [
        sliceCell(floorTex, 1, 22),
        sliceCell(floorTex, 1, 22),
        sliceCell(floorTex, 5, 22),
        sliceCell(floorTex, 6, 22),
      ],
    },
    props: {
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
    },
    lilypads: [
      sliceCell(animTex, 0, 0, 1, 1),
      sliceCell(animTex, 1, 0, 1, 1),
      sliceCell(animTex, 2, 0, 1, 1),
      sliceCell(animTex, 3, 0, 1, 1),
    ],
    leafFrames,
    shadow: shadowTex,
    characters: {
      samurai_blue: sliceCharacter(Assets.get<Texture>("char-samurai-blue")),
      ninja_blue: sliceCharacter(Assets.get<Texture>("char-ninja-blue")),
      samurai_green: sliceCharacter(Assets.get<Texture>("char-samurai-green")),
    },
  };
}
