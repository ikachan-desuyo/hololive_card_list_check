/**
 * 角巻わため (hBP07-010) 白・1st・HP170（#JP #4期生 #ケモミミ #歌）
 * コラボエフェクト「みんなー！ 楽しむぞおおー！！！！！」:
 *   自分のデッキの上から1枚をホロパワーにする。
 *   その後、自分のホロパワーを見る。その中から1枚を手札に加える。
 *   そしてホロパワーをシャッフルする。
 * アーツ「みんなの声聞けるかなー？？？？？？？」: dmg40（テキスト効果なし）。
 *
 * 注: ホロパワー専用プリミティブは context.js に無いため、
 *     ホロパワー領域(ctx.player.holoPower)を直接操作している
 *     （カードは常にいずれかの領域に属する＝保存則を満たす）。
 */
export default {
  number: 'hBP07-010',
  collabEffect: {
    name: 'みんなー！ 楽しむぞおおー！！！！！',
    *run(ctx) {
      const p = ctx.player;
      // デッキの上から1枚をホロパワーにする
      if (p.deck.length > 0) {
        const top = p.deck.shift();
        p.holoPower.push(top);
        ctx.log(`${p.name}: デッキの上から1枚をホロパワーにした`);
      }
      if (p.holoPower.length === 0) return;
      // ホロパワーを見て、その中から1枚を手札に加える
      const picked = yield ctx.chooseCard({
        cards: [...p.holoPower],
        title: 'ホロパワーから手札に加えるカードを選択',
      });
      if (picked) {
        const i = p.holoPower.indexOf(picked);
        if (i !== -1) p.holoPower.splice(i, 1);
        ctx.addToHand(picked);
      }
      // ホロパワーをシャッフルする
      ctx.engine._shuffle(p.holoPower);
      ctx.log(`${p.name}: ホロパワーをシャッフル`);
    },
  },
};
