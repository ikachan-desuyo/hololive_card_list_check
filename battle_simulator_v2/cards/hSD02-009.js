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
        // 手札1～3枚をアーカイブ（1枚目は必須・最大3枚）。一度に選んで確定する。
        const picked = yield ctx.chooseCards({
          cards: [...ctx.player.hand],
          min: 1,
          max: 3,
          title: 'コスト: アーカイブする手札を選択（1～3枚）',
        });
        for (const card of picked) {
          ctx.removeFromHand(card);
          ctx.player.archive.push(card);
        }
        const archived = picked.length;
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
