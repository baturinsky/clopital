# Goal

The goal is to explore, befriend all herds, and have a high level of overall happiness.   For that, you need to arrange a trade network, so herds, which harvest important resources, spread them to the others.

# Herds

Each herd 

1. Produce resources (mostly in the form of the workforce of their respective kind—unicorns produce "unicorning," etc.).

2. Convert resources between each other

3. Consume resources.

4. Trade resources.

## Resource value

They decide what they will convert, consume, and trade, based on how valuable each resource is for them.

Resource value is decided by a simple rule - the more they have of it, the less they want more of it ("diminishing marginal utility").

Herd uses the recipe when, and only when it increases the total subjective value ("utility") of their total stock.

# Trading

Trading resources between herds works in a similar way, but a bit more complex, as it happens only if BOTH parties increase their stock value after the trade. Additionally, the herd, which initiates the trade, has to spend some "travel" resource to transport the goods back and forth, proportional to the total amount and distance.

# Natural resources

Herds can also gather (harvest/mine/cut/fish/etc ) the local resources. It works this way.

The hex has its own stock of resources and a library of recipes. 

The herd temporarily adds those resources and recipes to their own and then picks recipes as usual, trying to maximize the value of the common stock. 

The recipe takes resources from whoever owns it and gives resources, which the hex has further use for, to the hex, and the rest of the resources to the herd.

# Happiness

Herd gains happiness by consuming resources at the end of the turn. There are three "generic" resources—food, fun, and comfort—which herd wants a lot of, and also a small amount of various resources.

Herd gains happiness proportionally to the amount of resources they consume.

Each herd has some "expectation" for the happiness they want each turn. It scales with the current herd happiness.

and the total number of herds with >999 happiness. Herd happiness change is the amount they gain from consuming resources minus the expected happiness.

Herds with 999+ happiness can be controlled by the player. Also, herds with happines>size will gradually grow in size (and shrink if happiness<size).

# Gifts

Alicorn can gift items to herds to give them some happiness. The happiness gained depends on its utility for the herd. Which means that only goods that herd has a very small amount of will net a lot of happiness.

Happy (>999 happiness) herd will also allow Alicorn to take some of their resources, using the similar rules.

That is, the more of resources the herd has, the more of it will give, and the less happiness it will lose when giving it away.

# Moving around

Each herd can make up to 5 steps, depending on the land biome and the herd species. 

Flying units ignore terrain.

Swimming species will only move across seas, rivers, and one hex on land away from them.

Other units will only move on land and have reduced movement costs on their "native" terrain.

Besides the 5-step limit, the herd spends some "travel" resource for moving, proportional to the herd size.