import type { Point } from "./types.ts";

const SQRT2 = Math.SQRT2;
const DIRS = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, SQRT2],
  [1, -1, SQRT2],
  [-1, 1, SQRT2],
  [-1, -1, SQRT2],
] as const;

/**
 * High-performance 8-directional A* pathfinder backed by flat typed arrays
 * and a binary min-heap for zero-lag tap-to-move on mobile web.
 */
export class Pathfinder {
  private readonly cols: number;
  private readonly rows: number;
  private readonly tileSize: number;
  private readonly collision: Uint8Array;

  private readonly gScore: Float32Array;
  private readonly fScore: Float32Array;
  private readonly cameFrom: Int32Array;
  private readonly state: Uint8Array; // 0 = unvisited, 1 = open, 2 = closed
  private readonly heap: Int32Array;

  constructor(cols: number, rows: number, tileSize: number, collision: Uint8Array) {
    this.cols = cols;
    this.rows = rows;
    this.tileSize = tileSize;
    this.collision = collision;

    const total = cols * rows;
    this.gScore = new Float32Array(total);
    this.fScore = new Float32Array(total);
    this.cameFrom = new Int32Array(total);
    this.state = new Uint8Array(total);
    this.heap = new Int32Array(total);
  }

  public isWalkableTile(col: number, row: number): boolean {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) {
      return false;
    }
    return this.collision[row * this.cols + col] === 0;
  }

  public isWalkableWorld(x: number, y: number): boolean {
    const col = Math.floor(x / this.tileSize);
    const row = Math.floor(y / this.tileSize);
    return this.isWalkableTile(col, row);
  }

  public findPath(startWorld: Point, goalWorld: Point): Point[] {
    const startCol = this.clampCol(Math.floor(startWorld.x / this.tileSize));
    const startRow = this.clampRow(Math.floor(startWorld.y / this.tileSize));

    let goalCol = this.clampCol(Math.floor(goalWorld.x / this.tileSize));
    let goalRow = this.clampRow(Math.floor(goalWorld.y / this.tileSize));

    const exactGoal = this.isWalkableTile(goalCol, goalRow);
    if (!exactGoal) {
      const nearest = this.findNearestWalkable(goalCol, goalRow, startCol, startRow);
      if (!nearest) return [];
      goalCol = nearest.col;
      goalRow = nearest.row;
    }

    if (startCol === goalCol && startRow === goalRow) {
      return exactGoal ? [{ x: goalWorld.x, y: goalWorld.y }] : [this.tileCenter(goalCol, goalRow)];
    }

    this.gScore.fill(Infinity);
    this.fScore.fill(Infinity);
    this.cameFrom.fill(-1);
    this.state.fill(0);

    const startIdx = startRow * this.cols + startCol;
    const goalIdx = goalRow * this.cols + goalCol;

    this.gScore[startIdx] = 0;
    this.fScore[startIdx] = this.octile(startCol, startRow, goalCol, goalRow);
    this.state[startIdx] = 1;

    let heapSize = 0;
    this.heap[heapSize++] = startIdx;

    let found = false;
    let iterations = 0;
    const maxIterations = this.cols * this.rows;

    while (heapSize > 0 && iterations < maxIterations) {
      iterations++;
      const current = this.heapPop(heapSize--);
      if (current === goalIdx) {
        found = true;
        break;
      }

      this.state[current] = 2;
      const cx = current % this.cols;
      const cy = Math.floor(current / this.cols);
      const currentG = this.gScore[current];

      for (const [dx, dy, cost] of DIRS) {
        const nx = cx + dx;
        const ny = cy + dy;

        if (!this.isWalkableTile(nx, ny)) continue;

        // Prevent corner-cutting around diagonal obstacles
        if (dx !== 0 && dy !== 0) {
          if (!this.isWalkableTile(cx + dx, cy) || !this.isWalkableTile(cx, cy + dy)) {
            continue;
          }
        }

        const nIdx = ny * this.cols + nx;
        if (this.state[nIdx] === 2) continue;

        const tentativeG = currentG + cost;
        if (tentativeG < this.gScore[nIdx]) {
          this.cameFrom[nIdx] = current;
          this.gScore[nIdx] = tentativeG;
          this.fScore[nIdx] = tentativeG + this.octile(nx, ny, goalCol, goalRow);

          if (this.state[nIdx] === 0) {
            this.state[nIdx] = 1;
            this.heapPush(heapSize++, nIdx);
          } else {
            this.heapSiftUpByIndex(heapSize, nIdx);
          }
        }
      }
    }

    if (!found) return [];

    const rawTiles: Array<{ col: number; row: number }> = [];
    let curr = goalIdx;
    while (curr !== -1 && curr !== startIdx) {
      rawTiles.push({ col: curr % this.cols, row: Math.floor(curr / this.cols) });
      curr = this.cameFrom[curr];
    }
    rawTiles.reverse();

    if (rawTiles.length === 0) return [];

    const smoothed = this.smoothTiles(startCol, startRow, rawTiles);
    const points = smoothed.map((tile) => this.tileCenter(tile.col, tile.row));

    // Preserve exact clicked pixel inside the final tile when walkable
    if (exactGoal && points.length > 0) {
      points[points.length - 1] = {
        x: Math.max(this.tileSize * 0.5, Math.min(this.cols * this.tileSize - this.tileSize * 0.5, goalWorld.x)),
        y: Math.max(this.tileSize * 0.5, Math.min(this.rows * this.tileSize - this.tileSize * 0.5, goalWorld.y)),
      };
    }

    return points;
  }

  private smoothTiles(
    startCol: number,
    startRow: number,
    path: Array<{ col: number; row: number }>,
  ): Array<{ col: number; row: number }> {
    if (path.length <= 2) return path;

    const result: Array<{ col: number; row: number }> = [];
    let anchorCol = startCol;
    let anchorRow = startRow;
    let i = 0;

    while (i < path.length) {
      let furthest = i;
      for (let j = path.length - 1; j > i; j--) {
        if (this.hasLineOfSight(anchorCol, anchorRow, path[j].col, path[j].row)) {
          furthest = j;
          break;
        }
      }
      const chosen = path[furthest];
      result.push(chosen);
      anchorCol = chosen.col;
      anchorRow = chosen.row;
      i = furthest + 1;
    }

    return result;
  }

  private hasLineOfSight(c0: number, r0: number, c1: number, r1: number): boolean {
    const dx = c1 - c0;
    const dy = r1 - r0;
    const steps = Math.max(Math.abs(dx), Math.abs(dy)) * 2;
    if (steps === 0) return true;

    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const fx = c0 + dx * t;
      const fy = r0 + dy * t;
      // Check slightly padded footprint so character doesn't scrape corners
      if (
        !this.isWalkableTile(Math.round(fx), Math.round(fy)) ||
        !this.isWalkableTile(Math.floor(fx + 0.25), Math.floor(fy + 0.25)) ||
        !this.isWalkableTile(Math.ceil(fx - 0.25), Math.ceil(fy - 0.25))
      ) {
        return false;
      }
    }
    return true;
  }

  private findNearestWalkable(
    targetCol: number,
    targetRow: number,
    startCol: number,
    startRow: number,
  ): { col: number; row: number } | null {
    let bestCol = -1;
    let bestRow = -1;
    let bestScore = Infinity;

    const maxRadius = 10;
    for (let radius = 1; radius <= maxRadius; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          const nc = targetCol + dx;
          const nr = targetRow + dy;
          if (!this.isWalkableTile(nc, nr)) continue;

          // Prefer closest to tapped spot, breaking ties toward player
          const distToTarget = dx * dx + dy * dy;
          const distToStart = (nc - startCol) ** 2 + (nr - startRow) ** 2;
          const score = distToTarget * 1000 + distToStart * 0.01;
          if (score < bestScore) {
            bestScore = score;
            bestCol = nc;
            bestRow = nr;
          }
        }
      }
      if (bestCol !== -1) {
        return { col: bestCol, row: bestRow };
      }
    }

    return null;
  }

  private tileCenter(col: number, row: number): Point {
    return {
      x: (col + 0.5) * this.tileSize,
      y: (row + 0.5) * this.tileSize,
    };
  }

  private clampCol(col: number): number {
    return Math.max(0, Math.min(this.cols - 1, col));
  }

  private clampRow(row: number): number {
    return Math.max(0, Math.min(this.rows - 1, row));
  }

  private octile(x0: number, y0: number, x1: number, y1: number): number {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    return Math.max(dx, dy) + (SQRT2 - 1) * Math.min(dx, dy);
  }

  private heapPush(size: number, nodeIdx: number): void {
    this.heap[size] = nodeIdx;
    this.heapSiftUp(size);
  }

  private heapPop(size: number): number {
    const top = this.heap[0];
    const last = this.heap[size - 1];
    if (size > 1) {
      this.heap[0] = last;
      this.heapSiftDown(0, size - 1);
    }
    return top;
  }

  private heapSiftUp(index: number): void {
    let i = index;
    const node = this.heap[i];
    const nodeF = this.fScore[node];
    while (i > 0) {
      const parentIdx = (i - 1) >> 1;
      const parent = this.heap[parentIdx];
      if (nodeF >= this.fScore[parent]) break;
      this.heap[i] = parent;
      i = parentIdx;
    }
    this.heap[i] = node;
  }

  private heapSiftUpByIndex(heapSize: number, nodeIdx: number): void {
    for (let i = 0; i < heapSize; i++) {
      if (this.heap[i] === nodeIdx) {
        this.heapSiftUp(i);
        return;
      }
    }
  }

  private heapSiftDown(index: number, size: number): void {
    let i = index;
    const node = this.heap[i];
    const nodeF = this.fScore[node];
    const half = size >> 1;

    while (i < half) {
      let childIdx = (i << 1) + 1;
      let child = this.heap[childIdx];
      let childF = this.fScore[child];

      const rightIdx = childIdx + 1;
      if (rightIdx < size) {
        const right = this.heap[rightIdx];
        const rightF = this.fScore[right];
        if (rightF < childF) {
          childIdx = rightIdx;
          child = right;
          childF = rightF;
        }
      }

      if (nodeF <= childF) break;
      this.heap[i] = child;
      i = childIdx;
    }

    this.heap[i] = node;
  }
}
