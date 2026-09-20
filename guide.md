Each herd 
1. Produce resources (mostly in the form of the workforce of their recpective kind - unicorns produce "unicorning" etc).
2. Convert resource between each other
3. Consume resources.
4. Trade resources.

## Resource value

They decide what they will convert, consume and trade, based on how valuable each resource is for them.
Resource value is decided by a simple rule - the more they have of it, the less they want more of it ("diminishing marginal utility").

Herd uses the recipe when, and only when it increases the total subjective value ("utility") of their total stock.

# Trading

Trading resource between herd works in similar way, but a bit more complex, as it happens only if BOTH parties would increase their stock value after the trade. Additionally, the herd, which initiates the trade, has to spend some "travel" resource to transport the goods back and forth, proportional to total amount and distance.

# Natural resources

Herds can also gather (harvest/mine/cut/fish/etc ) the local resources. It works this way.
The hex has it's own stock of resources and a library of recipes. 
The herd temporarily adds those resources and recipes to their own, and then picks recipes as usualy,
trying to maximise the value of the common stock. 
Recipe takes resources from whoever owns it, and gives resources which hex has further use to the hex, 
and the rest of the resoruces to the herd.

# Happiness

Herd gain happiness by consuming resources at the end of turn. There are three "generic" resources - food, fun and comfort - which herd wants a lot of, and also small amount of various resources.
Herd gains happiness proportionally to amount of resources they consume.

Each herd has some "expectation" for the happiness they want each turn. It scales with the current herd happiness,
and the total number of herds with >999 happiness. Herd happiness change is the amount they gain from consuming resources minus the expected happiness.

Herds with 999+ happiness can be controlled by the player. Also, herds with happines>size will gradually grow in size (and shrink if happiness<size).

# Gifts

Alicorn can gift items to herds to give them some happiness. The happiness gained depends on it's utility for the herd. Which means, that only goods which herd has very small amount off will net a lot of happiness.

Happy (>999 happiness) herd will also allow Alicorn to take some of their resources, using the similar rules.
That is, the more of resources the herd has, the more of it will give, and the less happiness it will lose when giving it away.

# Moving around

Each herd can make up to 5 steps, depending on the land biome and the herd species. 
Flying units ignore terrain.
Swimming species will only move across sea, rivers, and one hex on land away from them.
Other units will only move on land, and have reduced movement costs on their "native" terrain.

Besides 5 step limit, herd spends some "travel" resource for moving, proportional to the hed size.