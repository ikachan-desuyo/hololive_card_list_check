/**
 * ロボ子さん (hBP06-064) 紫・1st・HP160（JP/0期生/シューター）
 * コラボエフェクト「いたずらしちゃうぞ～！」:
 *   自分の推しホロメンが〈ロボ子さん〉なら、自分の手札1～2枚をアーカイブできる：
 *   アーカイブしたカード1枚につき、自分のアーカイブの〈ろぼさー〉1枚を手札に戻す。
 *   → 任意（できる）。手札を1枚または2枚アーカイブし、その枚数だけ
 *      アーカイブの〈ろぼさー〉を手札に戻す（戻せる枚数は手札に入れたコスト枚数が上限）。
 * アーツ「がおー！！......ビックリした？」(40): テキスト効果なし。
 */
export default {
  number: 'hBP06-064',
  collabEffect: {
    name: 'いたずらしちゃうぞ～！',
    *run(ctx) {
      // 推しホロメンが〈ロボ子さん〉でなければ使えない
      if (ctx.player.oshi?.name !== 'ロボ子さん') return;
      if (ctx.player.hand.length < 1) return; // コスト（手札1枚以上）を払えない

      const ok = yield ctx.confirm('手札1～2枚をアーカイブして、その枚数だけアーカイブの〈ろぼさー〉を手札に戻しますか？');
      if (!ok) return;

      // 手札1～2枚をアーカイブ（1枚目は必須、2枚目は任意）
      const maxCost = Math.min(2, ctx.player.hand.length);
      let archived = 0;
      for (let i = 0; i < maxCost; i++) {
        const card = yield ctx.chooseCard({
          cards: [...ctx.player.hand],
          title: `コスト: アーカイブする手札を選択（${i + 1}/${maxCost}）`,
          optional: i >= 1, // 1枚目は必須、2枚目以降は任意
          skipLabel: 'ここまでにする',
        });
        if (!card) break;
        ctx.removeFromHand(card);
        ctx.player.archive.push(card);
        archived++;
      }
      if (archived === 0) return;
      ctx.log(`手札${archived}枚をアーカイブした`);

      // Q530: アーカイブした枚数だけ、アーカイブの〈ろぼさー〉を手札に戻す（強制。候補があれば必ず戻す）
      for (let i = 0; i < archived; i++) {
        const cand = ctx.player.archive.filter((c) => c.name === 'ろぼさー');
        if (cand.length === 0) break;
        // 同名カードで機能差が無いため先頭を強制回収
        const picked = cand[0];
        ctx.removeFromArchive(picked);
        ctx.addToHand(picked);
        ctx.log(`いたずらしちゃうぞ～！: アーカイブの〈ろぼさー〉を手札に戻した（${i + 1}/${archived}）`);
      }
    },
  },
};
