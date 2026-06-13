/**
 * 音乃瀬奏 (hBP08-007) 推しホロメン・黄・ライフ5
 *
 * 推しスキル「奏でるメロディー」[ホロパワー：-2][ターンに1回]:
 *   自分のターンが終了する時、このターンに自分の〈音乃瀬奏〉がセンターポジションで
 *   アーツを使っていたなら使える:自分のセンターホロメンと自分の#ReGLOSSを持つ
 *   バックホロメン1人を交代させる。
 *   → 保留: 「ターンが終了する時に使える」起動型推しスキルのタイミングフックが
 *     エンジンに存在しない（_endStep の 7.7.3 誘発が TODO。registry.js にも
 *     ターン終了時の推しスキル枠が無い）。さらに「このターンに〈音乃瀬奏〉が
 *     センターでアーツを使ったか」を判定する記録もエンジンに無い。実装手段が
 *     揃わないため未実装とする。
 *
 * SP推しスキル「ぱちぱちありがとう！」[ホロパワー：-1][ゲームに1回]:
 *   自分のエールデッキの上から3枚を自分のセンターホロメンの〈音乃瀬奏〉に送る。
 *   このターンが終了する時、自分のステージのエール3枚をアーカイブする。
 *   → spOshiSkill（メインステップ起動型）として前半を実装。
 *     ・センターホロメンが〈音乃瀬奏〉のときのみ使用可（canUse）。
 *     ・エールデッキの上から最大3枚を順にセンターの音乃瀬奏へ送る
 *       （エールデッキが尽きたらそこまで）。sendCheerFromCheerDeckTop を使用。
 *   → 保留: 後半「このターンが終了する時、自分のステージのエール3枚をアーカイブする」は
 *     ターン終了時に遅延発火する効果。expireTurnModifiers はモディファイアを消すだけで
 *     コールバックを実行しないため、ターン終了時に効果を走らせる仕組みが無い。未実装。
 */
const NAME = '音乃瀬奏';

export default {
  number: 'hBP08-007',

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
      // 保留: 「このターンが終了する時、自分のステージのエール3枚をアーカイブする」は
      //       ターン終了時に遅延発火する仕組みがエンジンに無いため未実装。
    },
  },
};
