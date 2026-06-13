/**
 * 響咲リオナ (hBP08-020) 白・2nd・HP180（#DEV_IS #FLOW #GLOW）
 *
 * コラボエフェクト「セクシーダンスクィーン」:
 *   自分のデッキの上から1～2枚をアーカイブできる：アーカイブしたカード1枚につき、自分のデッキを1枚引く。
 *   → 任意（できる）。0枚も可なのでまず confirm し、1枚アーカイブ後さらにもう1枚できる（最大2枚）。
 *     アーカイブした枚数分ドローする。
 *     アーカイブした枚数を turn modifier(kind:'deckArchivedThisTurn') に積み、
 *     アーツ「挑戦のまなざし」の条件判定に使う。
 *
 * アーツ「挑戦のまなざし」(110+):
 *   このターンに自分のデッキからカードを3枚以上アーカイブしていたなら、このアーツ+40。
 *   特攻: 赤+50。
 *   → 「このターンに自分のデッキからアーカイブした枚数」を deckArchivedThisTurn モディファイア合算で判定。
 *
 * 保留: 「このターンに自分のデッキから3枚以上アーカイブ」の枚数カウントは、
 *   このカードのコラボエフェクトが積む deckArchivedThisTurn モディファイアのみを集計する。
 *   他カード（別の「デッキからアーカイブ」効果）が同じカウンタを更新しないため、
 *   それらと併用した場合の合算には対応していない（汎用デッキアーカイブ計数機構が未整備のため）。
 */
export default {
  number: 'hBP08-020',
  collabEffect: {
    name: 'セクシーダンスクィーン',
    *run(ctx) {
      // デッキの上から1～2枚をアーカイブできる（任意・0可）
      let archived = 0;
      for (let i = 0; i < 2; i++) {
        if (ctx.player.deck.length === 0) break;
        const ok = yield ctx.confirm(
          `デッキの上から1枚をアーカイブする？（${i + 1}/2・アーカイブ1枚につき1枚ドロー）`,
          'アーカイブする', 'やめる');
        if (!ok) break;
        const card = ctx.lookTopDeck(1)[0];
        if (!card) break;
        ctx._unreveal(card);
        ctx.player.archive.push(card);
        ctx.log(`${ctx.player.name}: デッキの上から ${card.name} をアーカイブ`);
        archived++;
      }
      if (archived > 0) {
        // このターンにデッキからアーカイブした枚数を記録（アーツの条件判定用）
        ctx.addTurnModifier({
          kind: 'deckArchivedThisTurn', amount: archived, ownerIdx: ctx.playerIdx,
          description: `このターン、デッキから${archived}枚アーカイブ`,
        });
        // アーカイブした枚数分ドロー
        ctx.draw(archived);
      }
    },
  },
  arts: {
    '挑戦のまなざし': {
      dmgBonus(ctx) {
        const count = ctx.engine.state.modifiers
          .filter((m) => m.kind === 'deckArchivedThisTurn' && m.ownerIdx === ctx.playerIdx)
          .reduce((sum, m) => sum + (m.amount || 0), 0);
        return count >= 3 ? 40 : 0;
      },
    },
  },
};
