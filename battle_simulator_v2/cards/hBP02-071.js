/**
 * 魔法少女ルーナ Spot (hBP02-071) 無色・HP60（#ホロウィッチ #4期生 #魔法）
 * コラボエフェクト「甘～い幸せ、おすそわけ！」:
 *   サイコロを1回振れる：奇数の時、自分のエールデッキから、[紫エールか黄エール]1枚を公開し、
 *   自分のバックホロメンに送る。そしてエールデッキをシャッフルする。
 * アーツ「『姫』の『ホロ』！」(20): 効果テキストなし（通常ダメージのみ）。
 *
 * ※「サイコロを振れる」は任意（confirm）。振った場合、奇数なら効果を処理する。
 *   エールデッキは非公開領域のため、候補（紫/黄エール）のみ提示する。
 *   候補がなくても、送り先（バックホロメン）がいなくても、奇数を出して振った時は
 *   最後にエールデッキのシャッフルを必ず行う（テキスト通り「そして～シャッフルする」）。
 */
export default {
  number: 'hBP02-071',
  collabEffect: {
    name: '甘～い幸せ、おすそわけ！',
    *run(ctx) {
      const roll = yield ctx.confirm('サイコロを1回振りますか？');
      if (!roll) return;
      const value = (yield* ctx.rollDice());
      if (value % 2 === 0) return; // 偶数の時は何もしない
      // 奇数の時
      const candidates = ctx.player.cheerDeck.filter(
        (c) => c.color === '紫' || c.color === '黄',
      );
      const backs = ctx.holomems('self', (e) => e.pos.zone === 'back');
      if (candidates.length > 0 && backs.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: candidates,
          title: 'エールデッキから送る[紫エールか黄エール]を選択',
        });
        if (picked) {
          const target = yield ctx.chooseHolomem({
            side: 'self',
            filter: (e) => e.pos.zone === 'back',
            title: 'エールを送る自分のバックホロメンを選択',
          });
          if (target) {
            ctx.removeFromCheerDeck(picked);
            ctx.log(`${ctx.player.name}: エールデッキから ${picked.name} を公開`);
            ctx.flashReveal(picked);
            ctx.attachCheer(picked, target.holomem);
          }
        }
      }
      ctx.shuffleCheerDeck();
    },
  },
};
