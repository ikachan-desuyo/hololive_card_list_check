/**
 * リプレイの保存・読込（キャッシュ=localStorage / ファイル=replay_data/）。
 *
 * リプレイ1件のデータ形式:
 *   { v:1, id, name, a, b, seed, first, applied:[...], winner, turns, date, source:'cache'|'file', file? }
 *   ・a/b … デッキキー（test_deck のファイル名。プレイヤー1/2）
 *   ・seed/first … 乱数シードと先攻プレイヤー(0/1)
 *   ・applied … 全適用手ID列（これだけで対局を決定的に再現できる＝詳細ログ不要）
 *
 * キャッシュは localStorage キー 'bsv2_replays'（配列）。ファイルは replay_data/manifest.json（無ければ
 * ディレクトリ一覧をパース）から各JSONを読む（読み取り専用）。
 */

const LS_KEY = 'bsv2_replays';
const FILE_DIR = 'battle_simulator_v2/replay_data';

/** localStorage の安全な読み書き */
function readCacheRaw() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function writeCacheRaw(list) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); return true; } catch { return false; }
}

/** キャッシュのリプレイ一覧（新しい順） */
export function loadCacheReplays() {
  return readCacheRaw().map((r) => ({ ...r, source: 'cache' })).reverse();
}

/** リプレイをキャッシュへ保存。id が無ければ採番（UI側なので Date.now 使用可）。 */
export function saveReplayToCache(replay) {
  const list = readCacheRaw();
  const id = replay.id || ('r' + Date.now() + '_' + (list.length + 1));
  const rec = { v: 1, ...replay, id, source: undefined };
  delete rec.source;
  list.push(rec);
  const ok = writeCacheRaw(list);
  return ok ? id : null;
}

/** キャッシュのリプレイを削除 */
export function deleteCacheReplay(id) {
  const list = readCacheRaw().filter((r) => r.id !== id);
  return writeCacheRaw(list);
}

/** キャッシュ全リプレイを1つのJSON文字列へ（エクスポート用） */
export function exportCacheReplaysText() {
  return JSON.stringify({ v: 1, kind: 'bsv2-replays', replays: readCacheRaw() }, null, 1);
}

/**
 * インポート: JSON文字列（単一リプレイ / リプレイ配列 / {replays:[...]} のいずれか）をキャッシュへ追加。
 * @returns {number} 取り込んだ件数
 */
export function importReplaysText(text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('JSONとして読めません'); }
  let incoming = [];
  if (Array.isArray(data)) incoming = data;
  else if (data && Array.isArray(data.replays)) incoming = data.replays;
  else if (data && Array.isArray(data.applied)) incoming = [data]; // 単一リプレイ
  else throw new Error('リプレイデータの形式ではありません');
  const valid = incoming.filter((r) => r && Array.isArray(r.applied) && r.a && r.b);
  if (valid.length === 0) throw new Error('有効なリプレイがありません');
  const list = readCacheRaw();
  let n = 0;
  for (const r of valid) {
    const id = r.id || ('r' + Date.now() + '_' + (list.length + n + 1));
    list.push({ v: 1, ...r, id, source: undefined });
    n++;
  }
  writeCacheRaw(list);
  return n;
}

/** replay_data/ のファイル名一覧を得る（manifest.json 優先、無ければディレクトリ一覧をパース）。 */
async function listFileReplayNames() {
  // 1) manifest.json（本番GitHub Pages含めどこでも動く）
  try {
    const res = await fetch(`${FILE_DIR}/manifest.json`, { cache: 'no-store' });
    if (res.ok) {
      const arr = await res.json();
      if (Array.isArray(arr)) return arr.filter((x) => typeof x === 'string' && x.endsWith('.json'));
    }
  } catch { /* 次へ */ }
  // 2) ディレクトリ一覧（python http.server 等のローカル配信。manifest更新なしでファイル追加を拾える）
  try {
    const res = await fetch(`${FILE_DIR}/`, { cache: 'no-store' });
    if (res.ok) {
      const html = await res.text();
      const names = [...html.matchAll(/href="([^"]+\.json)"/g)].map((m) => decodeURIComponent(m[1].split('/').pop()));
      return [...new Set(names)].filter((n) => n !== 'manifest.json');
    }
  } catch { /* 無視 */ }
  return [];
}

/** replay_data/ の全リプレイ（読み取り専用） */
export async function loadFileReplays() {
  const names = await listFileReplayNames();
  const out = [];
  for (const name of names) {
    try {
      const res = await fetch(`${FILE_DIR}/${encodeURIComponent(name)}`, { cache: 'no-store' });
      if (!res.ok) continue;
      const r = await res.json();
      if (r && Array.isArray(r.applied) && r.a && r.b) {
        out.push({ v: 1, ...r, id: 'file:' + name, file: name, source: 'file' });
      }
    } catch { /* 壊れたファイルは飛ばす */ }
  }
  return out;
}

/** 表示用ラベル（一覧の各行）。 */
export function replayLabel(r) {
  const who = r.winner == null ? '' : ` / 勝者:${r.winner === 0 ? r.a : r.b}`;
  const t = r.turns ? ` / ${r.turns}T` : '';
  const d = r.date ? ` / ${String(r.date).slice(0, 10)}` : '';
  return `${r.name || `${r.a} vs ${r.b}`}${who}${t}${d}`;
}

/** 完了した engine の状態からリプレイデータを作る。 */
export function buildReplayFromEngine(engine, a, b, seed) {
  const s = engine.state;
  const winner = s.phase === 'ended' ? (s.winner === 'draw' ? null : s.winner) : null;
  return {
    v: 1,
    name: `${a} vs ${b}`,
    a, b,
    seed,
    first: s.firstPlayer ?? 0,
    applied: [...(s.appliedIds || [])],
    winner,
    turns: s.turn,
    date: new Date().toISOString().slice(0, 10),
  };
}
