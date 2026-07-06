/* Split System — charge engine (pure, dual-mode: browser <script src> + node require)
   Real R-410A / R-22 PT data, real superheat/subcooling math. No arcade abstraction.

var HVAC = (function () {
  // Pressure–Temperature tables: saturation temp (°F) -> gauge pressure (psig).
  // Field-reference values; near-azeotropic R-410A treated single-curve.
  var PT = {
    'R-410A': [
      [30,98],[35,107],[40,118],[45,130],[50,142],[55,156],[60,170],[65,185],
      [70,201],[75,218],[80,235],[85,254],[90,274],[95,295],[100,317],[105,340],
      [110,365],[115,391],[120,418],[125,446],[130,475]
    ],
    'R-22': [
      [30,54.9],[35,61.5],[40,68.5],[45,76.0],[50,84.0],[55,92.6],[60,101.6],
      [65,111.2],[70,121.4],[75,132.2],[80,143.6],[85,155.7],[90,168.4],[95,181.8],
      [100,195.9],[105,210.8],[110,226.4],[115,242.7],[120,259.9],[125,278.0],[130,296.8]
    ]
  };

  function lerp(x, x0, x1, y0, y1) { return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }

  // saturation temp (°F) from gauge pressure (psig)
  function satTemp(ref, psig) {
    var t = PT[ref];
    if (psig <= t[0][1]) return t[0][0];
    if (psig >= t[t.length-1][1]) return t[t.length-1][0];
    for (var i = 0; i < t.length-1; i++) {
      if (psig >= t[i][1] && psig <= t[i+1][1])
        return lerp(psig, t[i][1], t[i+1][1], t[i][0], t[i+1][0]);
    }
    return t[t.length-1][0];
  }

  // gauge pressure (psig) from saturation temp (°F)
  function satPress(ref, temp) {
    var t = PT[ref];
    if (temp <= t[0][0]) return t[0][1];
    if (temp >= t[t.length-1][0]) return t[t.length-1][1];
    for (var i = 0; i < t.length-1; i++) {
      if (temp >= t[i][0] && temp <= t[i+1][0])
        return lerp(temp, t[i][0], t[i+1][0], t[i][1], t[i+1][1]);
    }
    return t[t.length-1][1];
  }

  // Fixed-orifice target superheat from indoor wet-bulb + outdoor dry-bulb (field formula)
  function targetSuperheat(indoorWB, outdoorDB) {
    var sh = (3 * indoorWB - 80 - outdoorDB) / 2;
    return Math.max(5, Math.min(30, sh));
  }

  // Physical readings as a function of charge (% of correct), conditions, and any mechanical fault.
  // Models the directions every tech knows: undercharge -> high SH / low suction / low subcool;
  // overcharge -> low SH / high head / high subcool. TXV holds SH, charge shows in subcooling.
  // Faults reshape the pattern so "add refrigerant" is the WRONG move (the v0.2 diagnosis layer).
  function readings(j) {
    var c = j.charge, DB = j.outdoorDB, r = j.ref;
    var fault = j.fault || 'none', sev = (j.severity == null ? 1 : j.severity);
    var evapTemp, condTemp, SH, subcool;
    condTemp = DB + 20 + (c - 100) * 0.25;            // ~20°F over ambient at correct charge
    if (j.metering === 'piston') {
      var tSH = targetSuperheat(j.indoorWB, DB);
      SH      = Math.max(0, tSH + (100 - c) * 0.6);    // undercharge raises superheat
      evapTemp = 40 + (c - 100) * 0.20;
      subcool  = Math.max(0, 6 + (c - 100) * 0.30);
    } else { // TXV / EEV — valve holds superheat, charge reads in subcooling
      SH       = 10 + Math.max(0, (85 - c)) * 0.8;     // only climbs if starved
      evapTemp = 40 + (c - 100) * 0.12;
      subcool  = Math.max(0, j.nameplateSubcool + (c - 100) * 0.35);
    }
    if (fault === 'low_airflow') {                     // starved coil: low suction, LOW superheat
      evapTemp -= 8 * sev;
      SH = Math.max(0, SH - (j.metering === 'piston' ? 7 : 1.5) * sev);
      subcool += 1.5 * sev;
      condTemp -= 2 * sev;                             // head a touch low (less load)
    } else if (fault === 'restriction') {              // restriction: HIGH superheat AND HIGH subcool
      evapTemp -= 9 * sev;
      SH += 10 * sev;
      subcool += 9 * sev;                              // refrigerant stacks ahead of the restriction
      condTemp += 1 * sev;
    } else if (fault === 'noncondensable') {           // air in system: head too high for ambient
      condTemp += 12 * sev;
      subcool += 6 * sev;
    } else if (fault === 'dirty_condenser') {          // poor heat rejection: high head + big split, subcool ~normal
      condTemp += 16 * sev;                            // condenser split (condTemp − ambient) blows out; subcool stays normal
    } else if (fault === 'txv_overfeed') {             // valve floods the coil: very low superheat, subcool ~normal
      SH = Math.max(0, SH - 8 * sev);
      evapTemp += 2 * sev;
    }
    subcool = Math.max(0, subcool);
    return {
      evapTemp: evapTemp,
      condTemp: condTemp,
      superheat: SH,
      subcool: subcool,
      lowP:  satPress(r, evapTemp),
      highP: satPress(r, condTemp),
      suctionLineTemp: evapTemp + SH,
      liquidLineTemp:  condTemp - subcool
    };
  }

  // The controlling value, its target and tolerance for this job.
  function spec(j) {
    if (j.metering === 'piston')
      return { name: 'Superheat', target: targetSuperheat(j.indoorWB, j.outdoorDB), tol: 3 };
    return { name: 'Subcooling', target: j.nameplateSubcool, tol: 3 };
  }

  // piston: add charge -> SH down, so SH > target => ADD. txv: SC < target => ADD.
  function needAdd(j, actual, target) {
    return (j.metering === 'piston') ? (actual > target) : (actual < target);
  }

  // Fault metadata + the diagnosis options the player chooses from.
  var FAULTS = {
    none:            { action: 'charge',      label: 'Charge / tune only' },
    low_airflow:     { action: 'airflow',     label: 'Low evaporator airflow' },
    restriction:     { action: 'restriction', label: 'Metering / liquid-line restriction' },
    noncondensable:  { action: 'purge',       label: 'Non-condensables (air) in system' },
    dirty_condenser: { action: 'condenser',   label: 'Dirty condenser / low outdoor airflow' },
    txv_overfeed:    { action: 'txv',         label: 'TXV overfeeding' }
  };
  var ACTIONS = [
    { key: 'add',         label: 'Undercharged — add refrigerant' },
    { key: 'recover',     label: 'Overcharged — recover refrigerant' },
    { key: 'airflow',     label: 'Low evaporator airflow — service the air side' },
    { key: 'restriction', label: 'Restriction — replace metering / drier' },
    { key: 'purge',       label: 'Non-condensables — recover, evacuate, recharge' },
    { key: 'condenser',   label: 'Dirty condenser — clean it / restore outdoor airflow' },
    { key: 'txv',         label: 'TXV overfeeding — adjust / replace the valve' },
    { key: 'inspec',      label: 'In spec — commission it' }
  ];

  function evaluate(j) {
    var rd = readings(j), s = spec(j);
    var actual = (j.metering === 'piston') ? rd.superheat : rd.subcool;
    var err = actual - s.target;
    var fault = j.fault || 'none';
    var add = needAdd(j, actual, s.target);
    var inSpec = (fault === 'none') && Math.abs(err) <= s.tol;
    var correctAction = (fault !== 'none')
      ? FAULTS[fault].action                                  // mechanical fix, not charge
      : (inSpec ? 'inspec' : (add ? 'add' : 'recover'));
    return {
      name: s.name, target: s.target, tol: s.tol, actual: actual,
      err: err, inSpec: inSpec, needAdd: add,
      fault: fault, correctAction: correctAction
    };
  }

  function score(actual, target, taps) {
    var acc = Math.max(0, Math.round(100 - Math.abs(actual - target) * 9));
    var eff = Math.max(0, 100 - Math.max(0, taps - 6) * 5);
    return Math.round(acc * 0.8 + eff * 0.2);
  }

  // includeFaults=false (default) -> charge-only jobs (v0.1 behaviour). true -> may inject a
  // mechanical fault where the correct move is a diagnosis + fix, not adding refrigerant.
  function newJob(seed, includeFaults) {
    // tiny deterministic PRNG so a job can be replayed / shared
    var s = (seed == null ? (Date.now() ^ (Math.random()*1e9)) : seed) >>> 0;
    function rnd(){ s = (s*1664525 + 1013904223) >>> 0; return s / 4294967296; }
    var ref = rnd() < 0.75 ? 'R-410A' : 'R-22';
    var metering = rnd() < 0.5 ? 'piston' : 'txv';
    var outdoorDB = Math.round(82 + rnd()*23);          // 82–105 °F
    var indoorWB  = Math.round(58 + rnd()*14);          // 58–72 °F
    var nameplateSubcool = [8,9,10,11,12][Math.floor(rnd()*5)];
    var fault = 'none', severity = 1, charge;
    if (includeFaults && rnd() < 0.55) {                // mechanical-fault job: charge ~correct
      var pool = ['low_airflow','restriction','noncondensable','dirty_condenser'];
      if (metering === 'txv') pool.push('txv_overfeed'); // overfeed is a TXV-only fault
      fault = pool[Math.floor(rnd()*pool.length)];
      severity = 0.7 + rnd()*0.3;
      charge = Math.round(97 + rnd()*6);                // ~correct so once fixed it commissions
    } else {                                            // charge job: start meaningfully off
      charge = rnd() < 0.7 ? Math.round(76 + rnd()*14) : Math.round(106 + rnd()*12);
    }
    return { ref:ref, metering:metering, outdoorDB:outdoorDB, indoorWB:indoorWB,
             nameplateSubcool:nameplateSubcool, charge:charge,
             fault:fault, severity:severity, seed:s };
  }

  return { PT:PT, satTemp:satTemp, satPress:satPress, targetSuperheat:targetSuperheat,
           readings:readings, spec:spec, evaluate:evaluate, score:score, newJob:newJob,
           FAULTS:FAULTS, ACTIONS:ACTIONS };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = HVAC;
if (typeof window !== 'undefined') window.HVAC = HVAC;
