/**
 * 大空スバル (hSD19-004) ホロメン・黄・Debut・HP100（#JP #2期生 #トリ）
 *
 * コラボエフェクト「大空スマイル」:
 *   自分が後攻で最初のターンなら、自分のデッキから、Debutホロメン1枚を公開し、
 *   ステージに出す。そしてデッキをシャッフルする。
 *
 * 解釈:
 *  - 条件は ctx.isFirstTurnGoingSecond()（後攻かつ自分の最初のターン）。満たさなければ何もしない。
 *  - 「Debutホロメン」= デッキ内の c.kind==='holomen' かつ c.bloomLevel==='Debut'。
 *  - 「ステージに出す」= バックポジションへ（ctx.putToBack。ステージ上限6人チェック付き）。
 *  - 公開して出す部分は実質強制効果。ただしデッキに該当カードが無い／ステージが満杯で出せない場合は
 *    その部分をスキップし、シャッフルのみ行う（出せないものは出さない）。
 *  - 公開対象（=どのDebutホロメンを出すか）は非公開のデッキからの探索なのでプレイヤーが選択する。
 *  - シャッフルは出した／出せなかったに関わらず最後に必ず行う。
 *
 * アーツ「しゅばぁ」(20ダメージ、任意エール1): テキスト効果なし（素点処理）。実装不要。
 * 保留: なし
 */
export default {
  number: 'hSD19-004',
  collabEffect: {
    name: '大空スマイル',
    *run(ctx) {
      // 条件: 自分が後攻で、自分の最初のターン
      if (!ctx.isFirstTurnGoingSecond()) return;
      const cand = ctx.deckCards((c) => c.kind === 'holomen' && c.bloomLevel === 'Debut');
      if (cand.length === 0) {
        ctx.shuffleDeck();
        return;
      }
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: 'デッキから公開してステージに出すDebutホロメンを選択',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.flashReveal(picked);
        ctx.log(`${ctx.player.name}: ${picked.name} を公開`);
        if (!ctx.putToBack(picked)) {
          // ステージが満杯などで出せない場合はデッキに戻す（どの領域にも属さない瞬間を作らない）
          ctx.player.deck.push(picked);
          ctx.log(`${ctx.player.name}: ステージに出せないため ${picked.name} をデッキに戻した`);
        }
      }
      ctx.shuffleDeck();
    },
  },
};
