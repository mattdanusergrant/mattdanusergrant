// THUDWORKS, example songs, grouped by genre. Each is fully arranged with
// section(name, { instrument: pattern }) + arrange(...names).
// Click one in the app to load it into the editor and play it.

export const EXAMPLES = [
  {
    group: 'VGM',
    songs: [
      {
        name: 'Overworld',
        code: `
// OVERWORLD, bright NES march in C. Two pulse channels + triangle bass + noise drums.
// pulse = lead, pulse2 = fast arpeggio (how the NES fakes chords), tri = bass.
tempo(144)

section('intro', {
  tri: ["C2 . C3 . C2 . C3 . C2 . C3 . C2 . C3 .", { gain: 0.5 }],
  hat: "..x...x...x...x.",
})
section('main', {
  kick:  "x.......x.......",
  snare: "....x.......x...",
  hat:   "x.x.x.x.x.x.x.x.",
  tri:   [seq("C2 . C3 . C2 . C3 . G1 . G2 . G1 . G2 .",
              "A1 . A2 . A1 . A2 . F1 . F2 . F1 . F2 ."), { gain: 0.5 }],
  pulse2:[seq("C5 E5 G5 E5 C5 E5 G5 E5 C5 E5 G5 E5 C5 E5 G5 E5",
              "A4 C5 E5 C5 A4 C5 E5 C5 F4 A4 C5 A4 F4 A4 C5 A4"), { gain: 0.28 }],
  pulse: [seq("E5 . G5 . E5 . C5 . D5 . E5 . G5 . . .",
              "E5 . D5 . C5 . A4 . C5 . . . . . . ."), { gain: 0.4 }],
})
arrange('intro', 'main', 'main', 'main', 'main')
`,
      },
      {
        name: 'Boss Battle',
        code: `
// BOSS BATTLE, fast, tense Am. Pounding triangle, frantic arp, screaming lead.
tempo(168)

section('build', {
  hat: "xxxxxxxxxxxxxxxx",
  tri: ["A1 . . . A1 . . . A1 . . . A1 . . .", { gain: 0.5 }],
})
section('main', {
  kick:  "x...x...x...x...",
  snare: "....x.......x...",
  hat:   "x.x.x.x.x.x.x.x.",
  tri:   [seq("A1 A1 . A1 A1 . A1 . E1 E1 . E1 E1 . E1 .",
              "F1 F1 . F1 F1 . F1 . G1 G1 . G1 G1 . G1 ."), { gain: 0.5 }],
  pulse2:[seq("A4 C5 E5 C5 A4 C5 E5 C5 A4 C5 E5 C5 A4 C5 E5 C5",
              "F4 A4 C5 A4 F4 A4 C5 A4 G4 B4 D5 B4 G4 B4 D5 B4"), { gain: 0.26 }],
  pulse: [seq("A5 . . G5 . . E5 . F5 . E5 . D5 . C5 .",
              "E5 . . . D5 . C5 . B4 . . . E5 . . ."), { gain: 0.4 }],
})
arrange('build', 'main', 'main', 'main', 'main', 'main')
`,
      },
      {
        name: 'Dungeon',
        code: `
// DUNGEON, slow and eerie in Dm. Sparse pulse over a creeping triangle.
tempo(100)

section('main', {
  hat:   "....x.......x...",
  tri:   ["D2 . . . D2 . . . A1 . . . A1 . . .", { gain: 0.5 }],
  pulse: [seq("D5 . . . F5 . . . E5 . . . . . . .",
              "A4 . . . D5 . . . C5 . . . A4 . . ."), { cutoff: 3500, gain: 0.35 }],
})
section('turn', {
  hat:    "....x.......x...",
  tri:    ["A#1 . . . A#1 . . . G1 . . . A1 . . .", { gain: 0.5 }],
  pulse:  [seq("F5 . . . E5 . . . D5 . . . . . . .",
               "A4 . . . C5 . . . D5 . F5 . E5 . . ."), { cutoff: 3500, gain: 0.35 }],
  pulse2: ["D4+F4+A4 - - - - - - - - - - - - - - -", { gain: 0.16 }],
})
arrange('main', 'main', 'turn', 'main', 'turn')
`,
      },
      {
        name: 'Title',
        code: `
// TITLE, a triumphant fanfare; the reprise lifts up a whole step (transpose +2).
tempo(132)

section('fanfare', {
  snare: "....x.......x...",
  hat:   "x.x.x.x.x.x.x.x.",
  tri:   ["C2 . G2 . C2 . G2 . C2 . G2 . C2 . G2 .", { gain: 0.5 }],
  pulse2:["C4+E4+G4 - - - C4+E4+G4 - - - G3+B3+D4 - - - G3+B3+D4 - - -", { gain: 0.2 }],
  pulse: [seq("C5 . E5 . G5 . C6 . B5 . G5 . E5 . C5 .",
              "D5 . G5 . B5 . D6 . C6 . . . . . . ."), { gain: 0.42 }],
})
section('reprise', {
  snare: "....x.......x...",
  hat:   "x.x.x.x.x.x.x.x.",
  tri:   [transpose("C2 . G2 . C2 . G2 . C2 . G2 . C2 . G2 .", 2), { gain: 0.5 }],
  pulse2:[transpose("C4+E4+G4 - - - C4+E4+G4 - - - G3+B3+D4 - - - G3+B3+D4 - - -", 2), { gain: 0.2 }],
  pulse: [transpose(seq("C5 . E5 . G5 . C6 . B5 . G5 . E5 . C5 .",
                        "D5 . G5 . B5 . D6 . C6 . . . . . . ."), 2), { gain: 0.42 }],
})
arrange('fanfare', 'fanfare', 'reprise', 'reprise')
`,
      },
    ],
  },
  {
    group: 'EDM',
    songs: [
      {
        name: 'Acid House',
        code: `
// ACID HOUSE, 128bpm. '-' holds a note so the 303 slides. Builds to a peak.
tempo(128)

section('intro', { kick: "x...x...x...x...", openhat: "..x...x...x...x." })
section('main', {
  kick:    "x...x...x...x...",
  clap:    "....x.......x...",
  openhat: "..x...x...x...x.",
  synth:   [seq("A1 . A2 - C2 . A1 . E2 - A1 . C2 . D2 .",
                "A1 . A2 - C2 . E2 . A2 - G2 . E2 . D2 ."),
            { wave: 'sawtooth', cutoff: 1200, detune: 6, gain: 0.5 }],
})
section('peak', {
  kick:    "x...x...x...x...",
  clap:    "....x.......x...",
  openhat: "x.x.x.x.x.x.x.x.",
  synth:   [seq("A2 . A3 - C3 . A2 . E3 - A2 . C3 . D3 .",
                "A2 . C3 . E3 . D3 . C3 . A2 . G2 . E2 ."),
            { wave: 'sawtooth', cutoff: 2200, detune: 8, gain: 0.45 }],
})

arrange('intro', 'main', 'main', 'peak', 'main', 'peak', 'peak')
`,
      },
      {
        name: 'Deep House',
        code: `
// DEEP HOUSE, 122bpm chord stabs ('+' = chord). Goes to a deeper key, then back.
tempo(122)

section('intro', { kick: "x...x...x...x...", openhat: "..x...x...x...x." })
section('main', {
  kick:    "x...x...x...x...",
  clap:    "....x.......x...",
  openhat: "..x...x...x...x.",
  bass:    "F1 . . . F1 . . . A#1 . . . C2 . . .",
  pad:     [". . F3+A3+C4 . . . . . D#3+G3+A#3 . . . . . . .",
            { wave: 'sawtooth', cutoff: 1700, detune: 10, gain: 0.3 }],
})
section('deep', {
  kick:    "x...x...x...x...",
  clap:    "....x.......x...",
  openhat: "x.x.x.x.x.x.x.x.",
  bass:    "D1 . . . D1 . . . G1 . . . A1 . . .",
  pad:     [". . D3+F3+A3 . . . . . G3+A#3+D4 . . . . . . .",
            { wave: 'sawtooth', cutoff: 2000, detune: 10, gain: 0.3 }],
})

arrange('intro', 'main', 'main', 'deep', 'main', 'deep', 'deep', 'main')
`,
      },
      {
        name: 'Euclid Techno',
        code: `
// EUCLID TECHNO, euclid(hits, steps) spreads hits evenly. Lift section adds a lead.
tempo(130)

section('intro', { kick: "x...x...x...x...", openhat: euclid(7, 16) })
section('main', {
  kick:    "x...x...x...x...",
  openhat: euclid(7, 16),
  clap:    euclid(2, 16, 4),
  bass:    ["A1 . . . A1 . . . C2 . . . E2 . . .", { wave: 'sawtooth', cutoff: 900, detune: 4 }],
})
section('lift', {
  kick:    "x...x...x...x...",
  openhat: euclid(9, 16),
  clap:    euclid(4, 16, 2),
  bass:    ["A1 . . . C2 . . . E2 . . . G2 . . .", { wave: 'sawtooth', cutoff: 1400, detune: 4 }],
  lead:    [seq("A3 . . E4 . . C4 . . E4 . . D4 . . .",
                "E4 . . C4 . . A3 . . B3 . . D4 . . ."), { gain: 0.3 }],
})

arrange('intro', 'main', 'main', 'lift', 'main', 'lift', 'lift')
`,
      },
      {
        name: 'Arranged',
        code: `
// ARRANGED, the full toolkit: section/arrange, per-part swing, chords, and
// transpose() to lift the chorus up a fourth.
tempo(124)

section('intro', { kick: "x...x...x...x...", openhat: "..x...x...x...x." })
section('build', {
  kick:    "x...x...x...x...",
  clap:    "....x.......x...",
  openhat: ["..x...x...x...x.", { swing: 33 }],
  bass:    "A1 . . . A1 . . . C2 . . . E2 . . .",
})
section('drop', {
  kick:    "x.x.x.x.x.x.x.x.",
  clap:    "....x.......x...",
  openhat: ["..x...x...x...x.", { swing: 33 }],
  bass:    "A1 . . . A1 . . . C2 . . . E2 . . .",
  pad:     ["A3+C4+E4 - - - - - - - F3+A3+C4 - - - - - - -", { gain: 0.3 }],
})
section('lift', {       // chorus, transposed up a perfect fourth (+5 semitones)
  kick:    "x.x.x.x.x.x.x.x.",
  clap:    "....x.......x...",
  openhat: ["..x...x...x...x.", { swing: 33 }],
  bass:    transpose("A1 . . . A1 . . . C2 . . . E2 . . .", 5),
  pad:     [transpose("A3+C4+E4 - - - - - - - F3+A3+C4 - - - - - - -", 5), { gain: 0.3 }],
})

arrange('intro', 'build', 'drop', 'drop', 'lift', 'drop', 'lift')
`,
      },
    ],
  },
  {
    group: 'Hip-Hop',
    songs: [
      {
        name: 'Boom Bap',
        code: `
// BOOM BAP, dusty 90bpm head-nod, with a 2-bar riff section
tempo(90)
swing(14)

section('intro', {
  kick: "x.......x.......",
  hat:  "x.x.x.x.x.x.x.x.",
})
section('groove', {
  kick:    "x.....x...x.....",
  snare:   "....x.......x...",
  hat:     "x.x.x.x.x.x.x.x.",
  openhat: "..........x.....",
  bass:    "C2 . . . . . . . G1 . . . . . . .",
})
section('riff', {
  kick:  "x.....x...x.....",
  snare: "....x.......x...",
  hat:   "x.x.x.x.x.x.x.x.",
  bass:  "C2 . . . A1 . . . F1 . . . G1 . . .",
  pluck: [seq("E4 . G4 . A4 . G4 E4 D4 . . . . . . .",
              "E4 . G4 . C5 . B4 . A4 . . . . . . ."), { gain: 0.4 }],
})
section('outro', { kick: "x.......x.......", bass: "C2 . . . . . . . . . . . . . . ." })

arrange('intro', 'groove', 'riff', 'groove', 'riff', 'riff', 'outro')
`,
      },
      {
        name: 'Trap',
        code: `
// TRAP, 140, rolling hats, sliding 808, chord pad. A roll section every 4th bar.
tempo(140)

section('intro', {
  hat:  "xxxxx.xxxxx.xx.x",
  bass: "C1 . . . . . . . C1 . D#1 . F1 . . .",
})
section('main', {
  kick:    "x.....x.....x...",
  snare:   "........x.......",
  hat:     "xxxxx.xxxxx.xx.x",
  openhat: "..........x.....",
  bass:    "C1 . . . . . . . C1 . D#1 . F1 . . .",
  pad:     ["C3+D#3+G3 - - - - - - - G#2+C3+D#3 - - - A#2+D3+F3 - - -", { gain: 0.26 }],
})
section('roll', {
  kick:  "x.....x.....x.x.",
  snare: "........x.....x.",
  hat:   "xxxxxxxxxxxxxxxx",
  bass:  "C1 . . . F1 . . . G#1 . . . A#1 . . .",
  pad:   ["C3+D#3+G3 - - - - - - - - - - - - - - -", { gain: 0.26 }],
})

arrange('intro', 'main', 'main', 'roll', 'main', 'main', 'roll', 'main')
`,
      },
      {
        name: 'Lo-Fi',
        code: `
// LO-FI, 78bpm, sleepy and swung, with a chord turnaround
tempo(78)
swing(18)

section('intro', {
  hat:   "..x...x...x...x.",
  pluck: ["E4 . G4 B4 . A4 . G4 E4 . D4 . . . . .", { wave: 'triangle', cutoff: 2200, gain: 0.4 }],
})
section('verse', {
  kick:  "x.......x.....x.",
  snare: "....x.......x...",
  hat:   "..x...x...x...x.",
  bass:  "E2 . . . . . . . C2 . . . D2 . . .",
  pluck: [seq("E4 . G4 B4 . A4 . G4 E4 . D4 . . . . .",
              "C5 . B4 . A4 . G4 . E4 . . . D4 . . ."),
          { wave: 'triangle', cutoff: 2200, gain: 0.4 }],
})
section('turn', {
  kick:  "x.......x.......",
  snare: "....x.......x...",
  hat:   "..x...x...x...x.",
  bass:  "A1 . . . . . . . G1 . . . C2 . . .",
  pad:   ["E3+G3+B3 - - - - - - - A3+C4+E4 - - - - - - -", { gain: 0.25 }],
})

arrange('intro', 'verse', 'verse', 'turn', 'verse', 'turn')
`,
      },
    ],
  },
];
