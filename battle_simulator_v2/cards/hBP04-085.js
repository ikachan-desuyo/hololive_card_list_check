/**
 * 桃鈴ねね (hBP04-085) 黄・1stホロメン
 * ブルームエフェクト「最高の気分!!!!!!!!!!!!!!」:
 *   自分のエールデッキから、自分のステージの#5期生を持つホロメン1人と同色のエール1枚を公開し、
 *   自分の#5期生を持つホロメンに送る。そしてエールデッキをシャッフルする。
 *   → ①色の基準にする#5期生ホロメンを1人選ぶ → ②その色のエールをエールデッキから1枚選んで公開 →
 *     ③送り先の#5期生ホロメン（基準と別人でも可）を選んで送る → ④エールデッキをシャッフル。
 *   色の#5期生がいない／同色エールが無い場合でも、最後のシャッフルは必ず行う。
 * アーツ「いっぱいがんばるぞい!!!!!」(20): テキスト効果なし（ダメージのみ）。
 *
 * 保留: なし。
 */
export default {
  number: 'hBP04-085',
  bloomEffect: {
    name: '最高の気分!!!!!!!!!!!!!!',
    *run(ctx) {
      // ① 色の基準にする #5期生 ホロメンを選ぶ
      const colorRef = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.hasTag(e.top, '5期生'),
        title: '同色エールの基準にする#5期生ホロメン1人を選択',
        optional: true,
      });
      if (colorRef) {
        const color = colorRef.top.color;
        // ② 同色のエールをエールデッキから1枚選んで公開
        const cand = ctx.player.cheerDeck.filter((c) => c.color === color);
        const picked = yield ctx.chooseCard({
          cards: cand,
          title: `${color}エールを選択（エールデッキ）`,
          optional: true,
          skipLabel: '見つからなかったことにする',
        });
        if (picked) {
          // ③ 送り先の #5期生 ホロメンを選ぶ（基準と別人でも可）
          const dest = yield ctx.chooseHolomem({
            side: 'self',
            filter: (e) => ctx.hasTag(e.top, '5期生'),
            title: 'エールを送る#5期生ホロメンを選択',
          });
          if (dest) {
            ctx.removeFromCheerDeck(picked);
            ctx.log(`${ctx.player.name}: エールデッキから ${picked.name} を公開`);
            ctx.flashReveal(picked);
            ctx.attachCheer(picked, dest.holomem);
          }
        }
      }
      // ④ エールデッキをシャッフル
      ctx.shuffleCheerDeck();
    },
  },
};
