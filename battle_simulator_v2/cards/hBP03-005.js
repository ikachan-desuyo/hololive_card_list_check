/**
 * 常闇トワ (hBP03-005) 推しホロメン・紫
 *
 * 推しスキル「デビルズヴォイス」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の#歌を持つ[センターホロメンとコラボホロメン]のアーツ+20。
 *   → メインステップの能動推しスキル。コストはエンジンが処理するので run では支払わない。
 *      addTurnModifier で「#歌 を持つセンター/コラボホロメン」のアーツ+20（エンドステップで自動消滅）。
 *
 * SP推しスキル「悪魔的所業」[ホロパワー：-2][ゲームに1回]:
 *   相手のターンで、自分の〈常闇トワ〉がダウンした時に使える：
 *   相手のセンターホロメンとコラボホロメンのエール2枚ずつを好きな順でエールデッキの下に戻す。
 *   → ダウン処理中に使えるSP推しスキル (11.3.1.1) として onDownOshiSkill(sp:true).run で実装。
 *     相手のセンター/コラボのエールを各最大2枚（どのエールを戻すかは発動側=トワが選ぶ）取り、
 *     好きな順で相手のエールデッキの下へ戻す。保存則を守るため、ホロメンから外す処理は
 *     並べ替え(yield)後にまとめて行い、yield中はエールを盤面に残す。
 */
export default {
  number: 'hBP03-005',
  oshiSkill: {
    *run(ctx) {
      const ownerIdx = ctx.playerIdx;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 20,
        ownerIdx,
        match: (h) => {
          const top = h.stack[0];
          if (!top || !ctx.hasTag(top, '歌')) return false;
          const zone = ctx.engine._zoneOf(h);
          return zone === 'center' || zone === 'collab';
        },
        description: 'このターン、#歌 のセンター/コラボホロメンのアーツ+20',
      });
    },
  },

  // SP推しスキル「悪魔的所業」: 相手のターンで〈常闇トワ〉がダウンした時、相手のセンター/コラボのエール2枚ずつを好きな順でエールデッキの下に戻す
  onDownOshiSkill: {
    sp: true,
    cost: 2,
    title: 'SP推しスキル「悪魔的所業」: 相手のセンター/コラボのエール2枚ずつをエールデッキの下に戻しますか？',
    canUse(engine, ownerIdx, downedHolomem) {
      const p = engine.state.players[ownerIdx];
      return engine.state.turnPlayer !== ownerIdx &&        // 相手のターン
        !p.usedSpOshiSkillThisGame &&                        // ゲームに1回
        p.holoPower.length >= 2 &&                           // [ホロパワー：-2]
        downedHolomem.stack[0].name === '常闇トワ';          // ダウンしたのが〈常闇トワ〉
    },
    *run(ctx) {
      const opp = ctx.opponent;
      const targets = ctx.holomems('opponent', (e) => {
        const z = ctx.engine._zoneOf(e.holomem);
        return z === 'center' || z === 'collab';
      });
      const chosen = []; // { cheer, holomem }（盤面から外さず参照のみ保持）
      for (const t of targets) {
        const pickCount = Math.min(2, t.holomem.cheers.length);
        for (let i = 0; i < pickCount; i++) {
          const avail = t.holomem.cheers.filter((c) => !chosen.some((x) => x.cheer === c));
          if (avail.length === 0) break;
          const cheer = avail.length === 1
            ? avail[0]
            : yield ctx.chooseCard({ cards: avail, title: `${t.top.name} から戻すエールを選択（${i + 1}/${pickCount}）` });
          if (!cheer) break;
          chosen.push({ cheer, holomem: t.holomem });
        }
      }
      if (chosen.length === 0) return;
      const ordered = yield* ctx.orderCardsFlow(chosen.map((x) => x.cheer), 'エールデッキの下に戻す順番');
      // ここから yield しない: ホロメンから外して即エールデッキ下へ（保存則維持）
      for (const cheer of ordered) {
        const owner = chosen.find((x) => x.cheer === cheer).holomem;
        const idx = owner.cheers.indexOf(cheer);
        if (idx !== -1) owner.cheers.splice(idx, 1);
        opp.cheerDeck.push(cheer);
      }
      ctx.log(`SP推しスキル「悪魔的所業」: 相手のエール${ordered.length}枚をエールデッキの下に戻した`);
    },
  },
};
