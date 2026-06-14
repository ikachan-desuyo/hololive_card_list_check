/**
 * フワワ・アビスガード (hBP05-050) 青・1st・HP250 Buzzホロメン（#EN #Advent #ケモミミ）
 *
 * アーツ「キーボードクラッシャー」(100+):
 *   ① このターンに自分の〈モココ・アビスガード〉がアーツを使っていたなら、このアーツ+40。
 *   ② このターンに自分の推しスキル「モコちゃん！」を使っていたなら、さらに、このアーツ+30。
 *   → ②は dmgBonus で実装。エンジンは「このターン推しスキルを使ったか(usedOshiSkillThisTurn)」のみ
 *     保持するため、さらに自分の通常推しスキルが「モコちゃん！」であることを名前一致で確認して厳密化
 *     （FUWAMOCO 推し採用時のみ成立）。
 *   → 保留: ① の「このターンに〈モココ・アビスガード〉がアーツを使っていたか」は、エンジンが
 *     ホロメン個別の当ターンのアーツ使用履歴を保持していないため判定できず、安全側で +40 を付けない。
 *
 * ギフト「モゴジャ～～ン！！！」:
 *   [センターポジション限定]自分の推しスキル「モコちゃん！」を使った時、
 *   自分のエールデッキの上から1枚を自分の#Adventを持つホロメンに送る。
 *   → triggers.onOshiSkillUsed で実装（oshiSkillInfo.text に「モコちゃん！」を含み、このホロメンがセンターの時、
 *     エールデッキ上から1枚を#Adventホロメンへ送る）。
 * 保留（①のみ）: アーツ+40の「このターンに〈モココ〉がアーツを使ったか」はホロメン個別のアーツ使用履歴を
 *   エンジンが持たないため未加算（中央のターン内アーツ履歴が必要）。
 */
export default {
  number: 'hBP05-050',
  arts: {
    'キーボードクラッシャー': {
      dmgBonus(ctx) {
        const p = ctx.player;
        // ② このターンに推しスキル「モコちゃん！」を使っていたなら +30
        if (!p.usedOshiSkillThisTurn) return 0;
        const usedMoko = (p.oshi?.oshiSkills || []).some(
          (s) => !s.sp && /モコちゃん！/.test(s.text || ''));
        return usedMoko ? 30 : 0;
        // ① 〈モココ・アビスガード〉の当ターンのアーツ使用は判定不能のため未加算（保留）
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
