/**
 * みこだにぇー (hBP05-085) サポート・マスコット
 *
 * [サポート効果]
 *  ■このマスコットが付いているホロメンのHP+10。
 *    → attached.hpPlus で常時 +10。
 *
 *  ◆〈さくらみこ〉に付いていたら能力追加
 *    相手のターンで、このマスコットが付いているホロメンがダウンした時、
 *    相手は、自身の手札1枚をアーカイブする。
 *    → triggers.onDown（装着先ホロメンのダウン時に発火。ctx.sourceHolomem=ダウンしたホロメン、
 *      ctx.playerIdx=このマスコットの持ち主）。
 *      ・条件: ダウンしたホロメンが〈さくらみこ〉/ 相手のターン（turnPlayer!==自分）。
 *      ・「相手は、自身の手札1枚をアーカイブする」= 強制。どのカードをアーカイブするかは相手が選ぶ
 *        （相手の手札は非公開情報なので、決定ポイントの所有者を相手にして相手に選ばせる）。
 *
 *  マスコットは、自分のホロメン1人につき1枚だけ付けられる。
 *    → マスコットの「1人につき1枚」はエンジンの既定ルール（_canAttachSupport）が処理するため
 *      attachRule は不要（付け先の名前制限も無い＝任意のホロメンに付く）。
 */
export default {
  number: 'hBP05-085',
  attached: {
    // ■このマスコットが付いているホロメンのHP+10
    hpPlus() { return 10; },
  },
  triggers: {
    // ◆〈さくらみこ〉に付いていたら能力追加：
    //   相手のターンで、付いているホロメン（=さくらみこ）がダウンした時、相手は手札1枚をアーカイブ
    *onDown(ctx) {
      if (ctx.sourceHolomem?.stack[0]?.name !== 'さくらみこ') return; // 付け先が〈さくらみこ〉の時のみ
      if (ctx.state.turnPlayer === ctx.playerIdx) return;            // 相手のターンのみ
      const opp = ctx.opponent;
      if (opp.hand.length === 0) return;                            // 手札が無ければ何もできない
      const oppIdx = 1 - ctx.playerIdx;
      // 相手自身に、自身の手札1枚を選ばせる（強制。相手の手札は非公開なので決定ポイントの所有者は相手）。
      const picked = yield {
        kind: 'chooseCard',
        player: oppIdx,
        title: 'みこだにぇー: アーカイブする手札を1枚選択',
        buildOptions: () => opp.hand.map((c, i) => ({
          id: `card_${i}`, label: c.name, card: c, value: c,
        })),
      };
      if (!picked) return;
      const i = opp.hand.indexOf(picked);
      if (i !== -1) {
        opp.hand.splice(i, 1);
        opp.archive.push(picked);
        ctx.log(`${opp.name}: 手札の ${picked.name} をアーカイブ`);
      }
    },
  },
};
