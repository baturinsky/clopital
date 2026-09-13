It's a 4x economy simulator about horses. These horses are smart enough to figure out what they produce and who to trade with by themselves, so you role is mainly to choose *where* they will do it.

# Controls
LMB - select herd, cycle through herds in the same hex
RMB - move the current herd 
Drag with LMB or MMB to move the map.
Mouse Wheel - Zoom Map
Hold Shift to hold the updating of the hex tooltip in top left
Tab - cycle controllable herds
1-5 - choose the herd info tab

# Gameplay

Your goal is to unite the many herds of horsefolk on the map by befriending them and forming a trade network out of them. 
Initially you only control one Alicorn, but you can gain control of the others by raising their happiness to 1000.
You will lose control of the herd if their happiness drops below 1000.

# Happiness

The simplest way to increase the herd's happiness is to gift them some items that they do not have.
Herds also gain or lose some happiness each turn, depending on what needs they could fulfill.
The bigger the herd's happiness is, and the more herds are above 1000 happiness, the harder it is to satisfy their expectations each turn.

What can you do with a happy herd?

Most importantly, you can choose where they go.
Each herd can gather resources from the hexes in radius 1 from them (i.e., the hex they are on and 6 hexes around it), so it's a good idea to park the herd over/next to some useful resource deposits.

You also can instantly summon Alicorn to any happy herd at the price of some Alicorn's magic.

You can ask some resources from the happy herd at the price of a bit of their happiness.

And, finally, if you want, you can manually command them to do some resource conversion action, but there's no need to micromanage them like this - they aree adult horses and can figure out what to do themselves.

# How the game works

At the core of the game is a simple data-driven economic simulation. 
with a relation between herds, goods, and land described with simple formulas.
Each herd and hex produce and consume a certain amount of resources. 

Some resources are more abstract ("working" or "crops"), some are material items which can be bartered and such.

Herds have a library of "actions" to convert some resources into the others.
Some of those actions are tied to specific hexes, such as, you can only convert abastract "crops" into the specific "apples" on the hexes with apples.

Herds decide which action they use, based on the number of items they have currently - 
The less they have of something, the more valuable this item seems to them. 

Herds also can trade with other herds in range, at the cost of some "travel" resource. Same "travel" is used to move around.
