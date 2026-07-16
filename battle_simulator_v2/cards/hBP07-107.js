/**
 * Boros (hBP07-107) サポート・マスコット
 *
 * [サポート効果] このマスコットが付いているホロメンのHP+20。
 *   → attached.hpPlus で実装（常時+20）。
 *
 * ◆〈オーロ・クロニー〉に付いていたら能力追加
 *   このゲーム中に、自分の〈オーロ・クロニー〉のSP推しスキル「時間の典獄」を使っていたなら、
 *   このホロメンのアーツ+20。
 *   → SP推しスキル「時間の典獄」は推し〈オーロ・クロニー〉（hBP07-005）のSPスキル。
 *     owner.spOshiSkillUsedInfo（{ turn, oshiNumber, text }）で「どの推しのSPスキルを使ったか」を
 *     確認し、oshiNumber が hBP07-005 の場合のみ +20（推し1人につきSPスキルは1つなので番号で特定できる）。
 *     推しがオーロ・クロニー以外（例: hBP08-001 IRyS）でSP推しスキルを使っていても発動しない。
 *     「このゲーム中に」なのでターンは問わない。付け先の名前判定は engine._nameIs（別名対応）。
 *
 * マスコットは自分のホロメン1人につき1枚だけ付けられる（エンジン既定のマスコット制限で処理）。
 */

/** 付いているホロメンの所有プレイヤー状態を返す（見つからなければ null）。 */
function ownerOf(holomem, engine) {
  for (const p of engine.state.players) {
    if (p.center === holomem || p.collab === holomem || p.back.includes(holomem)) return p;
  }
  return null;
}

export default {
  number: 'hBP07-107',
  attached: {
    // [サポート効果] 付いているホロメンのHP+20
    hpPlus() { return 20; },
    // ◆〈オーロ・クロニー〉に付いていて、〈オーロ・クロニー〉(hBP07-005)のSP推しスキル
    //   「時間の典獄」をこのゲーム中に使用済みならアーツ+20
    artsPlus(holomem, engine) {
      if (!engine._nameIs(holomem?.stack?.[0], 'オーロ・クロニー')) return 0;
      const owner = ownerOf(holomem, engine);
      const info = owner?.spOshiSkillUsedInfo;
      if (!info || info.oshiNumber !== 'hBP07-005') return 0;
      return 20;
    },
  },
};
