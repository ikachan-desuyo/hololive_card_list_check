/**
 * ジジ・ムリン (hSD13-013) 黄・2nd・HP210（#EN #Justice）
 *
 * キーワード/ギフト「再起のストレングス」:
 *   [ターンに1回]自分のメインステップで、自分の〈ジジ・ムリン〉に重なっている
 *   ホロメン1枚をアーカイブできる：自分のエールデッキの上から1枚をこのホロメンに送る。
 *   → メインステップの起動型能力。コスト = このホロメンに重なっているホロメン(stack[1..])を
 *     1枚アーカイブ。効果 = エールデッキ上から1枚をこのホロメンへ送る。
 *
 * アーツ「殻破りのライオット」(90+):
 *   このホロメンに重なっているホロメンが0枚なら、このアーツ+90。
 *   → dmgBonus（stack 長が1＝重なり0なら +90）。
 */
export default {
  number: 'hSD13-013',
  activatedAbilities: [{
    name: '再起のストレングス',
    oncePerTurn: true,
    canUse(ctx) {
      // 重なっているホロメン（stack[1..]）が1枚以上、かつエールデッキに残りがある
      const lower = ctx.sourceHolomem.stack.slice(1);
      if (lower.length < 1) return false;
      if (ctx.player.cheerDeck.length < 1) return false;
      return true;
    },
    *run(ctx) {
      const lower = ctx.sourceHolomem.stack.slice(1);
      if (lower.length < 1) return;
      const card = yield ctx.chooseCard({
        cards: lower,
        title: 'コスト: アーカイブする重なっているホロメンを選択',
      });
      if (!card) return;
      const idx = ctx.sourceHolomem.stack.indexOf(card);
      if (idx === -1) return;
      ctx.sourceHolomem.stack.splice(idx, 1);
      ctx.player.archive.push(card);
      ctx.log(`${card.name} をアーカイブした（再起のストレングス コスト）`);
      // 自分のエールデッキの上から1枚をこのホロメンに送る
      ctx.sendCheerFromCheerDeckTop(ctx.sourceHolomem);
    },
  }],
  arts: {
    '殻破りのライオット': {
      dmgBonus(ctx) {
        // stack[0] が自身、stack[1..] が重なっているホロメン。重なり0枚なら+90。
        const stacked = (ctx.sourceHolomem?.stack?.length ?? 1) - 1;
        return stacked === 0 ? 90 : 0;
      },
    },
  },
};
