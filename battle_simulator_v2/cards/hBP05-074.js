/**
 * フレンドリーパソコン (hBP05-074) サポート・アイテム
 *
 * サポート効果:
 *   自分のデッキから、エクストラ「このホロメンはデッキに何枚でも入れられる」を持つ
 *   Debutホロメン1～2枚を公開し、ステージに出す。そしてデッキをシャッフルする。
 *   Debutホロメンを2枚出したなら、さらに、自分の手札1枚をデッキの下に戻す。
 *
 * 実装方針:
 *   - 対象は「Debutホロメン」かつ エクストラ キーワードに
 *     「デッキに何枚でも入れられる」を含むカード（keywords を走査して判定）。
 *     同名カードが何枚でもデッキに入れられる性質上、同じカード名でも別々に選べる（重複可）。
 *   - 「1～2枚」=「1～2枚まで」相当（最低0枚も可。候補が無ければ何も出ない）。
 *     ステージ上限(6人)に達したら以降は出せない（putToBack が false を返す）。
 *   - 公開してステージに出す＝ flashReveal で公開 → putToBack でバックに出す → デッキから除去。
 *   - 出し終えたらデッキをシャッフル。
 *   - 実際に2枚出した場合のみ、手札1枚をデッキの下に戻す（強制。手札が無ければ何もしない）。
 *
 * 保留: なし
 *   （エクストラ「このホロメンはデッキに何枚でも入れられる」はコレクタが取得済みで、
 *     card_data の該当Debutホロメンに keywords として格納される＝下記 isUnlimitedDebut で判定可能。）
 */

/** エクストラ「このホロメンはデッキに何枚でも入れられる」を持つDebutホロメンか
 *  （subtype 'エクストラ' の keyword のみ対象。効果テキストに同句を含むだけのカードは除外） */
function isUnlimitedDebut(card) {
  if (card.kind !== 'holomen' || card.bloomLevel !== 'Debut') return false;
  return (card.keywords || []).some((kw) =>
    kw.subtype === 'エクストラ' &&
    `${kw.name || ''}${kw.text || ''}`.includes('デッキに何枚でも入れられる'));
}

export default {
  number: 'hBP05-074',
  support: {
    *run(ctx) {
      let placed = 0;
      // 「1～2枚」=最低1枚（候補があれば必須）、2枚目は任意。デッキから対象Debutを公開してステージに出す
      for (let i = 0; i < 2; i++) {
        if (ctx.engine._stageCount(ctx.player) >= 6) break; // ステージ満杯なら打ち切り
        const cand = ctx.deckCards(isUnlimitedDebut);
        const picked = yield ctx.chooseCard({
          cards: cand,
          title: `ステージに出すDebutホロメンを選択（${i + 1}/2）`,
          // 1枚目かつ候補ありなら必須。候補が無い時はデッキ確認のみで「見つからなかった」を選べる
          optional: i > 0 || cand.length === 0,
          skipLabel: i === 0 ? '見つからなかったことにする' : '1枚だけにする',
        });
        if (!picked) break;
        ctx.flashReveal(picked); // 公開
        ctx.removeFromDeck(picked);
        const ok = ctx.putToBack(picked);
        if (!ok) {
          // ステージ上限などで出せなかった場合はデッキに戻す（領域消失を作らない）
          ctx.deckToTop([picked]);
          break;
        }
        placed++;
      }
      // デッキをシャッフル
      ctx.shuffleDeck();

      // 2枚出したなら、さらに手札1枚をデッキの下に戻す（強制）
      if (placed >= 2 && ctx.player.hand.length > 0) {
        const back = yield ctx.chooseCard({
          cards: [...ctx.player.hand],
          title: 'デッキの下に戻す手札を選択',
        });
        if (back) {
          ctx.removeFromHand(back);
          ctx.deckToBottom([back]);
          ctx.log(`${ctx.player.name}: ${back.name} をデッキの下に戻した`);
        }
      }
    },
  },
};
