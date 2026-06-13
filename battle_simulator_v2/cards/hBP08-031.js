/**
 * パヴォリア・レイネ (hBP08-031) Buzzホロメン・緑・1st・HP250 / ID・ID2期生・トリ・絵
 *
 * [ギフト/キーワード] SPY-C1000:
 *   [センターポジション・コラボポジション限定][ターンに1回]
 *   自分のターンで、自分のエールがアーカイブに置かれた時、自分のデッキを1枚引く。
 *   → 保留: 「自分のエールがアーカイブに置かれた時」を捕捉するトリガーフックが
 *      現状のエンジン/registry に無い（giftEffect は registry 冒頭コメントでも「未対応」）。
 *      onSelfCheerArchive 等の誘発フックが追加されたら、center/collab限定・ターンに1回
 *      （ctx.oncePerTurnUsed/markOncePerTurn）・自分のターン限定で ctx.draw(1) を実装する。
 *      フックが無いため本枠は未実装のまま保留する。
 *
 * [アーツ] GWS+ (60 / green+any):
 *   自分のエールデッキの上から1枚をアーカイブする。
 *   その後、自分のステージのエール1色につき、自分のホロメン1人のHP10回復。
 *   → 「アーカイブする」は強制（任意ではない）。エールデッキが空なら何もアーカイブできないだけ。
 *      回復は、自分のステージにあるエールの色数（重複なし）の回数だけ行い、
 *      各色につき自分のホロメン1人を選んでHP10回復する（同じホロメンを複数回選んでもよい解釈）。
 *      ctx.ownStageCheerColors() で色一覧を取得。色数が0なら回復なし。
 *
 * 保留: ギフト SPY-C1000（エール被アーカイブ誘発フックが無いため）。
 */
export default {
  number: 'hBP08-031',

  arts: {
    'GWS+': {
      *run(ctx) {
        // 自分のエールデッキの上から1枚をアーカイブする（強制。空なら何もしない）
        if (ctx.player.cheerDeck.length > 0) {
          const cheer = ctx.player.cheerDeck.shift();
          ctx.player.archive.push(cheer);
          ctx.log(`${ctx.player.name}: エールデッキの上から ${cheer.name} をアーカイブ`);
        } else {
          ctx.log(`${ctx.player.name}: エールデッキが空のためアーカイブできない`);
        }

        // 自分のステージのエール1色につき、自分のホロメン1人のHP10回復
        const colors = ctx.ownStageCheerColors();
        for (const color of colors) {
          const entry = yield ctx.chooseHolomem({
            side: 'self',
            title: `HP10回復するホロメンを選択（${color}エール分）`,
          });
          if (entry) ctx.heal(entry.holomem, 10);
        }
      },
    },
  },
};
