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
 *     エンジンの onDownOshiSkill 経路は apply が同期関数で、コストもこの apply 内で支払う。
 *     探索は「〈一条莉々華〉1枚」「〈限界飯〉1枚」を各1枚取るだけ（プレイヤー選択を伴わない確定処理）なので
 *     同期処理で公開→手札へ→シャッフルまで完結できる。SPなので usedSpOshiSkillThisGame で[ゲームに1回]を管理。
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
    title: 'SP推しスキル「かわいい！ ポジティブ！ ジーニアス！」: 〈一条莉々華〉と〈限界飯〉をデッキから手札に加えますか？',
    canUse(engine, ownerIdx, downedHolomem) {
      const p = engine.state.players[ownerIdx];
      const top = downedHolomem.stack[0];
      return engine.state.turnPlayer !== ownerIdx &&   // 相手のターン
        !p.usedSpOshiSkillThisGame &&                   // [ゲームに1回]
        p.holoPower.length >= 1 &&                       // [ホロパワー：-1]
        top?.name === '一条莉々華';                      // ダウンしたのが〈一条莉々華〉
    },
    apply(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // コスト支払い＆[ゲームに1回]の消費
      p.archive.push(...p.holoPower.splice(0, 1));
      p.usedSpOshiSkillThisGame = true;

      // デッキから〈一条莉々華〉1枚・〈限界飯〉1枚を取り出して公開し手札に加える
      const grabbed = [];
      for (const name of ['一条莉々華', '限界飯']) {
        const i = p.deck.findIndex((c) => c.name === name);
        if (i !== -1) {
          const card = p.deck.splice(i, 1)[0];
          p.hand.push(card);
          engine.flashReveal(card);
          grabbed.push(card.name);
        }
      }
      if (grabbed.length > 0) {
        engine.log(`SP推しスキル「かわいい！ ポジティブ！ ジーニアス！」: ${grabbed.join(' / ')} を公開し手札に加えた`);
      } else {
        engine.log('SP推しスキル「かわいい！ ポジティブ！ ジーニアス！」: デッキに対象カードが無かった');
      }
      // そしてデッキをシャッフルする
      engine._shuffle(p.deck);
      engine.log(`${p.name}: デッキをシャッフル`);
    },
  },
};
