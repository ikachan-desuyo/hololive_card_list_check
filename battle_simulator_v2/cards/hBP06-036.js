/**
 * 百鬼あやめ (hBP06-036) 赤・1st・HP140（#JP #2期生 #シューター）
 * コラボエフェクト「まったり夜桜温泉デート」:
 *   自分のデッキから〈阿修羅＆羅刹〉か〈鬼神刀「阿修羅」〉か〈ぽよ余〉1枚を公開し手札に加え、デッキをシャッフルする。
 * アーツ「お風呂上がりの幸せな時間」(30):
 *   自分のエールデッキの上から1枚をアーカイブできる（任意コスト）：自分のデッキを1枚引く。
 */
const SEARCH_NAMES = ['阿修羅＆羅刹', '鬼神刀「阿修羅」', 'ぽよ余'];

export default {
  number: 'hBP06-036',
  collabEffect: {
    name: 'まったり夜桜温泉デート',
    *run(ctx) {
      const candidates = ctx.deckCards((c) => SEARCH_NAMES.includes(c.name));
      // 非公開領域からの検索なので「見つからない（選ばない）」も許容
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: '〈阿修羅＆羅刹〉か〈鬼神刀「阿修羅」〉か〈ぽよ余〉を1枚選び手札に加える',
        optional: true,
        skipLabel: '加えない',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      ctx.shuffleDeck();
    },
  },
  arts: {
    'お風呂上がりの幸せな時間': {
      *run(ctx) {
        if (ctx.player.cheerDeck.length === 0) return;
        const ok = yield ctx.confirm('エールデッキの上から1枚をアーカイブしてデッキを1枚引きますか？');
        if (!ok) return;
        // エールデッキの上から1枚をアーカイブ（コスト支払い）
        const cheer = ctx.player.cheerDeck.shift();
        ctx.player.archive.push(cheer);
        ctx.log(`${ctx.player.name}: エールデッキの上 ${cheer.name} をアーカイブ`);
        ctx.draw(1);
      },
    },
  },
};
