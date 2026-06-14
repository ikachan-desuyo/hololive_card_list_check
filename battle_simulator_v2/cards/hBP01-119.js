/**
 * ジョブズ (hBP01-119) サポート・マスコット
 *
 * [サポート効果] このマスコットが付いているホロメンのHP+10。
 *   → attached.hpPlus で常時 +10。
 *
 * ◆〈アキ・ローゼンタール〉に付いていたら能力追加:
 *   このマスコットが付いているホロメンがアーツを使った時、自分のホロメン1人のHP10回復。
 *   → triggers.onArtsUse（装着カードのトリガー。engine がホストのアーツ使用時に装着カードの
 *      onArtsUse も走査して発火。ctx.sourceHolomem=ホスト, ctx.sourceCard=このマスコット）。
 *
 * マスコットは、自分のホロメン1人につき1枚だけ付けられる
 *   （エンジン既定のマスコット制限で処理されるため attachRule 不要）。
 */
export default {
  number: 'hBP01-119',
  attached: {
    // [サポート効果] 付いているホロメンのHP+10
    hpPlus() { return 10; },
  },
  triggers: {
    // ◆〈アキ・ローゼンタール〉に付いていたら: ホストがアーツを使った時、自分のホロメン1人のHP10回復
    *onArtsUse(ctx) {
      if (ctx.sourceHolomem?.stack[0].name !== 'アキ・ローゼンタール') return;
      if (ctx.holomems('self', (e) => e.holomem.damage > 0).length === 0) return;
      const entry = yield ctx.chooseHolomem({
        side: 'self', filter: (e) => e.holomem.damage > 0,
        title: 'HP10回復する自分のホロメンを選択', optional: true,
      });
      if (entry) ctx.heal(entry.holomem, 10);
    },
  },
};
