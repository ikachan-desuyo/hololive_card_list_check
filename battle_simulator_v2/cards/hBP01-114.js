/**
 * 石の斧 (hBP01-114) サポート・ツール
 *
 * [サポート効果]
 *  ■このツールが付いているホロメンのアーツ+20。
 *    → attached.artsPlus で常時 +20。
 *  ■このツールが付いているホロメンがアーツを使った時、このホロメンに特殊ダメージ10を与える。
 *    → triggers.onArtsUse で実装。付いているホロメン自身へ特殊ダメージ10（自傷）。
 *
 *  ◆１st以上の〈アキ・ローゼンタール〉に付いていたら能力追加
 *  [ターンに１回]自分の能力で、このホロメンが回復した時、自分のデッキを１枚引く。
 *    → attached.onHealed で実装。ctx.heal（＝自分の能力による回復）の発生時に engine が装着カードの
 *      onHealed を呼ぶ。付け先が1st以上の〈アキ・ローゼンタール〉なら[ターンに1回]デッキを1枚引く。
 *
 * ※ ツールは自分のホロメン1人につき1枚（エンジン既定の付け上限。attachRule 不要）。
 */
export default {
  number: 'hBP01-114',
  attached: {
    // ■このツールが付いているホロメンのアーツ+20
    artsPlus() { return 20; },
    // ◆1st以上の〈アキ・ローゼンタール〉に付いていたら: 自分の能力で回復した時、[ターンに1回]デッキを1枚引く
    onHealed(holomem, engine, self, ownerIdx) {
      const top = holomem.stack[0];
      if (top.name !== 'アキ・ローゼンタール') return;
      if (top.bloomLevel !== '1st' && top.bloomLevel !== '2nd') return; // 1st以上
      if (holomem._akiHealDrewTurn === engine.state.turn) return;       // [ターンに1回]
      holomem._akiHealDrewTurn = engine.state.turn;
      const p = engine.state.players[ownerIdx];
      if (p.deck.length > 0) {
        p.hand.push(p.deck.shift());
        engine.log('石の斧（アキ・ローゼンタール）: 回復したのでデッキを1枚引いた');
      }
    },
  },
  triggers: {
    // ■このツールが付いているホロメンがアーツを使った時、このホロメンに特殊ダメージ10（自傷）
    * onArtsUse(ctx) {
      const host = ctx.sourceHolomem;
      if (!host) return;
      yield* ctx.dealSpecialDamage({ holomem: host, top: host.stack[0] }, 10);
    },
  },
};
