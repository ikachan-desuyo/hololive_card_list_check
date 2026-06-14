/**
 * パヴォリア・レイネ (hBP08-031) Buzzホロメン・緑・1st・HP250 / ID・ID2期生・トリ・絵
 *
 * [ギフト/キーワード] SPY-C1000:
 *   [センターポジション・コラボポジション限定][ターンに1回]
 *   自分のターンで、自分のエールがアーカイブに置かれた時、自分のデッキを1枚引く。
 *   → onSelfCheerArchived（ステージのエールが archiveCheer でアーカイブされた時に同期発火）で実装。
 *      自分のターン・センター/コラボ限定・ターンに1回でデッキ1枚ドロー。
 *      （注: エールデッキからの直接アーカイブ＝下記GWS+の自前アーカイブは archiveCheer を通らないため
 *       この誘発の対象外。バトンタッチコストや効果によるステージエールのアーカイブで誘発する。）
 *
 * [アーツ] GWS+ (60 / green+any):
 *   自分のエールデッキの上から1枚をアーカイブする。
 *   その後、自分のステージのエール1色につき、自分のホロメン1人のHP10回復。
 *   → 「アーカイブする」は強制（任意ではない）。エールデッキが空なら何もアーカイブできないだけ。
 *      回復は、自分のステージにあるエールの色数（重複なし）の回数だけ行い、
 *      各色につき自分のホロメン1人を選んでHP10回復する（同じホロメンを複数回選んでもよい解釈）。
 *      ctx.ownStageCheerColors() で色一覧を取得。色数が0なら回復なし。
 *
 */
export default {
  number: 'hBP08-031',

  // ギフト SPY-C1000: [センター/コラボ限定][ターン1回]自分のターンで自分のエールがアーカイブされた時、デッキ1枚ドロー
  onSelfCheerArchived(holomem, engine, ownerIdx) {
    if (engine.state.turnPlayer !== ownerIdx) return;     // 自分のターンで
    const zone = engine._zoneOf(holomem);
    if (zone !== 'center' && zone !== 'collab') return;   // [センター/コラボ限定]
    if (holomem._spy1000Turn === engine.state.turn) return; // [ターンに1回]
    holomem._spy1000Turn = engine.state.turn;
    const p = engine.state.players[ownerIdx];
    if (p.deck.length > 0) {
      p.hand.push(p.deck.shift());
      engine.log(`${p.name}: SPY-C1000 でデッキを1枚引いた`);
    }
  },

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
