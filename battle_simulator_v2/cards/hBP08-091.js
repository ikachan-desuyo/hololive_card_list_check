/**
 * クリエイターパソコン (hBP08-091) サポート・アイテム
 *
 * サポート効果:
 *   自分のデッキから、エクストラ「このホロメンはデッキに何枚でも入れられる」を持つ
 *   Debutホロメン1枚をステージに出す。そしてデッキをシャッフルする。
 *   その後、自分のアーカイブのDebutホロメン1枚をステージに出す。
 *   → support.run。
 *     ① デッキから「エクストラ『このホロメンはデッキに何枚でも入れられる』」を持つ
 *        Debutホロメンを1枚ステージ（バック）に出す。
 *        ・この「エクストラ」能力はキーワード（subtype「エクストラ」等）として格納されるため、
 *          キーワードのテキストに「デッキに何枚でも」を含むDebutホロメンを候補にする
 *          （hBP08-062 と同じ判定）。
 *        ・「1枚」=「まで」表記が無いので、候補があり、かつステージに空きがあれば出す
 *          （非公開領域からの取得なので「見つからなかった」選択も許容する＝chooseCard optional）。
 *     ② デッキをシャッフルする（①で出した/出さないに関わらず行う）。
 *     ③ その後、自分のアーカイブのDebutホロメン1枚をステージ（バック）に出す。
 *        ・こちらは①のエクストラ条件は不要（単に「Debutホロメン」）。
 *        ・ステージは最大6人。空きが無ければ出せない。
 *
 * 保留: なし
 */
function isExtraUnlimitedDebut(c) {
  if (c.kind !== 'holomen' || c.bloomLevel !== 'Debut') return false;
  // 「エクストラ」能力（subtype 'エクストラ'）の記載のみを対象にする。コラボ等の効果テキストに
  // "エクストラ「…デッキに何枚でも…」" と書かれているだけのカードを誤判定しないため。
  return (c.keywords || []).some((k) =>
    k.subtype === 'エクストラ' &&
    `${k.name || ''}${k.text || ''}`.includes('デッキに何枚でも入れられる'));
}

export default {
  number: 'hBP08-091',

  support: {
    *run(ctx) {
      // ① デッキから該当Debutホロメン1枚をステージ（バック）に出す（「1枚を出す」=候補があれば必須）
      if (ctx.engine._stageCount(ctx.player) < 6) {
        const cand = ctx.deckCards((c) => isExtraUnlimitedDebut(c));
        const picked = yield ctx.chooseCard({
          cards: cand,
          title: 'デッキからステージに出すDebutホロメンを選択',
          optional: cand.length === 0, // 候補があれば必須。無い時はデッキ確認のみ
          skipLabel: '見つからなかったことにする',
        });
        if (picked) {
          ctx.removeFromDeck(picked);
          ctx.log(`${ctx.player.name}: ${picked.name}〔Debut〕を公開`);
          ctx.putToBack(picked);
        }
      }

      // ② デッキをシャッフルする
      ctx.shuffleDeck();

      // ③ その後、自分のアーカイブのDebutホロメン1枚をステージ（バック）に出す
      if (ctx.engine._stageCount(ctx.player) < 6) {
        const cand = ctx.player.archive.filter(
          (c) => c.kind === 'holomen' && c.bloomLevel === 'Debut');
        if (cand.length > 0) {
          const picked = cand.length === 1
            ? cand[0]
            : yield ctx.chooseCard({
              cards: cand,
              title: 'アーカイブからステージに出すDebutホロメンを選択',
              optional: false, // 「アーカイブのDebut1枚を出す」=候補があれば必須
            });
          if (picked) {
            ctx.removeFromArchive(picked);
            ctx.putToBack(picked);
          }
        }
      }
    },
  },
};
