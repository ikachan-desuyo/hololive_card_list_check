/**
 * 一条莉々華（推しホロメン hBP04-003）赤・ライフ5
 *
 * 推しスキル「Reach the top！」[ホロパワー：-3][ターンに1回]:
 *   自分のセンターホロメンが#ReGLOSSを持つ時、相手のコラボホロメンに特殊ダメージ50を与える。
 *   → メインステップの能動型推しスキル（oshiSkill）。
 *     canUse: 自分のセンターが#ReGLOSS かつ 相手にコラボホロメンがいる時のみ。
 *     対象は相手コラボ（コラボは1人だが念のため chooseHolomem で対象確定）。特殊ダメージ50。
 *     ※「ライフが減らない」等の記載は無いので noLifeOnDown は付けない。
 *     ※コスト[ホロパワー：-3]はエンジン側が処理するため run には書かない。
 *
 * SP推しスキル「かわいい！ ポジティブ！ ジーニアス！」[ホロパワー：-1][ゲームに1回]:
 *   相手のターンで、自分の〈一条莉々華〉がダウンした時に使える：
 *   自分のデッキから、[〈一条莉々華〉と〈限界飯〉]1枚ずつを公開し、手札に加える。
 *   そしてデッキをシャッフルする。
 *   → 「ダウンした時に使える」＝ダウン処理中に使える推しスキル (12.1.5.2) として onDownOshiSkill で実装。
 *     run（対話的ジェネレータ）方式: コスト支払いと[ゲームに1回]の記録（sp:true）はエンジン側が行う。
 *     〈一条莉々華〉は同名の別カード（別番号・別性能）が複数あるため、どれを加えるかはプレイヤーが
 *     chooseCard で選ぶ。デッキ＝非公開領域なので「見つからなかったことにする」も選べる（総合ルール 4.1.2.3）。
 */
export default {
  number: 'hBP04-003',

  // メインステップの能動型推しスキル「Reach the top！」
  oshiSkill: {
    name: 'Reach the top！',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      const opp = engine.state.players[1 - ownerIdx];
      // 自分のセンターが#ReGLOSSを持つ
      const center = p.center;
      const centerTop = center?.stack[0];
      if (!centerTop || !(centerTop.tags || []).includes('ReGLOSS')) return false;
      // 相手にコラボホロメンがいる
      return !!opp.collab;
    },
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'opp',
        filter: ({ pos }) => pos.zone === 'collab',
        title: '特殊ダメージ50を与える相手のコラボホロメンを選択',
      });
      if (!target) return;
      yield* ctx.dealSpecialDamage(target, 50);
    },
  },

  // 「ダウンした時に使える」SP推しスキル (12.1.5.2)。相手のターンで自分の〈一条莉々華〉がダウンした時。
  onDownOshiSkill: {
    cost: 1,
    sp: true, // SP推しスキル（コスト支払いと[ゲームに1回]の記録はエンジン側で処理）
    title: 'SP推しスキル「かわいい！ ポジティブ！ ジーニアス！」: 〈一条莉々華〉と〈限界飯〉をデッキから手札に加えますか？',
    canUse(engine, ownerIdx, downedHolomem) {
      const p = engine.state.players[ownerIdx];
      const top = downedHolomem.stack[0];
      return engine.state.turnPlayer !== ownerIdx &&   // 相手のターン
        !p.usedSpOshiSkillThisGame &&                   // [ゲームに1回]
        p.holoPower.length >= 1 &&                       // [ホロパワー：-1]
        engine._nameIs(top, '一条莉々華');               // ダウンしたのが〈一条莉々華〉
    },
    *run(ctx) {
      // デッキから〈一条莉々華〉1枚・〈限界飯〉1枚を公開し手札に加える
      // （〈一条莉々華〉は同名の別カードが複数あるため、どれを加えるかプレイヤーが選ぶ）
      for (const name of ['一条莉々華', '限界飯']) {
        const candidates = ctx.deckCards((c) => ctx.nameIs(c, name));
        const picked = yield ctx.chooseCard({
          cards: candidates,
          title: `デッキから公開して手札に加える〈${name}〉を選択`,
          optional: true,
          skipLabel: '見つからなかったことにする',
        });
        if (picked) {
          ctx.removeFromDeck(picked);
          ctx.addToHand(picked); // 公開して手札へ
        }
      }
      // そしてデッキをシャッフルする
      ctx.shuffleDeck();
    },
  },
};
