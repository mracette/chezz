import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { Game, Piece, DangerSquare } from "../game/engine";
import {
  attackSquares,
  coord,
  isHole,
  moves,
  movementPath,
  pieceAt,
  same,
  targets,
  upgraded,
} from "../game/engine";
import { PIECES } from "../game/content";
import type { Pos } from "../game/content";
import type { Forecast } from "../components/AttackPreview";

type Props = {
  game: Game;
  selected: string | null;
  hover: Pos | null;
  onSquare: (p: Pos) => void;
  onHover: (p: Pos | null) => void;
  threats: boolean;
  reduced: boolean;
  tool: string | null;
  trapFirst: Pos | null;
  forecast: Forecast[];
  danger: DangerSquare[];
  dangerFocus: string | null;
};
const IVORY = 0xe6e0cd,
  MINT = 0x00d9ff,
  CORAL = 0xff3b45,
  READY = 0x4dff88,
  MOVED = 0xffbd32,
  DONE = 0x526378;
function mesh(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  parent: THREE.Object3D,
  x = 0,
  y = 0,
  z = 0,
) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function cylinder(
  parent: THREE.Object3D,
  mat: THREE.Material,
  rt: number,
  rb: number,
  h: number,
  y: number,
) {
  return mesh(new THREE.CylinderGeometry(rt, rb, h, 32), mat, parent, 0, y, 0);
}
function ring(
  parent: THREE.Object3D,
  mat: THREE.Material,
  r: number,
  t: number,
  y: number,
) {
  const m = mesh(new THREE.TorusGeometry(r, t, 6, 64), mat, parent, 0, y, 0);
  m.rotation.x = Math.PI / 2;
  m.castShadow = false;
  m.receiveShadow = false;
  return m;
}
function makePiece(p: Piece, isUpgraded: boolean) {
  const group = new THREE.Group();
  const pale = p.side === "player";
  const body = new THREE.MeshStandardMaterial({
    color: pale ? IVORY : 0x382a35,
    roughness: pale ? 0.25 : 0.31,
    metalness: pale ? 0.22 : 0.52,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: pale ? 0xa6c9bd : 0xb66555,
    metalness: 0.7,
    roughness: 0.27,
  });
  const glow = new THREE.MeshBasicMaterial({
    color: pale ? READY : CORAL,
    toneMapped: false,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x14212b,
    roughness: 0.8,
  });
  cylinder(group, body, 0.31, 0.34, 0.09, 0.06);
  cylinder(group, accent, 0.285, 0.31, 0.04, 0.125);
  cylinder(group, body, 0.23, 0.28, 0.075, 0.18);
  const profile = [
    [0.21, 0.2],
    [0.19, 0.25],
    [0.135, 0.32],
    [0.1, 0.47],
    [0.14, 0.55],
    [0.19, 0.58],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  if (p.kind !== "rook")
    mesh(new THREE.LatheGeometry(profile, 32), body, group);
  if (p.kind === "pawn") {
    cylinder(group, accent, 0.16, 0.18, 0.05, 0.58);
    mesh(new THREE.SphereGeometry(0.16, 24, 16), body, group, 0, 0.76);
  }
  if (p.kind === "rook") {
    cylinder(group, body, 0.24, 0.2, 0.39, 0.42);
    cylinder(group, accent, 0.27, 0.24, 0.035, 0.63);
    cylinder(group, body, 0.28, 0.26, 0.15, 0.72);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      mesh(
        new THREE.BoxGeometry(0.15, 0.18, 0.15),
        body,
        group,
        Math.cos(a) * 0.2,
        isUpgraded ? 0.99 : 0.85,
        Math.sin(a) * 0.2,
      );
    }
    if (isUpgraded) ring(group, glow, 0.27, 0.013, 0.87);
  }
  if (p.kind === "bishop") {
    cylinder(group, accent, 0.2, 0.17, 0.055, 0.6);
    const head = mesh(
      new THREE.SphereGeometry(0.19, 24, 20),
      body,
      group,
      0,
      0.84,
    );
    head.scale.set(0.82, 1.35, 0.82);
    const slit = mesh(
      new THREE.BoxGeometry(0.035, 0.24, 0.33),
      dark,
      group,
      0.025,
      0.87,
      0,
    );
    slit.rotation.z = -0.4;
    mesh(new THREE.SphereGeometry(0.045, 12, 8), accent, group, 0, 1.13);
    if (isUpgraded) {
      const h = ring(group, glow, 0.26, 0.012, 0.88);
      h.rotation.z = 0.4;
    }
  }
  if (p.kind === "knight") {
    cylinder(group, accent, 0.18, 0.18, 0.04, 0.58);
    const s = new THREE.Shape();
    s.moveTo(-0.18, 0.48);
    s.lineTo(-0.19, 0.74);
    s.lineTo(-0.07, 0.91);
    s.lineTo(0.02, 1.02);
    s.lineTo(0.12, 1.03);
    s.lineTo(0.14, 0.9);
    s.lineTo(0.28, 0.79);
    s.lineTo(0.27, 0.66);
    s.lineTo(0.14, 0.67);
    s.lineTo(0.06, 0.71);
    s.lineTo(0.1, 0.49);
    s.closePath();
    const horse = mesh(
      new THREE.ExtrudeGeometry(s, {
        depth: 0.2,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.025,
        bevelThickness: 0.025,
      }),
      body,
      group,
      0,
      0,
      -0.1,
    );
    horse.rotation.y = p.side === "player" ? Math.PI : 0;
    const eye = mesh(
      new THREE.SphereGeometry(0.022, 10, 8),
      glow,
      horse,
      0.12,
      0.85,
      0.235,
    );
    eye.castShadow = false;
  }
  if (p.kind === "queen") {
    cylinder(group, body, 0.135, 0.16, 0.16, 0.65);
    cylinder(group, accent, 0.22, 0.16, 0.045, 0.76);
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      const point = mesh(
        new THREE.ConeGeometry(0.065, 0.22, 5),
        body,
        group,
        Math.cos(a) * 0.14,
        0.88,
        Math.sin(a) * 0.14,
      );
      point.rotation.z = -Math.cos(a) * 0.2;
    }
    mesh(new THREE.SphereGeometry(0.06, 16, 12), accent, group, 0, 0.91);
    ring(group, glow, 0.23, 0.011, 1.13);
    ring(group, accent, 0.17, 0.012, 1.27);
  }
  if (p.kind === "king") {
    cylinder(group, body, 0.13, 0.16, 0.18, 0.66);
    cylinder(group, accent, 0.21, 0.13, 0.07, 0.79);
    cylinder(group, body, 0.13, 0.2, 0.12, 0.88);
    mesh(new THREE.BoxGeometry(0.065, 0.28, 0.065), body, group, 0, 1.08);
    mesh(new THREE.BoxGeometry(0.21, 0.065, 0.065), body, group, 0, 1.11);
    ring(group, accent, 0.31, 0.011, 1.38);
  }
  ring(group, glow, 0.285, 0.009, 0.16);
  if (pale) ring(group, glow, 0.36, 0.028, 0.04);
  if (isUpgraded && p.kind !== "bishop" && p.kind !== "rook")
    ring(group, glow, 0.32, 0.012, 0.43);
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const texture = new THREE.CanvasTexture(canvas);
  const bar = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      depthTest: false,
      transparent: true,
    }),
  );
  bar.scale.set(0.7, 0.35, 1);
  bar.position.set(
    0,
    p.kind === "pawn"
      ? 1.02
      : p.kind === "rook"
        ? 1.18
        : p.kind === "king"
          ? 1.58
          : p.kind === "queen"
            ? 1.5
            : 1.3,
    0,
  );
  bar.renderOrder = 5;
  group.add(bar);
  group.userData = {
    id: p.id,
    canvas,
    texture,
    bar,
    body,
    accent,
    glow,
    piece: p,
    upgraded: isUpgraded,
  };
  return group;
}
function health(group: THREE.Group, p: Piece, selected: boolean, after = p.hp) {
  const { canvas, texture } = group.userData;
  const c = canvas.getContext("2d") as CanvasRenderingContext2D;
  c.clearRect(0, 0, 128, 64);
  c.fillStyle = "#070d14";
  c.fillRect(3, 8, 122, 14);
  c.strokeStyle = selected ? "#f2ddae" : "#57646a";
  c.lineWidth = 2;
  c.strokeRect(3, 8, 122, 14);
  const status = p.acted ? "#8291a6" : p.moved ? "#ffbd32" : "#4dff88";
  c.fillStyle = p.side === "player" ? status : "#ff6269";
  c.fillRect(6, 11, 116 * Math.max(0, p.hp / p.maxHp), 8);
  if (after < p.hp) {
    const start = 6 + (116 * after) / p.maxHp;
    const width = (116 * (p.hp - after)) / p.maxHp;
    c.fillStyle = "#fff0cf";
    c.fillRect(start, 11, width, 8);
    c.fillStyle = "#ff3b45";
    for (let x = start; x < start + width; x += 8)
      c.fillRect(x, 11, Math.min(3, start + width - x), 8);
  }
  if (p.side === "player") {
    c.fillStyle = "#070d14";
    c.fillRect(15, 28, 98, 27);
    c.fillStyle = status;
    c.font = "bold 21px monospace";
    c.textAlign = "center";
    c.fillText(p.acted ? "✓ DONE" : p.moved ? "MOVED" : "READY", 64, 49);
  }
  texture.needsUpdate = true;
}
function disposeObject(o: THREE.Object3D) {
  o.traverse((c) => {
    if (
      c instanceof THREE.Mesh ||
      c instanceof THREE.Line ||
      c instanceof THREE.Points
    ) {
      c.geometry.dispose();
      const ms = Array.isArray(c.material) ? c.material : [c.material];
      ms.forEach((m) => m.dispose());
    }
    if (c instanceof THREE.Sprite) {
      c.material.map?.dispose();
      c.material.dispose();
    }
  });
}

