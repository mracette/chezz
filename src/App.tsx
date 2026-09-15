import { useEffect, useRef, useState } from "react";
import { PieceArt } from "./components/PieceArt";
import { COST, ENCOUNTERS, HP, at, budget, campReason, cleanupStrike, coord, declineCleanup, held, leaveCamp, legal, newRun, passable, plan, readRun, resolveTurn, route, same, unplan } from "./game/exile";
import type { Mode, Order, Pos, Resolution, Run, Unit } from "./game/exile";

const SAVE = "chezz.exile.v1";
function saved() { try { return readRun(localStorage.getItem(SAVE)); } catch { return null; } }
function exportRun(run: Run, feedback: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ prototype: "Escape from Exile", run, feedback }, null, 2)], { type: "application/json" }));
  const a = document.createElement("a"); a.href = url; a.download = `chezz-exile-${run.mode}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function description(run: Run, o: Order) {
  const u = run.units.find(u => u.id === o.unitId)!;
  return `${u.kind} ${o.defend ? "defends" : held(run, o) ? "watches" : "→"} ${coord(run, o.to)}`;
}
const modeName = (mode: Mode) => mode === "retaliation" ? "Always trade" : "Free hits";

function PlanningBoard({ run, selected, onSquare, playback, step }: { run: Run; selected: string | null; onSquare: (p: Pos) => void; playback: Resolution | null; step: number }) {
  const e = ENCOUNTERS[run.encounter], u = run.units.find(u => u.id === selected);
  const legalSquares = u && !playback ? legal(run, u).filter(p => run.phase !== "cleanup" || run.cleanupTargets.some(id => same(p, run.units.find(v => v.id === id)!))) : [];
  const shownBeat = playback && step >= 2 ? playback.beats[Math.min(step - 2, playback.beats.length - 1)] : null;
  const units = playback ? playback.before : run.units;
  const orders = playback ? playback.orders : run.planned;
  const arrows = orders.filter(o => !o.defend);
  const moving = !!playback && step >= 1;
  const finalFrame = !!playback && step === playback.beats.length + 1;
  const visualPos = (piece: Unit): Pos => {
    if (!moving || !playback) return piece;
    const actual = playback.run.units.find(v => v.id === piece.id);
    if (finalFrame && actual) return actual;
    const o = playback.orders.find(o => o.unitId === piece.id);
    if (!o || o.defend || held(run, o)) return piece;
    const initialTarget = at(run, o.to);
    const targetSurvives = initialTarget && playback.run.units.some(v => v.id === initialTarget.id);
    const targetMoves = initialTarget && playback.orders.some(other => other.unitId === initialTarget.id && !other.defend && !held(run, other));
    if (targetSurvives && !targetMoves) {
      const path = route(run, o);
      return path.length > 2 ? path[path.length - 2] : { x: piece.x + (o.to.x - piece.x) * .45, y: piece.y + (o.to.y - piece.y) * .45 };
    }
    const contested = playback.orders.some(other => other.unitId !== piece.id && same(other.to, o.to));
    return { x: o.to.x + (contested ? (piece.side === "white" ? -.12 : .12) : 0), y: o.to.y };
  };
  return <div className="board-camera">
    <div className="board-plane" style={{ aspectRatio: `${e.width}/${e.height}` }}>
      <div className="exile-grid" style={{ gridTemplateColumns: `repeat(${e.width}, 1fr)` }}>
        {Array.from({ length: e.width * e.height }, (_, i) => {
          const p = { x: i % e.width, y: Math.floor(i / e.width) }, piece = at(run, p);
          const available = legalSquares.some(q => same(p, q));
          const planned = run.planned.find(o => same(o.to, p));
          const focus = shownBeat?.focus.some(q => same(p, q));
          return <button key={i} disabled={!!playback || !["planning", "cleanup"].includes(run.phase) || !passable(run, p)}
            className={`exile-cell ${(p.x + p.y) % 2 ? "grass" : "sand"} ${!passable(run, p) ? "wall" : ""} ${available ? "available" : ""} ${planned ? "reserved" : ""} ${focus ? "impact-square" : ""}`}
            aria-label={`${coord(run, p)} ${piece ? `${piece.side} ${piece.kind}, ${piece.hp} HP` : passable(run, p) ? "empty" : "obstacle"}`}
            onClick={() => onSquare(p)}><span className="tile-coord">{coord(run, p)}</span>{available && <span className={`target-dot ${piece?.side === "black" ? "attack-dot" : ""}`} />}{planned?.defend && <span className="defend-badge">◆</span>}</button>;
        })}
      </div>
      <svg className="plan-arrows" viewBox={`0 0 ${e.width * 100} ${e.height * 100}`} aria-hidden="true">
        <defs><marker id="friendly-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="#315e55" /></marker><marker id="enemy-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="#a3453a" /></marker></defs>
        {arrows.map(o => {
          const piece = units.find(v => v.id === o.unitId)!, path = route(run, o);
          return <polyline key={o.unitId} points={path.map(p => `${p.x * 100 + 50},${p.y * 100 + 50}`).join(" ")} fill="none" stroke={piece.side === "white" ? "#315e55" : "#a3453a"} strokeWidth="5" strokeDasharray={held(run, o) ? "8 7" : undefined} markerEnd={`url(#${piece.side === "white" ? "friendly" : "enemy"}-arrow)`} />;
        })}
      </svg>
      <div className="piece-layer" aria-hidden="true">{units.map(piece => {
        const pos = visualPos(piece), live = shownBeat ? shownBeat.units.find(v => v.id === piece.id) : piece;
        const dead = !!shownBeat && !live;
        const damage = shownBeat?.damage.find(d => d.id === piece.id);
        const ordered = orders.find(o => o.unitId === piece.id);
        return <div key={piece.id} className={`exile-piece ${piece.side} ${selected === piece.id ? "selected" : ""} ${dead ? "fallen" : ""} ${damage ? "hit" : ""} ${ordered?.defend ? "guarded" : ""}`}
          style={{ left: `${(pos.x + .5) / e.width * 100}%`, top: `${(pos.y + .5) / e.height * 100}%`, width: `${83 / e.width}%`, zIndex: Math.round(pos.y * 10 + 30) }}>
          <PieceArt kind={piece.kind} side={piece.side} /><span className="piece-health">{live?.hp ?? 0}<small> / {HP[piece.kind]}</small></span>{damage && <span className="damage-pop" key={`${step}-${piece.id}`}>−{damage.amount}</span>}
          {ordered?.defend && <span className="guard-ring">◆</span>}
        </div>;
      })}</div>
    </div>
  </div>;
}

