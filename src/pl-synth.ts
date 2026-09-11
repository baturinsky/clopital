/*

Copyright (c) 2024, Dominic Szablewski - https://phoboslab.org
SPDX-License-Identifier: MIT

Based on Sonant, published under the Creative Commons Public License
(c) 2008-2009 Jake Taylor [ Ferris / Youth Uprising ] 

*/

export const pl_synth_init = (ctx:AudioContext) => {
	let
	samplerate = 44100,
	
	tab_size = 4096,
	tab_mask = tab_size-1,
	tab = new Float32Array(tab_size * 4),
	rand_state = 0xd8f554a5,

	generate = (
		row_len:number, note:number, buf_l:Float32Array, buf_r:Float32Array, write_pos = 0,
		osc1_oct = 0, osc1_det = 0, osc1_detune = 0, osc1_xenv = 0, osc1_vol = 0, osc1_waveform = 0, 
		osc2_oct = 0, osc2_det = 0, osc2_detune = 0, osc2_xenv = 0, osc2_vol = 0, osc2_waveform = 0, 
		noise_fader = 0, 
		attack = 0, sustain = 0, release = 0, master = 0, 
		fx_filter = 0, fx_freq = 0, fx_resonance_p = 0, fx_delay_time = 0, fx_delay_amt = 0, fx_pan_freq_p = 0, fx_pan_amt_p = 0, 
		lfo_osc1_freq = 0, lfo_fx_freq = 0, lfo_freq_p = 0, lfo_amt_p = 0, lfo_waveform = 0
	) => {
		let 
			uint8_norm = 1 / 255,
			osc_lfo_offset = lfo_waveform * tab_size,
			osc1_offset = osc1_waveform * tab_size,
			osc2_offset = osc2_waveform * tab_size,
			fx_pan_freq = Math.pow(2, fx_pan_freq_p - 8) / row_len,
			fx_pan_amt = fx_pan_amt_p / 512,
			fx_osc_m = 0.5 / samplerate * tab_size,
			lfo_amt = lfo_amt_p / 512,
			lfo_freq = (Math.pow(2, lfo_freq_p - 8) / row_len) * tab_size,
			
			c1 = 0,
			c2 = 0,

			fx_resonance = fx_resonance_p * uint8_norm,
			noise_vol = noise_fader * 4.6566e-010, /* 1/(2**31) */
			low = 0,
			band = 0,
			high = 0,

			inv_attack = 1 / attack,
			inv_release = 1 / release,

			osc1_freq = Math.pow(1.059463094, (note + (osc1_oct - 8) * 12 + osc1_det) - 128) * 0.00390625 * (1 + 0.0008 * osc1_detune),
			osc2_freq = Math.pow(1.059463094, (note + (osc2_oct - 8) * 12 + osc2_det) - 128) * 0.00390625 * (1 + 0.0008 * osc2_detune),

			num_samples = attack + sustain + release - 1;
		
		for (let j = num_samples; j >= 0; --j) {
			let 
				k = j + write_pos,
				lfor = tab[osc_lfo_offset + ((k * lfo_freq) & tab_mask)] * lfo_amt + 0.5,

				sample = 0,
				filter_f = fx_freq,
				temp_f,
				envelope = 1;

			// Envelope
			if (j < attack) {
				envelope = j * inv_attack;
			}
			else if (j >= attack + sustain) {
				envelope -= (j - attack - sustain) * inv_release;
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
			sample += tab[osc1_offset + ((c1 * tab_size) & tab_mask)] * osc1_vol;

			// Oscillator 2
			temp_f = osc2_freq;
			if (osc2_xenv) {
				temp_f *= envelope * envelope;
			}
			c2 += temp_f;
			sample += tab[osc2_offset + ((c2 * tab_size) & tab_mask)] * osc2_vol;

			// Noise oscillator
			if (noise_fader) {
				rand_state ^= rand_state << 13;
				rand_state ^= rand_state >> 17;
				rand_state ^= rand_state << 5;
				sample += rand_state * noise_vol * envelope;
			}

			sample *= envelope * uint8_norm;

			// State variable filter
			if (fx_filter) {
				if (lfo_fx_freq) {
					filter_f *= lfor;
				}
				filter_f = 1.5 * tab[(filter_f * fx_osc_m) & tab_mask];
				low += filter_f * band;
				high = fx_resonance * (sample - band) - low;
				band += filter_f * high;
				sample = [sample, high, low, band, low + high][fx_filter];
			}

			// Panning & master volume
			temp_f = tab[(k * fx_pan_freq * tab_size) & tab_mask] * fx_pan_amt + 0.5;
			sample *= 0.00238 * master;

			buf_l[k] += sample * (1-temp_f);
			buf_r[k] += sample * temp_f;
		}
	},

	unundefine = (data:any) => {
		for (let i = 0; i < data.length; i++) {
			data[i] = Array.isArray(data[i]) ? unundefine(data[i]) : (data[i] ?? 0);
		}
		return data;
	},

	instrumentLen = (instrument:number[], row_len:number) => {
		let 
			delay_shift = (instrument[20/*fx_delay_time*/] * row_len) >> 1,
			delay_amount = instrument[21/*fx_delay_amt*/] / 255,
			delay_iter = Math.ceil(Math.log(0.1) / Math.log(delay_amount));
		return instrument[13/*env_attack*/] + 
			instrument[14/*env.sustain*/] + 
			instrument[15/*env.release*/] +
			delay_iter * delay_shift;
	},

	apply_delay = (left:Float32Array, right:Float32Array, start:number, row_len:number, instrument:Float32Array) => {
		if (!instrument[21/*fx_delay_amt*/]) {
			return;
		}
		let 
			delay_shift = (instrument[20/*fx_delay_time*/] * row_len) >> 1,
			delay_amount = instrument[21/*fx_delay_amt*/] / 255,
			len = left.length - delay_shift;
		for (let i = start, j = start + delay_shift; i < len; i++, j++) {
			left[j] += right[i] * delay_amount;
			right[j] += left[i] * delay_amount;
		}
	},

	sound = (instrument:Float32Array, note = 147 /* C-5 */, row_len = 5513 /* 120 BPM */) => {
    debugger
		instrument = unundefine(instrument);

		let 
			num_samples = instrumentLen(instrument, row_len),
			audio_buffer = ctx.createBuffer(2, num_samples, samplerate),
			samples_l = audio_buffer.getChannelData(0),
			samples_r = audio_buffer.getChannelData(1);

		generate(row_len, note, samples_l, samples_r, 0, ...instrument);
		apply_delay(samples_l, samples_r, 0, row_len, instrument);
		return audio_buffer;
	},

	song = (songData:any) => {

		songData = unundefine(songData);

		let 
			row_len = songData[0/*row_len*/],
			tracks = songData[1/*track*/],
			num_samples = 0;
		for (let track of tracks) {
			let track_samples = track[1/*sequence*/].length * row_len * 32 + 
				instrumentLen(track[0/*instrument*/], row_len);

			if (track_samples > num_samples) {
				num_samples = track_samples;
			}
		}

		let 
			audio_buffer = ctx.createBuffer(2, num_samples, samplerate),
			song_samples_l = audio_buffer.getChannelData(0),
			song_samples_r = audio_buffer.getChannelData(1),
			track_samples_l = new Float32Array(num_samples),
			track_samples_r = new Float32Array(num_samples);

		for (let track of tracks) {
			let 
				instrument = track[0/*instrument*/],
				sequence = track[1/*sequence*/],
				write_pos = 0,
				first = num_samples;

			track_samples_l.fill(0);
			track_samples_r.fill(0);

			for (let pi of sequence) {
				for (let row = 0; row < 32; row++) {
					let note = track[2/*patterns*/][pi-1]?.[row];
					if (note) {
						first = Math.min(first, write_pos);
						generate(row_len, note, track_samples_l, track_samples_r, write_pos, ...instrument);
					}
					write_pos += row_len;
				}
			}

			apply_delay(track_samples_l, track_samples_r, first, row_len, instrument);

			for (let i = first; i < num_samples; i++) {
				song_samples_l[i] += track_samples_l[i];
				song_samples_r[i] += track_samples_r[i];
			}
		}
		return audio_buffer;
	};

	// Generate the lookup tab with 4 oscilators: sin, square, saw, tri
	for (let i = 0; i < tab_size; i++) {
		tab[i               ] = Math.sin(i*6.283184/tab_size);
		tab[i + tab_size    ] = tab[i] < 0 ? -1 : 1;
		tab[i + tab_size * 2] = i / tab_size - 0.5;
		tab[i + tab_size * 3] = i < tab_size/2 ? (i/(tab_size/4)) - 1 : 3 - (i/(tab_size/4));
	}

	return {sound, song};
};

export const song0 = [8481,[[[7,,,,121,1,7,,,,91,3,,100,1212,5513,113,,6,19,3,121,6,21,,1,1,29],[1,2,1,2,1,2,,,1,2,1,2],[[138,145,138,150,138,145,138,150,138,145,138,150,138,145,138,150,136,145,138,148,136,145,138,148,136,145,138,148,136,145,138,148],[135,145,138,147,135,145,138,147,135,145,138,147,135,145,138,147,135,143,138,146,135,143,138,146,135,143,138,146,135,143,138,146]]],[[7,,,,192,1,6,,9,,192,1,25,137,1111,16157,141,1,982,89,6,25,6,77,,1,3,69],[,,1,2,1,2,3,3,3,3,3,3],[[138,138,,138,140,,141,,,,,,,,,,136,136,,136,140,,141],[135,135,,135,140,,141,,,,,,,,,,135,135,,135,140,,141,,140,140],[145,,,,145,143,145,150,,148,,146,,143,,,,145,,,,145,143,145,139,,139,,,142,142]]],[[7,,,1,255,,7,,,1,255,,,100,,3636,254,2,500,254,,27],[1,1,1,1,,,1,1,1,1,1,1],[[135,135,,135,139,,135,135,135,,135,139,,135,135,135,,135,139,,135,135,135,,135,139,,135,135,135,,135]]],[[8,,,1,200,,7,,,,211,3,210,50,200,6800,160,4,11025,130,6,32,5,61,,1,4,60],[1,1,1,1,,,1,1,1,1,1,1],[[,,,,140,,,,,,,,140,,,,,,,,140,,,,,,,,140]]]]];

export const song = [5513,[[[7,,,,255,2,8,,18,,255,2,117,30021,75047,81599,192,2,200,254,8,72,2,142],[1,2,3,2],[[132],[125],[123]]],[[7,,,,192,,7,,,,192,3,,12,12173,87084,172,4,1076,76,,,,,,1,11],[1,2,3,1],[[,142,,,,,,,,142,,,,,,,,142,,,,,,,,142],[139,,,,,,,,139,,,,,,,,,139,,,,,,,,139],[,,,128,,,,,,,,128,,,,,,,,128,,,,,,,,128]]]]];

/**
Moon [7,0,0,0,192,0,7,0,0,0,192,3,0,12,12173,87084,172,4,1076,76,0,0,0,0,0,1,11]


? [7,0,0,0,100,2,7,0,0,0,66,1,0,18,4333,37125,191,3,543,254,0,0,0,0,0,0,13,126,2]
*/