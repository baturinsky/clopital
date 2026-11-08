//@ts-ignore
import { useSyncExternalStore } from "preact/compat";
//@ts-ignore
import { plainText as changelog } from "../changelog.md"
import { Agent } from "./agent";
import { Cell } from "./cell";
import { buttonEffect } from "./controls";
import { gains, GoodNumbers, losses, marginalUtility, MarketAgent } from "./market";
import { tradeables } from "./resources";
import { saveTitlePrefix } from "./saves";
import { resourceIcon, resourceIconDataUrl } from "./sprites";
import { tabs, state, pointedCell, queen, selected, State, select, store, update } from "./state";
import { u } from "./universe";
import { cap1, clamp, debounce, dist, formatNumber, listSum, loop, objEvery, objFilter, objMap, objScale, objStripFalsy, removeDuplicates, RGBA } from "./util";

export let setState: (s: Partial<typeof state>) => any = (s: Partial<typeof state>) => {
  alert()
};

export function GUI() {

  useSyncExternalStore(store.subscribe, store.getState);

  return <>  <div id="BTN"></div>

    <div id="MAIN">
      <div id="MID">
        {changelogDiv()}
        {state.page == "saves" ?
          savesMenu() :
          <div id="BTN">{buttonsDiv()}</div>
        }
      </div>
      {state.page != "saves" &&
        <div id="SIDEBAR" className={selected()?.happy() ? "happy" : "unhappy"}>
          {agentInfo(selected())}
        </div>}
    </div>
  </>
}



const changelogDiv = () => state.page == "saves" && <div id="CHANGELOG">
  <h4>CHANGELOG</h4>
  {changelog.split("\n").map((a: string) => [a, <br />]).flat(1)}
</div>

const specialTags = {
  icon: (prop: { of: string, tip?: string }) => icon(prop.of, prop.tip)
} as { [id: string]: (prop: any) => any }


export let menuOn = false;