export default function App() {
  const [run, setRun] = useState<Run>(() => saved() ?? newRun());
  const [intro, setIntro] = useState(() => !saved());
  const [mode, setMode] = useState<Mode>(run.mode);
  const [selected, setSelected] = useState<string | null>(null);
  const [playback, setPlayback] = useState<Resolution | null>(null);
  const [step, setStep] = useState(0);
  const [fast, setFast] = useState(false);
  const [help, setHelp] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [notice, setNotice] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = useRef(false);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const e = ENCOUNTERS[run.encounter], selectedUnit = run.units.find(u => u.id === selected), king = run.units.find(u => u.id === "king");
  useEffect(() => { if (!intro) try { localStorage.setItem(SAVE, JSON.stringify(run)); } catch { setNotice("Autosave unavailable. Export your playtest to keep a copy."); } }, [run, intro]);
  useEffect(() => {
    if (!playback) return;
    timer.current = setTimeout(() => {
      if (step < playback.beats.length + 1) setStep(step + 1);
      else { setRun(playback.run); setPlayback(null); setStep(0); busy.current = false; }
    }, reduced ? 90 : fast ? 180 : step === 0 ? 850 : step === 1 ? 850 : 700);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [playback, step, fast, reduced]);
  const play = (resolution: Resolution) => {
    if (busy.current || resolution.run === run) return;
    busy.current = true; setSelected(null); setStep(0); setPlayback(resolution);
  };
  const square = (p: Pos) => {
    if (playback || intro || !["planning", "cleanup"].includes(run.phase)) return;
    const u = at(run, p);
    if (u?.side === "white") { setSelected(u.id); setNotice(""); return; }
    if (!selectedUnit) return;
    if (run.phase === "cleanup") {
      if (u && run.cleanupTargets.includes(u.id)) play(cleanupStrike(run, selectedUnit.id, u.id));
      return;
    }
    const next = plan(run, { unitId: selectedUnit.id, to: p });
    if (next === run) { setNotice("Choose a highlighted square that no other piece has reserved."); return; }
    setRun(next); setSelected(null); setNotice("");
  };
  function start(nextMode: Mode) { if (timer.current) clearTimeout(timer.current); busy.current = false; setPlayback(null); setStep(0); setRun(newRun(nextMode)); setSelected(null); setIntro(false); setFeedback(""); setNotice(""); }
  const caption = playback ? step === 0 ? "Both plans revealed." : step === 1 ? "Orders in motion…" : playback.beats[Math.min(step - 2, playback.beats.length - 1)]?.text : run.phase === "cleanup" ? "An ally fell. Take one free cleanup strike, or decline." : "Enemy orders are hidden until you resolve.";
  return <main className="exile-app">
    <header className="exile-header"><div className="exile-brand">CHEZZ<span>A SMALL REBELLION</span></div><div className="header-controls"><button onClick={() => setHelp(true)}>How to play</button><button disabled={!!playback} onClick={() => { setMode(run.mode); setIntro(true); }}>New run / compare</button></div></header>
    <section className="run-heading"><div><p className="kicker">ESCAPE FROM EXILE · {run.encounter + 1} / 3</p><h1>{e.title}</h1><p>{e.story}</p></div><div className="run-stats"><span>♛ <b>{king?.hp ?? 0} / 5</b><small>KING HEALTH</small></span><span>✦ <b>{run.gold}</b><small>GOLD</small></span><span className="model-label">{modeName(run.mode)}<small>COMBAT MODEL</small></span></div></section>
    <div className="exile-layout">
      <section className="exile-arena"><div className="arena-topline"><span>{run.phase === "cleanup" ? "CLEANUP WINDOW" : `TURN ${run.turn}`}</span><span>{run.units.filter(u => u.side === "black").length} ENEMIES · DEFEAT THE PATROL</span></div><PlanningBoard run={run} selected={selected} onSquare={square} playback={playback} step={step} />
        <div className={`playback-caption ${playback ? "playing" : ""}`} aria-live="polite">{caption}</div><div className="playback-controls"><label><input type="checkbox" checked={fast} onChange={ev => setFast(ev.target.checked)} /> Fast playback</label>{playback && <button onClick={() => { if (timer.current) clearTimeout(timer.current); setRun(playback.run); setPlayback(null); busy.current = false; }}>Skip playback</button>}</div>
      </section>
      <aside className="exile-sidebar">
        <section className="plan-panel"><p className="kicker">{run.phase === "cleanup" ? "ONE OPTIONAL REACTION" : `${run.planned.length} / ${budget(run)} ORDERS PLANNED`}</p><h2>{run.phase === "cleanup" ? "An ally needs avenging." : "Your move, Your Majesty."}</h2>
          {run.phase === "cleanup" ? <><p>Select a friendly piece with a clear attack line to the enemy that just captured your ally. Take one free strike before planning resumes.</p><button className="secondary-button" disabled={!!playback} onClick={() => { setRun(declineCleanup(run)); setSelected(null); }}>Let it go</button></> : <>
            <ol className="exile-orders">{run.planned.map((o, i) => <li key={o.unitId}><span className="order-number">{i + 1}</span><span>{description(run, o)}</span><button aria-label={`Remove ${description(run, o)}`} disabled={!!playback} onClick={() => setRun(unplan(run, o.unitId))}>×</button></li>)}{run.planned.length === 0 && <li className="empty-plan">Select a friendly piece, then a highlighted square.</li>}</ol>
            {selectedUnit && !playback && <div className="selected-card"><PieceArt kind={selectedUnit.kind} side="white" /><div><strong>{selectedUnit.kind} · {selectedUnit.hp} HP</strong><p>{selectedUnit.kind === "bishop" ? "Slides diagonally. Pieces and walls block its line." : selectedUnit.kind === "rook" ? "Slides in straight lines. Pieces and walls block its line." : selectedUnit.kind === "king" ? "One square in any direction. Keep him alive." : selectedUnit.kind === "knight" ? "Jumps in an L. Can leap over obstacles." : "Forward to move. Diagonal to capture or watch an empty square."}</p></div></div>}
            {selectedUnit && !playback && <button className="secondary-button" onClick={() => { setRun(plan(run, { unitId: selectedUnit.id, to: { x: selectedUnit.x, y: selectedUnit.y }, defend: true })); setSelected(null); }}>Defend in place {run.mode === "retaliation" ? "· block 1 damage" : "· trade when hit"}</button>}
            <button className="primary-button" disabled={!!playback || !run.planned.length || run.phase !== "planning"} onClick={() => play(resolveTurn(run))}>{playback ? "Resolving…" : "Resolve turn"}<span>→</span></button><p className="small-print">One order per piece. Orders can be changed before resolving. Your king’s health carries to the next battle.</p>
          </>}{notice && <p role="status" className="notice">{notice}</p>}
        </section>
        <section className="resolution-panel"><details><summary>Last resolution</summary>{run.log.map((text, i) => <p key={i}>{text}</p>)}</details><button className="text-button" onClick={() => exportRun(run, feedback)}>Export playtest ↗</button></section>
      </aside>
    </div>
    <footer className="exile-footer">Three battles. A little army. One crown to get back.<span>Prototype · {modeName(run.mode)}</span></footer>
    {intro && <div className="exile-modal-shade"><section className="exile-modal intro-exile" role="dialog" aria-modal="true" aria-label="Start exile run"><div className="intro-king"><PieceArt kind="king" side="white" /></div><p className="kicker">BANISHED. BROKE. STILL WEARING THE CROWN.</p><h1>A king without a kingdom.</h1><p>Clear the road, recruit your first followers, and cross the bridge. Fallen allies stay gone. If your king falls, the run is over.</p><fieldset className="mode-options"><legend>Choose a combat model to test</legend><label className={mode === "retaliation" ? "active-mode" : ""}><input type="radio" name="mode" checked={mode === "retaliation"} onChange={() => setMode("retaliation")} /><span><strong>Always trade <small>MARK’S SIMPLER RULE</small></strong>Every attack trades current HP. Defend absorbs 1 incoming damage.</span></label><label className={mode === "ambush" ? "active-mode" : ""}><input type="radio" name="mode" checked={mode === "ambush"} onChange={() => setMode("ambush")} /><span><strong>Free hits <small>WESLEY’S PREDICTION RULE</small></strong>Idle targets don’t hit back. Defenders and clashing pieces trade HP.</span></label></fieldset><button className="primary-button" onClick={() => start(mode)}>Begin the rebellion<span>→</span></button>{saved() && <button className="text-button" onClick={() => setIntro(false)}>Keep playing current run</button>}</section></div>}
    {!intro && !playback && run.phase === "camp" && <div className="exile-modal-shade"><section className="exile-modal camp-modal" role="dialog" aria-modal="true" aria-label="Roadside camp"><p className="kicker">PATROL DEFEATED · +{e.reward} GOLD</p><h1>A fire. A choice.</h1><p>Your king has {king!.hp} / 5 HP. Your surviving army keeps its health. Choose one offer, then move on.</p><div className="camp-gold">✦ {run.gold} gold</div><div className="camp-offers">{(["bishop", "rook", "heal"] as const).map(choice => <button key={choice} disabled={!!campReason(run, choice)} onClick={() => { setRun(leaveCamp(run, choice)); setSelected(null); }}><div className="offer-art">{choice === "heal" ? <span>♥</span> : <PieceArt kind={choice} side="white" />}</div><h2>{choice === "heal" ? "Mend the king" : `Recruit a ${choice}`}</h2><p>{choice === "bishop" ? "3 HP. Diagonal reach. Mind your colors." : choice === "rook" ? "5 HP. Straight lines and stubborn loyalty." : "Restore 2 king HP, up to 5."}</p><strong>{campReason(run, choice) || `${COST[choice]} gold →`}</strong></button>)}</div><button className="text-button" onClick={() => { setRun(leaveCamp(run, "save")); setSelected(null); }}>Save the gold and continue →</button></section></div>}
    {!intro && !playback && ["victory", "defeat"].includes(run.phase) && <div className="exile-modal-shade"><section className="exile-modal" role="dialog" aria-modal="true" aria-label={run.phase === "victory" ? "Exile run complete" : "Rebellion ended"}><p className="kicker">{run.phase === "victory" ? "THREE PATROLS DOWN" : "THE CROWN HAS FALLEN"}</p><h1>{run.phase === "victory" ? "A very small rebellion." : "Long live… somebody else."}</h1><p>{run.phase === "victory" ? `You crossed the bridge with ${run.units.filter(u => u.side === "white").length} surviving pieces and ${king?.hp ?? 0} king HP. This is the end of the prototype.` : "Your king fell. Your next attempt starts with a fresh crown and questionable confidence."}</p><label className="feedback-label">What felt clever? What was confusing?<textarea value={feedback} onChange={ev => setFeedback(ev.target.value)} placeholder="Leave a note for the next design pass…" /></label><button className="secondary-button" onClick={() => exportRun(run, feedback)}>Export feedback and action history</button><button className="primary-button" onClick={() => start(run.mode === "retaliation" ? "ambush" : "retaliation")}>Try {modeName(run.mode === "retaliation" ? "ambush" : "retaliation")} on the same boards<span>→</span></button><button className="text-button" onClick={() => start(run.mode)}>Replay this combat model</button></section></div>}
    {help && <div className="exile-modal-shade"><section className="exile-modal help-exile" role="dialog" aria-modal="true" aria-label="How to play"><p className="kicker">A FEW ROYAL DECREES</p><h1>Choose. Watch. Survive.</h1><ol><li>Select a friendly piece and a highlighted square. Pieces use chess movement; pawns may watch empty diagonals.</li><li>Queue one order per piece, up to three. Select a queued piece to replace its order. Defend spends its order in place.</li><li>Resolve reveals enemy orders and plays the turn. Current HP is also attack damage. {run.mode === "retaliation" ? "Every attack trades HP; defending reduces incoming damage by 1." : "Idle targets take free hits; clashes and defenders trade HP."} Equal trades destroy both pieces.</li><li>A moving enemy can escape a targeted square. Movement uses destinations; pieces don’t intercept paths halfway through.</li><li>If an ally falls and a survivor can reach its killer, you may take one free cleanup strike before planning again.</li><li>Defeat all enemies to reach camp. Recruit or heal. All surviving HP persists, allies stay dead, and king death ends the run.</li></ol><button className="primary-button" onClick={() => setHelp(false)}>Back to the road<span>→</span></button></section></div>}
  </main>;
}
