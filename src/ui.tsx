import { Agent } from "./agent";
import { Cell } from "./cell";
import { GoodNumbers, marginalUtility, MarketAgent } from "./market";
import { tradeables } from "./resources";
import { saveTitlePrefix } from "./saves";
import { resourceIcon, resourceIconDataUrl } from "./sprites";
import { tabs, state, pointedCell, queen, selected } from "./state";
import { u } from "./universe";
import { plainText as changelog } from "../changelog.md"
import { cap1, clamp, debounce, dist, formatNumber, listSum, loop, objFilter, objMap, objScale, objStripFalsy, removeDuplicates, RGBA } from "./util";

console.log(changelog);

const specialTags = {
  icon: (prop: { of: string, tip?: string }) => icon(prop.of, prop.tip)
} as { [id: string]: (prop: any) => any }

export function el(tag: string, args: any, ...children: string[]) {
  if (typeof tag == "function")
    return children.join('')
  if (specialTags[tag])
    return specialTags[tag]({ ...args, children })
  return `<${tag}${args ? Object.entries(args).map(([a, b]) => ` ${a}="${b}"`).join(" ") : ""}>${children.join('')}</${tag}>`;
}

declare var TIP: HTMLDivElement, INFO: HTMLDivElement, MID: HTMLDivElement, BTN: HTMLDivElement;

export let menuOn = false;

