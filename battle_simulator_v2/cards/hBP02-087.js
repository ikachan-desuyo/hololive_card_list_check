/**
 * 紫咲シオンの魔法のステッキ (hBP02-087) サポート・ツール（#魔法）
 *
 * [サポート効果] このツールが付いているホロメンのアーツ+10。
 *   → attached.artsPlus で常時 +10。
 *
 * ◆1st以上の〈紫咲シオン〉に付いていたら能力追加:
 *   このツールが付いているホロメンがセンターホロメンの時、自分の推しスキルの[ターンに1回]を[ターンに2回]に変更する。
 *   → oshiSkillCapBonus で実装。engine の usedOshiSkillThisTurn は使用回数カウントに、上限は
 *     _oshiSkillCap（通常1）に変更済み。付け先が1st以上の〈紫咲シオン〉でセンターにいる時、上限を+1する。
 *
 * ツール付け上限（ホロメン1人につき1枚）はエンジン既定のツール制限で処理されるため attachRule は不要。
 */
export default {
  number: 'hBP02-087',
  attached: {
    artsPlus() {
      return 10;
    },
  },
  // ◆1st以上の〈紫咲シオン〉センターに付いていたら: （通常）推しスキルの使用回数上限+1（ターン1回→2回）
  oshiSkillCapBonus(holomem, engine) {
    const top = holomem.stack[0];
    if (top.name !== '紫咲シオン') return 0;
    if (top.bloomLevel !== '1st' && top.bloomLevel !== '2nd') return 0; // 1st以上
    if (engine._zoneOf(holomem) !== 'center') return 0;                 // センターホロメンの時
    return 1;
  },
};
