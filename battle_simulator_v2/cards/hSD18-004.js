/**
 * 森カリオペ (hSD18-004) ホロメン・紫・Debut・HP90（#EN #Myth #歌）
 *
 * コラボエフェクト「みーなさんっ」:
 *   自分が後攻で最初のターンなら、自分のデッキの上から1枚をアーカイブする。
 *   その後、自分のデッキを1枚引く。
 *
 * 解釈:
 *  - 条件は ctx.isFirstTurnGoingSecond()（後攻かつ自分の最初のターン）。満たさなければ何もしない。
 *  - 両ステップとも強制（プレイヤー選択なし）。
 *  - 「デッキの上から1枚をアーカイブ」= デッキ先頭を取り除いてアーカイブへ（context.js に専用プリミティブが
 *    無いため、ローグでデッキ先頭→archive を直接移動。カードがどの領域にも属さない瞬間は作らない）。
 *  - 「その後1枚引く」= ctx.draw(1)。デッキが空でも安全（draw が枚数を見て処理）。
 *
 * アーツ「あたためて貰えますか…？」(20ダメージ、任意エール1): テキスト効果なし（素点処理）。実装不要。
 * 保留: なし
 */
export default {
  number: 'hSD18-004',
  collabEffect: {
    name: 'みーなさんっ',
    *run(ctx) {
      if (!ctx.isFirstTurnGoingSecond()) return;
      // デッキの上から1枚をアーカイブ
      if (ctx.player.deck.length > 0) {
        const top = ctx.player.deck.shift();
        ctx.player.archive.push(top);
        ctx.recordDeckArchive(1);
        ctx.log(`${ctx.player.name}: デッキの上から ${top.name} をアーカイブ`);
      }
      // その後、自分のデッキを1枚引く
      ctx.draw(1);
    },
  },
};
