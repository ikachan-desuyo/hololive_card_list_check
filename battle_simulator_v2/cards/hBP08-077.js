/**
 * 音乃瀬奏 (hBP08-077) ホロメン・黄・Debut・HP120
 *
 * [コラボエフェクト]（キーワード:コラボエフェクト）「歌ってみた、聴いてください」:
 *   自分が後攻で最初のターンなら、自分のデッキから、
 *   [1stホロメンの〈音乃瀬奏〉と〈リコーダー〉]1枚ずつを公開し、手札に加える。
 *   そしてデッキをシャッフルする。
 *   → 後攻最初のターン判定は ctx.isFirstTurnGoingSecond()。満たさなければ何もしない。
 *     「1枚ずつ」= それぞれ1枚（①1stホロメンの〈音乃瀬奏〉=name '音乃瀬奏' かつ bloomLevel '1st'、
 *     ②〈リコーダー〉=name 'リコーダー'）を独立に検索する。
 *     テキストは「加える」（強制）なので、候補があれば手札へ加える（複数コピーがあればどれを加えるか選択）。
 *     デッキは非公開領域だが、対象は名称/レベル指定で一意の種類に絞られるため、候補があれば必ず加える運用。
 *     最後にデッキをシャッフルする（②までで何も加えなくても、条件成立時は必ずシャッフルする）。
 *
 * [アーツ]「奏スタンバイ」（20 / any）: テキスト効果なし（素点ダメージのみ）。
 *
 * 保留: なし。
 */
export default {
  number: 'hBP08-077',

  collabEffect: {
    name: '歌ってみた、聴いてください',
    *run(ctx) {
      // 自分が後攻で最初のターンなら
      if (!ctx.isFirstTurnGoingSecond()) return;

      // ① 1stホロメンの〈音乃瀬奏〉を1枚、デッキから公開して手札に加える
      const kanades = ctx.deckCards(
        (c) => c && c.kind === 'holomen' && c.name === '音乃瀬奏' && c.bloomLevel === '1st');
      if (kanades.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: kanades,
          title: '手札に加える 1stホロメンの〈音乃瀬奏〉を選択',
        });
        if (picked) {
          ctx.removeFromDeck(picked);
          ctx.flashReveal(picked);
          ctx.addToHand(picked, { reveal: true });
        }
      } else {
        ctx.log('デッキに 1stホロメンの〈音乃瀬奏〉が無い');
      }

      // ② 〈リコーダー〉を1枚、デッキから公開して手札に加える
      const recorders = ctx.deckCards((c) => c && c.name === 'リコーダー');
      if (recorders.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: recorders,
          title: '手札に加える〈リコーダー〉を選択',
        });
        if (picked) {
          ctx.removeFromDeck(picked);
          ctx.flashReveal(picked);
          ctx.addToHand(picked, { reveal: true });
        }
      } else {
        ctx.log('デッキに〈リコーダー〉が無い');
      }

      // そしてデッキをシャッフルする
      ctx.shuffleDeck();
    },
  },
};
