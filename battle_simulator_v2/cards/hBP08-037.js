/**
 * モココ・アビスガード (hBP08-037) 赤・1st・HP170（#EN #Advent #ケモミミ）
 *
 * ブルームエフェクト「トゥインクル・アイドル」:
 *   自分のステージに〈フワワ・アビスガード〉がいるなら、相手のセンターホロメンか
 *   コラボホロメンに特殊ダメージ20を与える。
 *   → 対象（センター/コラボ）はプレイヤー選択。「ライフは減らない」記載は無いので
 *     ダウン時のライフ減少は通常通り。
 *
 * アーツ「がんBAUるねー！」(30):
 *   このホロメンに青エールが2枚以上付いているなら、自分のエールデッキの上から1枚を
 *   自分の〈フワワ・アビスガード〉に送る。
 *   → 青エール判定は ctx.cheerCountOfColor（実効色）。推しFUWAMOCO（hBP08-003）の
 *     「赤エールすべては青エールとしても扱う」エイリアスを反映する。
 *     自分のステージに〈フワワ・アビスガード〉が複数いる場合は送り先をプレイヤーが選択。
 *     ダメージは固定30で増減なし。
 */
export default {
  number: 'hBP08-037',

  bloomEffect: {
    name: 'トゥインクル・アイドル',
    *run(ctx) {
      // 自分のステージに〈フワワ・アビスガード〉がいるか
      const hasFuwawa = ctx.holomems('self').some((e) => ctx.nameIs(e.top, 'フワワ・アビスガード'));
      if (!hasFuwawa) return;
      // 相手のセンターかコラボに特殊ダメージ20（対象はプレイヤー選択）
      const target = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
        title: '特殊ダメージ20を与える相手のセンター/コラボホロメンを選択',
      });
      if (target) yield* ctx.dealSpecialDamage(target, 20);
    },
  },

  arts: {
    'がんBAUるねー！': {
      // ダメージは固定30。青エール2枚以上ならエールデッキの上から1枚を〈フワワ・アビスガード〉へ。
      *run(ctx) {
        const self = ctx.sourceHolomem;
        if (!self) return;
        // 青エール2枚以上（実効色: FUWAMOCO推しの赤→青エイリアス対応）
        if (ctx.cheerCountOfColor(self, '青') < 2) return;
        const fuwawa = ctx.holomems('self', (e) => ctx.nameIs(e.top, 'フワワ・アビスガード'));
        if (fuwawa.length === 0) return;
        let dest = fuwawa[0];
        if (fuwawa.length > 1) {
          dest = yield ctx.chooseHolomem({
            side: 'self',
            filter: (e) => ctx.nameIs(e.top, 'フワワ・アビスガード'),
            title: 'エールを送る〈フワワ・アビスガード〉を選択',
          });
        }
        if (dest) ctx.sendCheerFromCheerDeckTop(dest.holomem);
      },
    },
  },
};
