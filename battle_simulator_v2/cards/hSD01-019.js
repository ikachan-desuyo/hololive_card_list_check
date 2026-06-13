/**
 * スゴイパソコン (hSD01-019) サポート・アイテム・LIMITED
 * [サポート効果] このカードは、自分のステージのエール1枚をアーカイブしなければ使えない。
 *   自分のデッキから、Buzz以外の[1stホロメンか2ndホロメン]1枚を公開し、手札に加える。
 *   そしてデッキをシャッフルする。
 * LIMITED：ターンに1枚しか使えない。
 *
 * 実装メモ:
 *   - 使用条件: ステージ上のホロメンに付いているエールが1枚以上あること（コストとして必須でアーカイブする）。
 *     LIMITED（ターン1枚）はエンジン側のサポート使用処理で制御される想定のため、ここでは扱わない。
 *   - 公開する対象は Buzz以外（!c.buzz）で bloomLevel が '1st' か '2nd' のホロメン。
 */
export default {
  number: 'hSD01-019',
  support: {
    canUse(ctx) {
      // 自分のステージのエールが1枚以上ないとコストを払えない＝使えない
      return ctx.holomems('self').some((e) => (e.holomem.cheers || []).length > 0);
    },
    *run(ctx) {
      // コスト: 自分のステージのエール1枚をアーカイブする（必須）
      const entries = [];
      for (const e of ctx.holomems('self')) {
        for (const cheer of e.holomem.cheers) entries.push({ cheer, from: e.holomem });
      }
      if (entries.length === 0) return; // 念のため（canUseで弾かれている想定）
      const picked = yield ctx.chooseCard({
        cards: entries.map((e) => e.cheer),
        title: 'コスト: アーカイブする自分のステージのエール1枚を選択',
      });
      if (!picked) return;
      const from = entries.find((e) => e.cheer === picked).from;
      yield* ctx.archiveCheer(from, picked);

      // 効果: デッキからBuzz以外の[1stか2nd]ホロメン1枚を公開して手札に加える
      const cand = ctx.deckCards(
        (c) => c.kind === 'holomen' && !c.buzz &&
          (c.bloomLevel === '1st' || c.bloomLevel === '2nd'),
      );
      const target = yield ctx.chooseCard({
        cards: cand,
        title: '手札に加える Buzz以外の[1stか2nd]ホロメン1枚を選択（任意）',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (target) {
        ctx.removeFromDeck(target);
        ctx.addToHand(target, { reveal: true });
      }
      ctx.shuffleDeck();
    },
  },
};
