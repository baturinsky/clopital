export const playSound = (tones:number[], vol = 1, vibratto = 1) => {
    let A = new AudioContext();
    let l = 2e4
    let B = A.createBuffer(tones.length, l, 2e4);
    let C = tones.map((t, i) => B.getChannelData(i));
    for (let i = 0; i < l; i++) {
      tones.forEach((tone, ci) => {
        let v =
          vol * tone / 20 * Math.sin(i / tone)
          * Math.min(i / 3e1, 1 - i / l) * Math.cos(i * vibratto)
        C[ci][i] = v
      });
    }
    let w = A.createBufferSource();
    w.buffer = B;

    let gain = A.createGain();
    gain.gain.value = 1;
    w.connect(gain);
    gain.connect(A.destination);

    w.start();

  }
