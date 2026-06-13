/**
 * 鷹嶺ルイ (hBP01-059) 赤・1st・HP130（#秘密結社holoX, #トリ, #お酒）
 * アーツ「パーティーへようこそ」(30): 効果なし（ダメージのみ）。
 * アーツ「Lui’s Party」(50):
 *   自分の手札1枚をアーカイブできる：
 *   自分のデッキから、Buzz以外の1stホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 */
export default {
  number: 'hBP01-059',
  arts: {
    'Lui’s Party': {
      *run(ctx) {
        // 手札がなければコストを支払えない
        if (ctx.player.hand.length === 0) return;
        const ok = yield ctx.confirm('手札1枚をアーカイブして、デッキからBuzz以外の1stホロメンを手札に加えますか？');
        if (!ok) return;
        // コスト: 手札1枚をアーカイブ
        const cost = yield ctx.chooseCard({
          cards: [...ctx.player.hand],
          title: 'コスト: アーカイブする手札を選択',
        });
        if (!cost) return;
        ctx.removeFromHand(cost);
        ctx.player.archive.push(cost);
        ctx.log(`${ctx.player.name}: ${cost.name} をアーカイブした`);

        // 効果: デッキからBuzz以外の1stホロメンを公開して手札へ
        const candidates = ctx.deckCards((c) =>
          c.kind === 'holomen' && c.bloomLevel === '1st' && !c.buzz);
        const picked = yield ctx.chooseCard({
          cards: candidates,
          title: '手札に加えるBuzz以外の1stホロメンを選択',
          optional: true,
          skipLabel: '見つからなかったことにする',
        });
        if (picked) {
          ctx.removeFromDeck(picked);
          ctx.addToHand(picked);
        }
        ctx.shuffleDeck();
      },
    },
  },
};
