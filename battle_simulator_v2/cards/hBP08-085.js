/**
 * 不知火フレア (hBP08-085) ホロメン・黄・Debut・HP120（#JP #3期生 #ハーフエルフ）
 *
 * [コラボエフェクト] 手、繋いでいると温かいね:
 *   自分の手札1枚をアーカイブできる：
 *   自分のアーカイブの[Debutホロメンか1stホロメンかSpotホロメン]1枚を手札に戻す。
 *   → 「できる」＝任意効果。コストとして手札1枚をアーカイブし、
 *     その後アーカイブから Debut/1st/Spot のホロメン1枚を手札に戻す。
 *     手札が無い／戻せるホロメンが居ない場合は不発（コストを払えないため何もしない）。
 *     コスト（手札アーカイブ）支払い後は本文（手札に戻す）は強制。
 *
 * [アーツ] テレ隠しが下手ですな～ (10 / any):
 *   テキスト効果なし（素点10のみ）。run 不要。
 *
 * 保留: なし（全文 context.js のプリミティブで実装）。
 */
const RETURNABLE = ['Debut', '1st', 'Spot'];

export default {
  number: 'hBP08-085',

  collabEffect: {
    name: '手、繋いでいると温かいね',
    *run(ctx) {
      // アーカイブに Debut/1st/Spot のホロメンが居なければ意味がないので不発
      const returnable = ctx.player.archive.filter(
        (c) => c.kind === 'holomen' && RETURNABLE.includes(c.bloomLevel));
      if (returnable.length === 0) {
        ctx.log('アーカイブに手札に戻せるホロメン（Debut/1st/Spot）が無い');
        return;
      }
      if (ctx.player.hand.length === 0) {
        ctx.log('アーカイブするための手札が無い');
        return;
      }
      // 任意効果（できる）: 発動するか確認
      const use = yield ctx.confirm(
        '手札1枚をアーカイブして、アーカイブのDebut/1st/Spotホロメン1枚を手札に戻しますか？');
      if (!use) return;
      // コスト: 手札1枚をアーカイブ
      const cost = yield ctx.chooseCard({
        cards: ctx.player.hand,
        title: 'アーカイブする手札を選択',
      });
      if (!cost) return;
      ctx.removeFromHand(cost);
      ctx.player.archive.push(cost);
      ctx.log(`${cost.name} をアーカイブ`);
      // 本文: アーカイブから Debut/1st/Spot ホロメン1枚を手札に戻す（強制）
      const cand = ctx.player.archive.filter(
        (c) => c.kind === 'holomen' && RETURNABLE.includes(c.bloomLevel));
      if (cand.length === 0) return; // 念のため
      const target = yield ctx.chooseCard({
        cards: cand,
        title: '手札に戻すホロメン（Debut/1st/Spot）を選択',
      });
      if (!target) return;
      ctx.removeFromArchive(target);
      ctx.addToHand(target);
    },
  },
};
