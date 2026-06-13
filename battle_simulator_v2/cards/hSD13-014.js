/**
 * セシリア・イマーグリーン (hSD13-014) 無色・Spot・HP160（#EN #Justice #語学）
 *
 * アーツ「紅茶をどうぞ！」(40):
 *   自分のエールデッキの上から1枚を自分の#Justiceを持つホロメンに送る。
 *
 * 【未実装】ギフト「正義の旋律」:
 *   [センターポジション・コラボポジション限定][ターンに1回]
 *   自分の#Justiceを持つ[DebutホロメンかSpotホロメン]がステージに出た時、自分のデッキを1枚引く。
 *   → 「ホロメンがステージに出た時（登場時）」トリガーのフックがエンジンに無いため保留。
 *      実装可能なフックは onDown / onAttach / onOpponentDown のみで、登場監視は未対応。
 *      エンジンに onPlace / onEnter 相当のトリガーが追加されたら実装すること。
 */
export default {
  number: 'hSD13-014',
  arts: {
    '紅茶をどうぞ！': {
      *run(ctx) {
        if (ctx.player.cheerDeck.length === 0) return;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => ctx.hasTag(e.top, 'Justice'),
          title: 'エールデッキの上から1枚を送る #Justice ホロメンを選択',
        });
        if (target) ctx.sendCheerFromCheerDeckTop(target.holomem);
      },
    },
  },
};
