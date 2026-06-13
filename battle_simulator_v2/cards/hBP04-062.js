/**
 * 森カリオペ (hBP04-062) Buzzホロメン・紫・HP240
 * アーツ「最期の一杯」(50 / 紫無):
 *   自分のデッキの上から2枚を見る。その中から、1枚をアーカイブする。
 *   そして残ったカードをデッキの上に戻す。
 * ギフト「永遠の休息」:
 *   [センター・コラボ限定]このホロメンに〈森カリオペの鎌〉か〈Death-sensei〉が付いている間、
 *   自分の#Mythを持つセンターホロメンのアーツ+30。
 *   → 常時アウラ（auraArtsPlus）。自分(カリオペ)がセンター/コラボで鎌/Death-sensei装着中、
 *     #Mythのセンターホロメンに+30。
 */
export default {
  number: 'hBP04-062',
  auraArtsPlus(src, target, engine) {
    const z = engine._zoneOf(src);
    if (z !== 'center' && z !== 'collab') return 0;
    const hasWeapon = src.attachments.some((a) => a.name === '森カリオペの鎌' || a.name === 'Death-sensei');
    if (!hasWeapon) return 0;
    if (engine._zoneOf(target) !== 'center') return 0;
    return (target.stack[0].tags || []).includes('Myth') ? 30 : 0;
  },
  arts: {
    '最期の一杯': {
      *run(ctx) {
        const looked = ctx.lookTopDeck(2); // 解決領域(revealed)に置かれる
        if (looked.length === 0) return;
        const picked = yield ctx.chooseCard({
          cards: looked,
          title: 'アーカイブするカードを選択',
        });
        const rest = looked.slice();
        if (picked) {
          ctx._unreveal(picked);
          ctx.player.archive.push(picked);
          ctx.log(`${picked.name} をアーカイブした`);
          rest.splice(rest.indexOf(picked), 1);
        }
        if (rest.length > 0) ctx.deckToTop(rest); // 残りはデッキの上に戻す
      },
    },
  },
};
