import { useEffect, useRef, useState } from "react";
import Board from "./render/Board";
import { Art } from "./components/Art";
import {
  PIECES,
  ENCOUNTERS,
  GAMBITS,
  UPGRADES,
  CONSUMABLES,
  SETS,
  itemById,
} from "./game/content";
import type {
  Pos,
  GambitId,
  ConsumableId,
  UpgradeId,
  Kind,
} from "./game/content";
import {
  newGame,
  loadGame,
  moves,
  targets,
  move,
  attack,
  waitPiece,
  endPhase,
  enemyStep,
  pieceAt,
  same,
  coord,
  previewDamage,
  victims,
  bonusMet,
  useConsumable,
  openShop,
  purchaseReason,
  buy,
  releaseGambit,
  discardConsumable,
  continueRun,
  chooseEvent,
  upgraded,
} from "./game/engine";
import type { Game } from "./game/engine";
import { playSound } from "./sound";

const SAVE = "chezz.run.v1",
  PREFS = "chezz.prefs.v1";
function readSave() {
  try {
    return loadGame(localStorage.getItem(SAVE));
  } catch {
    return null;
  }
}
function readPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS) || "{}");
  } catch {
    return {};
  }
}
function download(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
function Modal({
  children,
  className = "",
  label,
  onClose,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
  onClose?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input, select, [tabindex="0"]',
        ) ?? [],
      );
    focusable()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) onClose();
      if (e.key === "Tab") {
        const els = focusable();
        if (!els.length) return;
        if (e.shiftKey && document.activeElement === els[0]) {
          e.preventDefault();
          els.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === els.at(-1)) {
          e.preventDefault();
          els[0].focus();
        }
      }
    };
    const node = ref.current;
    node?.addEventListener("keydown", key);
    return () => {
      node?.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div className="modal-shade">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={"modal " + className}
      >
        {onClose && (
          <button className="close" aria-label="Close dialog" onClick={onClose}>
            ×
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
export default function App() {
  const [game, setGame] = useState<Game>(() => readSave() ?? newGame());
  const [intro, setIntro] = useState(() => !readSave());
  const [selected, setSelected] = useState<string | null>(null),
    [hover, setHover] = useState<Pos | null>(null);
  const [set, setSet] = useState("mahogany"),
    [seed, setSeed] = useState("BETWEEN-WORLDS");
  const [help, setHelp] = useState(false),
    [settings, setSettings] = useState(false),
    [debug, setDebug] = useState(false);
  const [threats, setThreats] = useState(false),
    [sound, setSound] = useState(() => readPrefs().sound ?? true);
  const [reduced, setReduced] = useState(
    () =>
      readPrefs().reduced ??
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [fast, setFast] = useState(() => readPrefs().fast ?? false);
  const [tool, setTool] = useState<number | null>(null),
    [trapFirst, setTrapFirst] = useState<Pos | null>(null),
    [toast, setToast] = useState("");
  const [savingError, setSavingError] = useState(false),
    [detail, setDetail] = useState<string | null>(null);
  const debugAvailable =
    import.meta.env.DEV || new URLSearchParams(location.search).has("lab");
  const encounter = ENCOUNTERS[game.floor];
  const chosen = game.pieces.find((p) => p.id === selected);
  const hovering = hover ? pieceAt(game, hover) : undefined;
  const inspected = hovering ?? chosen;
  const canAct = game.screen === "battle" && game.turn === "player" && !intro;
  const toolId = tool !== null ? game.inventory[tool] : undefined;
  const attackTarget =
    chosen &&
    hovering &&
    chosen.side === "player" &&
    targets(game, chosen).some((p) => p.id === hovering.id)
      ? hovering
      : undefined;
  const remaining = game.pieces.filter(
    (p) => p.side === "player" && !p.acted,
  ).length;
  useEffect(() => {
    try {
      localStorage.setItem(SAVE, JSON.stringify(game));
      setSavingError(false);
    } catch {
      setSavingError(true);
    }
  }, [game]);
  useEffect(() => {
    try {
      localStorage.setItem(PREFS, JSON.stringify({ sound, reduced, fast }));
    } catch {}
  }, [sound, reduced, fast]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    if (
      game.screen !== "battle" ||
      game.turn !== "enemy" ||
      intro ||
      help ||
      settings
    )
      return;
    const timer = setTimeout(
      () => {
        setGame((g) => enemyStep(g));
        playSound("move", sound);
      },
      fast || reduced ? 100 : 620,
    );
    return () => clearTimeout(timer);
  }, [game, fast, reduced, intro, help, settings, sound]);
  useEffect(() => {
    setSelected(null);
    setTool(null);
    setTrapFirst(null);
    setHover(null);
  }, [game.floor, game.screen, game.turn]);
  useEffect(() => {
    if (game.screen === "reward" || game.screen === "victory")
      playSound("reward", sound);
  }, [game.screen, sound]);
  const notify = (s: string) => setToast(s);
  function start() {
    setGame(newGame(seed, set));
    setIntro(false);
    setSelected(null);
    setTool(null);
    setTrapFirst(null);
    playSound("phase", sound);
  }
  function square(pos: Pos) {
    if (!canAct) {
      if (game.turn === "enemy") notify("The other side is taking its turn.");
      return;
    }
    if (tool !== null && toolId) {
      if (toolId === "trapdoor" && !trapFirst) {
        if (game.holes.some((p) => same(p, pos))) {
          notify("Choose an intact square.");
          return;
        }
        if (game.trap) {
          notify("A fold is already waiting on the board.");
          return;
        }
        setTrapFirst(pos);
        notify("Choose the second square to link.");
        return;
      }
      const next = useConsumable(
        game,
        tool,
        trapFirst ? [trapFirst, pos] : [pos],
      );
      if (next === game) {
        notify(
          toolId === "repair"
            ? "Choose a wounded friendly piece."
            : toolId === "smoke"
              ? "Choose a friendly piece."
              : "Choose an eligible intact square.",
        );
        return;
      }
      setGame(next);
      setTool(null);
      setTrapFirst(null);
      playSound("phase", sound);
      return;
    }
    const p = pieceAt(game, pos);
    if (
      chosen &&
      p &&
      p.side !== chosen.side &&
      chosen.side === "player" &&
      targets(game, chosen).some((t) => t.id === p.id)
    ) {
      const next = attack(game, chosen.id, p.id);
      if (next !== game) {
        setGame(next);
        playSound("attack", sound);
      }
      return;
    }
    if (p) {
      if (game.active && p.id !== game.active && p.side === "player") {
        notify(
          "Finish " +
            PIECES[chosen?.kind ?? "pawn"].name +
            "’s activation first.",
        );
        return;
      }
      setSelected(p.id);
      return;
    }
    if (
      chosen &&
      chosen.side === "player" &&
      moves(game, chosen).some((p) => same(p, pos))
    ) {
      const next = move(game, chosen.id, pos);
      if (next !== game) {
        setGame(next);
        playSound("move", sound);
      }
    } else if (chosen)
      notify(
        chosen.acted
          ? "This piece has already acted."
          : chosen.moved
            ? "Attack a target or finish this activation."
            : "Choose a highlighted square.",
      );
  }
  function finish() {
    if (chosen) {
      setGame((g) => waitPiece(g, chosen.id));
      setSelected(null);
    }
  }
  function end() {
    if (!canAct) return;
    setGame((g) => endPhase(g));
    setSelected(null);
    setTool(null);
    setTrapFirst(null);
    playSound("phase", sound);
  }
  const cancel = () => {
    if (game.active) setSelected(game.active);
    else setSelected(null);
    setTool(null);
    setTrapFirst(null);
  };
  function labEncounter(floor: number) {
    const fresh = newGame(game.seed, game.set);
    setGame(
      continueRun({
        ...fresh,
        gambits: game.gambits,
        upgrades: game.upgrades,
        inventory: game.inventory,
        gold: game.gold,
        kingHp: game.kingMax,
        floor: floor - 1,
        screen: "shop",
        eventTaken: true,
        serial: game.serial + 1,
      }),
    );
    setSelected(null);
    setTool(null);
    setIntro(false);
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        intro ||
        help ||
        settings ||
        detail ||
        debug
      )
        return;
      if (e.key === "Escape") cancel();
      if (e.key.toLowerCase() === "t") setThreats((v) => !v);
      if (e.key.toLowerCase() === "e") end();
      if (
        e.key === " " &&
        chosen &&
        canAct &&
        !(e.target instanceof HTMLButtonElement)
      ) {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  return (
    <div className={"app " + (reduced ? "reduced" : "")}>
      <div className="cosmos" />
      <div className="grain" />
      <header className="topbar">
        <button
          className="wordmark"
          onClick={() => setSettings(true)}
          aria-label="Chezz menu"
        >
          CHEZZ<span>BETWEEN WORLDS</span>
        </button>
        <div className="header-center">
          <span className="tiny-star">✧</span> A GAME IN THE GAP BETWEEN
          UNIVERSES <span className="tiny-star">✧</span>
        </div>
        <div className="header-actions">
          <span className="prototype">
            PROTOTYPE <i>01</i>
          </span>
          <button
            className="icon-button"
            onClick={() => setHelp(true)}
            aria-label="How to play"
          >
            ?
          </button>
          <button
            className="icon-button"
            onClick={() => setSettings(true)}
            aria-label="Settings"
          >
            ☷
          </button>
        </div>
      </header>
      <div className="compact-resources">
        <span>
          ♚ <b>{game.kingHp}</b> / {game.kingMax} <small>KING HEALTH</small>
        </span>
        <span>
          ✦ <b>{game.gold}</b> <small>GOLD</small>
        </span>
      </div>
      <main className="game-layout">
        <aside className="journey">
          <div className="eyebrow">
            <span className="diamond">◇</span> THE FIRST DESCENT
          </div>
          <h2>
            Away from
            <br />
            <em>everything.</em>
          </h2>
          <div className="floor-track" aria-label="Floor progress">
            {ENCOUNTERS.map((e, i) => (
              <div
                className={
                  "floor-step " +
                  (i === game.floor
                    ? "current"
                    : i < game.floor
                      ? "complete"
                      : "")
                }
                key={e.name}
              >
                <span className="step-icon">
                  {i < game.floor
                    ? "✓"
                    : i === 5
                      ? "♚"
                      : String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <span>{e.name}</span>
                  {i === game.floor && (
                    <small>
                      {i === 5 ? "BOSS ENCOUNTER" : "CURRENT ENCOUNTER"}
                    </small>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="run-resources">
            <div>
              <span className="resource-label">THE CONSTANT</span>
              <strong>
                ♚ <span>{game.kingHp}</span>
                <small> / {game.kingMax}</small>
              </strong>
            </div>
            <div className="health-track">
              <i style={{ width: (100 * game.kingHp) / game.kingMax + "%" }} />
            </div>
            <p>Your king’s health carries between battles.</p>
            <div className="gold-row">
              <span>
                ✦ <b>{game.gold}</b>
              </span>
              <small>GOLD</small>
            </div>
          </div>
          <div className="log-panel">
            <div className="eyebrow">ECHOES</div>
            <div aria-live="polite">
              {game.log.slice(0, 3).map((s, i) => (
                <p className={i === 0 ? "latest" : ""} key={i}>
                  {s}
                </p>
              ))}
            </div>
            <button className="text-button" onClick={() => setDetail("log")}>
              View battle log ↗
            </button>
          </div>
          <div className="seed-label">
            SEED <span>{game.seed}</span>
          </div>
        </aside>
        <section className="arena" aria-label="Battle">
          <div className="arena-heading">
            <div>
              <div className="eyebrow">
                ENCOUNTER {String(game.floor + 1).padStart(2, "0")}{" "}
                <span>/ 06</span>
              </div>
              <h1>
                {encounter.name}
                <span className="heading-star">✧</span>
              </h1>
            </div>
            <button
              className={"threat-toggle " + (threats ? "on" : "")}
              onClick={() => setThreats((t) => !t)}
              aria-pressed={threats}
            >
              <span>◎</span> THREAT RANGES <kbd>T</kbd>
            </button>
          </div>
          <Board
            game={game}
            selected={selected}
            hover={hover}
            onSquare={square}
            onHover={setHover}
            threats={threats}
            reduced={reduced}
            tool={toolId ?? null}
            trapFirst={trapFirst}
          />
          <div className="board-caption">
            <span
              className={
                "phase-indicator " + (game.turn === "enemy" ? "enemy" : "")
              }
            />
            <span>
              {game.turn === "enemy"
                ? "THE OTHER SIDE IS THINKING"
                : toolId
                  ? itemById(toolId).name.toUpperCase() +
                    " — SELECT " +
                    (trapFirst ? "SECOND SQUARE" : "A TARGET")
                  : game.active
                    ? "MOVE COMPLETE · ATTACK OR FINISH"
                    : chosen?.acted
                      ? "ACTIVATION COMPLETE"
                      : chosen?.side === "player"
                        ? "MOVE, THEN ATTACK OR USE YOUR ABILITY"
                        : "YOUR PHASE · SELECT A PIECE"}
            </span>
            <span className="caption-right">
              {hover ? coord(hover).toUpperCase() : "∞"}
            </span>
          </div>
          <div className="legend">
            <span>
              <i className="mint" />
              MOVE
            </span>
            <span>
              <i className="coral" />
              ATTACK
            </span>
            <span>
              <i className="gold" />
              SELECTED
            </span>
            <span className="legend-hint">
              Each piece moves, then attacks. You choose the order.
            </span>
          </div>
        </section>
        <aside className="command-panel">
          <div className="objective-card">
            <div className="eyebrow">
              YOUR OBJECTIVE <span>◇</span>
            </div>
            <h2>
              {encounter.boss
                ? "Unmake the king."
                : "Win " + encounter.target + " material."}
            </h2>
            <p>
              {encounter.boss
                ? "His adjacent guards reduce incoming damage by 2."
                : "Captured enemy value minus your losses. Hold the target through the enemy phase."}
            </p>
            {encounter.boss ? (
              <div className="material-count boss-count">
                ♚{" "}
                <strong>
                  {game.pieces.find(
                    (p) => p.side === "enemy" && p.kind === "king",
                  )?.hp ?? 0}
                </strong>
                <span> / 20 HP</span>
              </div>
            ) : (
              <>
                <div className="material-count">
                  <strong>{game.material}</strong>
                  <span> / {encounter.target}</span>
                  <small>MATERIAL</small>
                </div>
                <div className="objective-track">
                  <i
                    style={{
                      width:
                        Math.max(
                          0,
                          Math.min(
                            100,
                            (game.material / encounter.target) * 100,
                          ),
                        ) + "%",
                    }}
                  />
                </div>
              </>
            )}
            <div className="bonus">
              <span className={bonusMet(game) ? "bonus-met" : ""}>
                {bonusMet(game) ? "✧" : "◇"}
              </span>
              <div>
                <small>OPTIONAL · +12 GOLD</small>
                <p>{encounter.bonus}</p>
              </div>
            </div>
            <div className="round-row">
              <span>ROUND</span>
              <strong>
                {String(game.round).padStart(2, "0")}{" "}
                <small>/ {String(encounter.rounds).padStart(2, "0")}</small>
              </strong>
            </div>
          </div>
          <div className="piece-panel">
            {inspected ? (
              <>
                <div className="eyebrow">
                  {inspected.side === "player" ? "YOUR ARMY" : "THE OTHER SIDE"}{" "}
                  <span>{coord(inspected).toUpperCase()}</span>
                </div>
                <div className="piece-title">
                  <span className={"piece-symbol " + inspected.side}>
                    {PIECES[inspected.kind].symbol}
                  </span>
                  <div>
                    <h3>
                      {PIECES[inspected.kind].name}
                      {upgraded(game, inspected) && <sup>✧</sup>}
                    </h3>
                    <small>{PIECES[inspected.kind].role}</small>
                  </div>
                </div>
                <div className="piece-stats">
                  <div>
                    <b>
                      {inspected.hp}
                      <small>/{inspected.maxHp}</small>
                    </b>
                    <span>HEALTH</span>
                  </div>
                  <div>
                    <b>
                      {PIECES[inspected.kind].atk +
                        (inspected.kind === "pawn" &&
                        game.upgrades.includes("ascension") &&
                        inspected.side === "player"
                          ? 1
                          : 0)}
                    </b>
                    <span>BASE ATK</span>
                  </div>
                  <div>
                    <b>{PIECES[inspected.kind].move}</b>
                    <span>MOVE</span>
                  </div>
                </div>
                <p className="piece-rule">{PIECES[inspected.kind].rule}</p>
                {inspected.ward > 0 && (
                  <div className="status-pill">
                    ◇ WARD · ABSORBS {inspected.ward}
                  </div>
                )}
                {inspected.veiled && (
                  <div className="status-pill">◎ VEILED · NEXT HIT IGNORED</div>
                )}
                {attackTarget && chosen && (
                  <div className="damage-preview">
                    <strong>
                      {previewDamage(game, chosen, attackTarget)} DAMAGE
                    </strong>
                    <span>
                      {previewDamage(game, chosen, attackTarget) >=
                      attackTarget.hp
                        ? "LETHAL"
                        : "ON CLICK"}
                      {victims(game, chosen, attackTarget).length > 1
                        ? " · PIERCING"
                        : ""}
                    </span>
                  </div>
                )}
                {upgraded(game, inspected) && (
                  <button
                    className="text-button"
                    onClick={() =>
                      setDetail(
                        UPGRADES.find((u) => u.kind === inspected.kind)!.id,
                      )
                    }
                  >
                    View upgrade ↗
                  </button>
                )}
              </>
            ) : (
              <div className="empty-selection">
                <div className="orbit-glyph">♙</div>
                <h3>Your move.</h3>
                <p>
                  Select a piece to see its movement, attack range, and
                  abilities.
                </p>
              </div>
            )}
          </div>
          <div className="phase-controls">
            {tool !== null ? (
              <button
                className="secondary wide"
                onClick={() => {
                  setTool(null);
                  setTrapFirst(null);
                }}
              >
                Cancel consumable <kbd>ESC</kbd>
              </button>
            ) : chosen?.side === "player" && !chosen.acted && canAct ? (
              <button className="secondary wide" onClick={finish}>
                Finish activation <kbd>SPACE</kbd>
              </button>
            ) : (
              <div className="ready-count">
                <span>●</span> {remaining} OF{" "}
                {game.pieces.filter((p) => p.side === "player").length} PIECES
                READY
              </div>
            )}
            <button
              className="primary end-phase"
              onClick={end}
              disabled={!canAct}
            >
              {game.turn === "enemy" ? "Enemy phase…" : "End phase"}
              <span>↗</span>
            </button>
            <p>All ready pieces may act before you end.</p>
          </div>
        </aside>
        <section className="build-tray" aria-label="Your build">
          <div className="gambit-section">
            <div className="tray-heading">
              <span className="eyebrow">
                YOUR GAMBITS <small>{game.gambits.length} / 3</small>
              </span>
              <span className="tray-poem">
                Small exceptions to universal laws.
              </span>
            </div>
            <div className="gambit-row">
              {Array.from({ length: 3 }, (_, i) => {
                const item = game.gambits[i]
                  ? itemById(game.gambits[i])
                  : undefined;
                return item ? (
                  <button
                    className="gambit-card"
                    onClick={() => setDetail(item.id)}
                    key={i}
                  >
                    <Art type={item.art} />
                    <div>
                      <h3>{item.name}</h3>
                      <p>{item.desc}</p>
                    </div>
                    <span className="card-index">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </button>
                ) : (
                  <div className="empty-gambit" key={i}>
                    <span>✧</span>
                    <small>AN UNWRITTEN LAW</small>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="consumable-section">
            <div className="tray-heading">
              <span className="eyebrow">
                POCKET DIMENSION <small>{game.inventory.length} / 2</small>
              </span>
            </div>
            <div className="consumable-row">
              {Array.from({ length: 2 }, (_, i) => {
                const item = game.inventory[i]
                  ? itemById(game.inventory[i])
                  : undefined;
                return item ? (
                  <button
                    key={i}
                    className={"consumable " + (tool === i ? "active" : "")}
                    disabled={!canAct || game.consumed || !!game.active}
                    onClick={() => {
                      setTool(tool === i ? null : i);
                      setTrapFirst(null);
                      setSelected(null);
                      notify(item.desc);
                    }}
                    title={item.desc}
                  >
                    <Art type={item.art} />
                    <span>{item.name}</span>
                    <small>USE</small>
                  </button>
                ) : (
                  <div className="empty-pocket" key={i}>
                    ＋
                  </div>
                );
              })}
            </div>
            <p>
              {game.consumed
                ? "Used this phase. Ready again next phase."
                : "One consumable per phase, between activations."}
            </p>
          </div>
        </section>
      </main>
      <footer className="footer">
        <span>
          <i />{" "}
          {savingError
            ? "SAVE UNAVAILABLE — EXPORT IN SETTINGS"
            : "SAVED IN THIS REALITY"}
        </span>
        <button onClick={() => setHelp(true)}>HOW TO PLAY ↗</button>
        {debugAvailable && (
          <button onClick={() => setDebug(true)}>DEVELOPER LAB</button>
        )}
        <span>FLOOR ONE · v0.1</span>
      </footer>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}

      {intro && (
        <Modal label="Begin your descent" className="intro-modal">
          <div className="intro-orbit">
            <Art type="eclipse" />
          </div>
          <div className="eyebrow">A TACTICS ROGUELIKE BETWEEN WORLDS</div>
          <h1>
            Nothing here
            <br />
            plays by <em>the rules.</em>
          </h1>
          <p className="intro-copy">
            Build an army. Bend reality.
            <br />
            Five encounters. One impossible king.
          </p>
          <div className="set-selection">
            {SETS.map((s) => (
              <button
                className={"set-card " + (set === s.id ? "chosen" : "")}
                key={s.id}
                onClick={() => setSet(s.id)}
              >
                <span className="set-symbol">
                  {s.id === "mahogany" ? "♚" : "♞"}
                </span>
                <div>
                  <small>{s.subtitle}</small>
                  <h3>{s.name}</h3>
                  <p>{s.detail}</p>
                </div>
                <span className="radio">{set === s.id ? "●" : "○"}</span>
              </button>
            ))}
          </div>
          <div className="seed-input">
            <label htmlFor="seed">RUN SEED</label>
            <input
              id="seed"
              value={seed}
              maxLength={48}
              onChange={(e) => setSeed(e.target.value)}
              spellCheck={false}
            />
            <button
              aria-label="Generate a new seed"
              onClick={() =>
                setSeed(
                  "VOID-" +
                    Math.random().toString(36).slice(2, 8).toUpperCase(),
                )
              }
            >
              ↻
            </button>
          </div>
          <button className="primary wide begin-button" onClick={start}>
            Enter the in-between <span>↗</span>
          </button>
          <div className="intro-bottom">
            <span>No chess knowledge required.</span>
            <button className="text-button" onClick={() => setHelp(true)}>
              Learn the rules
            </button>
          </div>
        </Modal>
      )}
      {!intro && game.screen === "reward" && (
        <Modal label="Encounter complete" className="reward-modal">
          <div className="eyebrow">A LITTLE FURTHER FROM HOME</div>
          <Art type="sun" />
          <h1>Reality yields.</h1>
          <p>You conquered {encounter.name}.</p>
          <div className="reward-stats">
            <div>
              <strong>+{game.reward}</strong>
              <span>GOLD RECOVERED</span>
            </div>
            <div>
              <strong>
                {game.material > 0 ? "+" : ""}
                {game.material}
              </strong>
              <span>NET MATERIAL</span>
            </div>
          </div>
          <div className={"reward-bonus " + (game.bonusEarned ? "earned" : "")}>
            {game.bonusEarned
              ? "✧ BONUS COMPLETE · +12 GOLD"
              : "◇ BONUS NOT COMPLETED"}
            <p>{encounter.bonus}</p>
          </div>
          <p className="muted">
            Your army reforms for the next battle.
            <br />
            Your king carries the scars.
          </p>
          <button
            className="primary wide"
            onClick={() => setGame(openShop(game))}
          >
            Visit the Interstice <span>↗</span>
          </button>
        </Modal>
      )}
      {!intro && game.screen === "shop" && (
        <Modal label="The Interstice shop" className="shop-modal">
          <div className="shop-title">
            <div>
              <div className="eyebrow">BETWEEN ENCOUNTERS</div>
              <h1>The Interstice</h1>
              <p>Something useful, salvaged from another possibility.</p>
            </div>
            <div className="shop-gold">
              ✦ {game.gold}
              <small>GOLD TO SPEND</small>
            </div>
          </div>
          <div className="shop-grid">
            {game.offers.map((id, i) => {
              const item = itemById(id),
                reason = purchaseReason(game, i);
              return (
                <article
                  className={
                    "shop-card " + (game.bought.includes(i) ? "sold" : "")
                  }
                  key={i}
                >
                  <div className="eyebrow">
                    {item.type === "heal"
                      ? "RESTORATION"
                      : item.type.toUpperCase()}
                  </div>
                  <Art type={item.art} />
                  <h3>{item.name}</h3>
                  <p>{item.desc}</p>
                  <button
                    className="secondary"
                    disabled={!!reason}
                    onClick={() => {
                      setGame(buy(game, i));
                      playSound("reward", sound);
                    }}
                  >
                    {reason || "Acquire · " + item.price + " gold"}
                  </button>
                </article>
              );
            })}
          </div>
          <div className="shop-inventory">
            <div>
              <span className="eyebrow">GAMBITS · {game.gambits.length}/3</span>
              {game.gambits.map((id) => (
                <div className="inventory-chip" key={id}>
                  <span>{itemById(id).name}</span>
                  <button
                    onClick={() => setGame(releaseGambit(game, id))}
                    title="Release without refund"
                  >
                    Release
                  </button>
                </div>
              ))}
            </div>
            <div>
              <span className="eyebrow">
                CONSUMABLES · {game.inventory.length}/2
              </span>
              {game.inventory.map((id, i) => (
                <div className="inventory-chip" key={i}>
                  <span>{itemById(id).name}</span>
                  <button onClick={() => setGame(discardConsumable(game, i))}>
                    Discard
                  </button>
                </div>
              ))}
            </div>
            <div>
              <span className="eyebrow">PERMANENT UPGRADES</span>
              <p>
                {game.upgrades.length
                  ? game.upgrades.map((id) => itemById(id).name).join(" · ")
                  : "Your pieces still hold their original forms."}
              </p>
            </div>
          </div>
          <div className="shop-bottom">
            <span>
              ♚ KING {game.kingHp} / {game.kingMax}
              <small>Release or discard items to make room. No refund.</small>
            </span>
            <button
              className="primary"
              onClick={() => setGame(continueRun(game))}
            >
              Continue the descent <span>↗</span>
            </button>
          </div>
        </Modal>
      )}
      {!intro && game.screen === "event" && (
        <Modal label="The wishing well" className="event-modal">
          <div className="eyebrow">AN UNEXPECTED ENCOUNTER</div>
          <Art type="rings" />
          <h1>The other you.</h1>
          <p>
            A familiar hand reaches through a crack in space.
            <br />
            It offers you a choice. It already knows your answer.
          </p>
          <div className="event-choices">
            <button
              className="set-card"
              onClick={() => setGame(chooseEvent(game, "heal"))}
            >
              <h3>Take its hand.</h3>
              <p>Restore 5 health to your king.</p>
              <span>“You have further to go.”</span>
            </button>
            <button
              className="set-card"
              onClick={() => setGame(chooseEvent(game, "gold"))}
            >
              <h3>Take its bargain.</h3>
              <p>Lose up to 3 king health. Gain 20 gold.</p>
              <span>Your king cannot fall from this choice.</span>
            </button>
          </div>
        </Modal>
      )}
      {!intro && (game.screen === "victory" || game.screen === "defeat") && (
        <Modal
          label={game.screen === "victory" ? "Floor complete" : "Run ended"}
          className="reward-modal"
        >
          <div className="eyebrow">
            {game.screen === "victory"
              ? "THE FIRST FLOOR IS YOURS"
              : "ANOTHER POSSIBILITY ENDS"}
          </div>
          <Art type={game.screen === "victory" ? "crown" : "fracture"} />
          <h1>
            {game.screen === "victory"
              ? "Beyond the crown."
              : "Lost between worlds."}
          </h1>
          <p>
            {game.screen === "victory"
              ? "You brought an impossible king to zero. The universe makes a little more room for you."
              : game.kingHp <= 0
                ? "Your king has fallen. Somewhere, another version of you is beginning again."
                : "The encounter ended before you met its objective. A different approach awaits."}
          </p>
          <div className="reward-stats">
            <div>
              <strong>{game.screen === "victory" ? 6 : game.floor}</strong>
              <span>ENCOUNTERS WON</span>
            </div>
            <div>
              <strong>{game.totalCaptures}</strong>
              <span>PIECES CAPTURED</span>
            </div>
          </div>
          <p className="muted">
            SEED · {game.seed}
            <br />
            {game.screen === "victory"
              ? "You have reached the end of the prototype’s floor."
              : "Your next run starts with a fresh army."}
          </p>
          <button
            className="primary wide"
            onClick={() => {
              setSeed(
                "VOID-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
              );
              setIntro(true);
            }}
          >
            Begin another possibility <span>↗</span>
          </button>
          <button
            className="text-button"
            onClick={() => {
              setSeed(game.seed);
              setGame(newGame(game.seed, game.set));
            }}
          >
            Replay this seed
          </button>
        </Modal>
      )}
      {help && (
        <Modal
          label="How to play"
          className="help-modal"
          onClose={() => setHelp(false)}
        >
          <div className="eyebrow">FAMILIAR PIECES. DIFFERENT RULES.</div>
          <h1>A little orientation.</h1>
          <div className="help-steps">
            <div>
              <b>01</b>
              <h3>Move your whole army.</h3>
              <p>
                Each piece may move, then attack once. Click a friendly piece, a
                mint movement square, then a coral enemy target. Finish its
                activation before moving another piece. You can attack without
                moving.
              </p>
            </div>
            <div>
              <b>02</b>
              <h3>Make the exchange count.</h3>
              <p>
                Reduce a piece’s health to zero to capture it. Net material is
                enemy value captured minus your own losses: pawn 1, knight or
                bishop 3, rook 5, queen 9. Meet the target at the end of a round
                to advance.
              </p>
            </div>
            <div>
              <b>03</b>
              <h3>Protect your constant.</h3>
              <p>
                King death ends the run immediately. Its health persists. Your
                other pieces reform at full health between battles, keeping
                upgrades. The boss’s king must actually die.
              </p>
            </div>
            <div>
              <b>04</b>
              <h3>Rewrite a rule or two.</h3>
              <p>
                Gambits persist across the run. Upgrades modify a piece type.
                Consumables disappear after use, with one allowed each player
                phase between activations. Optional objectives award 12 extra
                gold.
              </p>
            </div>
          </div>
          <div className="help-pieces">
            {Object.entries(PIECES).map(([id, p]) => (
              <div key={id}>
                <span>{p.symbol}</span>
                <p>
                  <strong>{p.name}</strong>
                  {p.rule}
                </p>
              </div>
            ))}
          </div>
          <p className="help-note">
            Threat ranges show attacks from current enemy positions, not
            committed intentions. Enemies can move before attacking. Pawn and
            king protection applies to orthogonally adjacent allies; only the
            strongest protection applies. Damage is at least 1 unless Veil
            blocks it.
          </p>
          <div className="keyboard-help">
            <span>
              <kbd>E</kbd> End phase
            </span>
            <span>
              <kbd>SPACE</kbd> Finish activation
            </span>
            <span>
              <kbd>T</kbd> Threat ranges
            </span>
            <span>
              <kbd>ESC</kbd> Cancel selection
            </span>
          </div>
          <button className="primary wide" onClick={() => setHelp(false)}>
            Find your footing <span>↗</span>
          </button>
        </Modal>
      )}
      {settings && (
        <Modal
          label="Settings"
          className="settings-modal"
          onClose={() => setSettings(false)}
        >
          <div className="eyebrow">THIS LITTLE REALITY</div>
          <h1>Make yourself at home.</h1>
          <label className="setting-row">
            <span>Sound effects</span>
            <input
              type="checkbox"
              checked={sound}
              onChange={(e) => setSound(e.target.checked)}
            />
          </label>
          <label className="setting-row">
            <span>Reduced motion</span>
            <input
              type="checkbox"
              checked={reduced}
              onChange={(e) => setReduced(e.target.checked)}
            />
          </label>
          <label className="setting-row">
            <span>Fast enemy turns</span>
            <input
              type="checkbox"
              checked={fast}
              onChange={(e) => setFast(e.target.checked)}
            />
          </label>
          <button
            className="secondary wide"
            onClick={() => download("chezz-" + game.seed + ".json", game)}
          >
            Export run & battle log ↗
          </button>
          <button
            className="secondary wide"
            onClick={() => {
              setSettings(false);
              setHelp(true);
            }}
          >
            How to play
          </button>
          <button
            className="text-button danger"
            onClick={() => {
              setSettings(false);
              setSeed(
                "VOID-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
              );
              setIntro(true);
            }}
          >
            Start a fresh run
          </button>
          <p className="muted">
            Your current run is replaced when you enter the in-between.
          </p>
        </Modal>
      )}
      {detail && (
        <Modal
          label={
            detail === "log"
              ? "Battle log"
              : (itemById(detail)?.name ?? "Details")
          }
          className="detail-modal"
          onClose={() => setDetail(null)}
        >
          {detail === "log" ? (
            <>
              <div className="eyebrow">THE ORDER OF THINGS</div>
              <h1>Echoes of this battle.</h1>
              <div className="full-log">
                {game.log.map((s, i) => (
                  <p key={i}>
                    <span>{String(game.log.length - i).padStart(2, "0")}</span>
                    {s}
                  </p>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="eyebrow">
                {itemById(detail).type.toUpperCase()}
              </div>
              <Art type={itemById(detail).art} />
              <h1>{itemById(detail).name}</h1>
              <p>{itemById(detail).desc}</p>
              <blockquote>{itemById(detail).flavor}</blockquote>
            </>
          )}
        </Modal>
      )}
      {debug && (
        <Modal
          label="Developer lab"
          className="debug-modal"
          onClose={() => setDebug(false)}
        >
          <div className="eyebrow">DEVELOPMENT TOOLS · CHANGES AUTOSAVE</div>
          <h1>The laboratory.</h1>
          <p>
            Load encounters and experiment with the current build. Restart an
            encounter to apply new maximum-health modifiers.
          </p>
          <div className="debug-grid">
            <label>
              Encounter
              <select
                value={game.floor}
                onChange={(e) => labEncounter(Number(e.target.value))}
              >
                {ENCOUNTERS.map((e, i) => (
                  <option value={i} key={e.name}>
                    {i + 1}. {e.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Grant gambit
              <select
                defaultValue=""
                onChange={(e) => {
                  const id = e.target.value as GambitId;
                  if (id)
                    setGame((g) => ({
                      ...g,
                      gambits: [...new Set([...g.gambits, id])].slice(-3),
                      serial: g.serial + 1,
                    }));
                  e.target.value = "";
                }}
              >
                <option value="">Choose…</option>
                {GAMBITS.map((i) => (
                  <option value={i.id} key={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Grant upgrade
              <select
                defaultValue=""
                onChange={(e) => {
                  const id = e.target.value as UpgradeId;
                  if (id)
                    setGame((g) => ({
                      ...g,
                      upgrades: [...new Set([...g.upgrades, id])],
                      serial: g.serial + 1,
                    }));
                  e.target.value = "";
                }}
              >
                <option value="">Choose…</option>
                {UPGRADES.map((i) => (
                  <option value={i.id} key={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Grant consumable
              <select
                defaultValue=""
                onChange={(e) => {
                  const id = e.target.value as ConsumableId;
                  if (id)
                    setGame((g) => ({
                      ...g,
                      inventory: [...g.inventory, id].slice(-2),
                      serial: g.serial + 1,
                    }));
                  e.target.value = "";
                }}
              >
                <option value="">Choose…</option>
                {CONSUMABLES.map((i) => (
                  <option value={i.id} key={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="debug-buttons">
            <button
              className="secondary"
              onClick={() => labEncounter(game.floor)}
            >
              Restart encounter
            </button>
            <button
              className="secondary"
              onClick={() => setGame((g) => ({ ...g, gold: g.gold + 50 }))}
            >
              +50 gold
            </button>
            <button
              className="secondary"
              onClick={() =>
                setGame((g) => ({
                  ...g,
                  kingHp: g.kingMax,
                  pieces: g.pieces.map((p) =>
                    p.side === "player" ? { ...p, hp: p.maxHp } : p,
                  ),
                  serial: g.serial + 1,
                }))
              }
            >
              Heal army
            </button>
            <button
              className="secondary"
              onClick={() => download("chezz-debug.json", game)}
            >
              Export state
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
