import type { LockedPuzzleKind } from "../LootSystem.ts";
import type { Point } from "../types.ts";

export type DungeonRoomId = "hub" | "room_sort" | "room_beans" | "room_free" | "room_maze";

export type DungeonBranchRoomId = Exclude<DungeonRoomId, "hub">;

export type DungeonDirection = "north" | "south" | "east" | "west";

export type DungeonMazeStyle = "dfs" | "prim" | "growing_tree" | "kruskal_chambers";

export type DungeonScareKind = "shadow_ghost" | "ancient_centipede" | "stone_phantom";

export type DungeonMinigameKind = "coin_sort" | "peanut_steal";

export interface SavedDungeonState {
  cooldownUntil: number;
  totalClears: number;
  runsEntered: number;
}

export interface DungeonChestNode {
  id: string;
  roomId: DungeonRoomId;
  name: string;
  x: number;
  y: number;
  locked: boolean;
  opened: boolean;
  royal: boolean;
  /** Visible only after room minigame is cleared (always true in room_free / room_maze) */
  revealedInRoom: boolean;
  puzzleKind?: LockedPuzzleKind;
  puzzleSeed?: number;
}

export interface DungeonPortalNode {
  id: string;
  targetRoom: DungeonRoomId | "exit_world";
  label: string;
  shortTag: string;
  x: number;
  y: number;
  color: number;
  requiresStationClear?: boolean;
}

export interface DungeonMazeScareNode {
  id: string;
  kind: DungeonScareKind;
  name: string;
  x: number;
  y: number;
  damageHp: number;
  triggered: boolean;
}

export interface DungeonStationNode {
  id: string;
  roomId: "room_sort" | "room_beans";
  kind: DungeonMinigameKind;
  title: string;
  promptLabel: string;
  x: number;
  y: number;
  cleared: boolean;
  attempted?: boolean;
}

export interface DungeonRoomLayout {
  id: DungeonRoomId;
  direction?: DungeonDirection;
  title: string;
  subtitle: string;
  cols: number;
  rows: number;
  collision: Uint8Array;
  floorTint: number;
  wallColor: number;
  spawn: Point;
  portals: DungeonPortalNode[];
  station?: DungeonStationNode;
  chests: DungeonChestNode[];
  scares?: DungeonMazeScareNode[];
  torches: Point[];
  isMaze: boolean;
  mazeStyle?: DungeonMazeStyle;
}

export interface DungeonRunState {
  runId: string;
  seed: number;
  startedAt: number;
  rooms: Record<DungeonRoomId, DungeonRoomLayout>;
  activeRoomId: DungeonRoomId;
  roomDirections: Record<DungeonBranchRoomId, DungeonDirection>;
  exitRoomId: DungeonBranchRoomId;
  chestsOpenedCount: number;
  roomsClearedCount: number;
}
