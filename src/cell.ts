import { Agent } from "./agent"
import { Biome, biomesByNames, HILLS } from "./biomes"
import { GoodNumbers, MarketAgent, MarketAgentParameters } from "./market"
import { layerSickness } from "./renderer"
import { food, minerals, plants } from "./resources"
import { photoScale, worldCoord, toXY, wh, ws, ww, neighborhood } from "./root"
import { iterationsPerTurn, biomeToAgent, races, cellCapPerIncome, incomePerResource } from "./setting"
//import { nameById } from "./state"
import { ESea, u, Universe } from "./universe"
import { cap1, clamp, loop, min, muls, objAdd, objScale, randomElement, rng, round, setSeed, objStripFalsy, sum, Vec2, objFilter, objEvery, japaneseName } from "./util"

export type PathPoint = { c: Cell, d: number, from: Cell }

export const UNPPASSABLE = 1e12, SEALVL = 0, GROUNDLVL = 1, HILLSLVL = 2

export class Cell extends MarketAgent {
  /** Elevation */
  elev = 0
  /** Humidity */
  hum = 0
  rivers = 0
  roads = 0
  /** Temperature */
  t = 0
  woke?: boolean

  biome: Biome = biomesByNames.bedrock
  name: string

  layer: number = SEALVL | GROUNDLVL | HILLSLVL

  bedrock!: boolean

  /** Neighbor (or undefined) to the six irections in order */
  neighborsByDir!: Cell[]

  /** Non-undefined neighbors */
  neighbors!: Cell[]

  /** neighbors and itself*/
  neighborhood!: Cell[]

  seen?: boolean = true

  settlement?: MarketAgent

  resources!: GoodNumbers

  //agent?: MarketAgent

  special?: string

  /** Cells in radius cache */
  _cir = [] as Set<Cell>[]

  a = [] as Agent[]

  cir(d: number) {
    if (!this._cir[d])
      this._cir[d] = new Set(neighborhood[d].map(v => u.c[v + this.at]).filter(v => v));
    return this._cir[d]
  }

  water() {
    return this.elev < u.elev[ESea];
  }

  minit() {
    super.minit(cellAgentParameters(this))
  }

  get cell() {
    return this
  }

  constructor(public at: number) {
    super()
    setSeed(at)
    this.name = japaneseName()
    let coord = worldCoord(at)
    this.bedrock = coord[0] < 1 || coord[0] > ww - 2 || coord[1] < 1 || coord[1] > wh - 2;
  }

  /*neighborhoodResources() {
    return this.neighborhood.map(c => c.resources).reduce(objAdd, {})
  }*/

  /** todo: traverse queue in correct order */
  pathfind(moveMode: string, maxDist: number, destination?: Cell) {
    const visited = new Set<Cell>();
    const queue: PathPoint[] = [], result: { [at: number]: PathPoint } = {};

    const costFunction = travelCostFunction(moveMode);
    queue.push({ c: this, d: 0, from: this });
    visited.add(this);

    while (queue.length > 0) {
      // Remove the front element from the queue
      const current = queue.shift()!;
      result[current.c.at] = current;
      if (current.c == destination)
        return result

      current.c.neighbors.forEach(neighbor => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          let d = current.d + costFunction(current.c, neighbor);
          if (d <= maxDist) {
            let i;
            for (i = queue.length - 1; i >= 0 && queue[i].d > d; i--) { }
            queue.splice(i + 1, 0, { c: neighbor, d, from: current.c });
          }
        }
      })
    }

    return result;
  }

  pathFrom(pf: { [id: string]: PathPoint } = {}) {
    let path: Cell[] = [this], point = pf[this.at];
    if (!point)
      return undefined;
    do {
      point = pf[point.from.at]
      path.push(point.c)
    } while (point.c != point.from)
    return path.reverse()
  }

  /** visual hex position in photo coords */
  topLeft(shift: Vec2 = [0, 0], fixedLayer?: number) {
    let p = worldCoord(this.at);
    p = sum(muls(p, photoScale), shift);
    p[1] -= layerSickness * (fixedLayer ?? this.layer ?? 0)
    return p
  }

  center(shift: Vec2 = [0, 0], fixedLayer?: number) {
    return this.topLeft(sum(shift, photoScale, .5), fixedLayer)
  }

  nextTurn() {
    if (this.woke) {
      this.gainIncome(iterationsPerTurn)
      if (objEvery(this.cap, (v, k) => this.stock[k] >= v))
        this.woke = false;
    }
  }

}

export const
  travelCostFunction = (moveMode: string) => {
    return (a: Cell, b: Cell) => {
      switch (moveMode) {
        case "flying":
          return b.bedrock ? UNPPASSABLE : .5;
        case "swimming":
          return b.water() || a.water() || a.rivers || b.rivers ? 1 : UNPPASSABLE;
        default:
          let cost = b.biome.travel ?? 1e9
          if (races[moveMode] && b.biome.races.includes(moveMode)) {
            cost /= 2;
          }
          return cost;
      }
    }
  },

  cellAgentParameters = (c: Cell) => {
    let income: GoodNumbers = {}, ownRecipes = [] as GoodNumbers[], cap: GoodNumbers;

    for (let k in c.resources) {
      if (c.resources[k]) {
        objAdd(income, biomeToAgent[k].income, c.resources[k])
        ownRecipes = [...ownRecipes, ...biomeToAgent[k].ownRecipes];
      }
    }

    if (!c.special && c.layer > rng(100)) { 
      c.special = randomElement(["iron", "copper"])
    }

    if (c.special) {
      ownRecipes.push({ [minerals.includes(c.special) ? "ore" : "crops"]: -1, [c.special]: 1 })
    }

    income = objScale(objStripFalsy(income), incomePerResource);
    cap = objScale(income, cellCapPerIncome);


    return {
      //id: c.at,
      income,
      ownRecipes,
      cap,
      stock: { ...cap }
    } as MarketAgentParameters
  }

export const erode = (cell: Cell, path: Cell[] = []): Cell[] | undefined => {
  if (cell.bedrock)
    return

  path.push(cell);
  if (cell.elev < u.elev[ESea])
    return path;

  let flowTo = min(cell.neighbors, c => c.elev)

  if (!flowTo)
    return

  let d = cell.elev - flowTo.elev;

  if (!(d > 0))
    return;

  if (!u.rivers) {
    cell.elev -= d / 2;
    flowTo.elev += d / 3;
  }

  return erode(flowTo, path)
}


