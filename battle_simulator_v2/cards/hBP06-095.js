/**
 * IDENTIFY -AREA 15- (hBP06-095) サポート・イベント・LIMITED
 *
 * [サポート効果] このカードは、自分のステージのホロメン全員が #ID1期生 を持つホロメンでなければ使えない。
 *   自分のデッキから、#ID1期生 を持つホロメン2枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   その後、自分のエールデッキの枚数が0枚なら、このターンの間、自分の #ID1期生 を持つホロメンが
 *   相手のセンターホロメンをダウンさせた時、相手のライフ-1。
 * LIMITED：ターンに1枚しか使えない。
 *
 * 実装方針:
 *   - デッキから #ID1期生 ホロメン2枚を公開して手札に加え、シャッフルする部分は実装済み。
 *   - 後段の「エールデッキが0枚なら、このターンの間、#ID1期生 が相手センターをダウンさせた時 相手ライフ-1」は
 *     【未実装】。これは「特定タグのホロメン群が相手の特定ポジションをダウンさせた事を監視する
 *     ターン限定のグローバルなダウントリガー」であり、現エンジンの onOpponentDown は
 *     攻撃ホロメン自身のカード定義しか参照しない（engine._performArt 内）。
 *     ターン修正(addTurnModifier)にもライフ減少を引き起こすダウン監視の仕組みが無いため保留する。
 *     なお発動条件（エールデッキ0枚）はゲーム終盤の限定的な状況であり、主目的のサーチは機能する。
 */
export default {
  number: 'hBP06-095',
  support: {
    canUse(ctx) {
      const all = ctx.holomems('self');
      return all.length > 0 && all.every((e) => ctx.hasTag(e.top, 'ID1期生'));
    },
    *run(ctx) {
      for (let i = 0; i < 2; i++) {
        const cand = ctx.deckCards((c) => c.kind === 'holomen' && ctx.hasTag(c, 'ID1期生'));
        if (cand.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards: cand,
          title: `手札に加える #ID1期生 のホロメンを選択（${i + 1}/2・任意）`,
          optional: true,
          skipLabel: 'これ以上加えない',
        });
        if (!picked) break;
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      ctx.shuffleDeck();
      // その後、自分のエールデッキが0枚なら、このターンの間、
      // 自分の #ID1期生 ホロメンが相手のセンターをダウンさせた時 相手ライフ-1。
      // 【未実装】上記JSDoc参照（ターン限定のグローバルなダウン監視トリガーが必要）。
      if (ctx.player.cheerDeck.length === 0) {
        ctx.log('TODO(効果未実装): エールデッキ0枚時の「#ID1期生が相手センターをダウンさせた時 相手ライフ-1」は未対応');
      }
    },
  },
};
