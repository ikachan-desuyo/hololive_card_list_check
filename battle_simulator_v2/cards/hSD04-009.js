/**
 * 癒月ちょこ (hSD04-009) 紫・2nd・HP190（#JP #2期生 #料理）
 * アーツ「33… 22… 11…」(50): 効果なし（特攻 緑+50 はエンジン側で処理）。
 * アーツ「あくとっ」(60+):
 *   このターンに自分が使っていたイベント1枚につき、このアーツ+40。
 */
export default {
  number: 'hSD04-009',
  arts: {
    'あくとっ': {
      dmgBonus(ctx) {
        const events = ctx.countSupportThisTurn(
          (c) => c.kind === 'support' && c.supportType === 'イベント'
        );
        return events * 40;
      },
    },
  },
};
