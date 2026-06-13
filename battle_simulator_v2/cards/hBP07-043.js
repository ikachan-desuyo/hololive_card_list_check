/**
 * さくらみこ (hBP07-043) 赤・2nd・HP210（#JP #0期生 #ベイビー）
 *
 * コラボエフェクト「holoRêve -みこ-」:
 *   3か5を選ぶ。このターンの間、自分の推しホロメンの〈さくらみこ〉と
 *   自分のステージの〈さくらみこ〉の能力でサイコロを振る時、
 *   そのサイコロの目の数すべてを選んだ数として扱う。
 *   → 既存の継続効果 diceFixed（rollDice が参照）で「目をNとして扱う」を実装。
 *   ※ 注意: 現状の engine の diceFixed は ownerIdx 単位（その手番プレイヤーの
 *     全サイコロ）に適用される。テキストは「〈さくらみこ〉の能力で振る時」に
 *     限定しているが、rollDice 側に「どのホロメンの能力が振っているか」の情報が
 *     無いため、ホロメン単位の絞り込みはできていない（engine 改修が必要）。
 *     みこのコラボ後はみこ系の能力でサイコロを振るのが通常の用途なので近似実装。
 *
 * アーツ「桜は花に顕る」(70+):
 *   このホロメンに付いている〈35P〉1枚につき、このアーツ+70し、自分のデッキを1枚引く。
 *   → 装着物のうち name==='35P' の枚数 ×70 を加算し、同数ドロー。
 */
export default {
  number: 'hBP07-043',
  collabEffect: {
    name: 'holoRêve -みこ-',
    *run(ctx) {
      const pick = yield ctx.confirm('サイコロの目をいくつとして扱いますか？（はい=5 / いいえ=3）', '5', '3');
      const value = pick ? 5 : 3;
      ctx.addTurnModifier({
        kind: 'diceFixed',
        value,
        ownerIdx: ctx.playerIdx,
        description: `holoRêve -みこ-（サイコロの目を${value}として扱う）`,
      });
    },
  },
  arts: {
    '桜は花に顕る': {
      *run(ctx) {
        const count = (ctx.sourceHolomem?.attachments || [])
          .filter((a) => a.name === '35P').length;
        if (count <= 0) return;
        ctx.addArtBonus(70 * count, `〈35P〉${count}枚`);
        ctx.draw(count);
      },
    },
  },
};
