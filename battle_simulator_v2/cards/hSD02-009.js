/**
 * 百鬼あやめ (hSD02-009) 赤・2nd・HP180（#JP #2期生 #シューター）
 * アーツ「あやふぶみの「あや」担当」(60): 効果なし（特攻 黄+50）。
 * アーツ「余ーだ余」(40):
 *   自分の手札1～3枚をアーカイブできる：
 *   相手のセンターホロメンに、アーカイブしたカード1枚につき、特殊ダメージ40を与える。
 *   （「できる」＝任意コスト。手札がある時のみ。1～3枚を選んで支払い、枚数×40の特殊ダメージ）
 */
export default {
  number: 'hSD02-009',
  arts: {
    '余ーだ余': {
      *run(ctx) {
        if (ctx.player.hand.length === 0) return; // コスト（手札）を払えない
        const ok = yield ctx.confirm('手札1～3枚をアーカイブして、1枚につき特殊ダメージ40を与えますか？');
        if (!ok) return;
        const max = Math.min(3, ctx.player.hand.length);
        let archived = 0;
        for (let i = 0; i < max; i++) {
          const optional = i >= 1; // 1枚目は必須（コスト最小1枚）、2枚目以降は任意
          const card = yield ctx.chooseCard({
            cards: [...ctx.player.hand],
            title: `コスト: アーカイブする手札を選択（${i + 1}枚目${optional ? '・任意' : ''}）`,
            optional,
            skipLabel: 'ここでやめる',
          });
          if (!card) break;
          ctx.removeFromHand(card);
          ctx.player.archive.push(card);
          archived++;
        }
        if (archived === 0) return;
        ctx.log(`手札${archived}枚をアーカイブした`);
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'center',
          title: `特殊ダメージ${archived * 40}を与える相手のセンターホロメンを選択`,
        });
        if (target) yield* ctx.dealSpecialDamage(target, archived * 40);
      },
    },
  },
};
