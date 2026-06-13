/**
 * モココ・アビスガード (hSD12-013) 赤・Debut・HP130（#EN #Advent #ケモミミ）
 *
 * [コラボエフェクト] ハッピー☆パピー -MOCOCO-:
 *   自分のステージのホロメン全員が#Adventを持つホロメンなら、
 *   自分のバックポジションのDebutホロメン1人をデッキの下に戻せる：自分のデッキを2枚引く。
 *
 * 実装メモ:
 *   - 条件「ステージのホロメン全員が#Advent」を最初に判定。満たさなければ何も起きない。
 *   - 「戻せる」=コスト支払いは任意。バックの Debut ホロメン（名称・色指定なし）が対象。
 *     対象不在／支払わない場合は効果（2枚ドロー）が発動しない。
 *   - ステージを離れるホロメンに付いているエール／サポートはアーカイブへ、
 *     本体スタックはデッキの下へ（hBP07-040 コラボ・4.4.7 相当）。
 *   - コスト支払い後に2枚ドロー。
 *
 * [アーツ] ほんまにほんま～！！ (30): 追加効果なし（固定30）。アーツ定義は不要のため記述しない。
 */
export default {
  number: 'hSD12-013',
  collabEffect: {
    name: 'ハッピー☆パピー -MOCOCO-',
    *run(ctx) {
      // 条件: 自分のステージのホロメン全員が #Advent を持つホロメンであること
      const stage = ctx.holomems('self');
      const allAdvent = stage.length > 0 && stage.every((e) => ctx.hasTag(e.top, 'Advent'));
      if (!allAdvent) {
        ctx.log('ステージのホロメン全員が #Advent ではないため効果は発動しない');
        return;
      }

      // コスト: バックの Debut ホロメン1人をデッキの下に戻せる（任意）
      const back = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.pos.zone === 'back' && e.top.bloomLevel === 'Debut',
        title: 'デッキの下に戻すバックの Debut ホロメンを選択（戻すと2枚引く）',
        optional: true,
      });
      if (!back) return; // コストを支払わない／対象不在なら効果なし

      const h = back.holomem;
      if (h.cheers.length || h.attachments.length) {
        ctx.player.archive.push(...h.cheers, ...h.attachments);
        ctx.log(`${back.top.name} の付属カードをアーカイブ`);
      }
      ctx.engine._removeHolomem(ctx.player, back.pos);
      ctx.deckToBottom(h.stack);
      ctx.log(`${back.top.name} をデッキの下に戻した`);

      // 効果: デッキを2枚引く
      ctx.draw(2);
    },
  },
};
