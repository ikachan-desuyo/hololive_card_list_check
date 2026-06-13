/**
 * さくらみこ (hPR-001) 無色・Spot・HP50（#JP #0期生 #歌）
 * コラボエフェクト「誰かの芽吹きになれたら」:
 *   サイコロを1回振れる：１か３か５の時、自分のエールデッキから、[赤エールか青エール]1枚を公開し、
 *   自分のバックホロメンに送る。そしてエールデッキをシャッフルする。
 *   ※「振れる」= 任意（振らない選択可）。
 *   ※「１か３か５の時」= 奇数の出目。それ以外（2/4/6）の時は何もしない（シャッフルもしない＝「そして〜」は奇数節の続き）。
 *   ※送り先は「自分のバックホロメン」に限定。エールデッキは非公開領域のため候補のみ提示する。
 * アーツ「flower rhapsody」(10): 効果テキストなし（基本ダメージのみ。エンジン処理）。
 *
 * 保留なし。
 */
export default {
  number: 'hPR-001',
  collabEffect: {
    name: '誰かの芽吹きになれたら',
    *run(ctx) {
      // 「振れる」= 任意
      const go = yield ctx.confirm('サイコロを振りますか？', '振る', '振らない');
      if (!go) return;

      const roll = (yield* ctx.rollDice());
      // 1/3/5（奇数）の時のみ効果。それ以外の時は何もしない。
      if (roll % 2 === 0) return;

      // 送り先は自分のバックホロメン
      const backs = ctx.holomems('self', (e) => e.pos.zone === 'back');
      if (backs.length === 0) {
        // バックホロメンが居なくても、奇数節の「そしてシャッフルする」は実行する。
        ctx.shuffleCheerDeck();
        return;
      }

      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.pos.zone === 'back',
        title: 'エールを送る自分のバックホロメンを選択',
      });

      if (target) {
        // エールデッキから[赤エールか青エール]1枚を公開して送る（非公開領域なので候補のみ提示）
        const cand = ctx.player.cheerDeck.filter((c) => c.color === '赤' || c.color === '青');
        const picked = yield ctx.chooseCard({
          cards: cand,
          title: '送る[赤エールか青エール]を選択（エールデッキ）',
          optional: true,
          skipLabel: '見つからなかったことにする',
        });
        if (picked) {
          ctx.removeFromCheerDeck(picked);
          ctx.log(`${ctx.player.name}: エールデッキから ${picked.name} を公開`);
          ctx.flashReveal(picked);
          ctx.attachCheer(picked, target.holomem);
        }
      }
      // そしてエールデッキをシャッフルする（奇数の時）
      ctx.shuffleCheerDeck();
    },
  },
};
