/**
 * アキ・ローゼンタール (hBP05-027) 緑・2nd・HP210
 * ブルームエフェクト「ゲーム？ スポーティー？ キャンプ？！」(13.3):
 *   このホロメンに付いているツール1枚をアーカイブできる：自分のデッキから、[ホロメンかツール]1枚を
 *   公開し、手札に加える。そしてデッキをシャッフルする。
 *   → Bloomした時に誘発。「できる」なのでコスト（ツール1枚アーカイブ）は任意。
 * アーツ「ワンフォーオール」(130):
 *   このアーツで相手のホロメンをダウンさせた時、自分のデッキを1枚引く。その後、
 *   自分の推しホロメンが〈アキ・ローゼンタール〉なら、自分のホロメン全員のHP20回復。
 */
export default {
  number: 'hBP05-027',
  bloomEffect: {
    name: 'ゲーム？ スポーティー？ キャンプ？！',
    *run(ctx) {
      const tools = ctx.sourceHolomem.attachments.filter((a) => a.supportType === 'ツール');
      if (tools.length === 0) return;
      const tool = yield ctx.chooseCard({
        cards: tools,
        title: 'コスト: アーカイブするツールを選択（任意）',
        optional: true,
        skipLabel: 'アーカイブしない',
      });
      if (!tool) return;
      const i = ctx.sourceHolomem.attachments.indexOf(tool);
      ctx.sourceHolomem.attachments.splice(i, 1);
      ctx.player.archive.push(tool);
      ctx.log(`${tool.name} をアーカイブした`);
      const cand = ctx.deckCards((c) =>
        c.kind === 'holomen' || (c.kind === 'support' && c.supportType === 'ツール'));
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: '手札に加える[ホロメンかツール]を選択（任意）',
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
  arts: {
    'ワンフォーオール': {
      *onDownDealt(ctx) {
        ctx.draw(1);
        if (ctx.player.oshi?.name === 'アキ・ローゼンタール') {
          for (const e of ctx.holomems('self')) ctx.heal(e.holomem, 20);
        }
      },
    },
  },
};