export const ARROW = 65, Tip = 0, Info = 1, Mid = 2,

  //tabs = ["jobs", "gifts", "possible", "income", "trades"],

  showButtons = () => {
    BTN.innerHTML =
      [/*"Build",*/ /*"Research",*/ "Menu", "Queen", "Next Turn"].map((v, i) =>
        <button id={v.split(" ")[0]}>{v}</button>
      ).join('')

  },

  updateDiv = (slot: number, ...text: any[]) => {
    let div = [TIP, INFO, MID][slot];
    let buf = document.createElement("div");
    buf.innerHTML = text.filter(v => v).
      map(t =>
        t == "btn" ? agentButtons() :
          typeof t == "string" && t?.charAt(0) == "!" ? <div class="ptl">{t?.substring(1)}</div>
            : <div class={`pnl tab${state.tab}`}>{t ? t : " "}</div>
      ).join('')
    buf.id = div.id;
    drawIcons(buf);
    div.parentElement?.replaceChild(buf, div);
    //drawIcons();
  },

  agentButtons = () => {
    return <div class="abtn">
      {loop(5,
        t => <button id={"tab" + t} class={t == state.tab ? "h" : ""}>
          {icon("tab" + t, tabs[t])}
        </button>
      ).join('')}
    </div>
  },

  drawIcons = (div: HTMLElement) => {
    let icons = div.querySelectorAll("[data-icon]") as any as HTMLElement[]
    for (let icon of icons) {
      let n = icon.dataset.icon
      icon.children[0].innerHTML = ""
      icon.children[0].appendChild(resourceIcon(n as string))
    }
  },

  ttx = (tip: string) => tip == "notip" ? '' : `<span class=ttx>${tip}</span>`,

  iconDataUrl = (name: string, tip?: string) =>
    <span class="icon">
      <img src={resourceIconDataUrl(name)} />{ttx(tip ?? name)}
    </span>,

  icon = (name: string, tip?: string) =>
    <span data-icon={name} class="icon">
      <span class="img"></span>
      {ttx(tip ?? name)}
    </span>,


  asList = (a?: GoodNumbers) => a ? `${Object.entries(a).map(([k, v]) => goodSpan(k, v),).join('')}` : undefined,

  goodSpan = (good: any, value: number | string) =>
    <span class="good">
      <icon of={good} tip="notip" />
      {formatNumber(value)}
      {ttx(good)}
    </span>,

  /*drawIcons = debounce(() => {
    requestAnimationFrame(() => {
      let icons = document.querySelectorAll("[data-icon]") as any as HTMLElement[]
      for (let icon of icons) {
        let n = icon.dataset.icon
        icon.children[0].innerHTML = ""
        icon.children[0].appendChild(resourceIcon(n as string))
      }
    })
  }, 30),*/

  fancyRecipe = (r: GoodNumbers) => {
    let [minus, plus] = [objFilter(r, v => v < 0), objFilter(r, v => !(v < 0))]
    let s: string | undefined;
    if (Object.keys(minus).length) {
      s = `${asList(objScale(minus, -1))}→</span>${asList(plus)}`
    } else {
      s = asList(r)
    }
    return s
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
      lines.push(
        asDivs([
          `${agentTitle(cell)}${asList(objStripFalsy(cell?.stock))}`,
          `${icon("time")}${asList(cell.income)}`,
          doubleColumn(cell.ownRecipes.map(fancyRecipe))
        ])
      )


      if (Object.keys(cell.uses).length)
        lines.push(
          ["!jobs this turn",
            recipeUsedStats(cell)],
        )
      cell.a.forEach(a => lines.push(agentTitle(a)))

      //lines.push(asList(objStripFalsy(cell.resources)))
    }

    updateDiv(Tip, ...lines)
  },

  asDivs = (l: any[]) => l.map(a => <div>{a}</div>).join(''),

  doubleColumn = (a: any[]) => {
    return <div class="tc">{asDivs(a)}</div>
  },

  recipeUsedStats = (a: MarketAgent) => asDivs(Object.entries(a.uses ?? {}).map(([k, v]) => {
    let recipeStr = k,
      recipe = JSON.parse(recipeStr)
    return fancyRecipe(objScale(recipe, v))
  })),

  ifAnything = (...l: any[]) => l[1] ? l : [],

  agentInfo = (agent: Agent) => {
    return [
      `${agentTitle(agent)}${asList(objStripFalsy(agent.stock))}`,
      "btn",
      ...
      [
        () => [
          ...ifAnything("!produced", asList(agent.totTurnInc(1))),
          ...ifAnything('!' + tabs[0], recipeUsedStats(agent))
        ],
        () =>
          ['!' + tabs[1],
          doubleColumn(agent.ownRecipes.map(
            r => {
              let uses = selected().recipeUseMultiplier({ place: selected(), recipe: r })
              let retext = JSON.stringify(r).replaceAll('"', "`")
              //console.log(retext);
              return (selected().happy() && uses > 0 ?
                <button data-recipe={retext}>{fancyRecipe(objScale(r, uses))}</button> :
                fancyRecipe(r)) as string
            }
          ))
          ],
        () => [
          '!happiness change',
          `Had ${agent.happiness} + ${agent.totalHappinessGain()} from covered needs - wanted ${agent.expectation()} = ${icon("happiness")}${agent.nextHappiness()}`,
          ...ifAnything('!' + tabs[2], agent.consumed ? doubleColumn(
            Object.entries(agent.totTurnInc(-1)).map(
              ([good, _]) => <>
                {icon(good)}
                {agent.consumed[good] ?? 0}
                /
                {~~(-agent.totTurnInc(-1)[good]).toFixed(2)}
                {goodSpan("happiness", (agent.happinessGain()[good] as number ?? 0).toFixed(2))}
              </>
            )
          ) : "?")
        ],
        () =>
          [
            '!' + tabs[4],
            asDivs(agent.transfers
              .sort((a, b) => a.place instanceof Agent && !(b.place instanceof Agent) ? -1 : 1)
              .map(t => `${agentTitle(t.place as any, false)} ${fancyRecipe(t.recipe)}`)
            )
          ],
        () => [
          ...ifAnything('!' + tabs[3], tradeTable(agent))
        ],

      ][state.tab as number || 0]()
    ]
  },


  writeHappiness = (agent: Agent) =>
    agent.queen() ? "" : <>{icon("happiness")}{agent.happiness}</>,

  htmlTable = (divs: string[][]) => <table>{divs.map(line => <tr>{line.map(td => <td>{td}</td>).join('')}</tr>).join('')}</table>,

  tradeTable = (agent: Agent) => {
    if (agent.queen())
      return `Get next to the other herd and give them gifts to gain their trust`

    if (!agent.cell.neighborhood.includes(queen().cell))
      return `Should be near to give gifts<br/>${agent.happy() ?
        (queen().stock.magic > 100 && queen().steps >= 1 ?
          <button id="warp">{icon("warp")}Summon alicorn</button> : 'Alicorn asleep')
        : ''}`

    let res = removeDuplicates([...Object.keys(queen().stock), ...Object.keys(agent.stock)]).filter(res => tradeables.has(res))

    let tableGive: any[][] = [], tableTake: string[][] = []

    res.forEach(name => {
      let [give, take] = [agent.giftCalc(name, true), agent.giftCalc(name, false)],
        canTake = agent.stock[name] && take[1] && agent.happy(),
        canGive = queen().stock[name] && give[1]


      if (canGive)
        tableGive.push([
          `${give[0]}/${queen().stock[name]}${icon(name)}→${asList({ happiness: give[1] })
          }`,
          <button data-give={name}>give</button>
        ])

      if (canTake)
        tableTake.push([
          <button data-take={name}>take</button> as string,
          `${fancyRecipe({ [name]: -take[0], happiness: take[1] })}`
        ])
    })

    return `${writeHappiness(agent)} (befriended at 1000)    
    ${htmlTable([...tableGive, ...tableTake])}`
  },

  hideMenu = () => {
    menuOn = false;
    updateDiv(Mid,
      `Turn: ${state.turn} Friends: ${u.a.filter(u => u.happy()).length - 1}/${u.a.length}<br/> World Happiness: ${listSum(u.a, a => a.happiness)}${icon("happiness")}`)
  },

  showSavesMenu = () => {
    menuOn = true;
    updateDiv(Mid,
      <>
        <h1>Clopital</h1>
        Seed:
        <input type="number" id="SEED" value={state.seed}></input> Land:
        <input type="range" id="LAND" value={state.land} min={1} max={7} /> <button id="New">New game</button>
      </> as string,
      <>
        <h4>Saves</h4>
        {htmlTable(loop(13,
          i => [
            i || 'auto',
            i && u ? <button data-save={i}>save</button > : '---',
            ...localStorage[saveTitlePrefix + i] ?
              [
                <button data-load={i}>load</button>,
                <button data-x={i}>X</button>,
                localStorage[saveTitlePrefix + i]] : []
          ]
        ))}
        <h4>CHANGELOG</h4>
        <pre>
{changelog}</pre>

      </>,


    )
  }


/*showResearchMenu = (on = true) => {
  menuOn = true;
  updateDiv(Mid, "Research<button id=X>X</button>")
}*/

