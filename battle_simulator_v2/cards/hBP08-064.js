/**
 * 鷹嶺ルイ (hBP08-064) ホロメン・紫・1st・HP170（#JP #秘密結社holoX #トリ #お酒）
 *
 * [コラボエフェクト] 荒事上等:
 *   自分の手札1枚をアーカイブできる:相手のセンターホロメンかコラボホロメンに特殊ダメージ30を与える。
 *   → 「〜できる」＝任意効果。コスト＝手札1枚をアーカイブ。
 *     手札が無い／対象（相手センター・コラボ）が居ないなら発動できない。
 *     発動するか確認 → アーカイブする手札1枚を選択 → 与える相手（センター/コラボ）を選択 → 特殊ダメージ30。
 *     「ライフは減らない」記載は無いのでダウン時のライフ減少は通常通り。
 *
 * [アーツ] 眠らない街の仕事屋 (20 / any):
 *   自分のデッキから、〈ルイ友〉1枚を自分のホロメンに付ける。そしてデッキをシャッフルする。
 *   → 〈ルイ友〉はカード名で照合（サポート・ファン）。付け先は付け先ルール（_canAttachSupport）を満たす
 *     自分のホロメン1人をプレイヤーが選ぶ。デッキに〈ルイ友〉が無い／付けられる先が居なければ何もせずシャッフル。
 *     付けた時のトリガー（onAttach）があれば誘発させる。ダメージ20はdmgで処理。
 *
 * 保留: なし（全文 context.js のプリミティブで実装）。
 */
const LUITOMO = 'ルイ友';

export default {
  number: 'hBP08-064',

  collabEffect: {
    name: '荒事上等',
    *run(ctx) {
      // コスト用の手札（このコラボエフェクト発生源は手札に無いが、念のため全手札がコスト候補）
      if (ctx.player.hand.length === 0) {
        ctx.log('アーカイブできる手札がない');
        return;
      }
      // 対象: 相手のセンターホロメンかコラボホロメン
      const targets = ctx.holomems('opp', (e) => e.pos.zone === 'center' || e.pos.zone === 'collab');
      if (targets.length === 0) {
        ctx.log('相手のセンター/コラボホロメンがいない');
        return;
      }
      // 任意効果
      const use = yield ctx.confirm('手札1枚をアーカイブして相手のセンター/コラボに特殊ダメージ30を与える？');
      if (!use) return;
      // コスト: アーカイブする手札1枚を選択
      const discard = yield ctx.chooseCard({
        cards: ctx.player.hand,
        title: 'アーカイブする手札1枚を選択',
      });
      if (!discard) return;
      ctx.removeFromHand(discard);
      ctx.player.archive.push(discard);
      ctx.log(`${ctx.player.name}: 手札の ${discard.name} をアーカイブ`);
      // 対象を選択して特殊ダメージ30
      const target = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
        title: '特殊ダメージ30を与える相手のセンター/コラボホロメンを選択',
      });
      if (!target) return;
      yield* ctx.dealSpecialDamage(target, 30);
    },
  },

  arts: {
    '眠らない街の仕事屋': {
      *run(ctx) {
        // デッキから〈ルイ友〉を1枚（任意）選んで付ける
        const cand = ctx.deckCards((c) => c.name === LUITOMO);
        if (cand.length === 0) {
          ctx.log('デッキに〈ルイ友〉がない');
          ctx.shuffleDeck();
          return;
        }
        const picked = yield ctx.chooseCard({
          cards: cand,
          title: '付ける〈ルイ友〉を選択（任意）',
          optional: true,
          skipLabel: '見つからなかったことにする',
        });
        if (!picked) {
          ctx.shuffleDeck();
          return;
        }
        // 付け先（付け先ルールを満たす自分のホロメン）を選択
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => ctx.engine._canAttachSupport(e.holomem, picked),
          title: '〈ルイ友〉を付ける自分のホロメンを選択',
          optional: true,
        });
        if (!target) {
          ctx.shuffleDeck();
          return;
        }
        ctx.removeFromDeck(picked);
        ctx.flashReveal(picked);
        yield* ctx.attachSupportWithTrigger(picked, target.holomem);
        ctx.shuffleDeck();
      },
    },
  },
};
