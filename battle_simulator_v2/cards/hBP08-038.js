/**
 * モココ・アビスガード (hBP08-038) ホロメン・赤・2nd・HP190
 *
 * [コラボエフェクト] 魔法の武器だもん！:
 *   自分の推しホロメンが青の〈FUWAMOCO〉なら、自分のアーカイブの#Adventを持つホロメン1枚を手札に戻す。
 *   → 条件: 自分の推しホロメンが name==='FUWAMOCO' かつ color==='青'（厳密に色も判定）。
 *      条件を満たさなければ何もしない。
 *      対象: 自分のアーカイブの #Advent ホロメン1枚を手札に戻す。
 *      テキストは「戻す」（必須）だが、候補が無ければ何もしない。候補があれば1枚選んで手札へ。
 *
 * [アーツ] 勝つのはモココだよ！（100 / any any・特攻 緑+50）: テキスト効果なし（特攻はエンジンが処理）。
 *
 * 保留: なし。
 */
export default {
  number: 'hBP08-038',

  collabEffect: {
    name: '魔法の武器だもん！',
    *run(ctx) {
      // 条件: 自分の推しホロメンが青の〈FUWAMOCO〉
      const oshi = ctx.player.oshi;
      if (!oshi || oshi.name !== 'FUWAMOCO' || oshi.color !== '青') return;

      // 自分のアーカイブの #Advent ホロメン
      const cand = ctx.player.archive.filter(
        (c) => c.kind === 'holomen' && (c.tags || []).includes('Advent'));
      if (cand.length === 0) {
        ctx.log('アーカイブに#Adventホロメンがいない');
        return;
      }
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: 'アーカイブの#Adventホロメン1枚を手札に戻す',
      });
      if (!picked) return;
      ctx.removeFromArchive(picked);
      ctx.addToHand(picked, { reveal: false });
    },
  },
};
