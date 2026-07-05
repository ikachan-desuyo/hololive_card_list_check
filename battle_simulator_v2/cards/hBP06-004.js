/**
 * 百鬼あやめ (hBP06-004) 推しホロメン・赤
 * 推しスキル「鬼閻魔」[ホロパワー：-2][ターンに1回]:
 *   自分のエールデッキの上から1～2枚をアーカイブする：アーカイブしたエール1枚につき、自分のデッキを1枚引く。
 *   → エールデッキの上から（中身を選ばず）1枚、任意で2枚目もアーカイブし、その枚数ぶんドローする。
 *     ※「上からN枚を見る/選ぶ」ではなく単純に上から送るだけなので実装可能。
 * SP推しスキル「二刀一閃！ 鬼神斬り」[ホロパワー：-2][ゲームに1回]:
 *   相手のセンターホロメンかコラボホロメンどちらかに、自分のアーカイブの赤エール1枚につき、特殊ダメージ20を与える。
 *
 * ホロパワーコスト[-2]はエンジン側で処理されるため run 内では支払わない。
 */
export default {
  number: 'hBP06-004',
  oshiSkill: {
    name: '鬼閻魔',
    *run(ctx) {
      // エールデッキが空なら何もできない
      if (ctx.player.cheerDeck.length === 0) return;

      // 1枚目は必ずアーカイブする（「上から1～2枚」=最低1枚）
      let archived = 0;
      const first = ctx.player.cheerDeck.shift();
      ctx.flashReveal(first);
      ctx.player.archive.push(first);
      ctx.log(`エールデッキの上から ${first.name} をアーカイブ`);
      archived += 1;

      // 2枚目は任意（エールが残っている場合のみ）
      if (ctx.player.cheerDeck.length > 0) {
        const second = yield ctx.confirm(
          'エールデッキの上からもう1枚アーカイブしますか？（合計2枚 → 2ドロー）',
          'もう1枚アーカイブする',
          '1枚だけにする',
        );
        if (second) {
          const card = ctx.player.cheerDeck.shift();
          ctx.flashReveal(card);
          ctx.player.archive.push(card);
          ctx.log(`エールデッキの上から ${card.name} をアーカイブ`);
          archived += 1;
        }
      }

      // アーカイブしたエール1枚につき1ドロー
      if (archived > 0) ctx.draw(archived);
    },
  },
  spOshiSkill: {
    name: '二刀一閃！ 鬼神斬り',
    *run(ctx) {
      // 自分のアーカイブの赤エール枚数 × 20 の特殊ダメージ
      const redCheers = ctx.player.archive.filter(
        (c) => c.kind === 'cheer' && c.color === '赤',
      ).length;
      if (redCheers === 0) return; // ダメージ0なら不発
      const amount = redCheers * 20;
      const target = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
        title: `特殊ダメージ${amount}を与える相手ホロメンを選択（センターかコラボ）`,
      });
      if (target) yield* ctx.dealSpecialDamage(target, amount);
    },
  },
};
