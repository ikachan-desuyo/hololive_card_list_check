/**
 * ホロキャップ (hBP03-095) サポート・ツール
 *
 * [サポート効果] ◆DebutホロメンかSpotホロメンに付いていたら能力追加
 *   ■このツールが付いているホロメンのHP+30。
 *   ■このツールが付いているホロメンは相手から特殊ダメージを受けない。
 *
 * ツールは、自分のホロメン1人につき1枚だけ付けられる（エンジン既定のツール制限で処理）。
 *
 * 実装範囲:
 *   - HP+30（付け先がDebutまたはSpotホロメンの時のみ）を attached.hpPlus で実装。
 *     付いているホロメンの現在の最上段カード stack[0] の bloomLevel で条件判定する。
 *
 * 「相手から特殊ダメージを受けない」
 *   → attached.damageDelta で実装。付け先がDebut/Spotで、相手のターン（=相手から）の特殊ダメージ(kind==='special')
 *     のときに -100000 を返して実質0にする（damageReceivedDelta は max(0, dmg+delta)）。
 */
export default {
  number: 'hBP03-095',
  attached: {
    // 付け先がDebutまたはSpotホロメンの時のみ HP+30
    hpPlus(holomem) {
      const top = holomem.stack[0];
      const lv = top?.bloomLevel;
      return (lv === 'Debut' || lv === 'Spot') ? 30 : 0;
    },
    // ◆Debut/Spot限定: 相手から特殊ダメージを受けない（相手ターンの特殊ダメージを0に）
    damageDelta(holomem, zone, engine, kind) {
      const lv = holomem.stack[0]?.bloomLevel;
      if (lv !== 'Debut' && lv !== 'Spot') return 0;
      if (kind !== 'special') return 0;
      const ownerIdx = engine.state.players.findIndex((p) => engine._stageHolomems(p).includes(holomem));
      if (ownerIdx < 0 || engine.state.turnPlayer === ownerIdx) return 0; // 相手のターン=相手から
      return -100000;
    },
  },
};
