/**
 * 七詩ムメイ (hYS01-001) 推しホロメン・白・ライフ5
 *
 * 推しスキル「ホワイトバトン」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の白コラボホロメンのアーツ+20。
 *   → oshiSkill（能動・メイン起動型）。対象は「白いコラボホロメン」（トップカードの色が白で、
 *     コラボポジションにいるホロメン）。選択は不要で、コラボに白ホロメンがいればその1人に+20する。
 *     match はコラボポジション実体（player.collab）に一致させる。このターン中にコラボが入れ替わっても
 *     「自分の白コラボホロメン」の意図を保つため、評価時に「白 かつ 現在のコラボ」で判定する。
 *     ※コスト[ホロパワー：-2]・[ターンに1回]はエンジン側が処理するため run には書かない。
 *
 * SP推しスキル「クイックガード」[ホロパワー：-1][ゲームに1回]:
 *   相手のターンで、自分の白ホロメンが相手からダメージを受ける時に使える：
 *   そのホロメン1人が受けるダメージ-20。
 *   → onDamageOshiSkill（被ダメージ割り込み・SP）。対象（ダメージを受けるホロメン）のトップカードの色が
 *     白の時に使え、そのホロメンが受けるダメージ-20。
 *     ※エンジンの onDamageOshiSkill はアーツ/特殊どちらのダメージ経路でも提示される（registry.js 参照）。
 *
 * 保留: なし（全効果実装済み）。
 */
export default {
  number: 'hYS01-001',

  oshiSkill: {
    name: 'ホワイトバトン',
    canUse(engine, ownerIdx) {
      // コラボに白ホロメンがいる時のみ意味がある
      const p = engine.state.players[ownerIdx];
      return !!(p.collab && p.collab.stack[0] && p.collab.stack[0].color === '白');
    },
    *run(ctx) {
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 20,
        ownerIdx: ctx.playerIdx,
        // 評価時点で「自分の白コラボホロメン」に一致（コラボ位置かつ白）
        match: (h) => h === ctx.player.collab && h.stack[0] && h.stack[0].color === '白',
        description: 'このターンの間、自分の白コラボホロメンのアーツ+20',
      });
    },
  },

  onDamageOshiSkill: {
    cost: 1,
    sp: true,
    title: 'SP推しスキル「クイックガード」: 受けるダメージ-20しますか？',
    canUse(engine, defIdx, target) {
      // ダメージを受けるホロメンが白なら使える
      return !!(target && target.stack[0] && target.stack[0].color === '白');
    },
    reduce() {
      return 20;
    },
  },
};
