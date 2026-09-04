import { animate, cancelAnimation, MovementAnimation } from "./animation";
import { Cell } from "./cell";
import { MarketAgent } from "./market";
import { Race, raceAgentParameters, races } from "./races";
import { spriteOf } from "./renderer";
import { nameById, namePool, selected, state, update } from "./state";
import { u } from "./universe";
import { cap1, objMap, removeFromList } from "./util";

const craScale = 10000;

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
  }

  recomp() {
    this.places = this.cell.neighborhood.map(c => c.getAgent())
    super.recomp()

    this.iterate()
  }

  nextTurn() {
    this.steps = 3
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


  visit(c: Cell) {
    this.cell = c;
    if (c == this.dest)
      delete this.dest;
    this.recomp()
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