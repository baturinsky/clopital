import { Agent } from "./agent";
import { GoodNumbers, marginalUtility, MarketAgent } from "./market";
import { resourceIcon } from "./renderer";
import { state, agentPointed, pointedCell } from "./state";
import { u } from "./universe";
import { cap1, objFilter, objMap, objScale, objStripFalsy } from "./util";

declare var TIP: HTMLDivElement, INFO: HTMLDivElement;

export const ARROW = 65, Tip = 0, Info = 1, Tt = 2,

  tabs = ["jobs", "recipes", "trade"],

  updateDiv = (slot: number, ...text: (string | undefined)[]) => {
    [TIP, INFO][slot].innerHTML = text.filter(v => v).map(t =>
      t=="btn" ? agentButtons():
      t?.charAt(0)=="!"?`<div class=ptl>${t?.substring(1)}</div>`:
      `<div class=pnl>${t}</div>`
    ).join('')
    drawIcons();
  },

  agentButtons = ()=>{
    return `<div class=abtn>${tabs.map(t=>`<button id=${t} class=${t==state.tab?"h":""}>${t}</button>`).join('')}</div>`
  },

  icon = (name: string) => `<span data-icon="${name}"><span></span><span class=ttx>${name}</span></span>`,

  asList = (a?: GoodNumbers) => a ? Object.entries(a).map(([k, v]) => 
    `<span class=aaa>${~~v}${icon(k)}</span>`
).join('') : undefined,

  drawIcons = () => {
    setTimeout(() => {
      let icons = document.querySelectorAll("[data-icon]") as any as HTMLElement[]
      for (let icon of icons) {
        let n = icon.dataset.icon
        icon.children[0].innerHTML = ""
        icon.children[0].appendChild(resourceIcon(n as string))
      }
    }, 0)
  },

  fancyRecipe = (r: GoodNumbers) => {
    let [minus, plus] = [objFilter(r, v => v < 0), objFilter(r, v => v > 0)]
    if (Object.keys(minus).length) {
      return `${asList(objScale(minus, -1))}→ </span>${asList(plus)}`
    } else {
      return asList(r)
    }
  },

  agenTitle = (agent:Agent)=>`<h4>${icon(agent.race.job)} ${agent.name} ${agent.race.name}</h4>`,

  updateTip = () => {
    let cell = pointedCell()

    let lines = []
    if (agentPointed())
      lines.push(agenTitle(agentPointed()))

    if (cell) {
      lines.push(`${cell.name} ${cell.biome.name}`)
      if (cell.agent) {
        lines.push(
          "!income",
          asList(cell.agent.income), 
          "!have",
          asList(cell.agent.stock),
          ...Object.keys(cell.agent.uses).length?
          ["!jobs this turn",
          recipeUsedStats(cell.agent)]:[]
        )
      } else {
        lines.push(asList(objStripFalsy(cell.resources)))
      }
    }

    updateDiv(Tip, ...lines)
  },

  recipeUsedStats = (a:MarketAgent)=>Object.entries(a.uses).map(([k, v]) => {
      let recipeStr = k,
        recipe = JSON.parse(recipeStr)
      return fancyRecipe(objScale(recipe, v))
    }).join("</br>"),

  agentInfo = (agent: Agent) => [
    agenTitle(agent),
    "!income",
    asList(objScale(agent.income, agent.size)),
    "!have",
    `<div class=stock>${asList(objStripFalsy(agent.stock))}</div>`,
    //`<div class=stock>${asList(objMap(a.stock, v => ~~(marginalUtility(v) / 1000)))}</div>`,
    "btn",
    "!jobs this turn",
    state.tab == "jobs"?
    recipeUsedStats(agent):
    agent.ownRecipes.map(fancyRecipe).join("</br>")
  ]
