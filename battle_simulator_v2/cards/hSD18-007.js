/**
 * 森カリオペ (hSD18-007) ホロメン・紫・1st・HP130（#EN #Myth #歌）
 *
 * ギフト「ちょっとした特別なプレゼント」:
 *   相手のターンで、このホロメンがダウンした時、自分のデッキの上から1枚をアーカイブする。
 *   → ダウン時誘発のギフト。triggers.onDown で実装（_processDown で発火、アーカイブ前）。
 *     条件「相手のターンで」= turnPlayer がコントローラー以外の時のみ。
 *     プレイヤー選択を伴わない確定処理（デッキ先頭1枚をアーカイブ）。
 *
 * アーツ「手伝ってもらって助かるよ」(30+):
 *   このホロメンにツールが付いているなら、このアーツ+10。
 *   → dmgBonus で「ツール装着時+10」を表現。
 */
export default {
  number: 'hSD18-007',
  triggers: {
    *onDown(ctx) {
      if (ctx.state.turnPlayer === ctx.playerIdx) return; // 「相手のターンで」のみ
      if (ctx.player.deck.length === 0) return;
      const card = ctx.player.deck.shift();
      ctx.player.archive.push(card);
      ctx.recordDeckArchive(1);
      ctx.log(`ギフト「ちょっとした特別なプレゼント」: デッキの上から ${card.name} をアーカイブ`);
    },
  },
  arts: {
    '手伝ってもらって助かるよ': {
      dmgBonus(ctx) {
        return ctx.sourceHolomem?.attachments.some((a) => a.supportType === 'ツール') ? 10 : 0;
      },
    },
  },
};
