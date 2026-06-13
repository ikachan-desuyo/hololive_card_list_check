/**
 * シオリ・ノヴェラ (hSD12-001) 推しホロメン・青
 *
 * 推しスキル「収集家」[ホロパワー：-1][ターンに1回]:
 *   自分のデッキの上から3枚を見る。その中から、サポートカード1枚を公開し、手札に加える。
 *   そして残ったカードを好きな順でデッキの下に戻す。
 *   → oshiSkill（能動）。lookTopDeck(3) で見て、サポートがあれば1枚を公開して手札へ
 *     （テキストは「サポートカード1枚を公開し、手札に加える」＝サポートがあるなら加える。
 *      サポートが無ければ加えるカードは無い）。残りを好きな順でデッキの下に戻す。
 *     ※コスト[ホロパワー：-1]はエンジン側が処理するため run には書かない。
 *
 * SP推しスキル「リベリオン」[ホロパワー：-3][ゲームに1回]:
 *   相手のDebut以外のバックホロメン1人に、自分のアーカイブのサポートカード1枚につき、
 *   特殊ダメージ10を与える。
 *   → spOshiSkill（能動）。相手のバックにいる「トップカードがDebut以外」のホロメンを1人選び、
 *     自分のアーカイブのサポートカード枚数 × 10 の特殊ダメージを与える。
 *     ※コスト[ホロパワー：-3]はエンジン側が処理するため run には書かない。
 *     ※「ライフが減らない」等の記載は無いので noLifeOnDown は付けない。
 */
export default {
  number: 'hSD12-001',

  oshiSkill: {
    name: '収集家',
    canUse(engine, ownerIdx) {
      // デッキが1枚以上あれば見て戻す意味がある
      const p = engine.state.players[ownerIdx];
      return p.deck.length > 0;
    },
    *run(ctx) {
      const looked = ctx.lookTopDeck(3);
      if (looked.length === 0) return;

      const supports = looked.filter((c) => c.kind === 'support');
      let toBottom = looked;
      if (supports.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: supports,
          title: '手札に加えるサポートカードを選択',
          // 見えている他カードも表示（手札には加えられない）
          displayCards: looked,
        });
        if (picked) {
          // revealed 領域から手札へ（addToHand が revealed を整理する）
          ctx.addToHand(picked, { reveal: true });
          toBottom = looked.filter((c) => c !== picked);
        }
      } else {
        ctx.log(`${ctx.player.name}: 見た中にサポートカードが無い`);
      }

      // 残ったカードを好きな順でデッキの下に戻す
      if (toBottom.length > 0) {
        const ordered = yield* ctx.orderCardsFlow(toBottom, 'デッキの下に戻す順番');
        ctx.deckToBottom(ordered);
      }
    },
  },

  spOshiSkill: {
    name: 'リベリオン',
    canUse(engine, ownerIdx) {
      // 相手のDebut以外のバックホロメンがいる時のみ使える
      const opp = engine.state.players[1 - ownerIdx];
      for (const pos of engine._stagePositions(opp)) {
        if (pos.zone !== 'back') continue;
        const h = engine._holomemAt(opp, pos);
        const top = h.stack[0];
        if (top && top.bloomLevel !== 'Debut') return true;
      }
      return false;
    },
    *run(ctx) {
      // 相手のDebut以外のバックホロメンを対象に選ぶ
      const target = yield ctx.chooseHolomem({
        side: 'opp',
        filter: ({ pos, top }) => pos.zone === 'back' && top && top.bloomLevel !== 'Debut',
        title: '特殊ダメージを与える相手のバックホロメン（Debut以外）を選択',
      });
      if (!target) return;

      // 自分のアーカイブのサポートカード1枚につき特殊ダメージ10
      const supportCount = ctx.player.archive.filter((c) => c && c.kind === 'support').length;
      const amount = supportCount * 10;
      if (amount === 0) {
        ctx.log(`${ctx.player.name}: アーカイブにサポートカードが無いため特殊ダメージ0`);
        return;
      }
      ctx.dealSpecialDamage(target, amount);
    },
  },
};
