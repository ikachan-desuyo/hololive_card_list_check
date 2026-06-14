/**
 * 夏色まつり (hBP06-008) 推しホロメン / 黄
 *
 * [推しスキル]「おまつりわっしょーい！！！」[ホロパワー：-2][ターンに1回]:
 *   サイコロを1回振る。
 *   - 出た目の数が自分のライフ「以上」なら、自分のデッキからカード1枚を手札に加え、デッキをシャッフルする。
 *   - 出た目の数が自分のライフ「以下」なら、自分のデッキの上から1枚をホロパワーにする。
 *   ※「以上」(>=) と「以下」(<=) なので、出た目＝ライフ枚数のときは両方の効果が発生する。
 *
 * [SP推しスキル]「絶対勝ちたい！！！！！！！」[ホロパワー：-1][ゲームに1回]:
 *   自分のセンターホロメンが〈夏色まつり〉なら、このターンの間、自分が使える
 *   LIMITEDのサポートカードの枚数は2枚になる。
 *   → spOshiSkill + ターン修正 kind:'limitedCapBonus' で実装。engine の _limitedCap が
 *     base1 + 修正で上限を算出し、LIMITED使用判定に使う。
 *
 * コスト([ホロパワー：-N])はエンジン側で処理されるため run 内では支払わない。
 */
export default {
  number: 'hBP06-008',
  spOshiSkill: {
    name: '絶対勝ちたい！！！！！！！',
    canUse(engine, ownerIdx) {
      const c = engine.state.players[ownerIdx].center;
      return !!c && c.stack[0].name === '夏色まつり';
    },
    *run(ctx) {
      if (ctx.player.center?.stack[0].name !== '夏色まつり') return;
      ctx.addTurnModifier({
        kind: 'limitedCapBonus', amount: 1, ownerIdx: ctx.playerIdx,
        description: 'このターン、使えるLIMITEDサポートは2枚になる',
      });
    },
  },
  oshiSkill: {
    *run(ctx) {
      const p = ctx.player;
      const value = (yield* ctx.rollDice());
      const life = p.life.length;

      // 出た目が自分のライフ以上：デッキからカード1枚を手札に加え、デッキをシャッフル
      if (value >= life) {
        const cards = ctx.deckCards(() => true);
        if (cards.length > 0) {
          const picked = yield ctx.chooseCard({
            cards,
            title: 'デッキから手札に加えるカードを選択',
          });
          if (picked) {
            ctx.removeFromDeck(picked);
            ctx.addToHand(picked);
          }
        }
        ctx.shuffleDeck();
      }

      // 出た目が自分のライフ以下：デッキの上から1枚をホロパワーにする
      if (value <= life) {
        if (p.deck.length > 0) {
          p.holoPower.push(p.deck.shift());
          ctx.log(`${p.name}: デッキの上から1枚をホロパワーにした（ホロパワー${p.holoPower.length}）`);
        }
      }
    },
  },
};
