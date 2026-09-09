import { animate, cancelAnimation, MovementAnimation } from "./animation";
import { Cell, cellAgentParameters } from "./cell";
//import { updateBuildButton } from "./controls";
import { marginalUtility, MarketAgent, RecipeX, Transfer } from "./market";
import { Race, raceAgentParameters } from "./races";
import { resourceIcon, spriteOf } from "./renderer";
import { cellNeighborhood } from "./root";
import { iterationsPerTurn, races } from "./setting";
import { debouncedPrerender, queen, select, selected, state, update } from "./state";
import { u } from "./universe";
import { cap1, clamp, dist, japaneseName, listSum, loop, objMap, randomElement, removeFromList, rng, sum, Vec2 } from "./util";

/** Scale when saving Consume rolling average */
export const craScale = 10000;

/*export const agentLocation = (a: MarketAgent) => {
  let c = (a as Agent).cell ?? u.c[a.id]
  return c
}*/

declare var Build: HTMLDivElement

let resAnimations = 0
export class Agent extends MarketAgent {
  kind!: string
  race!: Race
  cell!: Cell
  dest?: Cell
  steps = 0
  anim?: MovementAnimation
  happiness = 0

  happy() {
    return this.queen() || this.happiness > 999;
  }

  /** This agent is village or dome */
  village() {
    return !this.race.job
  }

  /** We create a herd in this cell, an improvement in  this cell, or the agent for the cell itself */
  constructor(cell: Cell, race?: string, size = 1) {
    super()
    this.visit(cell);
    if (race)
      this.race = races[race];
    this.size = size

    this.cell = cell
    this.name = japaneseName()
    u.a.push(this);

    this.minit();
    this.recomp()
  }

  nextHappiness(){
    return clamp(0, this.happiness + this.tghappiness() - this.expectation())
  }

  get friend() {
    return this.queen()
  }

  minit() {
    this.race && super.minit(raceAgentParameters(this.race))
  }


  /** Animate transfers */
  anit(transfer: RecipeX) {
    let locs = [this.cell, (transfer.place as Agent | Cell).cell];
    Object.entries(transfer.recipe).forEach(([good, v]) => {
      let points = locs.map(cell => cell.topLeft()) as [Vec2, Vec2]
      points[1] = sum(points[1], [rng(5) - 2, -rng(5) - 2])
      if (v > 0)
        points = [points[1], points[0]];
      let anim = animate(resourceIcon(good), points, 500 + 5 * dist(...points))
      resAnimations++
      anim.f = () => resAnimations--
    })
  }

  recomp() {
    this.places = this.cell.neighborhood
    this.cell.neighborhood.forEach(p => p.woke = true)
    super.recomp()
  }

  trade() {
    let
      nb = this.cell.cir(20),
      partners = u.a.filter(a => nb.has(a.cell) && !((a.queen() || this.queen()) && !a.cell.seen && !this.cell.seen));
    partners.forEach(p => this.barter(p));
  }

  nextTurn() {
    //if (!this.isBuilding())
    this.steps = 3
    this.transfers = []
    this.happiness = this.nextHappiness();
    loop(iterationsPerTurn, () => this.iterate())

    //if(this.race.name =="alicorn")      debugger

    if(!this.happy()){
      this.dest = randomElement(this.cell.neighbors);
      //if(this.race.biomes.includes(cell.biome.name) || this.race.biomes.length == 0)
    }
    this.go();
  }

  tghappiness() {
    return listSum(Object.values(this.happinessG))
  }

  expectation() {
    return state.expectation + ~~(this.happiness / 100)
  }

  go() {
    if (this.steps < 1 || this.cell == this.dest)
      return

    let p = this.pathTo(this.dest);

    if (p) {
      p = p.slice(1, this.steps + 1)
      this.steps -= p?.length;
      p.forEach(c => this.visit(c))
      cancelAnimation(this.anim);
      this.anim = animate(spriteOf(this), p.map(c => c.topLeft()))
      this.anim.f = () => delete this.anim
      //if(this == selected())        updateBuildButton();
    }

  }

  see() {
    let newSeen = 0;
    this.cell.cir(3).forEach(c => {
      if (!c.seen) {
        newSeen++
        c.seen = true
      }
    });
    if (newSeen)
      debouncedPrerender()
  }

  visit(c: Cell) {
    this.cell && removeFromList(this.cell.a, this)
    this.cell = c;
    this.cell?.a.push(this)
    if (c == this.dest)
      delete this.dest;
    this.recomp()
    if (this.friend)
      this.see();

  }

  remove() {
    if (selected() == this)
      update({ selected: undefined })
    this.cell && removeFromList(this.cell.a, this);
    removeFromList(u.a, this);
  }


  get at() {
    return this.cell.at
  }

  /** Pathfind */
  pf(maxDist: number, destination?: Cell) {
    return this.cell?.pf(this.race.name, maxDist, destination)
  }

  pathTo(destination?: Cell, maxDist = 15) {
    if (!destination)
      return
    let pf = this.pf(maxDist, destination),
      dp = u.c[destination.at]
    let p = dp?.pathFrom(pf);
    return p
  }

  queen() {
    return this.race == races.alicorn
  }

  /** Calculate manual trade */
  gift(good: string, give: boolean) {
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

  /**apply manual trade */
  gifta(good: string, give: boolean) {
    let [amount, value] = this.gift(good, give);
    queen().give(this, good, amount);
    this.happiness += value
    select()
  }

  /*isBuilding() {
    return !this.race.job
  }*/

}

