/**
 * うぱお (hBP01-116) サポート・マスコット
 *
 * [サポート効果] このマスコットが付いているホロメンのアーツ+10。
 *   → attached.artsPlus で常時 +10。
 *
 * ◆〈天音かなた〉に付いていたら能力追加
 *   [ターンに1回]相手のターンで、このマスコットが付いているホロメンがダメージを
 *   受けた時、相手のセンターホロメンに特殊ダメージ20を与える。
 *   → attached.onDamageReceivedForced で実装（相手ターンに被ダメージで強制発火。hBP07-108 と同経路）。
 *     〈天音かなた〉に付いている時のみ・[ターンに1回]に限定し、相手センターへ特殊ダメージ20。
 *     ※テキストに「ライフは減らない」記載が無いため、ダウン時のライフは通常どおり減る。
 *
 * マスコットは、自分のホロメン1人につき1枚だけ付けられる（マスコット共通ルールで
 *   エンジンが制御するため、ここでは付け先制限を書かない＝任意のホロメンに付けられる）。
 */
export default {
  number: 'hBP01-116',
  attached: {
    // このマスコットが付いているホロメンのアーツ+10
    artsPlus() { return 10; },

    // [ターンに1回] 〈天音かなた〉に付いている時、相手ターンに被ダメージで相手センターに特殊20
    onDamageReceivedForced(holomem, engine, self, ownerIdx) {
      if (self._counterUsedTurn === engine.state.turn) return; // [ターンに1回]
      if (holomem.stack[0].name !== '天音かなた') return;
      const oppCenter = engine.state.players[1 - ownerIdx].center;
      if (!oppCenter) return;
      self._counterUsedTurn = engine.state.turn;
      const dmg = engine._applyDamageReceived(oppCenter, 20, 'special', holomem);
      if (dmg <= 0) return;
      oppCenter.damage += dmg;
      engine.log(`うぱお: ${holomem.stack[0].name}が被ダメージ→相手センターに特殊ダメージ${dmg}`);
    },
  },
};
