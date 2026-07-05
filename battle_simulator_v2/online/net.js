/**
 * 通信抽象（Net）。オンライン対戦のセッション(online.js)は、この最小APIだけに依存する。
 *   - Firebase Realtime Database 実装（本番）
 *   - Loopback 実装（同一ページ内の在メモリDB。ヘッドレスでの同期検証・開発用）
 *
 * Node API:
 *   child(path) -> Node
 *   set(v) / update(v) / push(v)->key / get()->v|null
 *   onValue(cb)->unsub        … ノードの値が変わるたび cb(value)
 *   onChildAdded(cb)->unsub   … 直下に子が追加されるたび cb(value, key)（既存子にも遡って発火）
 *   runTransaction(fn)->{committed,value} … fn(current)->newValue（undefinedで中断）
 */

import { FIREBASE_CONFIG, loadFirebase } from './firebase-config.js';

// ---------- Firebase 実装 ----------
let _fb = null; // { app, db, M } をキャッシュ（多重初期化防止）

async function ensureFirebase() {
  if (_fb) return _fb;
  const { appMod, dbMod } = await loadFirebase();
  const app = appMod.initializeApp(FIREBASE_CONFIG);
  const db = dbMod.getDatabase(app);
  _fb = { app, db, M: dbMod };
  return _fb;
}

function firebaseNode(fb, path) {
  const { db, M } = fb;
  const r = M.ref(db, path);
  return {
    child: (sub) => firebaseNode(fb, path + '/' + sub),
    set: (v) => M.set(r, v),
    update: (v) => M.update(r, v),
    push: async (v) => { const ref = await M.push(r, v); return ref.key; },
    get: async () => { const snap = await M.get(r); return snap.exists() ? snap.val() : null; },
    onValue: (cb) => M.onValue(r, (snap) => cb(snap.exists() ? snap.val() : null)),
    onChildAdded: (cb) => M.onChildAdded(r, (snap) => cb(snap.val(), snap.key)),
    runTransaction: async (fn) => {
      const res = await M.runTransaction(r, fn);
      return { committed: res.committed, value: res.snapshot.exists() ? res.snapshot.val() : null };
    },
  };
}

export async function createFirebaseNet() {
  const fb = await ensureFirebase();
  return { child: (path) => firebaseNode(fb, path) };
}

// ---------- Loopback 実装（在メモリ・同一ページ共有） ----------
// 'world' 単位で in-memory ツリーを共有する（同一ページ内に2つのNetを作ると同じworldを見る）。
const _worlds = new Map();
function getWorld(id) {
  if (!_worlds.has(id)) _worlds.set(id, { tree: {}, valueListeners: new Map(), childListeners: new Map(), seqKey: 0 });
  return _worlds.get(id);
}
function pathParts(p) { return p.split('/').filter(Boolean); }
function getAt(tree, parts) { let n = tree; for (const k of parts) { if (n == null) return null; n = n[k]; } return n === undefined ? null : n; }
function setAt(tree, parts, v) { let n = tree; for (let i = 0; i < parts.length - 1; i++) { n[parts[i]] = n[parts[i]] || {}; n = n[parts[i]]; } n[parts[parts.length - 1]] = v; }
function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }

function notify(world, path) {
  // この path と全祖先の onValue を発火（値変化）
  const parts = pathParts(path);
  for (let i = parts.length; i >= 0; i--) {
    const p = parts.slice(0, i).join('/');
    const ls = world.valueListeners.get(p);
    if (ls) { const val = clone(getAt(world.tree, pathParts(p))); for (const cb of ls) cb(val); }
  }
}

function loopbackNode(worldId, path) {
  const world = getWorld(worldId);
  return {
    child: (sub) => loopbackNode(worldId, path + '/' + sub),
    set: async (v) => { setAt(world.tree, pathParts(path), clone(v)); notify(world, path); },
    update: async (v) => {
      const cur = getAt(world.tree, pathParts(path)) || {};
      const merged = { ...cur, ...clone(v) };
      setAt(world.tree, pathParts(path), merged);
      notify(world, path);
    },
    push: async (v) => {
      const key = 'k' + String(world.seqKey++).padStart(8, '0');
      setAt(world.tree, pathParts(path + '/' + key), clone(v));
      // onChildAdded 発火
      const cls = world.childListeners.get(path);
      if (cls) for (const cb of cls) cb(clone(v), key);
      notify(world, path);
      return key;
    },
    get: async () => clone(getAt(world.tree, pathParts(path))),
    onValue: (cb) => {
      if (!world.valueListeners.has(path)) world.valueListeners.set(path, new Set());
      world.valueListeners.get(path).add(cb);
      cb(clone(getAt(world.tree, pathParts(path)))); // 初期値
      return () => world.valueListeners.get(path)?.delete(cb);
    },
    onChildAdded: (cb) => {
      if (!world.childListeners.has(path)) world.childListeners.set(path, new Set());
      world.childListeners.get(path).add(cb);
      const cur = getAt(world.tree, pathParts(path)); // 既存子に遡って発火
      if (cur && typeof cur === 'object') for (const k of Object.keys(cur)) cb(clone(cur[k]), k);
      return () => world.childListeners.get(path)?.delete(cb);
    },
    runTransaction: async (fn) => {
      const cur = clone(getAt(world.tree, pathParts(path)));
      const next = fn(cur);
      if (next === undefined) return { committed: false, value: cur };
      setAt(world.tree, pathParts(path), clone(next));
      notify(world, path);
      return { committed: true, value: clone(next) };
    },
  };
}

export function createLoopbackNet(worldId = 'default') {
  return { child: (path) => loopbackNode(worldId, path) };
}

/** 用途に応じた Net を作る。kind:'firebase'|'loopback'。 */
export async function createNet(kind = 'firebase', opts = {}) {
  if (kind === 'loopback') return createLoopbackNet(opts.world || 'default');
  return createFirebaseNet();
}
