export const race = {
  alicorns: {
    job: "alicorning"
  },
  horses: {
    job: "horsing",
    recipes: [
      { "horsing": -1, "working hard": 1 }
    ]
  },
  unicorns: {
    job: "unicorning",
    income: { gems: -1 },
    recipes: [
      { unicorning: -1, magic: 1 }
    ]
  },
  pegasi: {
    job: "pegasing",
    income: {},
    moving: "flying",
    recipes: [
      { pegasing: -1, rain: 1 }
    ]
  },
  zebras: {
    job: "zebring",
    income: {},
  },
  deers: {
    job: "deering",
    income: {},
  },
  goats: {
    job: "goating",
    income: {},
  },
  seahorses: {
    job: "seahorsing",
    income: {},
    moving: "swimming",
    recipes: [
    ]
  }
}

const
  recipes = [
    { $ing: -1, working: 1 },
    { working: -1, "working hard": 1 },
    { working: -1, thinking: 1 },
    { thinking: -1, spelunking: 1 },
    { strength: -1, digging: 1 },
    { strength: -3, tools: -1, digging: 10 },
    { magic: -1, fertilizer: 1 },
    { rain: -1, irrigation: 1 }
  ],

  farm = {
    recipes: [
      { soil: -1, irrigation: 1 },
      { soil: -1, fertilizer: 1 },
      { soil: -1, irrigation: -1, fertilizer: -1, plant: -1, harvest: 1 },
      { harvest: -1, $fruit: 1 },
    ]
  },

  mine = {
    recipes: [
      { spelunking: -1, digging: -1, $ore: 1 }
    ]
  },

  lumbermill = {

  },

  well = {

  }

