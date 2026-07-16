/**
 * 紫咲シオンの魔法のステッキ (hBP02-087) サポート・ツール（#魔法）
 *
 * [サポート効果] このツールが付いているホロメンのアーツ+10。
 *   → attached.artsPlus で常時 +10。
 *
 * ◆1st以上の〈紫咲シオン〉に付いていたら能力追加:
 *   このツールが付いているホロメンがセンターホロメンの時、自分の推しスキル
 *   「ねえ゛え゛え゛え゛え゛え゛え゛」の[ターンに1回]を[ターンに2回]に変更する。
 *   → oshiSkillCapBonus で実装。engine の usedOshiSkillThisTurn は使用回数カウントに、上限は
 *     _oshiSkillCap（通常1）に変更済み。付け先が1st以上の〈紫咲シオン〉でセンターにいて、
 *     かつ自分の推しが hBP02-005〈紫咲シオン〉（通常推しスキル「ねえ゛…」の持ち主。推し1人の
 *     通常推しスキルは1つなので推し番号判定で対象スキルに限定できる）の時のみ、上限を+1する。
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
  // ◆1st以上の〈紫咲シオン〉センターに付いていたら: 推しスキル「ねえ゛…」の使用回数上限+1（ターン1回→2回）
  oshiSkillCapBonus(holomem, engine, ownerIdx) {
    const top = holomem.stack[0];
    if (!engine._nameIs(top, '紫咲シオン')) return 0;
    if (top.bloomLevel !== '1st' && top.bloomLevel !== '2nd') return 0; // 1st以上
    if (engine._zoneOf(holomem) !== 'center') return 0;                 // センターホロメンの時
    // 対象スキルは推し hBP02-005〈紫咲シオン〉の通常推しスキル「ねえ゛え゛え゛え゛え゛え゛え゛」限定
    if (engine.state.players[ownerIdx]?.oshi?.number !== 'hBP02-005') return 0;
    return 1;
  },
};