export default function Board(props: Props) {
  const host = useRef<HTMLDivElement>(null),
    latest = useRef(props);
  latest.current = props;
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    if (!host.current) return;
    const container = host.current;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setFallback(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.14;
    container.appendChild(renderer.domElement);
    renderer.domElement.setAttribute(
      "aria-label",
      "Interactive three-dimensional Chezz board",
    );
    renderer.domElement.setAttribute("role", "img");
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-5.9, 5.9, 5.6, -5.6, 0.1, 100);
    camera.position.set(0, 12.3, 10.5);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xd3ecea, 0x243340, 1.35));
    const key = new THREE.DirectionalLight(0xffe9ce, 3);
    key.position.set(-3, 9, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -6;
    key.shadow.camera.right = 6;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    key.shadow.normalBias = 0.035;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x61aaba, 2.5);
    rim.position.set(5, 4, -5);
    scene.add(rim);
    const warmth = new THREE.PointLight(0xde836c, 18, 18);
    warmth.position.set(-5, 3, -4);
    scene.add(warmth);
    const board = new THREE.Group();
    scene.add(board);
    const tiles: THREE.Mesh[] = [];
    const tileGeo = new THREE.BoxGeometry(0.985, 0.21, 0.985);
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        const mat = new THREE.MeshStandardMaterial({
          color: (x + y) % 2 === 0 ? 0x809b9d : 0x203d49,
          roughness: 0.68,
          metalness: 0.2,
        });
        const t = mesh(tileGeo.clone(), mat, board, x - 3.5, -0.13, y - 3.5);
        t.userData = { pos: { x, y }, baseColor: mat.color.clone() };
        tiles.push(t);
      }
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0x9f9985,
      metalness: 0.75,
      roughness: 0.35,
    });
    for (const x of [-4.08, 4.08])
      mesh(new THREE.BoxGeometry(0.1, 0.3, 8.25), edgeMat, board, x, -0.15, 0);
    for (const z of [-4.08, 4.08])
      mesh(new THREE.BoxGeometry(8.25, 0.3, 0.1), edgeMat, board, 0, -0.15, z);
    const underside = new THREE.MeshStandardMaterial({
      color: 0x101c26,
      metalness: 0.4,
      roughness: 0.6,
    });
    for (const x of [-4.06, 4.06])
      mesh(
        new THREE.BoxGeometry(0.2, 0.55, 8.15),
        underside,
        board,
        x,
        -0.49,
        0,
      );
    for (const z of [-4.06, 4.06])
      mesh(
        new THREE.BoxGeometry(8.15, 0.55, 0.2),
        underside,
        board,
        0,
        -0.49,
        z,
      );
    // Coordinates are real board labels and remain fixed when the camera responds to resizing.
    for (let i = 0; i < 8; i++) {
      for (const type of ["file", "rank"]) {
        const c = document.createElement("canvas");
        c.width = 64;
        c.height = 64;
        const ctx = c.getContext("2d")!;
        ctx.fillStyle = "#a8b7b3";
        ctx.font = "28px Georgia";
        ctx.textAlign = "center";
        ctx.fillText(type === "file" ? "ABCDEFGH"[i] : String(8 - i), 32, 42);
        const label = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: new THREE.CanvasTexture(c),
            transparent: true,
            opacity: 0.75,
          }),
        );
        label.scale.set(0.28, 0.28, 1);
        label.position.set(
          type === "file" ? i - 3.5 : -4.38,
          -0.06,
          type === "file" ? 4.42 : i - 3.5,
        );
        board.add(label);
      }
    }
    const ornaments = new THREE.Group();
    scene.add(ornaments);
    const orbitMat = new THREE.MeshBasicMaterial({
      color: 0xb29b77,
      transparent: true,
      opacity: 0.18,
    });
    const orbit = ring(ornaments, orbitMat, 5.35, 0.008, -0.9);
    orbit.rotation.set(-1.1, 0.3, 0.5);
    const dots = new THREE.BufferGeometry();
    const coords = new Float32Array(90 * 3);
    for (let i = 0; i < 90; i++) {
      coords[i * 3] = Math.sin(i * 127.1) * 10;
      coords[i * 3 + 1] = Math.cos(i * 97.3) * 3 - 1;
      coords[i * 3 + 2] = Math.sin(i * 37.7) * 9;
    }
    dots.setAttribute("position", new THREE.BufferAttribute(coords, 3));
    const particles = new THREE.Points(
      dots,
      new THREE.PointsMaterial({
        color: 0xbddbd2,
        size: 0.025,
        transparent: true,
        opacity: 0.5,
      }),
    );
    ornaments.add(particles);
    const pieceGroups = new Map<string, THREE.Group>();
    const highlightGroup = new THREE.Group();
    scene.add(highlightGroup);
    const hitGroup = new THREE.Group();
    scene.add(hitGroup);
    let hitLife = 0;
    const raycaster = new THREE.Raycaster(),
      pointer = new THREE.Vector2();
    let prevKey = "",
      previousPieces: Piece[] = [],
      frame = 0,
      hoverKey = "",
      needsRender = true;
    const pick = (e: PointerEvent): Pos | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      // A legal highlighted target must remain clickable even when the active
      // piece's tall silhouette overlaps it in the orthographic projection.
      const tileHit = raycaster.intersectObjects(tiles, false)[0];
      const selectedPiece = latest.current.game.pieces.find(
        (p) => p.id === latest.current.selected,
      );
      if (tileHit && selectedPiece?.side === "player") {
        const pos = tileHit.object.userData.pos;
        if (
          targets(latest.current.game, selectedPiece).some((p) => same(p, pos))
        )
          return pos;
      }
      const hits = raycaster.intersectObjects(
        [...pieceGroups.values(), ...tiles],
        true,
      );
      for (const hit of hits) {
        if (hit.object instanceof THREE.Sprite) continue;
        let o: THREE.Object3D | null = hit.object;
        while (o) {
          if (o.userData.id) {
            const p = latest.current.game.pieces.find(
              (p) => p.id === o!.userData.id,
            );
            if (p) return { x: p.x, y: p.y };
          }
          if (o.userData.pos) return o.userData.pos;
          o = o.parent;
        }
      }
      return null;
    };
    const onClick = (e: PointerEvent) => {
      const p = pick(e);
      if (p) latest.current.onSquare(p);
    };
    const onMove = (e: PointerEvent) => {
      const p = pick(e);
      const k = p ? coord(p) : "";
      if (k !== hoverKey) {
        hoverKey = k;
        latest.current.onHover(p);
      }
      renderer.domElement.style.cursor = p ? "pointer" : "default";
    };
    const onLeave = () => {
      hoverKey = "";
      if (document.activeElement?.closest('[aria-label="Board squares"]'))
        return;
      latest.current.onHover(null);
    };
    renderer.domElement.addEventListener("pointerup", onClick);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerleave", onLeave);
    const resize = () => {
      const w = container.clientWidth,
        h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      const aspect = w / h;
      const height = Math.max(7.75, 9.5 / aspect);
      camera.left = (-height * aspect) / 2;
      camera.right = (height * aspect) / 2;
      camera.top = height / 2;
      camera.bottom = -height / 2;
      camera.updateProjectionMatrix();
      needsRender = true;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    function draw(t: number) {
      const {
        game: g,
        selected,
        hover,
        threats,
        reduced,
        tool,
        trapFirst,
      } = latest.current;
      const key =
        g.seed +
        "|" +
        g.set +
        "|" +
        g.serial +
        "|" +
        selected +
        "|" +
        threats +
        "|" +
        tool +
        "|" +
        (trapFirst ? coord(trapFirst) : "") +
        "|" +
        g.screen +
        "|" +
        (hover ? coord(hover) : "");
      const changed = key !== prevKey;
      if (key !== prevKey) {
        for (const tile of tiles) {
          const p = tile.userData.pos;
          const hole = isHole(g, p);
          tile.visible = !hole;
          const m = tile.material as THREE.MeshStandardMaterial;
          m.color.copy(tile.userData.baseColor);
          m.emissive.setHex(0);
        }
        for (const [id, obj] of pieceGroups)
          if (!g.pieces.some((p) => p.id === id)) {
            disposeObject(obj);
            scene.remove(obj);
            pieceGroups.delete(id);
          }
        for (const p of g.pieces) {
          let obj = pieceGroups.get(p.id);
          const up = upgraded(g, p);
          if (
            obj &&
            (obj.userData.upgraded !== up || obj.userData.piece.kind !== p.kind)
          ) {
            scene.remove(obj);
            disposeObject(obj);
            pieceGroups.delete(p.id);
            obj = undefined;
          }
          if (!obj) {
            obj = makePiece(p, up);
            obj.position.set(p.x - 3.5, 0, p.y - 3.5);
            pieceGroups.set(p.id, obj);
            scene.add(obj);
          }
          obj.userData.piece = p;
          health(
            obj,
            p,
            selected === p.id,
            latest.current.forecast.find((f) => f.piece.id === p.id)?.after,
          );
          (obj.userData.body as THREE.MeshStandardMaterial).emissive.setHex(
            p.side === "player"
              ? p.acted
                ? 0
                : p.moved
                  ? 0x493000
                  : 0x06351a
              : selected === p.id
                ? 0x421c1c
                : 0,
          );
          (obj.userData.body as THREE.MeshStandardMaterial).color.setHex(
            p.side === "player"
              ? p.acted
                ? 0x435268
                : p.moved
                  ? 0xffce70
                  : IVORY
              : 0x382a35,
          );
          if (p.side === "player") {
            (obj.userData.glow as THREE.MeshBasicMaterial).color.setHex(
              p.acted ? DONE : p.moved ? MOVED : READY,
            );
            (obj.userData.accent as THREE.MeshStandardMaterial).color.setHex(
              p.acted ? DONE : p.moved ? MOVED : 0xa6c9bd,
            );
          }
        }
        highlightGroup.children.forEach(disposeObject);
        highlightGroup.clear();
        const mark = (
          pos: Pos,
          color: number,
          fill = false,
          opacity = 0.55,
          borderOpacity = 0.8,
        ) => {
          if (fill) {
            const q = mesh(
              new THREE.PlaneGeometry(0.89, 0.89),
              new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity,
                toneMapped: false,
                depthWrite: false,
                side: THREE.DoubleSide,
              }),
              highlightGroup,
              pos.x - 3.5,
              0.02,
              pos.y - 3.5,
            );
            q.rotation.x = -Math.PI / 2;
          }
          const points = [
            [-0.45, -0.45],
            [0.45, -0.45],
            [0.45, 0.45],
            [-0.45, 0.45],
            [-0.45, -0.45],
          ].map(
            ([x, z]) =>
              new THREE.Vector3(pos.x - 3.5 + x, 0.012, pos.y - 3.5 + z),
          );
          const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(points),
            new THREE.LineBasicMaterial({
              color,
              transparent: true,
              opacity: borderOpacity,
              toneMapped: false,
            }),
          );
          highlightGroup.add(line);
        };
        const selectedPiece = g.pieces.find((p) => p.id === selected);
        const reachable = new Set(
          selectedPiece?.side === "player"
            ? moves(g, selectedPiece).map(coord)
            : [],
        );
        if (latest.current.danger.length) {
          for (const q of latest.current.danger) {
            const focused = latest.current.dangerFocus;
            const muted = !!focused && !q.attackers.includes(focused);
            const intensity = muted
              ? 0.08
              : focused
                ? 0.65
                : Math.min(0.8, 0.28 + 0.13 * q.attackers.length);
            mark(
              q,
              CORAL,
              !reachable.has(coord(q)) &&
                !same(q, selectedPiece ?? { x: -1, y: -1 }),
              intensity,
              muted ? 0.15 : 0.8,
            );
            // Keep a solid red border visible on cyan movement squares.
            for (const [x, z, w, h] of [
              [0, -0.46, 0.96, 0.045],
              [0, 0.46, 0.96, 0.045],
              [-0.46, 0, 0.045, 0.96],
              [0.46, 0, 0.045, 0.96],
            ]) {
              const edge = mesh(
                new THREE.PlaneGeometry(w, h),
                new THREE.MeshBasicMaterial({
                  color: CORAL,
                  transparent: true,
                  opacity: muted ? 0.15 : Math.min(1, intensity + 0.3),
                  side: THREE.DoubleSide,
                  toneMapped: false,
                }),
                highlightGroup,
                q.x - 3.5 + x,
                0.03,
                q.y - 3.5 + z,
              );
              edge.rotation.x = -Math.PI / 2;
              edge.castShadow = false;
              edge.receiveShadow = false;
            }
          }
        }
        if (selectedPiece) {
          mark(selectedPiece, 0xe9d4a4, true);
          if (
            selectedPiece.side === "player" &&
            g.turn === "player" &&
            g.screen === "battle"
          ) {
            for (const p of moves(g, selectedPiece)) mark(p, MINT, true);
            for (const p of attackSquares(g, selectedPiece))
              if (pieceAt(g, p)?.side === "enemy") {
                mark(p, CORAL, true, 0.75);
                const target = mesh(
                  new THREE.RingGeometry(0.29, 0.34, 4),
                  new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    side: THREE.DoubleSide,
                    toneMapped: false,
                  }),
                  highlightGroup,
                  p.x - 3.5,
                  0.035,
                  p.y - 3.5,
                );
                target.rotation.x = -Math.PI / 2;
                target.castShadow = false;
                target.receiveShadow = false;
              }
          }
          if (hover && selectedPiece.side === "player" && g.turn === "player") {
            const path = movementPath(g, selectedPiece, hover);
            if (path.length) {
              const points = path.map(
                (p) => new THREE.Vector3(p.x - 3.5, 0.055, p.y - 3.5),
              );
              const line = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(points),
                new THREE.LineDashedMaterial({
                  color: MINT,
                  dashSize: 0.12,
                  gapSize: 0.08,
                  transparent: true,
                  opacity: 0.9,
                }),
              );
              line.computeLineDistances();
              highlightGroup.add(line);
              const dot = mesh(
                new THREE.RingGeometry(0.09, 0.12, 24),
                new THREE.MeshBasicMaterial({
                  color: MINT,
                  side: THREE.DoubleSide,
                }),
                highlightGroup,
                hover.x - 3.5,
                0.06,
                hover.y - 3.5,
              );
              dot.rotation.x = -Math.PI / 2;
            }
          }
        }
        if (g.trap) for (const p of g.trap) mark(p, 0xc5a1ff, true);
        if (trapFirst) mark(trapFirst, 0xc5a1ff, true);
        for (const p of g.holes) {
          const glow = ring(
            highlightGroup,
            new THREE.MeshBasicMaterial({
              color: 0x9287ce,
              transparent: true,
              opacity: 0.65,
            }),
            0.34,
            0.013,
            -0.2,
          );
          glow.position.x = p.x - 3.5;
          glow.position.z = p.y - 3.5;
          const lower = ring(
            highlightGroup,
            new THREE.MeshBasicMaterial({
              color: 0x479498,
              transparent: true,
              opacity: 0.4,
            }),
            0.22,
            0.01,
            -0.65,
          );
          lower.position.x = p.x - 3.5;
          lower.position.z = p.y - 3.5;
        }
        if (previousPieces.length && g.serial > 0) {
          const changed = previousPieces.filter((p) => {
            const now = g.pieces.find((n) => n.id === p.id);
            return !now || now.hp < p.hp;
          });
          if (changed.length) {
            hitGroup.children.forEach(disposeObject);
            hitGroup.clear();
            hitLife = reduced ? 0 : 1;
            for (const p of changed) {
              for (let i = 0; i < 10; i++) {
                const q = mesh(
                  new THREE.OctahedronGeometry(0.035),
                  new THREE.MeshBasicMaterial({
                    color: p.side === "enemy" ? CORAL : MINT,
                    transparent: true,
                  }),
                  hitGroup,
                  p.x - 3.5,
                  0.5,
                  p.y - 3.5,
                );
                q.userData = {
                  vx: Math.sin(i * 2.4) * 0.035,
                  vz: Math.cos(i * 2.4) * 0.035,
                  vy: 0.025 + i * 0.004,
                };
              }
              const current = g.pieces.find((u) => u.id === p.id);
              const c = document.createElement("canvas");
              c.width = 128;
              c.height = 64;
              const ctx = c.getContext("2d")!;
              ctx.font = "bold 42px Georgia";
              ctx.textAlign = "center";
              ctx.strokeStyle = "#07121d";
              ctx.lineWidth = 5;
              const label = current ? "−" + (p.hp - current.hp) : "✧";
              ctx.strokeText(label, 64, 47);
              ctx.fillStyle = p.side === "enemy" ? "#f4b29b" : "#a6e8cc";
              ctx.fillText(label, 64, 47);
              const text = new THREE.Sprite(
                new THREE.SpriteMaterial({
                  map: new THREE.CanvasTexture(c),
                  depthTest: false,
                  transparent: true,
                }),
              );
              text.scale.set(0.8, 0.4, 1);
              text.position.set(p.x - 3.5, 1.35, p.y - 3.5);
              text.userData = { vx: 0, vz: 0, vy: 0.012 };
              hitGroup.add(text);
            }
          }
        }
        previousPieces = structuredClone(g.pieces);
        prevKey = key;
      }
      for (const obj of pieceGroups.values()) {
        const p: Piece = obj.userData.piece;
        const speed = reduced ? 1 : 0.18;
        obj.position.x += (p.x - 3.5 - obj.position.x) * speed;
        obj.position.z += (p.y - 3.5 - obj.position.z) * speed;
        const lifted = selected === p.id ? 0.12 : 0;
        obj.position.y += (lifted - obj.position.y) * (reduced ? 1 : 0.12);
        if (!reduced && (p.kind === "queen" || p.kind === "king"))
          for (const child of obj.children)
            if (
              child instanceof THREE.Mesh &&
              child.geometry instanceof THREE.TorusGeometry &&
              child.position.y > 1
            ) {
              child.rotation.z = Math.sin(t * 0.0007) * 0.14;
              child.rotation.y = Math.sin(t * 0.0005) * 0.2;
            }
      }
      if (!reduced) {
        ornaments.rotation.y = Math.sin(t * 0.00006) * 0.05;
        particles.position.y = Math.sin(t * 0.0003) * 0.12;
        if (hitLife > 0) {
          hitLife -= 0.035;
          for (const c of hitGroup.children) {
            c.position.x += c.userData.vx;
            c.position.z += c.userData.vz;
            c.position.y += c.userData.vy;
            (
              c as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>
            ).material.opacity = Math.max(0, hitLife);
          }
        }
      }
      if (!reduced || changed || needsRender) {
        renderer.render(scene, camera);
        needsRender = false;
      }
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerup", onClick);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerleave", onLeave);
      disposeObject(scene);
      dots.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return (
    <div className="board-wrap">
      <div className="three-board" ref={host} />
      <div
        className={fallback ? "fallback-board" : "sr-only"}
        role="group"
        aria-label="Board squares"
      >
        {Array.from({ length: 64 }, (_, i) => {
          const p = { x: i % 8, y: Math.floor(i / 8) },
            unit = pieceAt(props.game, p);
          return (
            <button
              key={i}
              aria-label={
                coord(p) +
                (unit
                  ? " " +
                    unit.side +
                    " " +
                    unit.kind +
                    " " +
                    unit.hp +
                    " health"
                  : isHole(props.game, p)
                    ? " void"
                    : " empty")
              }
              onClick={() => props.onSquare(p)}
              aria-description={
                props.danger.some((q) => same(q, p))
                  ? `Danger: ${props.danger.find((q) => same(q, p))!.attackers.length} enemies can attack this square after moving`
                  : undefined
              }
              onFocus={() => props.onHover(p)}
              onBlur={() => props.onHover(null)}
              onMouseEnter={fallback ? () => props.onHover(p) : undefined}
              onMouseLeave={fallback ? () => props.onHover(null) : undefined}
            >
              {unit ? PIECES[unit.kind].symbol : ""}
            </button>
          );
        })}
      </div>
      {fallback && (
        <p className="fallback-notice">
          WebGL is unavailable. The complete game is playable on this simplified
          board.
        </p>
      )}
    </div>
  );
}
