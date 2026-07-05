/**
 * 儒烏風亭らでん (hSD15-008) 緑・1st・HP140（#DEV_IS #ReGLOSS #お酒）
 * ギフト《薄明》:
 *   このホロメンが相手のホロメンをダウンさせた時、このホロメンのHPを20回復する。
 *   → triggers.onOpponentDown（アーツでダウンさせた時に発火）。常時効果なので確認は挟まない。
 * アーツ「きのこ狩り」(40+):
 *   このターンに自分が #きのこ を持つイベントを使っていたなら、このアーツ+10。
 *   → arts.dmgBonus（条件付き「このアーツ+N」）
 *
 * 保留: なし
 */
export default {
  number: 'hSD15-008',
  triggers: {
    *onOpponentDown(ctx) {
      // 自分自身（ダウンさせたこのホロメン）のHPを20回復
      ctx.heal(ctx.sourceHolomem, 20);
    },
  },
  arts: {
    'きのこ狩り': {
      dmgBonus(ctx) {
        const usedKinokoEvent = ctx.countSupportThisTurn(
          (c) => c.supportType === 'イベント' && ctx.hasTag(c, 'きのこ')
        ) > 0;
        return usedKinokoEvent ? 10 : 0;
      },
    },
  },
};
