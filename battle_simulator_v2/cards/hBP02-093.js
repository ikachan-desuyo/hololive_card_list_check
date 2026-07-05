/**
 * ミテイル (hBP02-093) サポート・マスコット（#白上'sキャラクター）
 *
 * [サポート効果] このマスコットが付いているホロメンのHP+20。
 *   → attached.hpPlus で常時 +20。
 *
 * ◆〈白上フブキ〉に付いていたら能力追加:
 *   [バックポジション限定]このマスコットが付いているホロメンは相手からダメージを受けない。
 *   → attached.damageDelta で実装。付け先が〈白上フブキ〉かつバックにいて、相手のターン（=相手から）の
 *     被弾時に -100000 を返して実質「受けない（0）」にする（damageReceivedDelta は max(0, dmg+delta)）。
 *
 * マスコットは、自分のホロメン1人につき1枚だけ付けられる（マスコット共通制限。エンジンが既定で処理）。
 */
export default {
  number: 'hBP02-093',
  attached: {
    hpPlus() {
      return 20;
    },
    // ◆〈白上フブキ〉に付いていたら: [バック限定]相手からダメージを受けない（相手ターンの被弾を0に）
    damageDelta(holomem, zone, engine) {
      if (holomem.stack[0].name !== '白上フブキ') return 0;
      if (zone !== 'back') return 0;
      const ownerIdx = engine.state.players.findIndex((p) => engine._stageHolomems(p).includes(holomem));
      if (ownerIdx < 0 || engine.state.turnPlayer === ownerIdx) return 0; // 相手のターン=相手から
      return -100000;
    },
  },
};
