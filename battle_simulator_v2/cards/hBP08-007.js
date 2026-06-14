/**
 * 音乃瀬奏 (hBP08-007) 推しホロメン・黄・ライフ5
 *
 * 推しスキル「奏でるメロディー」[ホロパワー：-2][ターンに1回]:
 *   自分のターンが終了する時、このターンに自分の〈音乃瀬奏〉がセンターポジションで
 *   アーツを使っていたなら使える: 自分のセンターホロメンと自分の#ReGLOSSを持つ
 *   バックホロメン1人を交代させる。
 *   → onEndOfTurnOshiSkill（ターン終了時に提示される起動型推しスキル。engine._offerEndOfTurnOshiSkill）。
 *     canUse: このターンに〈音乃瀬奏〉がセンターでアーツを使った（player.centerArtsUsedNamesThisTurn）かつ
 *             センターがいて #ReGLOSS のバックが1人以上いる。
 *     run: #ReGLOSS のバック1人を選び、センターと交代する。
 *
 * SP推しスキル「ぱちぱちありがとう！」[ホロパワー：-1][ゲームに1回]:
 *   自分のエールデッキの上から3枚を自分のセンターホロメンの〈音乃瀬奏〉に送る。
 *   このターンが終了する時、自分のステージのエール3枚をアーカイブする。
 *   → spOshiSkill（メインステップ起動型）。前半: エールデッキ上3枚をセンターの音乃瀬奏へ。
 *     後半: ctx.scheduleEndOfTurn でターン終了時にステージのエール3枚をアーカイブする遅延効果を予約。
 */
const NAME = '音乃瀬奏';
const REGLOSS = 'ReGLOSS';

export default {
  number: 'hBP08-007',

  // 推しスキル「奏でるメロディー」: ターン終了時、〈音乃瀬奏〉がセンターでアーツを使っていたなら
  // センターと #ReGLOSS バック1人を交代できる。
  onEndOfTurnOshiSkill: {
    name: '奏でるメロディー',
    cost: 2,
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      if (!p.center) return false;
      // このターンに〈音乃瀬奏〉がセンターでアーツを使っていた
      if (!(p.centerArtsUsedNamesThisTurn || []).includes(NAME)) return false;
      // 交代先の #ReGLOSS バックが1人以上
      return p.back.some((h) => (h.stack[0].tags || []).includes(REGLOSS));
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.pos.zone === 'back' && ctx.hasTag(e.top, REGLOSS),
        title: 'センターと交代する#ReGLOSSのバックホロメンを選択',
      });
      if (!entry) return;
      const p = ctx.player;
      const i = p.back.indexOf(entry.holomem);
      if (i < 0 || !p.center) return;
      // センターとバックを交代（互いの状態は維持）
      const oldCenter = p.center;
      p.center = entry.holomem;
      p.back[i] = oldCenter;
      ctx.log(`${ctx.player.name}: ${oldCenter.stack[0].name}（センター）と ${entry.top.name}（バック）を交代`);
    },
  },

  spOshiSkill: {
    name: 'ぱちぱちありがとう！',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // センターホロメンが〈音乃瀬奏〉であること
      return !!p.center && p.center.stack[0].name === NAME;
    },
    *run(ctx) {
      const center = ctx.player.center;
      if (!center || center.stack[0].name !== NAME) return;
      // エールデッキの上から3枚をセンターの〈音乃瀬奏〉へ送る（尽きたらそこまで）
      let sent = 0;
      for (let i = 0; i < 3; i++) {
        if (ctx.player.cheerDeck.length === 0) break;
        ctx.sendCheerFromCheerDeckTop(center);
        sent++;
      }
      ctx.log(`${ctx.player.name}: 〈${NAME}〉にエール${sent}枚を送った`);

      // 後半: このターンが終了する時、自分のステージのエール3枚をアーカイブする（遅延効果）
      ctx.scheduleEndOfTurn(function* (ctx2) {
        for (let i = 0; i < 3; i++) {
          // 毎回ステージ上の全エールと所有ホロメンの対応を作り直す
          const stage = ctx2.engine._stageHolomems(ctx2.player);
          const cheerCards = [];
          const ownerOf = new Map();
          for (const h of stage) {
            for (const cheer of h.cheers) {
              cheerCards.push(cheer);
              ownerOf.set(cheer, h);
            }
          }
          if (cheerCards.length === 0) break;
          const picked = yield ctx2.chooseCard({
            cards: cheerCards,
            title: `ターン終了時: アーカイブするステージのエールを選択 (${i + 1}/3)`,
          });
          if (!picked) break;
          yield* ctx2.archiveCheer(ownerOf.get(picked), picked, { ability: false });
        }
      }, '〈音乃瀬奏〉SP: ステージのエール3枚をアーカイブ');
    },
  },
};
