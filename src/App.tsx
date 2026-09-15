import { useMemo, useState } from "react";
import { ICON, at, cleanup, declineCleanup, isPawnAmbush, legal, name, newGame, queue, removeOrder, resolve, same } from "./game/simultaneous";
import type { Game, Pos } from "./game/simultaneous";
import "./style.css";

export default function App() {
  const [game, setGame] = useState<Game>(newGame);
  const [selected, setSelected] = useState<string | null>(null);
  const selectedUnit = game.units.find(u => u.id === selected);
  const destinations = useMemo(() => selectedUnit ? legal(game, selectedUnit).filter(p => !game.cleanupTargets.length || game.cleanupTargets.some(id => same(p, game.units.find(u => u.id === id)!))) : [], [game, selectedUnit]);
  const plannedUnitIds = new Set(game.planned.map(o => o.unitId));
  const plannedSquares = game.planned.map(o => o.to);
  const choose = (pos: Pos) => {
    const occupant = at(game, pos);
    if (occupant?.side === "white" && (!plannedUnitIds.has(occupant.id) || game.cleanupTargets.length)) { setSelected(occupant.id); return; }
    if (selectedUnit && destinations.some(p => same(p, pos))) {
      if (game.cleanupTargets.length && occupant?.side === "black") {
        setGame(cleanup(game, selectedUnit.id, occupant.id)); setSelected(null); return;
      }
      const next = queue(game, { unitId: selectedUnit.id, to: pos });
      if (next !== game) { setGame(next); setSelected(null); }
    }
  };
  const resolveTurn = () => { setGame(resolve(game)); setSelected(null); };
  return <main className="core-shell">
    <header className="core-header"><div><span className="eyebrow">CHEZZ · CORE PROTOTYPE</span><h1>Plan. Predict. Resolve.</h1></div><button className="reset" onClick={() => { setGame(newGame()); setSelected(null); }}>New battle</button></header>
    <section className="core-rule"><strong>Three orders each turn.</strong> Choose a piece, choose its destination, then resolve both sides simultaneously. Moving into an idle enemy fights; a moving enemy escapes; equal HP destroys both pieces.</section>
    <div className="core-layout">
      <section className="planning" aria-label="Your planned actions"><span className="eyebrow">{game.cleanupTargets.length ? "POST-RESOLUTION REACTION" : `YOUR PLAN · ${game.planned.length} / 3`}</span><h2>{game.winner ? `${game.winner === "white" ? "White" : "Black"} wins` : game.cleanupTargets.length ? "Cleanup opportunity" : "Queue your orders"}</h2>
        {game.cleanupTargets.length ? <div className="cleanup-copy"><p>An enemy just captured your piece. Select a white piece with a highlighted line to clean it up now, or decline.</p><button className="reset" onClick={() => { setGame(declineCleanup(game)); setSelected(null); }}>Decline cleanup</button></div> : <><ol className="order-list">{game.planned.length ? game.planned.map((o, i) => { const u = game.units.find(p => p.id === o.unitId)!; const ambush = isPawnAmbush(game, u, o.to); return <li key={o.unitId}><span>{ICON.white[u.kind]} {u.kind} {ambush ? "threatens" : "→"} <b>{name(o.to)}</b></span><button onClick={() => { setGame(removeOrder(game, i)); if (selected === o.unitId) setSelected(null); }}>Remove</button></li>; }) : <li className="empty">Select a white piece to begin.</li>}</ol>
        <button className="resolve" disabled={!game.planned.length || !!game.winner} onClick={resolveTurn}>Resolve turn <span>↗</span></button><p className="hint">A piece may receive one order. A destination may be chosen once.</p></>}
      </section>
      <section className="board-wrap" aria-label="Chezz board"><div className="board-label"><span>BLACK ORDERS HIDDEN</span><b>TURN {String(game.turn).padStart(2,"0")}</b></div><div className="core-board">{Array.from({length: 64}, (_, i) => { const pos = { x: i % 8, y: Math.floor(i / 8) }, u = at(game, pos); const isDestination = destinations.some(p => same(p,pos)), isPlanned = plannedSquares.some(p => same(p,pos)); return <button key={i} className={`cell ${(pos.x + pos.y) % 2 ? "dark" : "light"} ${isDestination ? "destination" : ""} ${isPlanned ? "planned-square" : ""}`} aria-label={`${name(pos)} ${u ? `${u.side} ${u.kind}` : "empty"}`} onClick={() => choose(pos)}>{isPlanned && <i className="order-dot" />}{u && <span className={`unit ${u.side} ${selected === u.id ? "chosen" : ""} ${plannedUnitIds.has(u.id) ? "ordered" : ""}`}><b>{ICON[u.side][u.kind]}</b><small>{u.hp}</small></span>}</button>; })}</div><div className="board-label files"><span>a</span><span>b</span><span>c</span><span>d</span><span>e</span><span>f</span><span>g</span><span>h</span></div></section>
      <aside className="outcome"><span className="eyebrow">LAST RESOLUTION</span><h2>Take inventory</h2><div className="combat-key"><span><b>1</b> Pawn</span><span><b>3</b> Knight / Bishop</span><span><b>5</b> Rook</span><span><b>9</b> Queen</span><span><b>5</b> King</span></div><div className="resolution-log">{game.log.map((entry,i) => <p key={i}>{entry}</p>)}</div></aside>
    </div>
    <footer>Core rules only · Gambits, consumables, special attacks, and progression deliberately deferred.</footer>
  </main>;
}
