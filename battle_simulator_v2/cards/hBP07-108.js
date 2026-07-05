/**
 * Zecretary (hBP07-108) サポート・ファン
 *
 * [サポート効果]
 *  ■このファンが付いているホロメンがアーツを使う時、自分の推しホロメンが〈ベスティア・ゼータ〉なら、
 *    このファンを白エールとしても扱う。
 *    → attached.cheerSupply で実装（アーツ使用時に白エール1個を擬似供給）。
 *
 *  ■相手のターンで、このファンが付いているホロメンがダメージを受けた時、このファンをアーカイブする。
 *    → attached.onDamageReceivedForced で実装。engine が「相手のターンに付いているホロメンがダメージを
 *      受けた時」に強制（選択なし）で発火する（任意割り込みの onDamageReceivedReact とは別経路）。
 *      発火時にこのファンを attachments から外し、持ち主のアーカイブへ送る（ダメージ値は変更しない）。
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
    // ■相手のターンで、このファンが付いているホロメンがダメージを受けた時、このファンをアーカイブする（強制・選択なし）
    onDamageReceivedForced(holomem, engine, self, ownerIdx) {
      const i = holomem.attachments.indexOf(self);
      if (i !== -1) {
        holomem.attachments.splice(i, 1);
        engine.state.players[ownerIdx].archive.push(self);
        engine.log(`${holomem.stack[0].name}: ダメージを受けたため Zecretary をアーカイブ`);
      }
    },
  },
  attachRule: {
    canAttach(holomem) {
      return holomem.stack[0].name === 'ベスティア・ゼータ';
    },
    unlimited: true, // 1人に何枚でも
  },
};
