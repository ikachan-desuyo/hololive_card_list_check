/**
 * アイラニ・イオフィフティーン (hBP05-002) 推しホロメン・緑・ライフ5
 *
 * 推しスキル「IOFORIA~!」[ホロパワー：-1][ターンに1回]:
 *   相手のターンで、自分の#ID1期生を持つホロメンが相手からダメージを受ける時に使える：
 *   そのホロメンのエール1枚を自分の他の#ID1期生を持つホロメンに付け替える。
 *   → 被ダメージ割り込み（onDamageOshiSkill 経路）に相当するが、この効果は「ダメージ-N」ではなく
 *     『エール1枚をどのホロメンへ付け替えるか』という2段階のプレイヤー選択（どのエール・どの付け先）を伴う。
 *     エンジンの onDamageOshiSkill は同期 reduce()=>数値 のみ対応で、割り込み中に
 *     yield ctx.chooseCard / chooseHolomem を挟めない（プレイヤー選択ができない）。
 *   → onDamageOshiSkill（被ダメージ割り込み）の generator 版 run で実装。
 *     アーツ/特殊どちらの被ダメージでも、防御側に決定ポイントを提示し、エール1枚を選んで
 *     他の#ID1期生に付け替える（ダメージ自体は変更しない）。コスト[ホロパワー：-1]・[ターンに1回]は
 *     エンジンの割り込み機構が処理する。
 *
 * SP推しスキル「Kekuatan Iofi」[ホロパワー：-3][ゲームに1回]:
 *   自分のステージのエール2枚をアーカイブすることで、自分のデッキから、#ID1期生を持つホロメン2枚を
 *   公開し、手札に加える。そしてデッキをシャッフルする。
 *   → spOshiSkill（能動）。コスト[ホロパワー：-3]と使用回数（ゲーム1回）はエンジンが処理する。
 *     追加コストとして自分のステージのエール2枚をアーカイブ（プレイヤーが2枚選択）。
 *     その後デッキの#ID1期生ホロメンを2枚（まで＝デッキに足りなければある分だけ）公開して手札へ。
 *     最後にデッキをシャッフルする。
 *     ※「2枚をアーカイブすることで」=コスト。ステージにエールが2枚未満なら使えない（canUse で弾く）。
 */
const ID1KISEI = 'ID1期生';

export default {
  number: 'hBP05-002',

  // 推しスキル「IOFORIA~!」[ホロパワー：-1][ターンに1回]:
  //   相手のターンで、自分の#ID1期生が相手からダメージを受ける時に使える：
  //   そのホロメンのエール1枚を自分の他の#ID1期生に付け替える（被ダメージ割り込み・generator）。
  onDamageOshiSkill: {
    cost: 1,
    title: '推しスキル「IOFORIA~!」: エール1枚を他の#ID1期生に付け替えますか？',
    canUse(engine, defIdx, target) {
      if (engine.state.turnPlayer === defIdx) return false; // 相手のターン限定
      if (!(target.stack[0].tags || []).includes(ID1KISEI)) return false; // 対象が#ID1期生
      if (target.cheers.length === 0) return false; // 付け替えるエールが必要
      // 付け替え先（他の#ID1期生）がいること
      return engine._stageHolomems(engine.state.players[defIdx])
        .some((h) => h !== target && (h.stack[0].tags || []).includes(ID1KISEI));
    },
    * run(ctx, { target }) {
      if (target.cheers.length === 0) return;
      const cheer = target.cheers.length === 1
        ? target.cheers[0]
        : yield ctx.chooseCard({ cards: [...target.cheers], title: '付け替えるエールを選択' });
      if (!cheer) return;
      const dest = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.holomem !== target && ctx.hasTag(e.top, ID1KISEI),
        title: 'エールの付け替え先（自分の他の#ID1期生）を選択',
      });
      if (!dest) return;
      ctx.moveCheer(cheer, target, dest.holomem);
    },
  },

  spOshiSkill: {
    name: 'Kekuatan Iofi',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // ステージ上のエール合計が2枚以上（アーカイブコストを払える）
      let cheerCount = 0;
      for (const h of engine._stageHolomems(p)) cheerCount += h.cheers.length;
      if (cheerCount < 2) return false;
      // デッキに#ID1期生ホロメンが1枚以上（0枚だと効果が無意味だが、コストだけ払う運用も避ける）
      return p.deck.some((c) => c.kind === 'holomen' && (c.tags || []).includes(ID1KISEI));
    },
    *run(ctx) {
      // --- 追加コスト: 自分のステージのエール2枚をアーカイブ ---
      for (let i = 0; i < 2; i++) {
        // 毎回ステージ上の全エール（カード）と所有ホロメンの対応を作り直す
        const stageHolomems = ctx.engine._stageHolomems(ctx.player);
        const cheerCards = [];
        const ownerOf = new Map();
        for (const h of stageHolomems) {
          for (const cheer of h.cheers) {
            cheerCards.push(cheer);
            ownerOf.set(cheer, h);
          }
        }
        if (cheerCards.length === 0) break; // 念のため
        const picked = yield ctx.chooseCard({
          cards: cheerCards,
          title: `コスト: アーカイブするステージのエールを選択 (${i + 1}/2)`,
        });
        if (!picked) break;
        const owner = ownerOf.get(picked);
        // システムコストとしてのアーカイブ（装着カードの置換は提示しない）
        yield* ctx.archiveCheer(owner, picked, { ability: false });
      }

      // --- 効果: デッキから#ID1期生ホロメンを2枚まで公開して手札に加える ---
      for (let i = 0; i < 2; i++) {
        const cand = ctx.deckCards(
          (c) => c.kind === 'holomen' && (c.tags || []).includes(ID1KISEI));
        if (cand.length === 0) {
          if (i === 0) ctx.log(`${ctx.player.name}: デッキに#ID1期生ホロメンが無い`);
          break;
        }
        const picked = yield ctx.chooseCard({
          cards: cand,
          title: `手札に加える#ID1期生ホロメンを選択 (${i + 1}/2)`,
        });
        if (!picked) break;
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }

      // --- デッキをシャッフル ---
      ctx.shuffleDeck();
    },
  },
};
