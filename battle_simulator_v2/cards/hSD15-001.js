/**
 * 儒烏風亭らでん (hSD15-001) 推しホロメン・緑
 *
 * 推しスキル「ちょっとまつたけ～♪」[ホロパワー：-2][ターンに1回]:
 *   自分のデッキから#きのこを持つイベント1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → oshiSkill（能動）。デッキ内の#きのこイベントを1枚選んで公開・手札へ加え、デッキをシャッフル。
 *     非公開領域からのサーチなので「見つからない（0枚）」もありうる（その場合はシャッフルのみ）。
 *     ※コスト[ホロパワー：-2]と「ターンに1回」はエンジンが処理するため run には書かない。
 *
 * SP推しスキル「あなたの世界を広げに行こう」[ホロパワー：-2][ゲームに1回]:
 *   自分のエールデッキの上から1枚を自分の〈儒烏風亭らでん〉に送る。
 *   その後、自分のアーカイブの#きのこを持つイベント1枚を手札に戻す。
 *   → spOshiSkill（能動）。エールデッキの上から1枚を、ステージ上の〈儒烏風亭らでん〉に送る。
 *     その後、アーカイブの#きのこイベントを1枚（あれば）手札に戻す。
 *     〈儒烏風亭らでん〉がステージにいない、またはエールデッキが空なら送付はスキップ。
 *     アーカイブに対象イベントが無ければ戻しはスキップ。
 *     ※コスト[ホロパワー：-2]と「ゲームに1回」はエンジンが処理するため run には書かない。
 *
 * 保留: なし
 */
const isKinokoEvent = (c) =>
  c.kind === 'support' && c.supportType === 'イベント' && (c.tags || []).includes('きのこ');

const isRaden = (e) => e.top.name === '儒烏風亭らでん';

export default {
  number: 'hSD15-001',

  oshiSkill: {
    name: 'ちょっとまつたけ～♪',
    canUse(engine, ownerIdx) {
      // デッキに#きのこイベントが1枚以上ある時のみ意味がある
      const p = engine.state.players[ownerIdx];
      return p.deck.some(isKinokoEvent);
    },
    *run(ctx) {
      const events = ctx.deckCards(isKinokoEvent);
      if (events.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: events,
          title: 'デッキから手札に加える#きのこイベントを選択',
        });
        if (picked) {
          ctx.removeFromDeck(picked);
          ctx.flashReveal(picked);
          ctx.addToHand(picked);
        }
      }
      // 公開・手札追加の後にデッキをシャッフルする
      ctx.shuffleDeck();
    },
  },

  spOshiSkill: {
    name: 'あなたの世界を広げに行こう',
    canUse(engine, ownerIdx) {
      // ステージに〈儒烏風亭らでん〉がいてエールデッキにエールがあるか、
      // またはアーカイブに#きのこイベントがある時に意味がある
      const p = engine.state.players[ownerIdx];
      const hasRaden = engine._stagePositions(p).some((pos) =>
        engine._holomemAt(p, pos).stack[0].name === '儒烏風亭らでん');
      const canSend = hasRaden && p.cheerDeck.length > 0;
      const canReturn = p.archive.some(isKinokoEvent);
      return canSend || canReturn;
    },
    *run(ctx) {
      // エールデッキの上から1枚を自分の〈儒烏風亭らでん〉に送る
      const radens = ctx.holomems('self', isRaden);
      if (radens.length > 0 && ctx.player.cheerDeck.length > 0) {
        let target = radens[0];
        if (radens.length > 1) {
          target = yield ctx.chooseHolomem({
            side: 'self',
            filter: isRaden,
            title: 'エールを送る〈儒烏風亭らでん〉を選択',
          });
        }
        if (target) ctx.sendCheerFromCheerDeckTop(target.holomem);
      }
      // その後、アーカイブの#きのこイベント1枚を手札に戻す
      const events = ctx.player.archive.filter(isKinokoEvent);
      if (events.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: events,
          title: '手札に戻す#きのこイベントをアーカイブから選択',
        });
        if (picked) {
          ctx.removeFromArchive(picked);
          ctx.addToHand(picked);
        }
      }
    },
  },
};
