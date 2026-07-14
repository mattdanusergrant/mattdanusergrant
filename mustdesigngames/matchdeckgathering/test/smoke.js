#!/usr/bin/env node
/* Dependency-free headless smoke test for the Card Game Workshop.
   Loads the inline <script> behind a minimal DOM stub, then:
     - asserts the engine (deck building + poker evaluator) is correct
     - mounts every game once to confirm mount() doesn't throw
   Exit 0 = pass, 1 = fail. Mirrors the Ronin Survivor smoke-test approach. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let fails = 0;
function test(name, fn){ try{ fn(); console.log('  ok  ', name); }catch(e){ fails++; console.log('  FAIL', name, '—', e.message); } }
function assert(c, m){ if(!c) throw new Error(m||'assertion failed'); }

// ---- minimal DOM stub -------------------------------------------------
function makeNode(tag){
  const node = {
    tag, _children:[], style:{}, dataset:{}, classList:new Set(),
    _cls:'', innerHTML:'', textContent:'', title:'', value:'', disabled:false, onclick:null, onchange:null,
  };
  node.classList = { _s:new Set(),
    add(...c){ c.forEach(x=>this._s.add(x)); }, remove(...c){ c.forEach(x=>this._s.delete(x)); },
    contains(c){ return this._s.has(c); }, toggle(c){ this._s.has(c)?this._s.delete(c):this._s.add(c); } };
  Object.defineProperty(node,'className',{ get(){ return node._cls; }, set(v){ node._cls=v; } });
  node.appendChild = ch => { node._children.push(ch); return ch; };
  node.append = (...ch)=> ch.forEach(c=>node._children.push(c));
  node.removeChild = ch => { node._children = node._children.filter(c=>c!==ch); };
  node.replaceWith = ()=>{};
  node.remove = ()=>{};
  node.addEventListener = (ev,cb)=>{ (node._ev||(node._ev={}))[ev]=cb; };
  node.setAttribute = ()=>{}; node.getAttribute = ()=>null;
  node.querySelector = () => makeNode('stub');       // permissive: any lookup returns a fresh node
  node.querySelectorAll = () => [];
  node.focus = ()=>{};
  return node;
}
const elements = {};
const document = {
  createElement: makeNode,
  getElementById: id => elements[id] || (elements[id]=makeNode('#'+id)),
  head: makeNode('head'), body: makeNode('body'),
  addEventListener: ()=>{},
};
const window = {};
const sandbox = { window, document, console, setTimeout:()=>0, clearTimeout:()=>{}, clearInterval:()=>{}, setInterval:()=>0, Math, Date };
sandbox.globalThis = sandbox;

// ---- extract and run the inline <script> ------------------------------
const html = fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
// pick the engine script (the one that defines the dev hatch), not the tiny head theme-init script
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
const mainScript = scripts.find(s=>s.includes('window.__cw'));
assert(mainScript, 'could not find engine <script> block');
test('script loads without throwing', ()=>{
  vm.createContext(sandbox);
  vm.runInContext(mainScript, sandbox, { filename:'matchdeckgathering.js' });
  assert(window.__cw, 'window.__cw dev hatch missing');
});
const cw = window.__cw || {};

// ---- engine: deck building -------------------------------------------
test('standard deck = 52 unique cards', ()=>{
  const d = cw.makeDeck();
  assert(d.length===52, 'len '+d.length);
  assert(new Set(d.map(c=>c.id)).size===52, 'not unique');
});
test('A–J deck = 44, royals+jokers = 10', ()=>{
  const aj = cw.makeDeck({ranks:['A','2','3','4','5','6','7','8','9','10','J']});
  assert(aj.length===44, 'A-J len '+aj.length);
  const ro = cw.makeDeck({ranks:['K','Q'],jokers:2});
  assert(ro.length===10, 'royals len '+ro.length);
  assert(ro.filter(c=>c.joker).length===2, 'jokers');
});

// ---- engine: poker evaluator -----------------------------------------
const C = (r,s)=>cw.mkCard(r,s);
function nameOf(cards){ return cw.best7(cards).name; }
test('royal flush beats four of a kind', ()=>{
  const royal=[C('A','S'),C('K','S'),C('Q','S'),C('J','S'),C('10','S')];
  assert(cw.score5(royal)[0]===8, 'royal cat '+cw.score5(royal)[0]);
  const quads=[C('9','S'),C('9','H'),C('9','D'),C('9','C'),C('2','S')];
  assert(cw.cmpScore(cw.score5(royal),cw.score5(quads))>0, 'royal !> quads');
});
test('category names from best7 (5-of-7)', ()=>{
  // full house from 7
  assert(nameOf([C('K','S'),C('K','H'),C('K','D'),C('2','S'),C('2','H'),C('7','C'),C('9','D')])==='Full House');
  // flush
  assert(nameOf([C('2','H'),C('5','H'),C('9','H'),C('J','H'),C('K','H'),C('3','S'),C('4','C')])==='Flush');
  // wheel straight (A-2-3-4-5)
  assert(nameOf([C('A','S'),C('2','H'),C('3','D'),C('4','C'),C('5','S'),C('K','H'),C('Q','D')])==='Straight');
  // pair
  assert(nameOf([C('A','S'),C('A','H'),C('5','D'),C('9','C'),C('J','S'),C('2','H'),C('7','D')])==='Pair');
});
test('higher pair wins, kickers break ties', ()=>{
  const aces=cw.score5([C('A','S'),C('A','H'),C('5','D'),C('9','C'),C('J','S')]);
  const kings=cw.score5([C('K','S'),C('K','H'),C('5','D'),C('9','C'),C('J','S')]);
  assert(cw.cmpScore(aces,kings)>0, 'AA !> KK');
  const hiKick=cw.score5([C('A','S'),C('A','H'),C('K','D'),C('9','C'),C('2','S')]);
  const loKick=cw.score5([C('A','S'),C('A','H'),C('Q','D'),C('9','C'),C('2','S')]);
  assert(cw.cmpScore(hiKick,loKick)>0, 'kicker fail');
});

// ---- Kingmaker duel: the King ▸ Queen ▸ Wyld ▸ King cycle ----------------
test('fae duel cycle resolves correctly', ()=>{
  const fb=cw.faeBeats, K=s=>C('K',s), Q=s=>C('Q',s), W=()=>cw.mkJoker(1), W2=()=>cw.mkJoker(2);
  assert(fb(K('S'),Q('S'))>0, 'King should fell Queen');
  assert(fb(Q('S'),W())>0, 'Queen should bind the Wyld');
  assert(fb(W(),K('S'))>0, 'Wyld should topple King');
  // same rank → higher suit S>H>D>C
  assert(fb(K('S'),K('H'))>0 && fb(K('D'),K('C'))>0 && fb(Q('C'),Q('S'))<0, 'suit tiebreak');
  // two Wylds clash → tie
  assert(fb(W(),W2())===0, 'Wyld vs Wyld should tie');
  // antisymmetry across the cycle
  assert(fb(Q('S'),K('S'))<0 && fb(W(),Q('S'))<0 && fb(K('S'),W())<0, 'cycle antisymmetry');
});

// ---- Game Design Deck: 60 cards, even partitions, 60 unique Mau rules ----
test('GD deck = 60 cards with unique ids', ()=>{
  const d=cw.buildGDDeck();
  assert(d.length===60, 'len '+d.length);
  assert(new Set(d.map(c=>c.id)).size===60, 'ids not unique');
});
test('GD deck systems partition evenly', ()=>{
  const d=cw.buildGDDeck(); const cnt=(k,v)=>d.filter(c=>c[k]===v).length;
  for(let v=1;v<=6;v++) assert(cnt('d6',v)===10, 'd6 '+v+' ×'+cnt('d6',v));
  for(let v=1;v<=20;v++) assert(cnt('d20',v)===3, 'd20 '+v+' ×'+cnt('d20',v));
  for(let v=0;v<=9;v++) assert(cnt('d10',v)===6, 'd10 '+v+' ×'+cnt('d10',v));
  for(let v=1;v<=12;v++) assert(cnt('bearing',v)===5, 'bearing '+v+' ×'+cnt('bearing',v));
  assert(cw.GD_ELEMENTS.length===3, '3 elements');
  cw.GD_ELEMENTS.forEach(e=>assert(cnt('element',e.id)===20, 'element '+e.id+' ×'+cnt('element',e.id)));
  assert(cw.GD_PILLARS.length===5, '5 pillars');
  cw.GD_PILLARS.forEach(p=>assert(cnt('pillar',p.id)===12, 'pillar '+p.id+' ×'+cnt('pillar',p.id)));
});
test('GD deck: 60 unique Mau rules, 40 lenses on the pips', ()=>{
  const d=cw.buildGDDeck();
  assert(cw.GD_MAU.length===60 && new Set(cw.GD_MAU).size===60, 'mau not 60-unique');
  assert(d.every(c=>c.mau), 'a card is missing its Mau rule');
  assert(d.filter(c=>c.lens).length===40, 'lens count '+d.filter(c=>c.lens).length);
  assert(d.every(c=>!c.hero), 'no card should carry a shipped credential');
});
test('element triangle (3): a clean cycle, each beats exactly one', ()=>{
  const b=cw.gdBeats, E=cw.GD_ELEMENTS.map(e=>e.id);
  assert(E.length===3, '3 elements');
  assert(b('fire','earth')&&b('earth','water')&&b('water','fire'), 'cycle');
  E.forEach(a=>{ assert(E.filter(x=>b(a,x)).length===1, a+' beats exactly 1');
                 assert(E.filter(x=>b(x,a)).length===1, a+' loses to exactly 1');
                 assert(!b(a,a), a+' cannot beat itself'); });
});
test('design pillars (5): ×12 each, one lesson per card, 60 unique + on-pillar', ()=>{
  const d=cw.buildGDDeck();
  assert(cw.GD_PILLARS.length===5, '5 pillars');
  cw.GD_PILLARS.forEach((p,i)=>{ assert(p.letter==='ABCDE'[i], 'pillar '+i+' letter'); assert(p.n===i+1, 'pillar '+i+' number'); });
  cw.GD_PILLARS.forEach(p=>assert(cw.GD_PILLAR_LESSONS[p.id].length===12, p.id+' needs 12 lessons'));
  assert(d.every(c=>c.lesson), 'a card is missing its lesson');
  assert(new Set(d.map(c=>c.lesson)).size===60, 'lessons not 60-unique');
  d.forEach(c=>assert(cw.GD_PILLAR_LESSONS[c.pillar].includes(c.lesson), c.id+' lesson not from its pillar '+c.pillar));
});
test('30 twin-pairs (each key exactly 2 cards) + unique 1-60 seconds', ()=>{
  const d=cw.buildGDDeck();
  const keys={}; d.forEach(c=>keys[c.pair]=(keys[c.pair]||0)+1);
  assert(Object.keys(keys).length===30, 'pair keys '+Object.keys(keys).length);
  assert(Object.values(keys).every(n=>n===2), 'a pair is not exactly 2');
  const secs=d.map(c=>c.sec).sort((a,b)=>a-b);
  assert(new Set(secs).size===60 && secs[0]===1 && secs[59]===60, 'seconds not a 1-60 permutation');
});

test('card back renders + 5 orientation systems', ()=>{
  const b=cw.gdBack(1); assert(b && typeof b==='object', 'gdBack returned nothing');
  assert(Array.isArray(cw.GD_ORIENT_USES) && cw.GD_ORIENT_USES.length===5, 'orientation uses count');
});
test('Vault Run: first flip never busts; big loot busts on low d20', ()=>{
  // loot 0 → nothing can bust (d20 ≥ 1 > 0)
  cw.buildGDDeck().forEach(c=>assert(!cw.vaultFlip(c,0).bust, 'flip busted at loot 0'));
  // a non-safe low-d20 card busts against a big pile
  const risky={ bearing:6, d20:5, d6:3 };   // bearing 6 = not in North band
  assert(cw.vaultFlip(risky,10).bust, 'risky flip should bust at loot 10');
  const safe={ bearing:12, d20:1, d6:3 };    // North-band = clear skies, never busts
  assert(!cw.vaultFlip(safe,50).bust, 'safe bearing should never bust');
});

// ---- games: mount every game without throwing -------------------------
test('every game has required fields', ()=>{
  assert(Array.isArray(cw.GAMES) && cw.GAMES.length>=4, 'GAMES count');
  cw.GAMES.forEach(g=>{ ['id','title','players','tag','blurb'].forEach(k=>assert(g[k]!=null,g.id+' missing '+k)); assert(typeof g.mount==='function', g.id+' mount'); });
});
cw.GAMES && cw.GAMES.forEach(g=>{
  test('mount(): '+g.id+' does not throw', ()=>{ const root=makeNode('root'); g.mount(root,{}); });
});

// ---- result -----------------------------------------------------------
console.log(fails ? `\n${fails} test(s) FAILED` : '\nAll smoke tests passed.');
process.exit(fails?1:0);
