import { Agent } from "./agent";
import { GoodNumbers, marginalUtility, MarketAgent } from "./market";
import { resourceIcon } from "./renderer";
import { iterationsPerTurn } from "./setting";
import { state, agentPointed, pointedCell, queen } from "./state";
import { u } from "./universe";
import { cap1, dist, objFilter, objMap, objScale, objStripFalsy, removeDuplicates } from "./util";

declare var TIP: HTMLDivElement, INFO: HTMLDivElement;

export const ARROW = 65, Tip = 0, Info = 1, Tt = 2,

  tabs = ["gifts", "jobs", "recipes", "income", "trades"],

  updateDiv = (slot: number, ...text: (string | undefined)[]) => {
    [TIP, INFO][slot].innerHTML = text.filter(v => v).map(t =>
      t == "btn" ? agentButtons() :
        t?.charAt(0) == "!" ? `<div class=ptl>${t?.substring(1)}</div>` :
          `<div class=pnl>${t}</div>`
    ).join('')
    drawIcons();
  },

  agentButtons = () => {
    return `<div class=abtn>${tabs.map(t => `<button id=${t} class=${t == state.tab ? "h" : ""}>${t}</button>`).join('')}</div>`
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

  agenTitle = (agent: Agent) => `<h4>${icon(agent.race.job)}${agent.name} - ${agent.size>1?agent.size:""} ${agent.race.name}</h4>`,

  updateTip = () => {
    let cell = pointedCell()

    let lines = []

    if (cell) {
      lines.push(`<h4>${cell.name} ${cell.biome.name} ${cell.special?`with ${cell.special}`:''}</h4>${cell.agent ? `<div class=stock>${asList(objStripFalsy(cell.agent?.stock))}</div>` : ''}`)

      u.a.forEach(a => a.cell == cell && lines.push(agenTitle(a)))

      if (cell.agent) {
        lines.push(
          "!income/turn",
          asList(cell.agent.income),
          "!jobs available",
          `<div class=tc>${cell.agent.ownRecipes.map(fancyRecipe).join("</br>")}</div>`,
          ...Object.keys(cell.agent.uses).length ?
            [
              "!jobs this turn",
              recipeUsedStats(cell.agent)] : [],

        )
      } else {
        lines.push(asList(objStripFalsy(cell.resources)))
      }
    }

    updateDiv(Tip, ...lines)
  },

  recipeUsedStats = (a: MarketAgent) => Object.entries(a.uses).map(([k, v]) => {
    let recipeStr = k,
      recipe = JSON.parse(recipeStr)
    return fancyRecipe(objScale(recipe, v))
  }).join("</br>"),

  agentInfo = (agent: Agent) => [
    //"!Authority:∞",
    `${agenTitle(agent)}<div class=stock>${asList(objStripFalsy(agent.stock))}</div>`,
    "!needs covered",
    `${asList(agent.cra)}`,

    //`<div class=stock>${asList(objMap(a.stock, v => ~~(marginalUtility(v) / 1000)))}</div>`,
    "btn",
    ...
    state.tab == "jobs" ?
      ["!jobs this turn",
        recipeUsedStats(agent)] :
      state.tab == "income" ?
        ["!income/turn",
          asList(objScale(agent.income, agent.size * iterationsPerTurn))] :
        state.tab == "gifts" ?
          ["!give or receive goods",
            tradeTable(agent)] :
          ["!jobs available",
            `<div class=tc>${agent.ownRecipes.map(fancyRecipe).join("</br>")}</div>`
          ]
  ],

  authority = (agent:Agent)=>`Authority: ${agent.queen() ? "∞" : agent.authority}`,

  tradeTable = (agent: Agent) => {
    if (agent.queen() || !agent.cell.neighbors.includes(queen().cell))
      return `${authority(agent)}<br/>Approach other herd to trade` 

    let res = removeDuplicates([...Object.keys(queen().stock), ...Object.keys(agent.stock)])

    return `${authority(agent)}
<table>
<td>${icon("alicorning")}</td>
<td>give</td>
<td></td>
<td>take</td>
<td>${icon(agent.race.job)}</td>
${res.map(name => {
      let [give, take] = [agent.queenTrade(name, true), agent.queenTrade(name, false)];
      if (!give[1] && !take[1])
        return ""
      return `<tr>
<td>${queen().stock[name] ?? 0}</td>
<td>${queen().stock[name] && give[1] ? `<button data-give="${name}">${give[0]}</button>` : ""}</td>
<td>${icon(name)}</td>
<td>${agent.stock[name] && take[1] && agent.authority > 1 ? `<button data-take="${name}">${-take[0]}</button>` : ""}</td>
<td>${agent.stock[name] ?? 0}</td>
</tr>`
    }).join('')}
  </table>
  `
  }
