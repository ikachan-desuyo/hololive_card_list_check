/**
 * フワワ・アビスガード (hBP05-050) 青・1st・HP250 Buzzホロメン（#EN #Advent #ケモミミ）
 *
 * アーツ「キーボードクラッシャー」(100+):
 *   ① このターンに自分の〈モココ・アビスガード〉がアーツを使っていたなら、このアーツ+40。
 *   ② このターンに自分の推しスキル「モコちゃん！」を使っていたなら、さらに、このアーツ+30。
 *   → ①は player.artsUsedNamesThisTurn（アーツを使ったホロメン名のターン内記録）で +40 を判定。
 *     ②は usedOshiSkillThisTurn ＋自分の通常推しスキル名が「モコちゃん！」かを名前一致で確認して +30。
 *
 * ギフト「モゴジャ～～ン！！！」:
 *   [センターポジション限定]自分の推しスキル「モコちゃん！」を使った時、
 *   自分のエールデッキの上から1枚を自分の#Adventを持つホロメンに送る。
 *   → triggers.onOshiSkillUsed で実装（oshiSkillInfo.text に「モコちゃん！」を含み、このホロメンがセンターの時、
 *     エールデッキ上から1枚を#Adventホロメンへ送る）。
 *   ① の「このターンに〈モココ〉がアーツを使ったか」は player.artsUsedNamesThisTurn（エンジンが
 *   アーツ使用ホロメン名をターン内記録）で判定して +40 を実装。
 */
export default {
  number: 'hBP05-050',
  arts: {
    'キーボードクラッシャー': {
      dmgBonus(ctx) {
        const p = ctx.player;
        let bonus = 0;
        // ① このターンに自分の〈モココ・アビスガード〉がアーツを使っていたなら +40
        if ((p.artsUsedNamesThisTurn || []).includes('モココ・アビスガード')) bonus += 40;
        // ② このターンに推しスキル「モコちゃん！」を使っていたなら、さらに +30
        if (p.usedOshiSkillThisTurn &&
            (p.oshi?.oshiSkills || []).some((s) => !s.sp && /モコちゃん！/.test(s.text || ''))) {
          bonus += 30;
        }
        return bonus;
      },
    },
  },
  triggers: {
    // ギフト「モゴジャ～～ン！！！」: 推しスキル「モコちゃん！」を使った時、[センター限定]エールデッキ上1枚を#Adventへ
    *onOshiSkillUsed(ctx) {
      const info = ctx.oshiSkillInfo;
      if (!info || !/モコちゃん！/.test(info.text || '')) return;
      if (ctx.sourceHolomemPos()?.zone !== 'center') return; // [センターポジション限定]
      const targets = ctx.holomems('self', (e) => (e.top.tags || []).includes('Advent'));
      if (targets.length === 0 || ctx.player.cheerDeck.length === 0) return;
      const entry = yield ctx.chooseHolomem({
        side: 'self', filter: (e) => (e.top.tags || []).includes('Advent'),
        title: 'エールデッキの上から1枚を送る#Adventホロメンを選択',
      });
      if (entry) ctx.sendCheerFromCheerDeckTop(entry.holomem);
    },
  },
};
