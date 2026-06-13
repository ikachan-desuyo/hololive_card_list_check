/**
 * 百鬼あやめ (hBP06-035) 赤・Debut・HP120（#JP #2期生 #シューター）
 * コラボエフェクト「かわ余」:
 *   自分が後攻で最初のターンなら、自分のデッキから、[ツールかマスコットかファン]1枚を公開し、
 *   自分の〈百鬼あやめ〉に付ける。そしてデッキをシャッフルする。
 *   → ctx.isFirstTurnGoingSecond() で「後攻で最初のターン」を判定。
 *     ツール/マスコットは付け上限があるため、付けられる〈百鬼あやめ〉が居る候補のみ提示する。
 * アーツ「…二度寝する(:3_ヽ)_」(20): 効果なし（素点ダメージのみ）→ 実装不要。
 */
export default {
  number: 'hBP06-035',
  collabEffect: {
    name: 'かわ余',
    *run(ctx) {
      if (!ctx.isFirstTurnGoingSecond()) return;
      // デッキから[ツール/マスコット/ファン]を取得（非公開領域なので「見つからない」も許容）
      const cand = ctx.deckCards(
        (c) => c.kind === 'support' && ['ツール', 'マスコット', 'ファン'].includes(c.supportType),
      );
      if (cand.length === 0) {
        ctx.shuffleDeck();
        return;
      }
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: '〈百鬼あやめ〉に付ける[ツール/マスコット/ファン]を選択（任意）',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (picked) {
        // 〈百鬼あやめ〉のうち、選んだカードを付けられる対象（ツール/マスコット上限を考慮）
        const targets = ctx.holomems(
          'self',
          (e) => e.top.name === '百鬼あやめ' && ctx.engine._canAttachSupport(e.holomem, picked),
        );
        if (targets.length > 0) {
          let dest;
          if (targets.length === 1) {
            dest = targets[0];
          } else {
            dest = yield ctx.chooseHolomem({
              side: 'self',
              filter: (e) => e.top.name === '百鬼あやめ' && ctx.engine._canAttachSupport(e.holomem, picked),
              title: `${picked.name} を付ける〈百鬼あやめ〉を選択`,
            });
          }
          if (dest) {
            ctx.removeFromDeck(picked);
            ctx.log(`${ctx.player.name}: ${picked.name} を公開した`);
            yield* ctx.attachSupportWithTrigger(picked, dest.holomem);
          }
        }
      }
      ctx.shuffleDeck();
    },
  },
};
