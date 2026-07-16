/**
 * ムーナ・ホシノヴァ (hBP06-006) 推しホロメン・青
 *
 * 推しスキル「満月の輝き」[ホロパワー：-1][ターンに1回]:
 *   相手のホロメン1人に特殊ダメージを与えた時に使える：相手のセンターホロメンと
 *   コラボホロメンに特殊ダメージ20を与える。
 *   → onSpecialDamageDealtOshiSkill で実装。engine が dealSpecialDamage（相手への特殊ダメージ）時に
 *     コスト＋発動確認を提示。発動で相手のセンター/コラボへ特殊20。[ターン1回]なので、自身が与える
 *     特殊20による再発火は使用済みフラグで止まる。
 *
 * SP推しスキル「双月の斉唱」[ホロパワー：-2][ゲームに1回]:
 *   お互いのステージのエールが合計6枚以上あるなら、自分のエールデッキから、エール1～3枚を公開し、
 *   自分の#ID1期生を持つホロメンに割り振って送る。そしてエールデッキをシャッフルする。
 *   → メインステップの能動SP推しスキルとして実装。コストはエンジンが処理するので run では支払わない。
 *     「エールデッキから、～を公開し…そしてエールデッキをシャッフルする」はエールデッキ内から選ぶサーチ
 *     （hBP06-049/059 と同型）。送るエール（色）はプレイヤーが1枚ずつ選んで公開し、#ID1期生に割り振る。
 *     非公開領域のサーチなので「見つからなかったことにする」も可（総合ルール 4.1.2.3）。
 */
export default {
  number: 'hBP06-006',

  // 推しスキル「満月の輝き」[ターン1回]: 相手に特殊ダメージを与えた時、相手のセンター/コラボに特殊ダメージ20
  onSpecialDamageDealtOshiSkill: {
    cost: 1,
    title: '推しスキル「満月の輝き」: 相手のセンター/コラボに特殊ダメージ20を与えますか？',
    *run(ctx) {
      for (const entry of ctx.holomems('opp', (e) => e.pos.zone === 'center' || e.pos.zone === 'collab')) {
        yield* ctx.dealSpecialDamage(entry, 20);
      }
    },
  },

  spOshiSkill: {
    name: '双月の斉唱',
    canUse(engine, ownerIdx) {
      const state = engine.state;
      // お互いのステージのエール合計が6枚以上
      let total = 0;
      for (const p of state.players) {
        for (const pos of engine._stagePositions(p)) {
          const h = engine._holomemAt(p, pos);
          total += (h.cheers || []).length;
        }
      }
      if (total < 6) return false;
      // 自分の#ID1期生を持つホロメンがステージにいること（送り先が無いと効果が無い）
      const me = state.players[ownerIdx];
      const hasTarget = engine._stagePositions(me).some((pos) => {
        const h = engine._holomemAt(me, pos);
        return (h.stack[0].tags || []).includes('ID1期生');
      });
      if (!hasTarget) return false;
      // エールデッキにエールが残っていること
      return me.cheerDeck.length > 0;
    },
    *run(ctx) {
      // エールデッキ内から送るエールを1枚ずつ選んで公開し、#ID1期生に割り振る（最大3枚）
      const maxSend = 3;
      for (let i = 0; i < maxSend; i++) {
        if (ctx.player.cheerDeck.length === 0) break;
        // 送り先候補（#ID1期生）がいなければ中断
        const targets = ctx.holomems('self', (e) => ctx.hasTag(e.top, 'ID1期生'));
        if (targets.length === 0) break;
        // 送るエールをエールデッキ内から選ぶ（非公開領域のサーチ: 見つからなかったことにできる）
        const cheer = yield ctx.chooseCard({
          cards: [...ctx.player.cheerDeck],
          title: `公開して送るエールを選択（${i + 1}/${maxSend}枚目・エールデッキ）`,
          optional: true,
          skipLabel: i === 0 ? '見つからなかったことにする' : 'これ以上送らない',
        });
        if (!cheer) break;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => ctx.hasTag(e.top, 'ID1期生'),
          title: `${cheer.name} を送る #ID1期生 ホロメンを選択`,
        });
        if (!target) break;
        ctx.removeFromCheerDeck(cheer);
        ctx.log(`${ctx.player.name}: エールデッキから ${cheer.name} を公開`);
        ctx.flashReveal(cheer);
        ctx.attachCheer(cheer, target.holomem);
      }
      ctx.shuffleCheerDeck();
    },
  },
};
