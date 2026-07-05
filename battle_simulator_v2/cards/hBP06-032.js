/**
 * セシリア・イマーグリーン (hBP06-032) 緑・1st・HP130（#Justice,#語学）
 * コラボエフェクト「FOR! JUSTICE!」:
 *   自分のエールデッキの上から1枚をこのホロメン以外の自分の#Justiceを持つホロメンに送る。
 * アーツ「春の思い出」(20): テキスト効果なし。
 */
export default {
  number: 'hBP06-032',
  collabEffect: {
    name: 'FOR! JUSTICE!',
    *run(ctx) {
      const targets = ctx.holomems('self', (e) => e.holomem !== ctx.sourceHolomem && ctx.hasTag(e.top, 'Justice'));
      if (targets.length === 0) return;
      const entry = yield ctx.chooseHolomem({
        side: 'self', filter: (e) => e.holomem !== ctx.sourceHolomem && ctx.hasTag(e.top, 'Justice'),
        title: 'エールデッキの上から1枚を送る #Justice ホロメンを選択（このホロメン以外）',
      });
      if (entry) ctx.sendCheerFromCheerDeckTop(entry.holomem);
    },
  },
};
