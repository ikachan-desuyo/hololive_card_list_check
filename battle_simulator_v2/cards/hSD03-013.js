/**
 * おかにゃん (hSD03-013) サポート・マスコット
 *
 * [サポート効果]
 *   このマスコットが付いているホロメンがセンターポジションかコラボポジションで受けるダメージ-10。
 *     → attached.damageDelta で、受け手のゾーンが center / collab の時のみ -10。
 *       （damageDelta は (holomem, zone, engine) を受け取り、system.js の damageReceivedDelta で
 *         アーツダメージ・特殊ダメージ両方に集計される。常時修正なので後始末不要。）
 *
 * マスコットは自分のホロメン1人につき1枚だけ → エンジン既定のマスコット枚数制限で処理されるため
 *   attachRule は不要。
 *
 * ◆〈猫又おかゆ〉に付いていたら能力追加:
 *   「このマスコットが付いてるホロメンの能力でエールをアーカイブする時、
 *     アーカイブする青エール1枚のかわりに、このマスコットをアーカイブできる。」
 *   → cheerArchiveReplace + canReplace（条件付き置換）で実装。ctx.archiveCheer がアビリティ起因で
 *     青エールをアーカイブしようとした時、付け先が〈猫又おかゆ〉なら、このマスコットをアーカイブする
 *     選択を提示する（青エールは場に残る）。
 */
export default {
  number: 'hSD03-013',
  attached: {
    // センター/コラボで受けるダメージ-10
    damageDelta(holomem, zone) {
      return (zone === 'center' || zone === 'collab') ? -10 : 0;
    },
  },
  // ◆〈猫又おかゆ〉に付いていたら: 青エール1枚のアーカイブのかわりに、このマスコットをアーカイブできる
  cheerArchiveReplace: {
    title: 'おかにゃん: 青エール1枚のかわりにおかにゃんをアーカイブする？',
    yesLabel: 'おかにゃんをアーカイブ（青エールは残す）',
    canReplace(cheer, holomem) {
      return holomem.stack[0].name === '猫又おかゆ' && cheer.color === '青';
    },
  },
};
