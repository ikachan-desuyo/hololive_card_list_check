/**
 * 魔法少女かなた (hBP02-070) 無色・Spot・HP60（#ホロウィッチ #4期生 #魔法）
 * コラボエフェクト「この手を差し伸べ、つかんで握る！」:
 *   サイコロを1回振れる：奇数の時、自分のエールデッキから、[白エールか緑エール]1枚を公開し、
 *   自分のバックホロメンに送る。そしてエールデッキをシャッフルする。
 *   ※「振れる」= 任意（振らない選択可）。
 *   ※「奇数の時」= 1/3/5。偶数(2/4/6)の時は何もしない（シャッフルもしない＝「そして〜」は奇数節の続き）。
 *   ※送り先は「自分のバックホロメン」に限定。
 *   ※エールデッキは非公開領域のため、候補（白/緑エール）のみ提示する。
 * アーツ「『天使』の『ホロ』！」(20): 効果なし（dmgのみ＝エンジンが自動処理）。
 *
 * 実装は同型の hBP02-069（魔法少女みこ）に準拠。
 */
export default {
  number: 'hBP02-070',
  collabEffect: {
    name: 'この手を差し伸べ、つかんで握る！',
    *run(ctx) {
      // 「振れる」= 任意
      const go = yield ctx.confirm('サイコロを振りますか？', '振る', '振らない');
      if (!go) return;

      const roll = ctx.rollDice();
      // 奇数(1/3/5)の時のみ効果。偶数の時は何もしない。
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
        // エールデッキから[白エールか緑エール]1枚を公開して送る
        const cand = ctx.player.cheerDeck.filter((c) => c.color === '白' || c.color === '緑');
        const picked = yield ctx.chooseCard({
          cards: cand,
          title: '送る[白エールか緑エール]を選択（エールデッキ）',
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
