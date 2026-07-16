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
 *     [ターンに1回]は能力の持ち主（ホロメン個体）ごとの制限のため、プレイヤー共有キーではなく
 *     ホロメン個体に使用ターンを記録する（hBP01-116 と同パターン）。センターとコラボに2体
 *     いれば各1回誘発できる。
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
      // [ターンに1回]は個体ごと（センターとコラボに2体いれば各1回）。個体に使用ターンを記録
      if (self._justiceMelodyUsedTurn === ctx.state.turn) return;
      self._justiceMelodyUsedTurn = ctx.state.turn;
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
