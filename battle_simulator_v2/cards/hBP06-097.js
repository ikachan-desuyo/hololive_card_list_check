/**
 * カワイイスタジャン (hBP06-097) サポート・ツール
 * ◆Buzzホロメンに付いていたら能力追加:
 *   ■このツールが付いているホロメンのHP+30。
 *   ■相手のメインステップの間、このツールが付いているホロメンのHPは相手の能力で減らず、変動しない。
 * ツールは、自分のホロメン1人につき1枚だけ付けられる（エンジン既定のツール装着ルール）。
 *
 * ※HP+30 は「◆Buzzホロメンに付いていたら能力追加」配下なので、付け先が Buzz ホロメンの時のみ +30。
 *   Buzz時の「相手のメインステップの間、HPが相手の能力で減らず・変動しない」は attached.damageDelta で実装
 *   （相手のメインステップ中の被弾を -100000 で実質0にする。hBP03-065/hBP04-024 と同型）。
 */
export default {
  number: 'hBP06-097',
  attached: {
    // 付け先が Buzz ホロメンの時のみ HP+30（それ以外では追加能力が発動しない）
    hpPlus(holomem) {
      return holomem?.stack?.[0]?.buzz ? 30 : 0;
    },
    // ◆Buzz限定: 相手のメインステップの間、HPは相手の能力で減らず変動しない（被弾を0に）
    damageDelta(holomem, zone, engine) {
      if (!holomem.stack[0]?.buzz) return 0;                 // ◆Buzzホロメンに付いていたら
      const s = engine.state;
      if (s.step !== 'main') return 0;                       // 相手のメインステップの間
      const ownerIdx = engine.state.players.findIndex((p) => engine._stageHolomems(p).includes(holomem));
      if (ownerIdx < 0 || s.turnPlayer === ownerIdx) return 0; // 「相手の」メインステップ
      return -100000;                                         // HPが相手の能力で減らない・変動しない
    },
  },
};
