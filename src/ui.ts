import { Agent, craScale } from "./agent";
import { GoodNumbers, marginalUtility, MarketAgent } from "./market";
import { resourceIcon } from "./renderer";
import { saveTitlePrefix } from "./saves";
import { iterationsPerTurn, placeables } from "./setting";
import { state, pointedCell, queen } from "./state";
import { cap1, dist, formatNumber, loop, objFilter, objMap, objScale, objStripFalsy, removeDuplicates } from "./util";

declare var TIP: HTMLDivElement, INFO: HTMLDivElement, MID: HTMLDivElement, BTN: HTMLDivElement;

export let menuOn = false;

export const ARROW = 65, Tip = 0, Info = 1, Mid = 2,

  //tabs = ["jobs", "gifts", "possible", "income", "trades"],

  updateDiv = (slot: number, ...text: (string | undefined)[]) => {
    [TIP, INFO, MID][slot].innerHTML = text.filter(v => v).map(t =>
      t == "btn" ? agentButtons() :
        t?.charAt(0) == "!" ? `<div class=ptl>${t?.substring(1)}</div>` :
          `<div class=pnl>${t ?? " "}</div>`
    ).join('')
    drawIcons();
  },

  agentButtons = () => {
    return `<div class=abtn>${loop(4, t => `<button id=${"tab" + t} class=${t == state.tab ? "h" : ""}>${icon("tab" + t)}</button>`).join('')}</div>`
  },

  icon = (name: string) => `<span data-icon="${name}"><span></span><span class=ttx>${name}</span></span>`,

  asList = (a?: GoodNumbers) => a ? Object.entries(a).map(([k, v]) =>
    `<span class=aaa>${formatNumber(v)}${icon(k)}</span>`
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

  agentTitle = (agent: Agent) => `<h4>${icon(agent.race.name)}${agent.name} - ${agent.size > 1 ? agent.size : ""} ${agent.race.name}</h4>`,

  updateTip = () => {
    let cell = pointedCell()

    let lines = []

    if (cell) {
      lines.push(`<h4>${cell.name} ${cell.biome.name} ${cell.special ? `with ${cell.special}` : ''}</h4>${`<div class=stock>${asList(objStripFalsy(cell?.stock))}</div>`}`)

      cell.a.forEach(a => lines.push(agentTitle(a)))

      lines.push(
        "!income/turn",
        asList(cell.income),
        "!can",
        `<div class=tc>${cell.ownRecipes.map(fancyRecipe).join("</br>")}</div>`,
        ...Object.keys(cell.uses).length ?
          [
            "!jobs this turn",
            recipeUsedStats(cell)] : [],

      )
      //lines.push(asList(objStripFalsy(cell.resources)))
    }

    updateDiv(Tip, ...lines)
  },

  recipeUsedStats = (a: MarketAgent) => Object.entries(a.uses).map(([k, v]) => {
    let recipeStr = k,
      recipe = JSON.parse(recipeStr)
    return fancyRecipe(objScale(recipe, v))
  }).join("</br>"),

  ifAnything = (...l: any[]) => l[1] ? l : [],

  agentInfo = (agent: Agent) => [
    //"!Authority:∞",
    `${agentTitle(agent)}<div class=stock>${asList(objStripFalsy(agent.stock))}</div>`,
    /*"!needs covered",
    `${asList(objScale(agent.cra, 1 / craScale))}`,*/

    //`<div class=stock>${asList(objMap(a.stock, v => ~~(marginalUtility(v) / 1000)))}</div>`,
    "btn",
    ...
    [
      () => [
        ...ifAnything("!produced", asList(agent.prodTurn())),
        ...ifAnything("!used", recipeUsedStats(agent))
      ],
      () =>
        ["!can use",
          `<div class=tc>${agent.ownRecipes.map(fancyRecipe).join("</br>")}</div>`
        ],
      () => [
        ...ifAnything("!needs", asList(agent.prodTurn(-1))),
        ...ifAnything("!trades", tradeTable(agent))
      ],
      () =>
        ["!trades"],
    ][state.tab as number || 0]()
  ],

  writeHappiness = (agent: Agent) => `${agent.queen() ? "" : "Happiness:" + agent.happiness}`,

  htmlTable = (divs: string[][]) => `<table>${divs.map(line => `<tr>${line.map(td => `<td>${td}</td>`).join('')}</tr>`).join('')}</table>`,

  tradeTable = (agent: Agent) => {
    if (agent.queen() || !agent.cell.neighbors.includes(queen().cell))
      return `${writeHappiness(agent)}<br/>Approach other herd to trade`

    let res = removeDuplicates([...Object.keys(queen().stock), ...Object.keys(agent.stock)])

    return `${writeHappiness(agent)}
    ${htmlTable([
      [icon("alicorning"), "give", "", "take", icon(agent.race.job)],
      ...res.map(name => {
        let [give, take] = [agent.queenTrade(name, true), agent.queenTrade(name, false)];
        if (!give[1] && !take[1])
          return []
        return [
          queen().stock[name] ?? 0,
          queen().stock[name] && give[1] ? `<button data-give="${name}">${give[0]}</button>` : "",
          icon(name),
          agent.stock[name] && take[1] && agent.happiness > 1 ? `<button data-take="${name}">${-take[0]}</button>` : "",
          agent.stock[name] ?? 0
        ]
      })
    ] as string[][])}`
  },

  hideMenu = () => {
    menuOn = false;
    updateDiv(Mid, "")
  },

  showSavesMenu = () => {
    menuOn = true;
    let s = ["<button id=X>X</button>"]
    for (let i = 0; i < 20; i++) {
      let title = localStorage[saveTitlePrefix + i]
      s.push(`${i || '*'} <button data - load=${i}> load < /button> ${i ? `<button data-save=${i}>save</button > ${title || "new"} ` : "autosave"}`)
      if (!title)
        break
    }
    updateDiv(Mid, s.join("</br>"))
  }


/*showResearchMenu = (on = true) => {
  menuOn = true;
  updateDiv(Mid, "Research<button id=X>X</button>")
}*/


BTN.innerHTML =
  ["Build", /*"Research",*/ "Queen", "Saves", "Next Turn"].map((v, i) =>
    `<button id="${v.split(" ")[0]}">${v}</button>`
  ).join('')
