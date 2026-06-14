/**
 * Zecretary (hBP07-108) サポート・ファン
 *
 * [サポート効果]
 *  ■このファンが付いているホロメンがアーツを使う時、自分の推しホロメンが〈ベスティア・ゼータ〉なら、
 *    このファンを白エールとしても扱う。
 *    → attached.cheerSupply で実装（アーツ使用時に白エール1個を擬似供給）。
 *
 *  ■相手のターンで、このファンが付いているホロメンがダメージを受けた時、このファンをアーカイブする。
 *    → 【保留】「ホロメンがダメージを受けた時」に発火する被ダメージトリガーのフックがエンジンに無い
 *      （実装可能なフックは triggers.onDown / onAttach / onOpponentDown / onArtsUse と
 *       推しスキルの onDamageOshiSkill[=ダメージ軽減]のみで、装着カードを被ダメージ時に
 *       アーカイブへ送るトリガーは存在しない）。規約の保留機構（被ダメージ割り込み類）に準ずる。
 *      被ダメージトリガーのディスパッチが追加されたら、相手ターン判定
 *      （ctx.state.turnPlayer !== ctx.playerIdx）の上で ctx.archive 系で自身をアーカイブする定義を足すこと。
 *
 * このファンは、自分の〈ベスティア・ゼータ〉だけに付けられ、1人につき何枚でも付けられる。
 *    → attachRule で実装。
 */
export default {
  number: 'hBP07-108',
  attached: {
    // ■アーツを使う時、自分の推しが〈ベスティア・ゼータ〉なら、このファンを白エールとしても扱う（擬似エール供給）
    cheerSupply(holomem, engine) {
      const owner = engine.state.players.find((p) => engine._stageHolomems(p).includes(holomem));
      return owner && owner.oshi && owner.oshi.name === 'ベスティア・ゼータ' ? [{ color: '白' }] : [];
    },
  },
  attachRule: {
    canAttach(holomem) {
      return holomem.stack[0].name === 'ベスティア・ゼータ';
    },
    unlimited: true, // 1人に何枚でも
  },
  // 保留: 「相手のターンで、このファンが付いているホロメンがダメージを受けた時、このファンをアーカイブする」は
  //   被ダメージ時の強制トリガー（任意割り込みの onDamageReceivedReact とは別）が未実装のため保留。
};
