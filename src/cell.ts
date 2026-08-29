import { Biome } from "./biomes"
import { photoScale, ws, ww } from "./root"
import { Universe } from "./universe"
import { cap1, clamp, japaneseName, loop, min, mulv, randomElement, rng, round, setSeed, sum, Vec2 } from "./util"

export type PathPoint = { c: Cell, d: number, from: Cell }

export class Cell {
  /** Elevation */
  elev = 0
  /** Humidity */
  hum = 0
  rivers = 0
  /** Temperature */
  t = 0
  
  biome!: Biome
  name: string
  layer!: number
  habitability!: number  

  /** Neighbor (or undefined) to the six irections in order */
  neighborsByDir!: Cell[]

  /** Non-undefined neighbors */
  neighbors!: Cell[]

  landTravelCost = 1

  latitude(){
    return Math.abs(.5 - this.at/ws)*2;
  }

  water() {
    return this.elev < this.u.SeaElev;
  }

  constructor(public u: Universe, public at: number) {
    setSeed(at)
    this.name = cap1(japaneseName())
  }


  erode(path: Cell[] = []): Cell[] | undefined {
    path.push(this);
    if (this.elev < this.u.SeaElev)
      return path;

    let flowTo = min(this.neighbors, c => c.elev)
    
      if(!flowTo)
      return

    let d = this.elev - flowTo.elev;

    if (!(d > 0))
      return;

    if (!this.u.rivers) {
      this.elev -= d / 2;
      flowTo.elev += d / 3;
    }

    return flowTo.erode(path)
  }


  pathfind(maxDist: number) {
    const visited = new Set<Cell>();
    const queue: PathPoint[] = [], result: { [at: number]: PathPoint } = {};

    queue.push({ c: this, d: 0, from: this });
    visited.add(this);

    while (queue.length > 0) {
      // Remove the front element from the queue
      const current = queue.shift()!;
      result[current.c.at] = current;

      current.c.neighbors.forEach(neighbor => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          let d = current.d + (neighbor.biome.travel ?? 1e9);
          if (d <= maxDist)
            queue.push({ c: neighbor, d, from: current.c });
        }
      })
    }

    return result;
  }

  /** visual hex position */
  topLeft(fixedLayer?: number) {
    let y = ~~(this.at / ww);
    return [(this.at % ww + y / 2) % ww,
    y - .4 * (fixedLayer ?? this.layer)
    ] as Vec2
  }

  /** visual hex center position */
  center() {
    return sum(this.topLeft(this.at), [.5, .5])
  }

  pixelPos() {
    return round(mulv(this.topLeft(), photoScale))
  }


}

