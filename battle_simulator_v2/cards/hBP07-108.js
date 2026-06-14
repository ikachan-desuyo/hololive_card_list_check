/**
 * Zecretary (hBP07-108) サポート・ファン
 *
 * [サポート効果]
 *  ■このファンが付いているホロメンがアーツを使う時、自分の推しホロメンが〈ベスティア・ゼータ〉なら、
 *    このファンを白エールとしても扱う。
 *    → attached.cheerSupply で実装（アーツ使用時に白エール1個を擬似供給）。
 *
 *  ■相手のターンで、このファンが付いているホロメンがダメージを受けた時、このファンをアーカイブする。
 *    → 【保留・継続】2026-06 再評価。被ダメージ割り込みフック onDamageReceivedReact が追加され、
 *      hBP03-105（ルーナイト）が同型の「相手ターンに付いているホロメンが受ける時、このファンをアーカイブ」を
 *      実装している。ただし onDamageReceivedReact は engine._offerDamageOshiSkill 経由で必ず
 *      「使う/使わない」の任意割り込み（confirm 決定ポイント）として防御側に提示される機構である。
 *      hBP03-105 は「アーカイブできる：ダメージ-30」という"任意・見返りあり"効果なので任意提示が正しいが、
 *      本カードは「アーカイブする」=見返りも軽減も無い"強制"効果。任意割り込みで実装すると防御側が
 *      「使わない」を選んでファンを温存でき、ルール上強制されるアーカイブを回避できてしまい不正確になる。
 *      → 防御側に選択を挟まず必ず発火する「強制の被ダメージトリガー」のディスパッチが必要なため保留を維持。
 *      それが追加されたら、相手ターン判定（engine.state.turnPlayer !== defIdx）の上で
 *      対象の attachments から自身を外し defender.archive へ送る定義を足すこと（ダメージ値は変更しない）。
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
  //   "強制"の被ダメージトリガーが未実装のため保留（onDamageReceivedReact は任意割り込みで、強制アーカイブを
  //   正確に表現できない＝防御側が回避できてしまう）。詳細は冒頭JSDoc参照。
};
