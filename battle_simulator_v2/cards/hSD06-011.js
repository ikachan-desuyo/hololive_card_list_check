/**
 * ﾁｬｷ丸 (hSD06-011) サポート・ツール
 *
 * [サポート効果] このツールが付いているホロメンのアーツ+10。
 *   → attached.artsPlus で常時 +10。
 *
 * ◆1st以上の〈風真いろは〉に付いていたら能力追加
 *   [ターンに1回]相手のターンで、このツールが付いているホロメンがダメージを
 *   受けた時、相手のセンターホロメンに特殊ダメージ20を与える。
 *   ただし、ダウンしても相手のライフは減らない。
 *   → attached.onDamageReceivedForced で実装（相手ターンに付いているホロメンが
 *     ダメージを受けた時に engine が強制発火。hBP07-108 と同経路）。
 *     1st以上の〈風真いろは〉に付いている時のみ・[ターンに1回]に限定し、相手センターへ
 *     特殊ダメージ20（ダウンしてもライフは減らない）。反撃ダウンは次のチェックタイミングで処理される。
 *
 * ツールは、自分のホロメン1人につき1枚だけ付けられる（ツール共通ルールで
 *   エンジンが制御するため、ここでは付け先制限を書かない）。
 */
export default {
  number: 'hSD06-011',
  attached: {
    // このツールが付いているホロメンのアーツ+10
    artsPlus() { return 10; },

    // [ターンに1回] 1st以上の〈風真いろは〉に付いている時、相手ターンに被ダメージで相手センターに特殊20（ライフ減らさず）
    onDamageReceivedForced(holomem, engine, self, ownerIdx) {
      if (self._counterUsedTurn === engine.state.turn) return; // [ターンに1回]
      const host = holomem.stack[0];
      if (host.name !== '風真いろは' || (host.bloomLevel !== '1st' && host.bloomLevel !== '2nd')) return;
      const oppCenter = engine.state.players[1 - ownerIdx].center;
      if (!oppCenter) return;
      self._counterUsedTurn = engine.state.turn;
      const dmg = engine._applyDamageReceived(oppCenter, 20, 'special', holomem);
      if (dmg <= 0) return;
      oppCenter.damage += dmg;
      // ただし、ダウンしても相手のライフは減らない
      if (oppCenter.damage >= engine.effectiveHp(oppCenter)) oppCenter.noLifeOnDown = true;
      engine.log(`ﾁｬｷ丸: ${host.name}が被ダメージ→相手センターに特殊ダメージ${dmg}（ダウンしてもライフは減らない）`);
    },
  },
};
