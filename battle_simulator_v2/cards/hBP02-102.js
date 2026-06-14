/**
 * 塩っ子 (hBP02-102) サポート・ファン
 *
 * [サポート効果]
 *  ■このファンが付いているホロメンのアーツ+10。
 *    → attached.artsPlus で常時 +10（複数枚付けたら各 +10 が加算される）。
 *
 *  ■このファンが付いているホロメンがダメージを受ける時、このファンをアーカイブする。
 *    → attached.onDamageReceivedForced で実装（強制・選択なし。hBP07-108 と同型）。
 *      ※engine の強制被ダメージトリガーは「相手のターンに被弾した時」に発火する（自分ターンの自傷は対象外）。
 *      テキストにターン制限は無いが、被弾の大半は相手ターンのため実用上はこの近似で足りる。
 *
 * このファンは、自分の〈紫咲シオン〉だけに付けられ、1人につき何枚でも付けられる。
 *    → attachRule.canAttach + unlimited で実装。
 */
export default {
  number: 'hBP02-102',
  attached: {
    // ■このファンが付いているホロメンのアーツ+10
    artsPlus() { return 10; },
    // ■このファンが付いているホロメンがダメージを受ける時、このファンをアーカイブする（強制・選択なし）
    onDamageReceivedForced(holomem, engine, self, ownerIdx) {
      const i = holomem.attachments.indexOf(self);
      if (i !== -1) {
        holomem.attachments.splice(i, 1);
        engine.state.players[ownerIdx].archive.push(self);
        engine.log(`${holomem.stack[0].name}: ダメージを受けたため 塩っ子 をアーカイブ`);
      }
    },
  },
  attachRule: {
    canAttach(holomem) {
      return holomem.stack[0].name === '紫咲シオン';
    },
    unlimited: true, // 1人に何枚でも
  },
};
