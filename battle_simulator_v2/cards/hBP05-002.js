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
 *   ★保留: この推しスキルは未実装。選択を伴う付け替えを被ダメージ割り込み中に行う機構
 *     （generator 版の onDamageOshiSkill 等）が無いため、安全側で見送る。
 *     ダメージ軽減効果も持たないため、reduce で副作用だけ実行する近似も自動選択になり不適切。
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

  // 推しスキル「IOFORIA~!」: 保留（上部JSDoc参照）。被ダメージ割り込み中の選択付き付け替えは未対応。

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
