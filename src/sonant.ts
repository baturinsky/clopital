export const playSound = (tones: number[], vol = 1, vibratto = 1) => {
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


export let music_data = [6014, 21, 88, [[[7, 0, 0, 1, 255, 0, 7, 0, 0, 1, 255, 0, 0, 100, 0, 3636, 254, 2, 1199, 254, 4, 71, 0, 0, 0, 0, 0, 0, 0], [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1], [[126, 126, 0, 0, 126, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 126, 126, 0, 0, 126, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]], [[6, 0, 0, 0, 255, 2, 6, 0, 18, 0, 255, 2, 0, 100000, 56363, 100000, 199, 2, 200, 254, 8, 24, 0, 0, 0, 0, 0, 0, 0], [0, 0, 2, 2, 3, 4, 2, 2, 3, 5, 2, 2, 3, 4, 2, 2, 3, 5], [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [132, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [133, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 128, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [125, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [120, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]], [[7, 0, 0, 0, 87, 2, 8, 0, 0, 0, 16, 3, 8, 0, 22, 2193, 255, 3, 1162, 51, 10, 182, 2, 190, 0, 1, 10, 96, 0], [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1], [[149, 149, 0, 0, 149, 0, 149, 0, 149, 149, 0, 0, 149, 0, 149, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]], [[8, 0, 0, 0, 65, 2, 6, 0, 0, 0, 243, 3, 0, 200, 7505, 20000, 204, 4, 6180, 81, 4, 198, 0, 0, 0, 0, 6, 131, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 3, 1, 1, 2, 3], [[132, 0, 0, 0, 0, 0, 0, 0, 133, 0, 0, 0, 137, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [132, 0, 0, 0, 0, 0, 0, 0, 133, 0, 0, 0, 130, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [132, 0, 0, 0, 0, 0, 0, 0, 133, 0, 0, 0, 125, 0, 0, 0, 0, 0, 0, 0, 125, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]]]];

export let
  audio_ctx: AudioContext,
  AUDIO_SAMPLERATE = 44100, // Samples per second
  AUDIO_TAB_SIZE = 4096,
  AUDIO_TAB_MASK = AUDIO_TAB_SIZE - 1,
  AUDIO_TAB = new Float32Array(AUDIO_TAB_SIZE * 4), // 4 oscilators

  audio_init = () => {
    // This function needs to be called in response to a user action, as it
    // tries to activate the audio context.
    audio_ctx = new AudioContext();
    audio_ctx.resume();

    // Generate the lookup tables
    for (let i = 0; i < AUDIO_TAB_SIZE; i++) {
      AUDIO_TAB[i] = Math.sin(i * 6.283184 / AUDIO_TAB_SIZE); // sin
      AUDIO_TAB[i + AUDIO_TAB_SIZE] = AUDIO_TAB[i] < 0 ? -1 : 1; // square
      AUDIO_TAB[i + AUDIO_TAB_SIZE * 2] = i / AUDIO_TAB_SIZE - 0.5; // saw
      AUDIO_TAB[i + AUDIO_TAB_SIZE * 3] = i < AUDIO_TAB_SIZE / 2 ? (i / (AUDIO_TAB_SIZE / 4)) - 1 : 3 - (i / (AUDIO_TAB_SIZE / 4)); // tri
    }
  },

  audio_play = (buffer, volume = 1, loop = 0, pan = 0) => {
    let gain = audio_ctx.createGain(),
      source = audio_ctx.createBufferSource(),
      panner = audio_ctx.createStereoPanner();
    gain.gain.value = volume;
    gain.connect(audio_ctx.destination);
    panner.connect(gain);
    panner.pan.value = pan;
    source.buffer = buffer;
    source.loop = loop;
    source.connect(panner);
    source.start();
  },

  audio_get_ctx_buffer = (buf_l, buf_r) => {
    let buffer = audio_ctx.createBuffer(2, buf_l.length, AUDIO_SAMPLERATE);
    buffer.getChannelData(0).set(buf_l);
    buffer.getChannelData(1).set(buf_r);
    return buffer;
  },

  audio_generate_sound = (
    row_len, note, buf_l, buf_r, write_pos,

    // Instrument properties
    osc1_oct, osc1_det, osc1_detune, osc1_xenv, osc1_vol, osc1_waveform,
    osc2_oct, osc2_det, osc2_detune, osc2_xenv, osc2_vol, osc2_waveform,
    noise_fader, attack, sustain, release, master,
    fx_filter, fx_freq, fx_resonance, fx_delay_time, fx_delay_amt, fx_pan_freq_p, fx_pan_amt,
    lfo_osc1_freq, lfo_fx_freq, lfo_freq_p, lfo_amt, lfo_waveform
  ) => {
    let osc_lfo_offset = lfo_waveform * AUDIO_TAB_SIZE,
      osc1_offset = osc1_waveform * AUDIO_TAB_SIZE,
      osc2_offset = osc2_waveform * AUDIO_TAB_SIZE,
      fx_pan_freq = Math.pow(2, fx_pan_freq_p - 8) / row_len,
      lfo_freq = Math.pow(2, lfo_freq_p - 8) / row_len,

      c1 = 0,
      c2 = 0,

      q = fx_resonance / 255,
      low = 0,
      band = 0,
      high = 0,

      buf_length = buf_l.length,
      num_samples = attack + sustain + release - 1,

      osc1_freq =
        Math.pow(1.059463094, (note + (osc1_oct - 8) * 12 + osc1_det) - 128)
        * 0.00390625 * (1 + 0.0008 * osc1_detune),
      osc2_freq =
        Math.pow(1.059463094, (note + (osc2_oct - 8) * 12 + osc2_det) - 128)
        * 0.00390625 * (1 + 0.0008 * osc2_detune);

    for (let j = num_samples; j >= 0; --j) {
      let
        // Buffer positions
        k = j + write_pos,

        // LFO
        lfor = AUDIO_TAB[osc_lfo_offset + ((k * lfo_freq * AUDIO_TAB_SIZE) & AUDIO_TAB_MASK)] * lfo_amt / 512 + 0.5,

        sample = 0,
        filter_f = fx_freq,
        temp_f,
        envelope = 1;

      // Envelope
      if (j < attack) {
        envelope = j / attack;
      }
      else if (j >= attack + sustain) {
        envelope -= (j - attack - sustain) / release;
      }

      // Oscillator 1
      temp_f = osc1_freq;
      if (lfo_osc1_freq) {
        temp_f *= lfor;
      }
      if (osc1_xenv) {
        temp_f *= envelope * envelope;
      }
      c1 += temp_f;
      sample += AUDIO_TAB[osc1_offset + ((c1 * AUDIO_TAB_SIZE) & AUDIO_TAB_MASK)] * osc1_vol;

      // Oscillator 2
      temp_f = osc2_freq;
      if (osc2_xenv) {
        temp_f *= envelope * envelope;
      }
      c2 += temp_f;
      sample += AUDIO_TAB[osc2_offset + ((c2 * AUDIO_TAB_SIZE) & AUDIO_TAB_MASK)] * osc2_vol;

      // Noise oscillator
      if (noise_fader) {
        sample += (2 * Math.random() - 1) * noise_fader * envelope;
      }

      sample *= envelope / 255;

      // State variable filter
      if (lfo_fx_freq) {
        filter_f *= lfor;
      }

      filter_f = 1.5 * AUDIO_TAB[(filter_f * 0.5 / AUDIO_SAMPLERATE * AUDIO_TAB_SIZE) & AUDIO_TAB_MASK];
      low += filter_f * band;
      high = q * (sample - band) - low;
      band += filter_f * high;
      sample = [sample, high, low, band, low + high][fx_filter];

      // Panning & master volume
      temp_f = AUDIO_TAB[(k * fx_pan_freq * AUDIO_TAB_SIZE) & AUDIO_TAB_MASK] * fx_pan_amt / 512 + 0.5;
      sample *= 0.00476 * master; // 39 / 8192 = 0.00476

      buf_l[k] += sample * (1 - temp_f);
      buf_r[k] += sample * temp_f;
    }
  },

  audio_create_song = (row_len, pattern_len, song_len, tracks) => {
    let num_samples = AUDIO_SAMPLERATE * song_len,
      mix_buf_l = new Float32Array(num_samples),
      mix_buf_r = new Float32Array(num_samples);

    for (let track of tracks) {
      let buf_l = new Float32Array(num_samples),
        buf_r = new Float32Array(num_samples),
        write_pos = 0,
        delay_shift = (track[0/*instrument*/][20/*fx_delay_time*/] * row_len) >> 1,
        delay_amount = track[0/*instrument*/][21/*fx_delay_amt*/] / 255;

      for (let p = 0; p < pattern_len; p++) {
        for (let row = 0; row < 32; row++) {
          let note = track[2/*notes*/][track[1/*pattern*/][p] - 1]?.[row];
          if (note) {
            audio_generate_sound(row_len, note, buf_l, buf_r, write_pos, ...track[0/*instrument*/]);
          }
          write_pos += row_len;
        }
      }

      audio_apply_delay(delay_shift, delay_amount, buf_l, buf_r);
      for (let b = 0; b < num_samples; b++) {
        mix_buf_l[b] += buf_l[b];
        mix_buf_r[b] += buf_r[b];
      }
    }
    return audio_get_ctx_buffer(mix_buf_l, mix_buf_r);
  },

  audio_create_sound = (note, instrument, row_len = 5605) => {
    let delay_shift = (instrument[20/*fx_delay_time*/] * row_len) >> 1,
      delay_amount = instrument[21/*fx_delay_amt*/] / 255,
      num_samples =
        instrument[13/*env_attack*/] +
        instrument[14/*env_sustain*/] +
        instrument[15/*env_release*/] +
        delay_shift * 32 * delay_amount,
      buf_l = new Float32Array(num_samples),
      buf_r = new Float32Array(num_samples);
    audio_generate_sound(row_len, note, buf_l, buf_r, 0, ...instrument);
    audio_apply_delay(delay_shift, delay_amount, buf_l, buf_r);
    return audio_get_ctx_buffer(buf_l, buf_r);
  },

  audio_apply_delay = (shift, amount, buf_l, buf_r) => {
    for (let i = 0; i < buf_l.length - shift; i++) {
      buf_l[i + shift] += buf_r[i] * amount;
      buf_r[i + shift] += buf_l[i] * amount;
    }
  };

  