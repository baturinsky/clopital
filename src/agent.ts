import { animate, cancelAnimation, MovementAnimation } from "./animation";
import { Cell } from "./cell";
import { MarketAgent, Transfer } from "./market";
import { Race, raceAgentParameters } from "./races";
import { resourceSprite, spriteOf } from "./renderer";
import { races } from "./setting";
import { debouncedPrerender, nameById, namePool, selected, state, update } from "./state";
import { u } from "./universe";
import { cap1, loop, objMap, randomElement, removeFromList, rng, sum, Vec2 } from "./util";

const craScale = 10000;

export const agentLocation = (a: MarketAgent) => {
  let c = (a as Agent).cell ?? u.c[a.id]
  return c
}

type SaveFormat = ReturnType<Agent["save"]>
export class Agent extends MarketAgent {
  kind!: string
  race!: Race
  cell!: Cell
  dest?: Cell
  steps = 5
  anim?: MovementAnimation

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

    loop(5, () => this.iterate())

    if (this.transfers.length) {
      //console.log(this.race.name, this.transfers, this.uses);
      setInterval(() => {
        let transfer = randomElement(this.transfers);
        if (!transfer)
          return
        /*let transfers = this.transfers.filter(t=>t[0]==transfer[0])
        setTimeout(()=> transfers.forEach(t=>this.anit(t)), rng(500));*/
        let reverse = this.transfers.filter(t => t[0] == transfer[0] && t[2] * transfer[2] < 0)
        let backTransfer = randomElement(reverse);
        if (backTransfer) {
          this.anit(backTransfer);
        }
      }, 500)
    }
  }

  anit(transfer: Transfer) {

    let locs = [agentLocation(this), agentLocation(transfer[0])];
    let points = locs.map(cell => cell.topLeft())
    points[1] = sum(points[1], [rng(5) - 2, -rng(5) - 2])
    if (transfer[2] > 0)
      points = [points[1], points[0]];
    animate(resourceSprite(transfer[1]), points, 500)
  }

  recomp() {
    this.places = this.cell.neighborhood.map(c => c.getAgent())
    super.recomp()
  }

  nextTurn() {
    this.steps = 3
    this.transfers = []
    loop(5, () => this.iterate())
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
    this.cell.neighborhoodR(3).forEach(c => c.seen = true);
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



}

