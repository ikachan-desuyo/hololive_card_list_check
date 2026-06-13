/**
 * さくらみこ (hSD16-009) 赤・2nd・HP170（#JP #0期生 #ベイビー）
 *
 * ブルームエフェクト「35P、ありがとうだよー！」:
 *   このターンの間、自分のステージの〈35P〉1枚につき、このホロメンのアーツ+10。
 *   → このホロメン自身に artsPlus のターン修正を付与。amount は解決時に
 *     自分のステージ上の〈35P〉（カード名一致）の枚数 × 10 を動的に再計算する
 *     （コラボ/Bloom等でステージ構成が変わっても追従させるため）。
 *     〈35P〉は名称参照なのでタグではなく stack[0].name === '35P' で数える。
 *
 * アーツ「この瞬間を見せてあげたいなって」(100 / 黄+30特攻):
 *   テキスト効果なし（素点＋特攻アイコンのみ）。特攻はエンジンのアイコン処理に
 *   委ねるため arts 定義は不要。
 *
 * 保留: なし。
 */
export default {
  number: 'hSD16-009',
  bloomEffect: {
    name: '35P、ありがとうだよー！',
    *run(ctx) {
      const self = ctx.sourceHolomem;
      const ownerIdx = ctx.playerIdx;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        ownerIdx,
        match: (h) => h === self,
        // 自分のステージの〈35P〉1枚につき +10（解決時のステージ状態で再計算）
        amount: (h, engine) => {
          const p = engine.state.players[ownerIdx];
          const cnt = engine._stageHolomems(p)
            .filter((m) => m.stack[0] && m.stack[0].name === '35P').length;
          return cnt * 10;
        },
        description: 'このターン、自分のステージの〈35P〉1枚につきこのホロメンのアーツ+10',
      });
    },
  },
};
