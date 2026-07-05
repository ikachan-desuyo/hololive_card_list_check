/**
 * オンライン対戦セッション（ルーム管理＋手の同期）。UIには依存せず、コールバックで通知する。
 *
 * 設計（フレンド限定・隠匿なし）:
 *   - ルーム = 中央ハブ(Firebase等)上の「順序付き手ログ」。対戦者2人が手(apply ID)を追記、
 *     対戦者＋観戦者の全員が購読して各自のエンジンに同じ順で適用する（決定論なので全員一致）。
 *   - 観戦者はフルエンジンを回す＝両方の手札が見える。途中入室は過去の手ログを再適用して追いつく。
 *
 * データ構造(net):
 *   rooms/<code>/meta     : { v, status:'waiting'|'playing'|'ended', host, a,b, deckA,deckB, seed, first }
 *   rooms/<code>/players  : { p1:{name,uid}, p2:{name,uid} }
 *   rooms/<code>/moves/<k>: { seq, by, id }     // by=0/1, id=apply ID（'__concede:idx' は投了の特殊手）
 *
 * 手の責任者（誰がその決定を手ログに書くか）:
 *   - pending.player != null → そのプレイヤー
 *   - stepPause 等(player==null) → turnPlayer（手番側）。手番未確定の初期はホスト(0)。
 *   観戦者は決して書かない。
 */

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 紛らわしい文字を除外

function randCode(n = 5) {
  let s = '';
  for (let i = 0; i < n; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}
function randUid() { return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

export class OnlineSession {
  /** @param net Net（net.js） @param hooks { onStart(config), onMove(seq,id), onMeta(meta), onError(msg), onStatus(text) } */
  constructor(net, hooks = {}) {
    this.net = net;
    this.hooks = hooks;
    this.uid = randUid();
    this.code = null;
    this.room = null;
    this.myRole = null; // 'p1'|'p2'|'spectator'
    this.myIdx = null;   // 0|1|null
    this._meta = null;
    this._expectedSeq = 0; // 次に適用すべき手の seq
    this._buffer = new Map(); // seq -> id（順序待ちバッファ）
    this._started = false;
    this._writtenSeq = -1; // 二重書き込み防止
    this._unsubs = [];
  }

  _status(t) { this.hooks.onStatus?.(t); }
  _err(m) { this.hooks.onError?.(m); }

  /** ルームを作成（自分=p1=ホスト）。deckMap は自己完結のデッキ構成。 */
  async host({ name, deckKey, deckMap }) {
    const code = randCode();
    this.code = code;
    this.room = this.net.child('rooms/' + code);
    this.myRole = 'p1';
    this.myIdx = 0;
    await this.room.child('meta').set({
      v: 1, status: 'waiting', host: this.uid,
      a: deckKey || 'P1', deckA: deckMap || null,
      b: null, deckB: null, seed: null, first: null,
    });
    await this.room.child('players/p1').set({ name: name || 'プレイヤー1', uid: this.uid });
    this._subscribe();
    this._status(`ルーム作成: コード ${code}（相手の参加を待っています）`);
    return code;
  }

  /** ルームに参加（空きがあれば p2、無ければ観戦）。 */
  async join(code, { name, deckKey, deckMap }) {
    code = (code || '').trim().toUpperCase();
    this.code = code;
    this.room = this.net.child('rooms/' + code);
    const meta = await this.room.child('meta').get();
    if (!meta) { this._err(`ルームが見つかりません: ${code}`); return null; }
    // p2 スロットをトランザクションで確保
    const res = await this.room.child('players/p2').runTransaction((cur) => (cur ? undefined : { name: name || 'プレイヤー2', uid: this.uid }));
    if (res.committed && res.value?.uid === this.uid) {
      this.myRole = 'p2'; this.myIdx = 1;
      await this.room.child('meta').update({ b: deckKey || 'P2', deckB: deckMap || null });
      this._subscribe();
      this._status('参加しました（p2）。対局開始を準備中…');
      return 'p2';
    }
    // 満員 → 観戦
    return this.spectate(code, { name });
  }

  /** 観戦で参加（読み取り専用）。 */
  async spectate(code, { name }) {
    code = (code || '').trim().toUpperCase();
    this.code = code;
    this.room = this.net.child('rooms/' + code);
    const meta = await this.room.child('meta').get();
    if (!meta) { this._err(`ルームが見つかりません: ${code}`); return null; }
    this.myRole = 'spectator'; this.myIdx = null;
    await this.room.child('spectators/' + this.uid).set({ name: name || '観戦者' });
    this._subscribe();
    this._status('観戦で参加しました。');
    return 'spectator';
  }

  /** meta と moves を購読。meta が playing になったらエンジン開始→手ログ適用を始める。 */
  _subscribe() {
    this._unsubs.push(this.room.child('meta').onValue((meta) => {
      if (!meta) return;
      this._meta = meta;
      this.hooks.onMeta?.(meta);
      // ホストは両デッキが揃ったら対局を開始（seed/first を決めて status=playing）
      if (this.myRole === 'p1' && meta.status === 'waiting' && meta.deckA && meta.deckB) {
        const seed = (Math.floor(Math.random() * 1e9)) >>> 0;
        const first = Math.random() < 0.5 ? 0 : 1;
        this.room.child('meta').update({ status: 'playing', seed, first });
      }
      // 全員: playing になったらエンジン構築（1回だけ）→ 手ログ購読開始
      if (meta.status === 'playing' && !this._started) {
        this._started = true;
        this.hooks.onStart?.({
          a: meta.a, b: meta.b, deckA: meta.deckA, deckB: meta.deckB,
          seed: meta.seed, first: meta.first,
          myIdx: this.myIdx, myRole: this.myRole, spectator: this.myRole === 'spectator',
        });
        // エンジン構築後に手ログを適用開始（過去手にも遡って届く＝途中入室でも追いつく）
        this._unsubs.push(this.room.child('moves').onChildAdded((mv) => this._onMove(mv)));
      }
    }));
  }

  /** 受信した手をseq順に適用（重複/順序ズレに耐性）。 */
  _onMove(mv) {
    if (!mv || typeof mv.seq !== 'number') return;
    if (mv.seq < this._expectedSeq) return; // 適用済み（重複）
    this._buffer.set(mv.seq, mv.id);
    while (this._buffer.has(this._expectedSeq)) {
      const id = this._buffer.get(this._expectedSeq);
      this._buffer.delete(this._expectedSeq);
      this.hooks.onMove?.(this._expectedSeq, id);
      this._expectedSeq++;
    }
  }

  /** 自分の手を手ログに追記。seq は現在の適用済み数（重複防止）。 */
  async writeMove(id) {
    if (this.myRole === 'spectator') return;
    const seq = this._expectedSeq;
    if (seq <= this._writtenSeq) return; // 同じseqの二重書き込みを防ぐ
    this._writtenSeq = seq;
    try { await this.room.child('moves').push({ seq, by: this.myIdx, id }); }
    catch (e) { this._err('送信に失敗: ' + e.message); }
  }

  /** 投了（特殊手）。全員のエンジンで concede させる。 */
  async concede() {
    if (this.myIdx == null) return;
    await this.writeMove('__concede:' + this.myIdx);
  }

  /** 退室。購読解除＋自分の痕跡を消す（任意）。 */
  async leave() {
    for (const u of this._unsubs) { try { u(); } catch { /* noop */ } }
    this._unsubs = [];
    try {
      if (this.myRole === 'spectator' && this.room) await this.room.child('spectators/' + this.uid).set(null);
    } catch { /* noop */ }
  }
}
