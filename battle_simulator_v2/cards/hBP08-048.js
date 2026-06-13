/**
 * 水宮枢 (hBP08-048) ホロメン・青・Debut・HP110（#DEV_IS #FLOW #GLOW）
 * バトンタッチ: 無色
 *
 * [コラボエフェクト] けはいあり183cm:
 *   自分のステージのエール1枚をアーカイブできる：
 *   自分のデッキから、〈けはい〉1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → コスト（エール1枚アーカイブ）は「できる」=任意。支払わなければ効果は発生しない。
 *      「自分のステージのエール」= 自分のステージの任意のホロメンに付いたエール（対象ホロメン限定なし）。
 *      エールが付いたホロメンが複数いれば、まずホロメンを選び、次にそのエール1枚を選ぶ。
 *      〈けはい〉= カード名 "けはい"（hBP08 のエールではなくホロメン名参照。card.name === 'けはい'）。
 *      デッキから1枚（複数あれば選択）を公開して手札に加え、デッキをシャッフルする。
 *      非公開領域からの探索なので「見つからなかったことにする」も許容（ただしコスト支払い後）。
 *
 * [アーツ] つよい。でかい。大きい。（30 / any）: テキスト効果なし（素点ダメージのみ）。
 *
 * 保留: なし（コラボエフェクト全文を実装。アーツは素点のみで効果テキスト無し）。
 */
const KEHAI = 'けはい';

export default {
  number: 'hBP08-048',

  collabEffect: {
    name: 'けはいあり183cm',
    *run(ctx) {
      // コスト: 自分のステージの、エールが付いているホロメンを集める
      const withCheer = ctx.holomems('self', (e) => (e.holomem.cheers || []).length > 0);
      if (withCheer.length === 0) {
        ctx.log('アーカイブできるエールが自分のステージに無いため発動できない');
        return;
      }

      const ok = yield ctx.confirm(
        '自分のステージのエール1枚をアーカイブして、デッキから〈けはい〉1枚を手札に加えますか？'
      );
      if (!ok) return;

      // どのホロメンのエールをアーカイブするか選ぶ
      let holomem;
      if (withCheer.length === 1) {
        holomem = withCheer[0].holomem;
      } else {
        const targetEntry = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => (e.holomem.cheers || []).length > 0,
          title: 'コスト: エールをアーカイブするホロメンを選択',
        });
        if (!targetEntry) return;
        holomem = targetEntry.holomem;
      }

      const picked = yield ctx.chooseCard({
        cards: [...holomem.cheers],
        title: 'コスト: アーカイブするエールを選択',
      });
      if (!picked) return; // コストを支払えなければ効果は発生しない
      yield* ctx.archiveCheer(holomem, picked);

      // 効果: 自分のデッキから〈けはい〉1枚を公開し、手札に加える
      const candidates = ctx.deckCards((c) => c.name === KEHAI);
      if (candidates.length > 0) {
        const target = candidates.length === 1
          ? candidates[0]
          : yield ctx.chooseCard({
              cards: candidates,
              title: '手札に加える〈けはい〉を選択',
              optional: true,
              skipLabel: '見つからなかったことにする',
            });
        if (target) {
          ctx.flashReveal(target);
          ctx.removeFromDeck(target);
          ctx.addToHand(target, { reveal: true });
        }
      } else {
        ctx.log('デッキに〈けはい〉がいない');
      }

      // そしてデッキをシャッフルする
      ctx.shuffleDeck();
    },
  },
};
