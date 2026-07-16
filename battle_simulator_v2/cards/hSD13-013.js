/**
 * ジジ・ムリン (hSD13-013) 黄・2nd・HP210（#EN #Justice）
 *
 * キーワード/ギフト「再起のストレングス」:
 *   [ターンに1回]自分のメインステップで、自分の〈ジジ・ムリン〉に重なっている
 *   ホロメン1枚をアーカイブできる：自分のエールデッキの上から1枚をこのホロメンに送る。
 *   → メインステップの起動型能力。コスト = 自分のステージの任意の〈ジジ・ムリン〉
 *     （このホロメン自身も含む）に重なっているホロメン(stack[1..])を1枚アーカイブ。
 *     効果 = エールデッキ上から1枚を「このホロメン」（能力の持ち主）へ送る。
 *     ※テキストはコスト部を「自分の〈ジジ・ムリン〉」、効果部を「このホロメン」と書き分けている。
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
      // コスト候補: 自分のステージの〈ジジ・ムリン〉（自身も含む）に重なっているホロメンが1枚以上
      const hasCost = ctx.holomems('self',
        (e) => ctx.nameIs(e.top, 'ジジ・ムリン') && e.holomem.stack.length >= 2).length > 0;
      if (!hasCost) return false;
      if (ctx.player.cheerDeck.length < 1) return false;
      return true;
    },
    *run(ctx) {
      // 自分の〈ジジ・ムリン〉全員の重なっているホロメン(stack[1..])をコスト候補に集める
      const entries = [];
      for (const e of ctx.holomems('self', (x) => ctx.nameIs(x.top, 'ジジ・ムリン'))) {
        for (const c of e.holomem.stack.slice(1)) entries.push({ card: c, host: e.holomem });
      }
      if (entries.length === 0) return;
      const card = yield ctx.chooseCard({
        cards: entries.map((x) => x.card),
        title: 'コスト: アーカイブする〈ジジ・ムリン〉に重なっているホロメンを選択',
      });
      if (!card) return;
      const host = entries.find((x) => x.card === card).host;
      const idx = host.stack.indexOf(card);
      if (idx === -1) return;
      host.stack.splice(idx, 1);
      ctx.player.archive.push(card);
      ctx.log(`${card.name} をアーカイブした（再起のストレングス コスト）`);
      // 自分のエールデッキの上から1枚をこのホロメン（能力の持ち主）に送る
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
