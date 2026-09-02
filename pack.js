/** WIP */

import fs from 'fs'
import Zopfli from 'node-zopfli';

fs.createReadStream('dist/index.html')
  .pipe(new Zopfli('deflate'))
  .pipe(fs.createWriteStream('file.gz'));