/**
 * 不知火フレア (hBP08-086) 黄・1st・HP160（#JP #3期生 #ハーフエルフ）
 * ブルームエフェクト「俺のイナー！」:
 *   自分のエールデッキの上から1枚を、自分の[〈不知火フレア〉か #EN を持つホロメン]に送れる。
 *   → 「送れる」=任意。送り先は名前が〈不知火フレア〉または #EN タグ持ちのホロメンに限定。
 * アーツ「最高のともだち」(20+):
 *   自分のセンターホロメンが2ndホロメンなら、このアーツ+30。
 *   → dmgBonus。コントローラーのセンターのスタック上面が bloomLevel==='2nd' の時 +30。
 *
 * 保留: なし
 */
const isTarget = (card) => card.name === '不知火フレア' || (card.tags || []).includes('EN');

export default {
  number: 'hBP08-086',
  bloomEffect: {
    name: '俺のイナー！',
    *run(ctx) {
      // 送り先候補: 〈不知火フレア〉か #EN を持つ自分のホロメン
      const candidates = ctx.holomems('self', (e) => isTarget(e.top));
      if (candidates.length === 0) {
        ctx.log('送り先となる〈不知火フレア〉か#ENを持つホロメンがいない');
        return;
      }
      if (ctx.player.cheerDeck.length === 0) {
        ctx.log('エールデッキが空のためエールを送れない');
        return;
      }
      // 「送れる」=任意
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => isTarget(e.top),
        title: 'エールデッキの上から1枚を送る自分のホロメンを選択（〈不知火フレア〉か#EN持ち）',
        optional: true,
      });
      if (target) ctx.sendCheerFromCheerDeckTop(target.holomem);
    },
  },
  arts: {
    '最高のともだち': {
      dmgBonus(ctx) {
        const center = ctx.player.center;
        return center && center.stack[0]?.bloomLevel === '2nd' ? 30 : 0;
      },
    },
  },
};
