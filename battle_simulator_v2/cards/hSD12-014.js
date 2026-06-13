/**
 * フワワ・アビスガード (hSD12-014) 青・Debut・HP100（#EN #Advent #ケモミミ）
 *
 * [コラボエフェクト] ハッピー☆パピー -FUWAWA-:
 *   自分のステージのホロメン全員が#Adventを持つホロメンなら、
 *   自分のバックポジションのDebutホロメン1人をデッキの下に戻せる：
 *   自分のエールデッキの上から1枚を自分のホロメンに送る。
 *   → 「戻せる：」=任意のコスト。条件(全員#Advent)を満たし、コスト(バックのDebut1人をデッキ下へ)を
 *      支払えた場合のみ効果(エールデッキ上1枚を送る)を実行する。
 *   → ホロメンをデッキに戻す際、付いていたエール／サポートはステージ外へは付いていけないため
 *      アーカイブする（ホロメン本体のカードのみデッキの下へ）。Debutなのでブルームスタックは無い。
 *
 * [アーツ] ほんまにほんまだよ！ (30):
 *   追加効果なし（固定30ダメージ）。アーツ定義は不要のため記述しない。
 */
export default {
  number: 'hSD12-014',
  collabEffect: {
    name: 'ハッピー☆パピー -FUWAWA-',
    *run(ctx) {
      // 条件: 自分のステージのホロメン全員が #Advent を持つ
      const stage = ctx.holomems('self');
      const allAdvent = stage.length > 0 && stage.every((e) => ctx.hasTag(e.top, 'Advent'));
      if (!allAdvent) return;

      // コスト候補: バックポジションのDebutホロメン
      const candidates = ctx.holomems(
        'self',
        (e) => e.pos.zone === 'back' && e.top.bloomLevel === 'Debut',
      );
      if (candidates.length === 0) return;

      const ok = yield ctx.confirm(
        'バックのDebutホロメン1人をデッキの下に戻して、エールデッキの上から1枚を送りますか？',
      );
      if (!ok) return;

      const picked = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.pos.zone === 'back' && e.top.bloomLevel === 'Debut',
        title: 'デッキの下に戻すバックのDebutホロメンを選択',
      });
      if (!picked) return;

      // コスト支払い: 選んだホロメンをデッキの下に戻す
      const h = picked.holomem;
      const name = h.stack[0].name;
      // 付いていたエール・サポートはアーカイブ（ステージ外には付いていけない）
      if (h.cheers.length > 0) ctx.player.archive.push(...h.cheers);
      if (h.attachments.length > 0) ctx.player.archive.push(...h.attachments);
      // ホロメン本体（Debutなのでstackは1枚）をデッキの下へ
      ctx.deckToBottom([...h.stack]);
      // ステージから取り除く（object 同一性で back 配列から除去）
      const idx = ctx.player.back.indexOf(h);
      if (idx !== -1) ctx.player.back.splice(idx, 1);
      ctx.log(`${ctx.player.name}: ${name}（バックのDebut）をデッキの下に戻した`);

      // 効果: エールデッキの上から1枚を自分のホロメンに送る
      const targets = ctx.holomems('self');
      if (targets.length === 0) return;
      const dest = yield ctx.chooseHolomem({
        side: 'self',
        title: 'エールを送る自分のホロメンを選択',
      });
      if (!dest) return;
      ctx.sendCheerFromCheerDeckTop(dest.holomem);
    },
  },
};
