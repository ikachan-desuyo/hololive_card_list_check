/**
 * 鷹嶺ルイ (hBP08-066) ホロメン・紫・2nd・HP200（#JP #秘密結社holoX #トリ #お酒）
 *
 * [コラボエフェクト] そんなに顔赤い？:
 *   自分のアーカイブのサポートカード1枚をデッキの上に戻せる。
 *   → アーカイブのサポートカード（c.kind==='support'）から任意で1枚を選び、
 *     デッキの上（先頭）に戻す。「戻せる」＝任意なので選ばない（0枚）も可。
 *
 * [アーツ] 酔い、覚ましていこ？（60+ / any / 特攻[黄+50]）:
 *   自分の手札1～2枚をアーカイブできる：アーカイブしたカード1枚につき、このアーツ+20。
 *   → 任意効果。手札を1枚ずつ最大2枚までアーカイブし、アーカイブ枚数×20をアーツ加算。
 *     「1～2枚」「できる」より 0枚（発動しない）も可。素点60・特攻[黄+50]はエンジンが処理する。
 *
 * 保留: なし。
 */
export default {
  number: 'hBP08-066',

  collabEffect: {
    name: 'そんなに顔赤い？',
    *run(ctx) {
      // アーカイブのサポートカードを任意で1枚デッキの上に戻せる
      const cand = ctx.player.archive.filter((c) => c.kind === 'support');
      if (cand.length === 0) {
        ctx.log('アーカイブにサポートカードが無い');
        return;
      }
      const target = yield ctx.chooseCard({
        cards: cand,
        title: 'デッキの上に戻すサポートカードを選択',
        optional: true,
        skipLabel: '戻さない',
      });
      if (!target) return;
      ctx.removeFromArchive(target);
      ctx.deckToTop([target]);
      ctx.log(`${target.name} をデッキの上に戻した`);
    },
  },

  arts: {
    '酔い、覚ましていこ？': {
      *run(ctx) {
        // 手札を1枚ずつ最大2枚までアーカイブできる（任意）。アーカイブ1枚につきこのアーツ+20。
        let archived = 0;
        while (archived < 2 && ctx.player.hand.length > 0) {
          const card = yield ctx.chooseCard({
            cards: ctx.player.hand,
            title: `アーカイブする手札を選択（このアーツ+20／最大2枚・現在${archived}枚）`,
            optional: true,
            skipLabel: archived === 0 ? 'アーカイブしない' : 'これ以上アーカイブしない',
          });
          if (!card) break;
          ctx.removeFromHand(card);
          ctx.player.archive.push(card);
          archived++;
        }
        if (archived > 0) ctx.addArtBonus(archived * 20, `手札${archived}枚をアーカイブ`);
      },
    },
  },
};
