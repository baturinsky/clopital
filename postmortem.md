I'll  more detail later, but here is something.

# Linear programming and economy

There is a thing named Linear Programming. It's about algorithms of solving systems linear equotions.
Such as, finding the optimal solution in tasks which can be described in linear equations, 
such as how to get the biggest profit from the limited resources, which can be converted into each other.

And I wanted to use these algorithms to make an economic simulator, using this lib https://github.com/IanManske/YALPS.
And it worked.
But at some point of making it, Linear Programming part got optimised out.

# Rollup

At some moment, I have hit the size limit, and start cuting features hard. I had ideas how to make buildings and research relatively cheap, but had no bytes even for simple implementations. So, I removed them and have designed around the gameplay without them.  I had even to remove the rivers.

Then I have tried Rollup, and it saved my around 1.5 kb. Which is huge. It was too late to put back buildings and research, but it saved rivers and allowed to add a lot of small nice things.

js13k-vite-plugins npm package can take care of rollup-ing code for you

# Art

Very often in 13k entries people try to encode graphics in the js files. But I have found that using the specialised format can be more efficient.

Another thing that saved a lot of KBs for me is webp format and exif removal.
Webp is the best at packing the pixel art. For even better results, remove the metadata (exif) from the file.
You can do it with @faffweasel/strip-metadata package, but Aseprite does it by default when saving.

My sprite sheet is 1346 bytes in webp, 1983 in gif and 3099 in png

# Recolors

I used recolors to make various variants of the same sprites. All tiles in game is the same red tile, recolored differently. I do it, generating an SVG filter which replaced red, blue and green channels with respective  colors of choice. 
One of the advantages of this method is that it works with CORS-protected images.
