/**
 * 輪堂千速 (hSD10-004) 緑・1st・HP150（#DEV_IS #FLOW #GLOW）
 *
 * [ギフト]「300馬力だよ！」:
 *   自分の推しホロメンが〈輪堂千速〉で、相手のステージに1stホロメンがいるなら、
 *   このターンにBloomしたこのホロメンは、自分の手札の2ndホロメンを使ってもう1回Bloomできる。
 *   → def.specialBloom フックで実装。通常 _canBloom は「このターンBloom済み」を弾くが、
 *     上記条件を満たす〈輪堂千速〉については、このターン既にBloomしたホロメン（bloomedTurn===turn）に
 *     対しても 2nd への追加Bloom を候補に出す（レベル遷移以外＝同名・新HP>ダメージ・置かれたターン制限は通常通り）。
 *
 * [アーツ]「パワフルな運転手だよ！」(50):
 *   自分のステージに #FLOW #GLOW を持つホロメンが3人以上いるなら、
 *   自分のエールデッキの上から1枚を自分のバックホロメンに送れる。
 */
export default {
  number: 'hSD10-004',
  /**
   * もう1回Bloom（追加Bloom）。「このターンにBloomしたこのホロメン」が条件なので、
   * 通常 Bloom（bloomedTurn !== turn）はこのフックの対象外（_canBloom が普通に処理する）。
   * @param h        ステージ上のこのホロメン（被Bloom側＝〈輪堂千速〉）
   * @param handCard 手札のBloom用カード
   * @param engine
   * @param ownerIdx このホロメンの持ち主
   * @returns true ならこの手札カードへの追加Bloomを許可する
   */
  specialBloom(h, handCard, engine, ownerIdx) {
    const s = engine.state;
    const me = s.players[ownerIdx];
    const opp = s.players[1 - ownerIdx];
    // 自分の推しホロメンが〈輪堂千速〉
    if (me.oshi?.name !== '輪堂千速') return false;
    // 相手のステージに1stホロメンがいる
    const oppHas1st = engine._stagePositions(opp).some((pos) => {
      const oh = engine._holomemAt(opp, pos);
      return oh && !oh.faceDown && oh.stack[0].bloomLevel === '1st';
    });
    if (!oppHas1st) return false;
    // 「このターンにBloomしたこのホロメン」のみが対象（追加Bloom）
    if (h.bloomedTurn !== s.turn) return false;
    // 「もう1回」は1回だけ。このギフトを持つ 1st 本体（このカード）が一番上の時のみ。
    // 追加Bloom後の top は 2nd になり、2nd→2nd の連鎖追加Bloomは起きない。
    if (h.stack[0].number !== 'hSD10-004') return false;
    // 手札の2ndホロメンを使う
    if (handCard.kind !== 'holomen' || handCard.bloomLevel !== '2nd') return false;
    // 通常のBloom条件（レベル遷移以外）は満たすこと
    if (h.faceDown) return false;
    if (h.placedTurn === s.turn) return false;          // このターンに出た→不可
    if (handCard.name !== h.stack[0].name) return false; // 同名〈輪堂千速〉
    if (handCard.hp <= h.damage) return false;           // 新HP > ダメージ
    return true;
  },
  arts: {
    'パワフルな運転手だよ！': {
      *run(ctx) {
        // 条件: 自分のステージに #FLOW かつ #GLOW を持つホロメンが3人以上
        const count = ctx.holomems('self', (e) =>
          ctx.hasTag(e.top, 'FLOW') && ctx.hasTag(e.top, 'GLOW')).length;
        if (count < 3) return;
        if (ctx.player.cheerDeck.length === 0) return;
        const ok = yield ctx.confirm('エールデッキの上から1枚をバックホロメンに送りますか？');
        if (!ok) return;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.pos.zone === 'back',
          title: 'エールを送るバックホロメンを選択',
        });
        if (!target) return;
        ctx.sendCheerFromCheerDeckTop(target.holomem);
      },
    },
  },
};
