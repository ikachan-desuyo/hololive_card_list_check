/**
 * 一伊那尓栖 (hBP02-063) 紫・1st・HP140（#EN #Myth #絵 #海）
 * ブルームエフェクト「みんな「WAH」の準備はいいかー！」:
 *   自分の#Mythを持つホロメン1人のHP20回復。
 * アーツ「楽しんでいこう！！！」(30):
 *   テキスト効果なし（基本ダメージのみ）。
 */
export default {
  number: 'hBP02-063',
  bloomEffect: {
    name: 'みんな「WAH」の準備はいいかー！',
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.hasTag(e.top, 'Myth'),
        title: 'HP20回復する #Myth ホロメンを選択',
      });
      if (target) ctx.heal(target.holomem, 20);
    },
  },
};
