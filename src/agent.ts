import { animate, cancelAnimation, MovementAnimation } from "./animation";
import { Cell, cellAgentParameters, PathPoint } from "./cell";
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

export let resAnimations = 0
export class Agent extends MarketAgent {
  kind!: string
  race!: Race
  cell!: Cell
  dest?: Cell
  steps = 0
  anim?: MovementAnimation
  happiness: number
  _pathfindData?: { [id: string]: PathPoint }
  _pathfindDataCell?: Cell

  pathfindData() {
    if (this.cell != this._pathfindDataCell || !this._pathfindData) {
      this._pathfindData = this.cell.pathfind(this.race.name, 20)
      this._pathfindDataCell = this.cell
    }
    return this._pathfindData
  }

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

    this.happiness = ~~rng(size) + 50;

    this.initMarket();
    this.recomp()
  }

  nextHappiness() {
    return clamp(0, this.happiness + this.totalHappinessGain() - this.expectation())
  }

  initMarket() {
    this.race && super.initMarket(raceAgentParameters(this.race))
  }


  /** Animate transfers */
  animateTransfer(transfer: RecipeX) {

    let path: Cell[], stepDuration = 200;

    path = this.pathTo(transfer.place.cell) as Cell[];

    if (transfer.place instanceof Agent)
      path ??= transfer.place.pathTo(this.cell) as Cell[];

    if(!path)
      return
    //path ??= [this.cell, transfer.place.cell]

    let points = path?.map(c => c.topLeft()) as Vec2[];

    if (points.length < 3)
      points.push(sum(points[points.length-1], [0, 3]))

    let rev = [...points].reverse();
    stepDuration += 500 / points.length;

    Object.entries(transfer.recipe).forEach(([good, v]) => {
      if (good == "travel") return;
      setTimeout(() => {
        let anim = animate(resourceIcon(good), v < 0 ? points : rev, stepDuration)
        resAnimations++
        anim.f = () => resAnimations--
      }, Math.random() * 200)
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
    partners.forEach(p => {
      let path = this.pathTo(p.cell);
      if (path)
        this.barter(p, Math.max(0, path.length - 2))
    });
  }

  barter(their: MarketAgent, distance?: number): boolean {
    if (this == queen() || their == queen()) {
      if (!this.cell.seen || !(their as any).cell.seen) {
        return false
      }
    }
    return super.barter(their, distance)
  }

  maxSteps() {
    return Math.min(this.steps, ~~(this.stock.travel / this.size));
  }

  nextTurn() {
    //if (!this.isBuilding())
    this.steps = 5
    this.transfers = []
    this.consumed = {}
    this.uses = {}

    loop(iterationsPerTurn, () => this.iterate())

    this.happiness = this.nextHappiness();
    if (this.size > 1) {
      let popGain = ~~((rng(this.happiness) - rng(this.size)) / 100);
      this.size = clamp(100, this.size + popGain, 5000)
    }

    //if(this.race.name =="alicorn")      debugger

    if (!this.happy()) {
      this.dest = randomElement(this.cell.neighbors);
      //if(this.race.biomes.includes(cell.biome.name) || this.race.biomes.length == 0)
    }
    this.go();
  }

  totalHappinessGain() {
    let res = Math.round(listSum(Object.values(this.happinessGain()))??0)
    return res
  }

  expectation() {
    return state.expectation + ~~(this.happiness / 200)
  }

  go() {
    this.visit(this.cell);
    if (this.maxSteps() < 1 || this.cell == this.dest)
      return

    let p = this.pathTo(this.dest);

    if (p) {
      p = p.slice(1, this.steps + 1)
      this.steps -= p?.length;
      this.gain("travel", -this.size);
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
    if (this.happy())
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

  /*pathfind(maxDist: number, destination?: Cell) {
    return this.cell?.pathfind(this.race.name, maxDist, destination)
  }*/

  pathTo(destination?: Cell) {
    if (!destination)
      return
    //let pf = this.pathfind(maxDist, destination),
    let pf = this.pathfindData(),
      dp = u.c[destination.at]
    let p = dp?.pathFrom(pf);
    return p
  }

  queen() {
    return this.race == races.alicorn
  }

  /** Calculate manual trade */
  giftCalc(good: string, give: boolean) {
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
  giftApply(good: string, give: boolean) {
    let [amount, value] = this.giftCalc(good, give);
    queen().give(this, good, amount);
    this.happiness += value
    select()
  }

  /*isBuilding() {
    return !this.race.job
  }*/

}

