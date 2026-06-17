/**
 * 鷹嶺ルイ (hBP08-062) 紫・Debut・HP130（#JP, #秘密結社holoX, #トリ, #お酒）
 *
 * コラボエフェクト「ダウンさせられる覚悟」:
 *   自分の手札1枚をアーカイブできる:自分のデッキから、エクストラ「このホロメンは
 *   デッキに何枚でも入れられる」を持つDebutホロメン1枚をステージに出す。
 *   そしてデッキをシャッフルする。
 *   → collabEffect。
 *     ・「手札1枚をアーカイブできる：〜」はコスト付きの任意効果。
 *       手札が無い、またはプレイヤーが発動しないなら何も起きない（シャッフルもしない）。
 *     ・コスト（手札1枚アーカイブ）を支払ってから、デッキの該当Debutホロメンを1枚出す。
 *       対象は「エクストラ『このホロメンはデッキに何枚でも入れられる』」を持つDebutホロメン。
 *       このエクストラ能力はキーワード（subtype「エクストラ」）として格納されるため、
 *       キーワードのテキストに「デッキに何枚でも」を含むDebutホロメンを候補にする
 *       （hBP03-086 と同じ判定。エクストラはコレクタが取得し keywords に格納される）。
 *     ・「1枚をステージに出す」=最低1枚（候補・空きがあれば）。コストを払った以上、
 *       候補があれば出す（出すホロメン自体の選択は許す）。出した/出さないに関わらず、
 *       コストを払って効果を発動したならデッキをシャッフルする。
 *     ・ステージは最大6人。空きが無ければ出せない（その場合でもシャッフルは行う）。
 *
 * アーツ「ダウンさせる意志」(20, any): テキスト効果なし。
 *
 * 保留: なし
 */
function isExtraUnlimitedDebut(c) {
  if (c.kind !== 'holomen' || c.bloomLevel !== 'Debut') return false;
  // 「エクストラ」能力としての記載のみを対象にする（subtype が 'エクストラ' の keyword）。
  // コラボエフェクト等の効果テキスト内に "エクストラ「…デッキに何枚でも…」" と書かれている
  // だけのカード（このカード自身など）を誤ってエクストラ扱いしないため subtype を厳密に見る。
  return (c.keywords || []).some((k) =>
    k.subtype === 'エクストラ' &&
    `${k.name || ''}${k.text || ''}`.includes('デッキに何枚でも入れられる'));
}

export default {
  number: 'hBP08-062',
  collabEffect: {
    name: 'ダウンさせられる覚悟',
    *run(ctx) {
      // コスト: 手札1枚をアーカイブできる（任意）。手札が無ければ発動できない。
      if (ctx.player.hand.length === 0) return;
      const use = yield ctx.confirm(
        'ダウンさせられる覚悟: 手札1枚をアーカイブして発動しますか？');
      if (!use) return;
      const cost = yield ctx.chooseCard({
        cards: ctx.player.hand,
        title: 'コストとしてアーカイブする手札を選択',
        optional: true,
        skipLabel: '発動しない',
      });
      if (!cost) return;
      ctx.removeFromHand(cost);
      ctx.player.archive.push(cost);
      ctx.log(`${ctx.player.name}: ${cost.name} をアーカイブ（ダウンさせられる覚悟）`);

      // デッキから該当Debutホロメン1枚をステージ（バック）に出す（コストを払った以上、候補があれば必須）
      if (ctx.engine._stageCount(ctx.player) < 6) {
        const cand = ctx.deckCards((c) => isExtraUnlimitedDebut(c));
        const picked = yield ctx.chooseCard({
          cards: cand,
          title: 'ステージに出すDebutホロメンを選択',
          optional: cand.length === 0, // 候補があれば必須。無い時はデッキ確認のみ
          skipLabel: '見つからなかったことにする',
        });
        if (picked) {
          ctx.removeFromDeck(picked);
          ctx.putToBack(picked);
        }
      }
      // そしてデッキをシャッフルする
      ctx.shuffleDeck();
    },
  },
};