export const ARROW = 65, Tip = 0, Info = 1, Mid = 2,

  buttonsDiv = () =>
    ["Menu", "Queen", "Next Turn"].map((v, i) =>
      <button onClick={() => (buttonEffect as any)[v]()}>{v}</button>
    )
  ,

  icon = (name: string, tip?: string) => {
    return <span data-icon={name} class="icon">
      <span class="img" ref={(dom) => {
        if (dom) {
          dom.replaceChildren(resourceIcon(name))
        }
      }}></span>
      {ttx(tip ?? name)}
    </span>
  },

  agentButtons = () => {
    let r = <div class="agent-tab-buttons">
      {loop(5,
        t => <button id={"tab" + t} class={t == state.tab ? "selected" : ""}>
          {icon("tab" + t, tabs[t])}
        </button>
      )}
    </div>;
    return r
  }
  ,

  ttx = (tip: string) => tip == "notip" ? '' : <span class="ttx">{tip}</span>,


  asList = (a?: GoodNumbers) => a ? Object.entries(a).map(([k, v]) => goodSpan(k, v),) : undefined,

  goodSpan = (good: any, value: number | string) =>
    <span class="good">
      {icon(good, "notip")}
      {formatNumber(value)}
      {ttx(good)}
    </span>,


  fancyRecipe = (r: GoodNumbers) => {
    let s;
    if (!objEvery(r, v => v > 0)) {
      s = <>{asList(losses(r))}→{asList(gains(r))}</>
    } else {
      s = asList(r)
    }
    return s
  },

  coloredHappiness = (agent: Agent) => <span style={{ color: agent.happy() ? "#080" : "#a00" }}>{goodSpan("happiness", agent.happiness)}</span>,

  cellTitle = (cell: Cell) =>
    <h4 data-c="${agent.at}">{cell.name} {cell.biome.name} {cell.special ? `with ${cell.special}` : ''}</h4>,

  agentTitle = (agent: Agent) =>
    <span onClick={() => select(agent)}>{icon(agent.race?.name)}{agent.name}</span>,

  agentFullTitle = (agent: Agent) =>
    <span onClick={() => select(agent)}>
      {icon(agent.race?.name)}{agent.name} - {agent.size > 1 ? agent.size : ""} {agent.race.name} {coloredHappiness(agent)}
    </span>,

  agentOrCellTitle = (agent: Agent | Cell) =>
    agent instanceof Agent ? agentTitle(agent) : cellTitle(agent),

  tipDiv = () => {
    let cell = pointedCell()

    let lines = []

    if (cell) {
      lines.push(
        asDivs([
          `${cellTitle(cell)}${asList(objStripFalsy(cell?.stock))} `,
        ])
      )
      cell.a.forEach(a => lines.push(agentTitle(a)))
    }

    return lines
  },

  asDivs = (l: any[]) => l.map(a => <div>{a}</div>),

  doubleColumn = (a: any[]) => {
    return <div class="tc">{asDivs(a)}</div>
  },


  recipeUsedStats = (a: MarketAgent) =>
    asDivs(Object.entries(a.uses ?? {}).map(([k, v]) => {
      let recipeStr = k,
        recipe = JSON.parse(recipeStr)
      return fancyRecipe(objScale(recipe, v))
    })),

  ifAnything = (...l: any[]) => l[1] ? l : [],

  agentTabsRenderers = [
    (agent: Agent) => <>
      {asList(agent.totTurnInc(1))}
      {recipeUsedStats(agent)}
    </>,
    (agent: Agent) =>
      doubleColumn(agent.ownRecipes.map(
        r => {
          let uses = selected().recipeUseMultiplier({ place: selected(), recipe: r })
          let retext = JSON.stringify(r).replaceAll('"', "`")
          //console.log(retext);
          return (selected().happy() && uses > 0 ?
            <button onClick={() => buttonEffect.useRecipe(retext)}>{fancyRecipe(objScale(r, uses))}</button> :
            fancyRecipe(r))
        }
      ))
    ,
    (agent: Agent) =>
      <>
        <div>Happiness for covered needs</div>
        <div class="happines-gain">
          <div></div><div></div><div>{icon("happiness")}</div>
          <div></div><div></div><div>{icon("happiness")}</div>
          {(agent.consumed ?
            Object.entries(agent.totTurnInc(-1)).map(
              ([good, _]) => <>
                <div>{icon(good)}</div>
                <div>{agent.consumed[good] ?? 0}
                  /
                  {~~(-agent.totTurnInc(-1)[good]).toFixed(2)}</div>
                <div>
                  {(agent.happinessGain()[good] as number ?? 0).toFixed(2)}
                </div>
              </>
            )
            : "?")}
        </div>
        <div class="grid2">
          {asDivs(
            [
              "Had", <>{icon("happiness")} {agent.happiness - agent.totalHappinessGain() + agent.expectation()}</>,
              "From needs covered", <>{icon("happiness")} {agent.totalHappinessGain()}</>,
              "From expectations", <>{icon("happiness")} {- agent.expectation()}</>,
              "Now", <>{icon("happiness")} {agent.happiness}</>
            ]
          )}
        </div>
      </>
    ,
    (agent: Agent) =>
      <table class="transfers"><tbody>{
        agent.transfers
          .sort((a, b) => a.place instanceof Agent && !(b.place instanceof Agent) ? -1 : 1)
          .map((t, i) =>
            <>
              <tr class={"odd" + (i % 2)}>
                <td class="r">{asList(losses(t.recipe))}</td><td class="arrow">▶</td>
                <td width="3rem" rowSpan={2}>{agentOrCellTitle(t.place)}</td>
              </tr>
              <tr class={"odd" + (i % 2)}><td class="r">{asList(gains(t.recipe))}</td><td class="arrow">◀</td></tr>
            </>
          )
      }</tbody></table>

    ,
    (agent: Agent) =>
      tradeTable(agent)
    ,

  ],

  agentInfo = (agent: Agent) => {
    if (!agent)
      return;
    let r = <>
      {agentFullTitle(agent)}
      <div>{asList(objStripFalsy(agent.stock))}</div>
      {agentButtons()}
      <div class="pnl">
        {agentTabsRenderers[Number(state.tab ?? 0)](agent)}
      </div>
    </>
    return r;
  },

  writeHappiness = (agent: Agent) =>
    agent.queen() ? "" : <>{icon("happiness")}{agent.happiness}</>,

  htmlTable = (divs: string[][]) =>
    <table>
      {divs.map(line => <tr>{line.map(td => <td>{td}</td>)}</tr>)}
    </table>,

  tradeTable = (agent: Agent) => {
    if (agent.queen())
      return `Get next to the other herd and give them gifts to gain their trust`

    if (!agent.cell.neighborhood.includes(queen().cell)) {
      return <>Should be near to give gifts<br />
        {agent.happy() &&
          (queen().stock.magic > 100 && queen().steps >= 1 ?
            <button id="warp">{icon("warp")}Summon alicorn</button> : 'Alicorn asleep')
        }</>
    }

    let res = removeDuplicates([...Object.keys(queen().stock), ...Object.keys(agent.stock)]).filter(res => tradeables.has(res))

    let tableGive: any[][] = [], tableTake: any[][] = []

    res.forEach(name => {
      let [give, take] = [agent.giftCalc(name, true), agent.giftCalc(name, false)],
        canTake = agent.stock[name] && take[1] && agent.happy(),
        canGive = queen().stock[name] && give[1]


      if (canGive)
        tableGive.push([
          <>
            {give[0]}/{queen().stock[name]}{icon(name)}→{asList({ happiness: give[1] })}
          </>,
          <button onClick={() => buttonEffect.giveToSelected(name)}>give</button>
        ])

      if (canTake)
        tableTake.push([
          <button onClick={() => buttonEffect.takeFromSelected(name)}>take</button>,
          <>
            {asList({ happiness: -take[1] })}→{-take[0]}{icon(name)}
          </>
        ])
    })

    return <>
      {writeHappiness(agent)}(befriended at 1000)
      {htmlTable(tableGive)}{htmlTable(tableTake)}
    </>
  },

  topInfo = () => {
    return <>Turn: {state.turn} Friends: {u.a.filter(u => u.happy()).length - 1}/${u.a.length}<br />
      World Happiness: {listSum(u.a, a => a.happiness)}{icon("happiness")}`</>
  },

  savesMenu = () => {
    return [
      <>
        <h1>Clopital</h1>
        Seed:
        <input type="number" id="SEED" value={state.seed} 
        onInput={e=>update({seed:Number(e.currentTarget.value)})}
         ></input> Land:
        <input type="range" id="LAND" value={state.land} 
        onInput={e=>update({land:Number(e.currentTarget.value)})}
        min={1} max={7} /> <button id="New">New game</button>
      </>,
      <>
        <h4>Saves</h4>
        {htmlTable(loop(13,
          (i: number) => [
            i || 'auto',
            i && u ? <button onClick={() => buttonEffect.save(i)}>save</button > : '---',
            ...localStorage[saveTitlePrefix + i] ?
              [
                <button onClick={() => buttonEffect.load(i)}>load</button>,
                <button onClick={() => buttonEffect.deleteSave(i)}>X</button>,
                localStorage[saveTitlePrefix + i]] : []
          ]
        ))}
      </>
    ]
  }
