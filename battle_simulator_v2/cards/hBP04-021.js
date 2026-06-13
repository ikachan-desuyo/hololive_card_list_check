/**
 * 儒烏風亭らでん Debut (hBP04-021) 緑
 * コラボエフェクト「あなたに学びと面白いをお届け」:
 *   このターンに自分が #きのこ を持つイベントを使っていた時、
 *   自分の #ReGLOSS を持つホロメン1人のHPを20回復する。
 * アーツ「らでんスタンバイ」(30): テキスト効果なし（素のダメージのみ）。
 *
 * 保留: なし
 */
export default {
  number: 'hBP04-021',
  collabEffect: {
    name: 'あなたに学びと面白いをお届け',
    *run(ctx) {
      const usedKinokoEvent = ctx.countSupportThisTurn(
        (c) => c.supportType === 'イベント' && ctx.hasTag(c, 'きのこ')
      ) > 0;
      if (!usedKinokoEvent) {
        ctx.log('このターンに #きのこ を持つイベントを使っていないため発動しない');
        return;
      }
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: ({ top }) => ctx.hasTag(top, 'ReGLOSS'),
        title: 'HPを20回復する #ReGLOSS のホロメンを選択',
      });
      if (target) ctx.heal(target.holomem, 20);
    },
  },
};
