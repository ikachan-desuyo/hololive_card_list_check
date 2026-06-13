/**
 * 桃鈴ねね (hBP07-083) 黄・2nd・HP200（JP, 5期生, 歌, 絵）
 *
 * [ブルームエフェクト] みんなのエナジードリンク（未実装）:
 *   [センターポジション限定]次の相手のターン終了時まで、お互いのステージのホロメン全員のアーツ+40。
 *   さらに、自分のステージの2ndホロメンの〈桃鈴ねね〉全員のアーツ+60。
 *   → 持続期間が「次の相手のターン終了時まで」（=自分のターン＋相手のターンをまたぐ）であり、
 *      現状の継続効果システムは duration:'turn'（現在のターン終了で消滅）しか持たないため、
 *      ターンをまたぐ修正を正しく表現できない。multi-turn modifier 機構が必要なため保留。
 *      （duration:'turn' で実装すると自分のターン終了時に消えてしまい、相手ターンの本来の効果を欠く）
 *
 * [アーツ] オーバーチアリーディング dmg:100（特攻 赤+50 はエンジンが自動処理）:
 *   相手の[センターホロメンかコラボホロメン]のエール1枚をエールデッキの下に戻す。
 *   → 実装済み。
 */
export default {
  number: 'hBP07-083',
  arts: {
    'オーバーチアリーディング': {
      *run(ctx) {
        // 対象は相手のセンターまたはコラボで、エールが付いているホロメン
        const candidates = ctx.holomems('opp',
          (e) => (e.pos.zone === 'center' || e.pos.zone === 'collab') && e.holomem.cheers.length > 0);
        if (candidates.length === 0) return;
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => (e.pos.zone === 'center' || e.pos.zone === 'collab') && e.holomem.cheers.length > 0,
          title: 'エールをエールデッキの下に戻す相手ホロメンを選択（センターかコラボ）',
        });
        if (!target) return;
        const cheer = yield ctx.chooseCard({
          cards: [...target.holomem.cheers],
          title: 'エールデッキの下に戻す相手のエールを選択',
        });
        if (!cheer) return;
        const i = target.holomem.cheers.indexOf(cheer);
        if (i !== -1) {
          target.holomem.cheers.splice(i, 1);
          // 相手のエールデッキの一番下へ戻す
          ctx.opponent.cheerDeck.push(cheer);
          ctx.log(`${target.holomem.stack[0].name} の ${cheer.name} を相手のエールデッキの下に戻した`);
        }
      },
    },
  },
};
