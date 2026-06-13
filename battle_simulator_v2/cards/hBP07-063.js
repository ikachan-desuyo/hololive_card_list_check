/**
 * AZKi (hBP07-063) 紫・Debut・HP120（#JP #0期生 #歌）
 * コラボエフェクト「ドキドキ夜キャンプ…」:
 *   自分が後攻で最初のターンで、自分の推しホロメンが〈AZKi〉なら、
 *   相手のステージのエール1枚をエールデッキの下に戻す。
 *   → isFirstTurnGoingSecond() ＆ 自分の推しの名前が AZKi の両方を満たす時のみ。
 *      対象（戻す相手エール）は効果の使用者（自分）が選ぶ。
 *      戻し先は相手のエールデッキの「下」（= cheerDeck 配列の末尾へ push）。
 * アーツ「君とぴったり密着空間」(dmg:30): 効果テキスト無し（コンパイラ/エンジンが素点処理）。
 */
export default {
  number: 'hBP07-063',
  collabEffect: {
    name: 'ドキドキ夜キャンプ…',
    *run(ctx) {
      // 条件: 後攻で最初のターン かつ 自分の推しホロメンが〈AZKi〉
      if (!ctx.isFirstTurnGoingSecond()) return;
      if (ctx.player.oshi?.name !== 'AZKi') return;

      // 相手のステージ上の全エールを列挙
      const entries = [];
      for (const e of ctx.holomems('opp')) {
        for (const cheer of e.holomem.cheers) entries.push({ cheer, from: e.holomem });
      }
      if (entries.length === 0) return;

      // 戻すエールは効果の使用者（自分）が選ぶ
      const picked = yield ctx.chooseCard({
        cards: entries.map((e) => e.cheer),
        title: '相手のエールデッキの下に戻す、相手ステージのエール1枚を選択',
      });
      if (!picked) return;

      const from = entries.find((e) => e.cheer === picked).from;
      // 付いているエールから取り除き、相手のエールデッキの「下」（末尾）へ戻す
      const i = from.cheers.indexOf(picked);
      if (i !== -1) from.cheers.splice(i, 1);
      ctx.opponent.cheerDeck.push(picked);
      ctx.log(`${from.stack[0].name} の ${picked.name} を相手のエールデッキの下に戻した`);
    },
  },
};
