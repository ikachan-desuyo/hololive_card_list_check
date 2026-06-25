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
 *   - デッキから #ID1期生 ホロメン2枚を公開して手札に加え、シャッフルする。
 *   - 後段「エールデッキ0枚なら、このターンの間、#ID1期生が相手センターをダウンさせた時 相手ライフ-1」は
 *     ターン修正 kind:'onSourceDown'（match=#ID1期生）で実装。_notifySourceDown がダウン対象配列を渡すので、
 *     ダウン対象に相手のセンターが含まれていれば相手ライフ-1。
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
      const cand = ctx.deckCards((c) => c.kind === 'holomen' && ctx.hasTag(c, 'ID1期生'));
      const picked = yield ctx.chooseCards({
        cards: cand,
        min: 0, max: 2,
        title: '手札に加える #ID1期生 のホロメンを選択（最大2枚・任意）',
      });
      for (const c of picked) {
        ctx.removeFromDeck(c);
        ctx.addToHand(c, { reveal: true });
      }
      ctx.shuffleDeck();
      // その後、自分のエールデッキが0枚なら、このターンの間、
      // 自分の #ID1期生 ホロメンが相手のセンターをダウンさせた時 相手ライフ-1（ターン修正 onSourceDown）。
      if (ctx.player.cheerDeck.length === 0) {
        const ownerIdx = ctx.playerIdx;
        ctx.addTurnModifier({
          kind: 'onSourceDown', ownerIdx,
          match: (h) => (h.stack[0].tags || []).includes('ID1期生'),
          onDown: (engine, downedList) => {
            // ダウンさせた相手にセンターが含まれているか（アーカイブ前なのでゾーン判定可）
            if (!(downedList || []).some((d) => engine._zoneOf(d) === 'center')) return;
            const oppIdx = 1 - ownerIdx;
            const immune = engine.state.modifiers.some(
              (m) => m.kind === 'lifeImmuneOpponentAbility' && m.ownerIdx === oppIdx);
            if (immune) return;
            engine.state.players[oppIdx].lifeDamage += 1;
            engine.log('IDENTIFY -AREA 15-: #ID1期生が相手センターをダウンさせた → 相手のライフ-1');
          },
          description: 'このターン、#ID1期生が相手センターをダウンさせた時 相手のライフ-1',
        });
        ctx.log('IDENTIFY -AREA 15-: エールデッキ0枚 → このターン、#ID1期生が相手センターをダウンさせると相手ライフ-1');
      }
    },
  },
};
