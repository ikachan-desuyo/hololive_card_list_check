/**
 * 響咲リオナ (hBP08-020) 白・2nd・HP180（#DEV_IS #FLOW #GLOW）
 *
 * コラボエフェクト「セクシーダンスクィーン」:
 *   自分のデッキの上から1～2枚をアーカイブできる：アーカイブしたカード1枚につき、自分のデッキを1枚引く。
 *   → 任意（できる）。0枚も可なのでまず confirm し、1枚アーカイブ後さらにもう1枚できる（最大2枚）。
 *     アーカイブした枚数分ドローする。
 *     アーカイブした枚数を共通カウンタ ctx.recordDeckArchive() に加算し、
 *     アーツ「挑戦のまなざし」の条件判定に使う。
 *
 * アーツ「挑戦のまなざし」(110+):
 *   このターンに自分のデッキからカードを3枚以上アーカイブしていたなら、このアーツ+40。
 *   特攻: 赤+50。
 *   → 「このターンに自分のデッキからアーカイブした枚数」を player.deckArchivedThisTurn（共通カウンタ）で判定。
 *     コラボ単体では最大2枚なので、他カードのデッキアーカイブ効果（recordDeckArchive で計上）と併用して3枚以上に届く。
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
        // このターンにデッキからアーカイブした枚数を共通カウンタに加算（アーツの条件判定用）
        ctx.recordDeckArchive(archived);
        // アーカイブした枚数分ドロー
        ctx.draw(archived);
      }
    },
  },
  arts: {
    '挑戦のまなざし': {
      dmgBonus(ctx) {
        // このターンに自分のデッキから3枚以上アーカイブしていたなら+40（共通カウンタ）
        return ctx.deckArchivedCountThisTurn() >= 3 ? 40 : 0;
      },
    },
  },
};
