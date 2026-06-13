/**
 * 戌神ころね (hBP06-067) 紫・Debut・HP100（#JP #ゲーマーズ #ケモミミ）
 * コラボエフェクト「ホロライブの狂犬」:
 *   自分の手札の#ゲーマーズを持つホロメン1枚をアーカイブできる：自分のデッキを1枚引く。
 *   （「できる」=任意。コストの#ゲーマーズホロメンが手札に無ければ何も起きない）
 * アーツ「指一本くれや！」 dmg:20: 効果なし（ダメージのみ）。
 */
export default {
  number: 'hBP06-067',
  collabEffect: {
    name: 'ホロライブの狂犬',
    *run(ctx) {
      // 手札の#ゲーマーズを持つホロメン
      const candidates = ctx.player.hand.filter(
        (c) => c.kind === 'holomen' && ctx.hasTag(c, 'ゲーマーズ'),
      );
      if (candidates.length === 0) return;
      const ok = yield ctx.confirm(
        '手札の#ゲーマーズホロメン1枚をアーカイブしてデッキを1枚引きますか？',
      );
      if (!ok) return;
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: 'アーカイブする#ゲーマーズホロメンを選択',
      });
      if (!picked) return;
      ctx.removeFromHand(picked);
      ctx.player.archive.push(picked);
      ctx.log(`${picked.name} をアーカイブした`);
      ctx.draw(1);
    },
  },
  // アーツ「指一本くれや！」は効果を持たないため定義不要（ダメージはカードデータ側で処理）。
};
