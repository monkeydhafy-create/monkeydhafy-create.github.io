// Exact 3x integer scale of 16x16 pixel art tiles -> zero blur on Retina & mobile
export const PIXEL_SCALE = 3;
export const TILE_SIZE = 16 * PIXEL_SCALE; // 48px
export const MAP_COLS = 84;
export const MAP_ROWS = 84;
export const WORLD_WIDTH = MAP_COLS * TILE_SIZE;
export const WORLD_HEIGHT = MAP_ROWS * TILE_SIZE;
export const CHUNK_TILES = 21; // 84 / 21 = 4x4 chunks = 16 cached chunk textures

export type TileType = "grass" | "meadow" | "forest" | "sand" | "water" | "dirt" | "stone" | "bridge";

export type BiomeId = "sanctuary" | "meadow" | "woods" | "coast";

export type CharacterSkinId = "samurai_blue" | "ninja_blue" | "samurai_green";

export type FacingDir = "down" | "up" | "left" | "right";

export interface Point {
  x: number;
  y: number;
}

export type PropKind =
  | "oak_warm"
  | "oak_moss"
  | "tree_small_warm"
  | "tree_small_moss"
  | "bush_a"
  | "bush_b"
  | "boulder"
  | "frog_statue"
  | "golem_statue"
  | "ruin_pillar"
  | "shrine_ruin"
  | "hut"
  | "watchtower"
  | "lodge"
  | "stump"
  | "stone_small";

export interface WorldProp {
  id: number;
  kind: PropKind;
  x: number;
  y: number;
  blocking: boolean;
}

export interface WorldLandmark {
  id: string;
  name: string;
  subtitle: string;
  x: number;
  y: number;
  radius: number;
  accentColor: number;
  discovered: boolean;
}

export interface WorldData {
  cols: number;
  rows: number;
  tileSize: number;
  tiles: TileType[];
  biomes: BiomeId[];
  collision: Uint8Array;
  props: WorldProp[];
  landmarks: WorldLandmark[];
  lilypads: Point[];
  spawn: Point;
}

export const BIOME_LABELS: Record<BiomeId, string> = {
  sanctuary: "Cổ Trấn Khởi Nguyên",
  meadow: "Thảo Nguyên Mùa Xuân",
  woods: "Mật Lâm Rêu Phong",
  coast: "Hồ Sen Pha Lê",
};

export const CHARACTER_SKINS: ReadonlyArray<{ id: CharacterSkinId; label: string }> = [
  { id: "samurai_blue", label: "Samurai Xanh" },
  { id: "ninja_blue", label: "Ninja Lam" },
  { id: "samurai_green", label: "Ronin Lục" },
];
