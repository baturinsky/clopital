import { Agent } from "./agent";
import { Cell } from "./cell";
import { GoodNumbers, marginalUtility, MarketAgent } from "./market";
import { resourceIcon } from "./renderer";
import { tradeables } from "./resources";
import { saveTitlePrefix } from "./saves";
import { iterationsPerTurn, placeables } from "./setting";
import { state, pointedCell, queen } from "./state";
import { u } from "./universe";
import { cap1, clamp, debounce, dist, formatNumber, loop, objFilter, objMap, objScale, objStripFalsy, removeDuplicates } from "./util";

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
    return `<div class=abtn>${loop(5, t => `<button id=${"tab" + t} class=${t == state.tab ? "h" : ""}>${icon("tab" + t, tabs[t])}</button>`).join('')}</div>`
  },

  icon = (name: string, tip?: string) => `<span data-icon="${name}"><span></span><span class=ttx>${tip ?? name}</span></span>`,

  asList = (a?: GoodNumbers) => a ? Object.entries(a).map(([k, v]) =>
    goodSpan(k, v),
  ).join('') : undefined,

  goodSpan = (good: string, value: number) => `<span class=good>${icon(good)}${formatNumber(value)}</span>`,

  drawIcons = debounce(() => {
    setTimeout(() => {
      let icons = document.querySelectorAll("[data-icon]") as any as HTMLElement[]
      for (let icon of icons) {
        let n = icon.dataset.icon
        icon.children[0].innerHTML = ""
        icon.children[0].appendChild(resourceIcon(n as string))
      }
    }, 0)
  }, 30),

  fancyRecipe = (r: GoodNumbers) => {
    let [minus, plus] = [objFilter(r, v => v < 0), objFilter(r, v => !(v < 0))]
    if (Object.keys(minus).length) {
      return `${asList(objScale(minus, -1))}→</span>${asList(plus)}`
    } else {
      return asList(r)
    }
  },

  coloredHappiness = (agent: Agent) => `<span style="color:${agent.happy() ? "#080" : "#a00"}">${goodSpan("happiness", agent.happiness)}</span>`,

  agentTitle = (agent: Agent | Cell, full = true): string =>
    agent instanceof Agent ?
      `<h4 data-a="${u.a.indexOf(agent)}">${icon(agent.race.name)}${agent.name}${full ? ` - ${agent.size > 1 ? agent.size : ""} ${agent.race.name} ${coloredHappiness(agent)}` : ''}</h4>` :
      `<h4 data-c="${agent.at}">${agent.name} ${agent.biome.name} ${agent.special ? `with ${agent.special}` : ''}</h4>`,

  updateTip = () => {
    let cell = pointedCell()

    let lines = []

    if (cell) {
      lines.push(`${agentTitle(cell)}${`<div class=stock>${asList(objStripFalsy(cell?.stock))}</div>`}`)

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

  doubleColumn = (a: string[]) => `<div class=tc>${a.join("</br>")}</div>`,

  recipeUsedStats = (a: MarketAgent) => Object.entries(a.uses).map(([k, v]) => {
    let recipeStr = k,
      recipe = JSON.parse(recipeStr)
    return fancyRecipe(objScale(recipe, v))
  }).join("</br>"),

  ifAnything = (...l: any[]) => l[1] ? l : [],

  tabs = ["jobs done", "possible jobs", "needs", "share", "trades and local jobs"],

  agentInfo = (agent: Agent) => {
    return [
      `${agentTitle(agent)}<div class=stock>${asList(objStripFalsy(agent.stock))}</div>`,
      "btn",
      ...
      [
        () => [
          ...ifAnything("!produced", asList(agent.prodTurn())),
          ...ifAnything('!' + tabs[0], recipeUsedStats(agent))
        ],
        () =>
          ['!' + tabs[1],
          doubleColumn(agent.ownRecipes.map(fancyRecipe) as string[])
          ],
        () => [
          '!happiness change',
          `Had ${agent.happiness} + ${agent.totalHappinessGain()} from covered needs - wanted ${agent.expectation()} = ${icon("happiness")}${agent.nextHappiness()}`,
          ...ifAnything('!' + tabs[2], agent.consumed ? doubleColumn(
            Object.entries(agent.happinessGain()).map(
              ([good, v]) => `${icon(good)}${agent.consumed[good]}/${agent.prodTurn(-1)[good]}→${goodSpan("happiness", ~~(v * 100) / 100)}`)
          ) : "?")
        ],
        () => [
          ...ifAnything('!' + tabs[3], tradeTable(agent))
        ],
        () =>
          [
            '!' + tabs[4],
            agent.transfers.sort((a, b) => a.place instanceof Agent && !(b.place instanceof Agent) ? -1 : 1).map(t => `${agentTitle(t.place as any, false)} ${fancyRecipe(t.recipe)}`).join("<br/>")
          ],
      ][state.tab as number || 0]()
    ]
  },


  writeHappiness = (agent: Agent) => `${agent.queen() ? "" : icon("happiness") + agent.happiness}`,

  htmlTable = (divs: string[][]) => `<table>${divs.map(line => `<tr>${line.map(td => `<td>${td}</td>`).join('')}</tr>`).join('')}</table>`,

  tradeTable = (agent: Agent) => {
    if (agent.queen())
      return `Get next to the other herd and give them gifts to gain trust`

    if(!agent.cell.neighbors.includes(queen().cell))
      return `Not next to ${queen().name}`

    let res = removeDuplicates([...Object.keys(queen().stock), ...Object.keys(agent.stock)]).filter(res=>tradeables.has(res))

    let table:string[][] = []

    res.forEach(name => {
      let [give, take] = [agent.gift(name, true), agent.gift(name, false)],
        canTake = agent.stock[name] && take[1] && agent.happy(),
        canGive = queen().stock[name] && give[1]

      if (canGive)
        table.push([`${fancyRecipe({ [name]: -give[0], happiness: give[1] })}`, `<button data-give="${name}">give</button>`])

      if (canTake)
        table.push([`<button data-take="${name}">take</button>`, `${fancyRecipe({ [name]: -take[0], happiness: take[1] })}`])
    })

    return `${writeHappiness(agent)} (happy at 1000)
    ${htmlTable(table)}`
  },

  hideMenu = () => {
    menuOn = false;
    updateDiv(Mid, "")
  },

  showSavesMenu = () => {
    menuOn = true;
    updateDiv(Mid, htmlTable(loop(20,
      i => [
        i || 'auto',
        i ? `<button data-save=${i}>save</b utton >` : '',
        localStorage[saveTitlePrefix + i] ? `<button data-load=${i}>load</button>` : '',
        localStorage[saveTitlePrefix + i] || ''
      ]
    )))

    /*for (let i = 0; i < 20; i++) {
      let title = localStorage[saveTitlePrefix + i]
      s.push(`${i || '*'} <button data-load=${i}>load</button> ${i ? `<button data-save=${i}>save</button > ${title || "new"} ` : "autosave"}`)
      if (!title)
        break
    }
    updateDiv(Mid, s.join("</br>"))*/
  }


/*showResearchMenu = (on = true) => {
  menuOn = true;
  updateDiv(Mid, "Research<button id=X>X</button>")
}*/


BTN.innerHTML =
  [/*"Build",*/ /*"Research",*/ "Queen", "Saves", "Next Turn"].map((v, i) =>
    `<button id="${v.split(" ")[0]}">${v}</button>`
  ).join('')
