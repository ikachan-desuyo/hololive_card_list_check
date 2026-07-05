/**
 * 猫又おかゆ (hSD03-008) Buzzホロメン・青・1st・HP240（#JP,#ゲーマーズ,#ケモミミ）
 * ギフト「泥棒建設代表取締役 CEO」:
 *   [センターポジション限定]自分のステージの
 *   〈鷹嶺ルイ〉〈大神ミオ〉〈白上フブキ〉〈ラプラス・ダークネス〉〈戌神ころね〉全員のアーツ+20。
 *   → 常時アウラ（auraArtsPlus）。自分(おかゆ)がセンターにいる間、
 *     上記いずれかの名前を持つホロメン全員に+20（おかゆ自身は対象外）。
 * アーツ「いちばんえらい猫又おかゆ～」(60): テキスト効果なし。
 */
const TARGET_NAMES = ['鷹嶺ルイ', '大神ミオ', '白上フブキ', 'ラプラス・ダークネス', '戌神ころね'];

export default {
  number: 'hSD03-008',
  auraArtsPlus(src, target, engine) {
    if (engine._zoneOf(src) !== 'center') return 0; // センターポジション限定
    return TARGET_NAMES.includes(target.stack[0].name) ? 20 : 0;
  },
};
