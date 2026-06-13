/**
 * 不知火フレア (hBP05-063) 黄・Debut・HP100（#3期生）
 * コラボエフェクト「おうちでまったり」:
 *   このホロメンのエール1枚をアーカイブできる：自分のデッキから、自分のステージのホロメン全員と
 *   異なるカード名のDebutホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 * アーツ「キミも一緒にゲームしない？」(20): テキスト効果なし。
 */
export default {
  number: 'hBP05-063',
  collabEffect: {
    name: 'おうちでまったり',
    *run(ctx) {
      if (ctx.sourceHolomem.cheers.length === 0) return;
      const ok = yield ctx.confirm('エール1枚をアーカイブしてDebutホロメンをサーチしますか？');
      if (!ok) return;
      const cheer = yield ctx.chooseCard({
        cards: [...ctx.sourceHolomem.cheers],
        title: 'コスト: アーカイブするエールを選択',
      });
      if (!cheer) return;
      yield* ctx.archiveCheer(ctx.sourceHolomem, cheer);
      // 自分のステージのホロメン全員と異なるカード名のDebut
      const stageNames = new Set(ctx.holomems('self').map((e) => e.top.name));
      const cand = ctx.deckCards((c) =>
        c.kind === 'holomen' && c.bloomLevel === 'Debut' && !stageNames.has(c.name));
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: '手札に加えるDebutホロメンを選択（ステージにいない名前・任意）',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked);
      }
      ctx.shuffleDeck();
    },
  },
};
