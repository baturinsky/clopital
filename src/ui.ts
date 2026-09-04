import { GoodNumbers } from "./market";
import { resourceSprite } from "./renderer";
import { cap1 } from "./util";

declare var TIP: HTMLDivElement;

export const tip = (text: string) => {
  TIP.innerHTML = text
  drawIcons();
}, asTable = (a: GoodNumbers) =>
  `<table>${Object.entries(a).map(([k, v]) =>
    `<tr><td>${cap1(k)}</td><td data-icon="${k}"></td><td>${v}</td></tr>`).join('')}</table>`
  , asList = (a: GoodNumbers) => Object.entries(a).map(([k, v]) => `<span data-icon="${k}"></span><span>${v}</span>`).join(''),
  drawIcons = () => {
    setTimeout(() => {
      let icons = document.querySelectorAll("[data-icon]") as any as HTMLElement[]
      for (let icon of icons) {
        let n = icon.dataset.icon
        icon.innerHTML = ""
        icon.appendChild(resourceSprite(n as string))
      }
    }, 0)
  }
