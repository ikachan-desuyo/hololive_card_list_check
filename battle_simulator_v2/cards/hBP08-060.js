/**
 * FUWAMOCO (hBP08-060) 青赤・1st・HP170（#EN #Advent #ケモミミ）
 *
 * ギフト「“BAU” DOL♡」(キーワード/ギフト):
 *   [コラボポジション限定]自分の推しスキル「モコちゃん！」の[ホロパワー:-3]を[ホロパワー:-2]に変更する。
 *   → このカードがコラボにいる間、推しスキル「モコちゃん！」の必要ホロパワーを-1する。
 *     エンジンの _effectiveOshiCost が全自ステージホロメンの oshiSkillCostMod を合算するため、
 *     下記フックで実現する（コラボ限定・スキル名一致）。
 *
 * アーツ「いっしょういっしょ♡」(50):
 *   自分の推しホロメンが青の〈FUWAMOCO〉なら、自分のデッキの上から1枚をホロパワーにする。
 *
 * 解釈:
 *   - 「青の〈FUWAMOCO〉」= 推しホロメンの名前が FUWAMOCO かつ色が青（FUWAMOCO推しは青/赤の2種ある）。
 *   - 条件を満たせばデッキ上1枚をホロパワーに置く（強制・選択なし）。デッキが空なら何もしない。
 *   - ホロパワー専用プリミティブは無いため ctx.player.holoPower / deck を直接操作する（カードは常に領域に属する＝保存則を満たす）。
 */
export default {
  number: 'hBP08-060',

  // ギフト「“BAU” DOL♡」: [コラボ限定] 推しスキル「モコちゃん！」の必要ホロパワーを-1（-3→-2）。
  // engine._effectiveOshiCost が自ステージ全ホロメンの本フックを合算する。
  oshiSkillCostMod(skill, holomem, zone) {
    if (zone !== 'collab') return 0;
    if (!/モコちゃん！/.test(skill.text || '')) return 0;
    return -1; // 必要ホロパワーを1減らす
  },

  arts: {
    'いっしょういっしょ♡': {
      *run(ctx) {
        const oshi = ctx.player.oshi;
        if (oshi?.name !== 'FUWAMOCO' || oshi?.color !== '青') return;
        const p = ctx.player;
        if (p.deck.length === 0) return;
        const card = p.deck.shift();
        p.holoPower.push(card);
        ctx.log(`${p.name}: デッキの上から1枚をホロパワーにした（ホロパワー${p.holoPower.length}枚）`);
      },
    },
  },
};
