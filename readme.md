It's a 4x economy simulator about horses.

# Gameplay

Your goal is to unite the many herds of horsefolk. 
Initially you only control one Alicorn, but you can gain control of the others by raising their happiness to 1000.
You can choose where the happy herd goes and also can instantly summon Alicorn to them at the price of some magic and move. But you will lose control if their happiness drops below 1000.

Each herd can gather resources from the hexes in radius 1 from them (i.e., the hex they are on and 6 hexes around it), so it's a good idea to park the herd over/next to some resource deposits.

# Happiness

The simplest way to increase the herd's happiness is to gift them some items that they do not have.
Herds also gain or lose some happiness each turn, depending on what needs they could fulfill.
The bigger is the herd's happiness, and the happier herds currently are, the harder it is to satisfy their expectations.

# How the game works

At the core of the game is a simple data-driven economic simulation. 
with a relation between herds, goods, and land described with simple formulas.
Each herd and hex produce and consume a certain amount of items. 
They also have a library of "recipes" to convert some resources into the others.

Herds decide which recipe they use, based on the number of items they have currently - 
The less they have of something, the more valuable this item seems to them. 

Herds also can trade with other herds in range, at the cost of some "travel" resource.


# Controls
LMB - select unit, cycle through units in hex
RMB - move current unit
Drag with LMB or MMB to move the map.
Mouse Wheel - Zoom Map
Hold Shift to hold the updating of the hex tooltip in top left
Tab - cycle controllable herds
1-5 - choose the herd info tab

# UI
Unit info is split into five tabs.
1. "Actions done" - which actions has the herd chosen last turn?
2. "Possible actions" - all possible herd actions, but WITHOUT the actions related to working the land (mining, growing, etc.). If the unit is friendly, you can make it use any of the available actions.
3. "Needs" - the needs that unit has and if they were covered last turn
4. "Trades and land actions" - exchanges with other herds and resource spending on/gained from hexes.
5. "Present" - here a tour alicorn can give items to nearby herds or ask them back (from friendly herds).
Also, the button for warping to friend is here.

Cell info shows which resource cell it has and which actions the herd can do on it.
Most of the cell resources are abstract intermediate ones, and they stay in the cell's "inventory."
The herd working it receives only the final products, such as the specific crop or mineral.

# What I plan for the full version

1. Fixed bugs
2. Balanced economy
3. Research
4. Buildings and roads

Whether or not there will be a full version, and what there will be in it, depends mostly on your feedback.