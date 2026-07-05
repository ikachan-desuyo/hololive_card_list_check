/**
 * 桃鈴ねね (hBP07-083) 黄・2nd・HP200（JP, 5期生, 歌, 絵）
 *
 * [ブルームエフェクト] みんなのエナジードリンク:
 *   [センターポジション限定]次の相手のターン終了時まで、お互いのステージのホロメン全員のアーツ+40。
 *   さらに、自分のステージの2ndホロメンの〈桃鈴ねね〉全員のアーツ+60。
 *   → ターンをまたぐ継続修正は mod.untilTurn で表現する（expireTurnModifiers が state.turn>=untilTurn の
 *      エンドステップで消滅させる）。Bloomは自分のターン(state.turn=T)なので、次の相手のターンは T+1。
 *      untilTurn = T+1 とすると、自分のターン終了(T<T+1で残存)→相手のターン終了(T+1で消滅)となり仕様どおり。
 *      アーツ+40 は「お互いのステージのホロメン全員」なので両プレイヤーぶん(ownerIdx 0/1)の artsPlus を付与する。
 *
 * [アーツ] オーバーチアリーディング dmg:100（特攻 赤+50 はエンジンが自動処理）:
 *   相手の[センターホロメンかコラボホロメン]のエール1枚をエールデッキの下に戻す。
 *   → 実装済み。
 */
export default {
  number: 'hBP07-083',

  // [ブルームエフェクト] みんなのエナジードリンク（13.3）
  bloomEffect: {
    name: 'みんなのエナジードリンク',
    *run(ctx) {
      const self = ctx.sourceHolomem;
      // [センターポジション限定]
      if (ctx.engine._zoneOf(self) !== 'center') return;
      const until = ctx.engine.state.turn + 1; // 次の相手のターン終了時まで（Bloomは自分のターン＝T → T+1）
      // お互いのステージのホロメン全員のアーツ+40（両プレイヤーぶん付与）
      for (let idx = 0; idx < 2; idx++) {
        ctx.addTurnModifier({
          kind: 'artsPlus', ownerIdx: idx, amount: 40, untilTurn: until,
          match: () => true,
          description: 'みんなのエナジードリンク: 全ホロメンのアーツ+40（次の相手のターン終了まで）',
        });
      }
      // さらに、自分のステージの2ndホロメンの〈桃鈴ねね〉全員のアーツ+60
      ctx.addTurnModifier({
        kind: 'artsPlus', ownerIdx: ctx.playerIdx, amount: 60, untilTurn: until,
        match: (h) => h.stack[0].name === '桃鈴ねね' && h.stack[0].bloomLevel === '2nd',
        description: 'みんなのエナジードリンク: 2nd〈桃鈴ねね〉のアーツ+60（次の相手のターン終了まで）',
      });
      ctx.log('《ブルームエフェクト》みんなのエナジードリンク: アーツ修正を付与（次の相手のターン終了まで）');
    },
  },

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
