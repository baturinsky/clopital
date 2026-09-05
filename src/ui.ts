import { Agent } from "./agent";
import { GoodNumbers } from "./market";
import { resourceSprite } from "./renderer";
import { cap1, objFilter, objScale } from "./util";

declare var TIP: HTMLDivElement, INFO: HTMLDivElement;

const ARROW = 65;

export const

  updateDiv = (div: HTMLDivElement, text: string[]) => {
    div.innerHTML = text.filter(v => v).map(t => `<div>${t}</div>`).join('')
    drawIcons();
  },

  tip = (...text: string[]) => updateDiv(TIP, text),

  info = (...text: string[]) => updateDiv(INFO, text),

  asTable = (a: GoodNumbers) =>
    `<table>${Object.entries(a).map(([k, v]) =>
      `<tr><td>${cap1(k)}</td><td data-icon="${k}"></td><td>${v}</td></tr>`).join('')}</table>`
  ,

  asList = (a: GoodNumbers) => Object.entries(a).map(([k, v]) => `${v}<span data-icon="${k}"></span>`).join(''),

  drawIcons = () => {
    setTimeout(() => {
      let icons = document.querySelectorAll("[data-icon]") as any as HTMLElement[]
      for (let icon of icons) {
        let n = icon.dataset.icon
        icon.innerHTML = ""
        icon.appendChild(resourceSprite(n as string))
      }
    }, 0)
  },

  fancyRecipe = (r: GoodNumbers) => {
    let [minus, plus] = [objFilter(r, v => v < 0), objFilter(r, v => v > 0)]    
    if (Object.keys(minus).length) {
      return `${asList(objScale(minus, -1))}<span data-icon="${ARROW}"></span>${asList(plus)}`
    } else {
      return asList(r)
    }
  },

  agentInfo = (a: Agent) => [
    `<h4>${a.name} ${a.race.name}`,
    Object.entries(a.uses).map(([k, v]) => {
      //let [placeId, recipeStr] = k.split("@"), 
      let recipeStr = k, 
      recipe = JSON.parse(recipeStr)
      return fancyRecipe(objScale(recipe,v))
    }).join("</br>")
  ]


