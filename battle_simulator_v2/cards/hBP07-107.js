/**
 * Boros (hBP07-107) サポート・マスコット
 *
 * [サポート効果] このマスコットが付いているホロメンのHP+20。
 *   → attached.hpPlus で実装（常時+20）。
 *
 * ◆〈オーロ・クロニー〉に付いていたら能力追加
 *   このゲーム中に、自分の〈オーロ・クロニー〉のSP推しスキル「時間の典獄」を使っていたなら、
 *   このホロメンのアーツ+20。
 *   → SP推しスキル「時間の典獄」は推し〈オーロ・クロニー〉のSPスキル（hBP07-005）。
 *     プレイヤーは推し1枚なので「SPスキル使用済み(usedSpOshiSkillThisGame) かつ
 *     付け先のホロメン名が〈オーロ・クロニー〉」で判定し、attached.artsPlus で +20。
 *     ※テキストは「自分の〈オーロ・クロニー〉のSP推しスキル」なので、推しが
 *       オーロ・クロニーであることが前提。usedSpOshiSkillThisGame が立っている時点で
 *       そのプレイヤーのSP推しスキルを使ったということなので、付け先のオーロ・クロニー
 *       （ホロメン）に付いていることのみ追加条件として判定する。
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
    // ◆〈オーロ・クロニー〉に付いていて、自分がSP推しスキル「時間の典獄」を使用済みならアーツ+20
    artsPlus(holomem, engine) {
      if (holomem?.stack?.[0]?.name !== 'オーロ・クロニー') return 0;
      const owner = ownerOf(holomem, engine);
      if (!owner || !owner.usedSpOshiSkillThisGame) return 0;
      return 20;
    },
  },
};
