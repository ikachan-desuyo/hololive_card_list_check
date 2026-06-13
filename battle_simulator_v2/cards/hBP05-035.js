/**
 * さくらみこ (hBP05-035) 赤・2nd・HP200
 * キーワード「今のはちょっとね、練習で…」:
 *   [センターポジション・コラボポジション限定]相手のターンで、自分の〈さくらみこ〉がダウンした時に使える：
 *   自分のデッキから、〈み俺恥〉1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → triggers.onDown（相手ターン＆センター/コラボ限定）
 * アーツ「あえんびえん」(90):
 *   自分の手札2枚をアーカイブできる：相手のセンターホロメンかコラボホロメンに特殊ダメージ50を与える。
 *   自分のステージに〈35P〉があるなら、さらに、自分のデッキを1枚引く。
 */
export default {
  number: 'hBP05-035',
  triggers: {
    *onDown(ctx) {
      if (ctx.state.turnPlayer === ctx.playerIdx) return; // 相手のターンのみ
      const zone = ctx.sourceHolomemPos()?.zone;
      if (zone !== 'center' && zone !== 'collab') return; // [センター・コラボ限定]
      const cand = ctx.deckCards((c) => c.name === 'み俺恥');
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: '手札に加える〈み俺恥〉を選択（任意）',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked);
      }
      ctx.shuffleDeck();
    },
  },
  arts: {
    'あえんびえん': {
      *run(ctx) {
        if (ctx.player.hand.length < 2) return; // コスト（手札2枚）を払えない
        const ok = yield ctx.confirm('手札2枚をアーカイブして特殊ダメージ50を与えますか？');
        if (!ok) return;
        for (let i = 0; i < 2; i++) {
          const card = yield ctx.chooseCard({
            cards: [...ctx.player.hand],
            title: `コスト: アーカイブする手札を選択（${i + 1}/2）`,
          });
          if (!card) return;
          ctx.removeFromHand(card);
          ctx.player.archive.push(card);
        }
        ctx.log('手札2枚をアーカイブした');
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
          title: '特殊ダメージ50を与える相手ホロメンを選択（センターかコラボ）',
        });
        if (target) ctx.dealSpecialDamage(target, 50);
        // 自分のステージに〈35P〉があるなら1ドロー
        const has35P = ctx.holomems('self', (e) =>
          e.holomem.attachments.some((a) => a.name === '35P')).length > 0;
        if (has35P) ctx.draw(1);
      },
    },
  },
};
