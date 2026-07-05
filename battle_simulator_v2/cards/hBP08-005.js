/**
 * 鷹嶺ルイ (hBP08-005) 推しホロメン 紫 ライフ5
 *
 * 推しスキル「ホイサホイサ」[ホロパワー：-2][ターンに1回]:
 *   自分の手札2枚をアーカイブする。この能力で2枚アーカイブしたなら、
 *   相手のDebut以外の[センターホロメンとコラボホロメン]に特殊ダメージ50を与える。
 *   → oshiSkill（能動）。
 *     ・コスト[ホロパワー：-2]はエンジン側が処理するため run には書かない。
 *     ・効果本体として手札2枚を選んでアーカイブする（手札が2枚未満なら使えない＝canUseで弾く。
 *       「2枚アーカイブしたなら」の条件を満たせる時のみ使う想定）。
 *     ・2枚アーカイブできたなら、相手のセンター・コラボのうち「トップカードがDebut以外」の
 *       ホロメン全員に特殊ダメージ50を与える（テキストは対象選択ではなく両方に与えるため、
 *       条件を満たす対象すべてに順に与える）。
 *     ・「ライフが減らない」等の記載は無いので noLifeOnDown は付けない。
 *     ・dealSpecialDamage は防御側の割り込みが入りうるため yield* で呼ぶ。
 *
 * 保留: なし
 */
export default {
  number: 'hBP08-005',

  // 推しステージスキル「もう金曜だねルイ姉」:
  //   自分のターンが終了する時、センターが〈鷹嶺ルイ〉で自分のコラボがいるなら、手札が4枚になるまで引く（常時・強制）。
  oshiStageSkill: {
    name: 'もう金曜だねルイ姉',
    * onTurnEnd(ctx) {
      const p = ctx.player;
      if (!p.center || p.center.stack[0].name !== '鷹嶺ルイ') return;
      if (!p.collab) return;
      const need = 4 - p.hand.length;
      if (need > 0) {
        ctx.draw(need);
        ctx.log(`もう金曜だねルイ姉: 手札が4枚になるまで${need}枚引いた`);
      }
    },
  },

  oshiSkill: {
    name: 'ホイサホイサ',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // Q642: 手札1枚でも使用可（2枚未満なら特殊ダメージは発生しないが使用自体は可能）
      return p.hand.length >= 1;
    },
    *run(ctx) {
      // 自分の手札2枚をアーカイブする（一括選択。手札が足りなければある分だけ）
      const archivedCards = yield ctx.chooseCards({
        cards: [...ctx.player.hand],
        count: 2,
        title: 'アーカイブする手札を選択（2枚）',
      });
      for (const card of archivedCards) {
        ctx.removeFromHand(card);
        ctx.player.archive.push(card);
        ctx.log(`${ctx.player.name}: ${card.name} をアーカイブ`);
      }
      const archived = archivedCards.length;

      // この能力で2枚アーカイブしたなら、相手のDebut以外のセンター・コラボに特殊ダメージ50
      if (archived < 2) {
        ctx.log('ホイサホイサ: 2枚アーカイブできなかったため特殊ダメージは発生しない');
        return;
      }

      const targets = ctx.holomems('opp', ({ pos, top }) =>
        (pos.zone === 'center' || pos.zone === 'collab') && top && top.bloomLevel !== 'Debut');
      if (targets.length === 0) {
        ctx.log('ホイサホイサ: 相手のDebut以外のセンター/コラボがいないため特殊ダメージなし');
        return;
      }
      for (const target of targets) {
        yield* ctx.dealSpecialDamage(target, 50);
      }
    },
  },
};
