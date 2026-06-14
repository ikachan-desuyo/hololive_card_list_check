/**
 * セシリア・イマーグリーン (hSD13-014) 無色・Spot・HP160（#EN #Justice #語学）
 *
 * アーツ「紅茶をどうぞ！」(40):
 *   自分のエールデッキの上から1枚を自分の#Justiceを持つホロメンに送る。
 *
 * ギフト「正義の旋律」:
 *   [センターポジション・コラボポジション限定][ターンに1回]
 *   自分の#Justiceを持つ[DebutホロメンかSpotホロメン]がステージに出た時、自分のデッキを1枚引く。
 *   → triggers.onEnter で実装。engine が place（手札からステージに出した時）に自分のステージの
 *     onEnter を発火する。ステージに出たホロメン(ctx.enteredInfo)が#JusticeのDebut/Spotで、
 *     このセシリアがセンター/コラボにいるなら、[ターンに1回]デッキを1枚引く。
 */
export default {
  number: 'hSD13-014',
  triggers: {
    // ギフト「正義の旋律」: 自分の#JusticeのDebut/Spotがステージに出た時、デッキを1枚引く
    *onEnter(ctx) {
      const self = ctx.sourceHolomem;
      if (self?.stack[0].name !== 'セシリア・イマーグリーン') return;
      const z = ctx.sourceHolomemPos()?.zone;
      if (z !== 'center' && z !== 'collab') return;     // [センター・コラボ限定]
      const top = ctx.enteredInfo?.holomem?.stack[0];
      if (!top || !ctx.hasTag(top, 'Justice')) return;  // #Justice
      if (top.bloomLevel !== 'Debut' && top.bloomLevel !== 'Spot') return; // Debut/Spot
      if (ctx.oncePerTurnUsed('hSD13-014:enter')) return; // [ターンに1回]
      ctx.markOncePerTurn('hSD13-014:enter');
      ctx.draw(1);
    },
  },
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
