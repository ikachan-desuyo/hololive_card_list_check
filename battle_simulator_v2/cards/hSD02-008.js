/**
 * 百鬼あやめ (hSD02-008) 赤・Buzz・1st・HP230 (#JP #2期生 #シューター)
 * アーツ「ファンシーバースデー」(40): 効果なし（バニラ）
 * アーツ「プレゼント何かな？」(50):
 *   自分の手札1枚をアーカイブできる：相手のセンターホロメンかコラボホロメンに特殊ダメージ50を与える。
 *   → コストは run 内で手札1枚をアーカイブして支払い、特殊ダメージ50を与える。
 */
export default {
  number: 'hSD02-008',
  arts: {
    'プレゼント何かな？': {
      *run(ctx) {
        if (ctx.player.hand.length < 1) return; // コスト（手札1枚）を払えない
        const ok = yield ctx.confirm('手札1枚をアーカイブして特殊ダメージ50を与えますか？');
        if (!ok) return;
        const card = yield ctx.chooseCard({
          cards: [...ctx.player.hand],
          title: 'コスト: アーカイブする手札を選択',
        });
        if (!card) return;
        ctx.removeFromHand(card);
        ctx.player.archive.push(card);
        ctx.log('手札1枚をアーカイブした');
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
          title: '特殊ダメージ50を与える相手ホロメンを選択（センターかコラボ）',
        });
        if (target) ctx.dealSpecialDamage(target, 50);
      },
    },
  },
};
