import { animate, cancelAnimation, MovementAnimation } from "./animation";
import { Cell } from "./cell";
import { marginalUtility, MarketAgent, RecipeX, Transfer } from "./market";
import { Race, raceAgentParameters } from "./races";
import { resourceIcon, spriteOf } from "./renderer";
import { cellNeighborhood } from "./root";
import { iterationsPerTurn, races } from "./setting";
import { debouncedPrerender, nameById, namePool, pointedCell, queen, select, selected, state, update } from "./state";
import { u } from "./universe";
import { cap1, dist, loop, objMap, randomElement, removeFromList, rng, sum, Vec2 } from "./util";

/** Scale when saving Consume rolling average */
export const craScale = 10000;

export const agentLocation = (a: MarketAgent) => {
  let c = (a as Agent).cell ?? u.c[a.id]
  return c
}

type SaveFormat = ReturnType<Agent["save"]>

let resAnimations = 0
export class Agent extends MarketAgent {
  kind!: string
  race!: Race
  cell!: Cell
  dest?: Cell
  steps = 0
  anim?: MovementAnimation
  authority = 0

  /** We create a herd in this cell, an improvement in  this cell, or the agent for the cell itself */
  constructor(cell: Cell, race?: string, size = 1) {
    super()
    if (!cell)
      debugger
    if (race)
      this.race = races[race];
    this.size = size

    let params = raceAgentParameters(this.race);

    this.cell = cell
    this.name = nameById(this.id)
    u.a.push(this);

    this.minit(params);
    this.recomp()

  }

  /** Animate transfers */
  anit(transfer: RecipeX) {
    let locs = [agentLocation(this), agentLocation(transfer.place)];
    Object.entries(transfer.recipe).forEach(([good, v]) => {
      let points = locs.map(cell => cell.topLeft())
      points[1] = sum(points[1], [rng(5) - 2, -rng(5) - 2])
      if (v > 0)
        points = [points[1], points[0]];
      let anim = animate(resourceIcon(good), points, 500)
      resAnimations++
      anim.f = () => resAnimations--
    })
  }

  recomp() {
    this.places = this.cell.neighborhood.map(c => c.getAgent())
    super.recomp()
  }

  trade() {
    let
      nb = new Set(this.cell.neighborhoodR(20)),
      partners = u.a.filter(a => nb.has(a.cell));
    partners.forEach(p => this.barter(p));
  }

  nextTurn() {
    this.steps = 3
    this.transfers = []
    loop(iterationsPerTurn, () => this.iterate())

    //if(this.race.name =="alicorn")      debugger

    this.go();
  }

  go() {
    if (this.steps < 1)
      return

    let p = this.pathTo(this.dest);

    if (p) {
      p = p.slice(1, this.steps + 1)
      this.steps -= p?.length;
      p.forEach(c => this.visit(c))
      cancelAnimation(this.anim);
      this.anim = animate(spriteOf(this), p.map(c => c.topLeft()))
      this.anim.f = () => delete this.anim
    }

  }

  see() {
    let newSeen = 0;
    this.cell.neighborhoodR(3).forEach(c => {
      if (!c.seen) {
        newSeen++
        c.seen = true
      }
    });
    if (newSeen)
      debouncedPrerender()
  }

  visit(c: Cell) {
    this.cell = c;
    if (c == this.dest)
      delete this.dest;
    this.recomp()
    this.see();
  }

  remove() {
    let sa = selected()
    removeFromList(u.a, this);
    update({ selected: u.a.indexOf(sa) })
  }

  save() {
    let v = this;
    return {
      at: v.cell.at,
      name: v.name,
      size: v.size,
      stock: v.stock,
      kind: v.kind,
      steps: v.steps,
      dest: v.dest?.at,
      cell: v.cell.at,
      race: v.race.name,
      cra: objMap(v.cra, v => ~~(v * craScale))
    }
  }

  load(v: SaveFormat) {
    Object.assign(this, {
      name: v.name,
      size: v.size,
      stock: v.stock,
      kind: this.kind,
      steps: v.steps,
      cell: u.c[v.cell],
      dest: u.c[v.dest as any],
      race: races[v.race],
      cra: objMap(this.cra, v => v / craScale)
    } as Partial<Agent>)
  }

  get at() {
    return this.cell.at
  }

  pathfind(maxDist: number, destination?: Cell) {
    return this.cell?.pathfind(this.race.moving, maxDist, destination)
  }

  pathTo(destination?: Cell, maxDist = 15) {
    if (!destination)
      return
    let pf = this.pathfind(maxDist, destination);
    let p = u.c[destination.at].pathFrom(pf);
    return p
  }

  queen() {
    return this.race == races.alicorn
  }

  queenTrade(good: string, give: boolean) {
    let giver = give ? queen() : this;
    let mu = marginalUtility(this.stock[good] ?? 0)
    let amount = Math.ceil(giver.stock[good] / 10);
    let value = ~~(mu * amount * (give ? .9 : 1.1) / 1e6);
    if (!give)
      value++;
    if (!value)
      amount = 0;
    return [amount, value].map(v => v * (give ? 1 : -1))
  }

  queenTradeApply(good: string, give: boolean) {
    let [amount, value] = this.queenTrade(good, give);
    queen().give(this, good, amount);
    this.authority += value
    select()
  }

}

