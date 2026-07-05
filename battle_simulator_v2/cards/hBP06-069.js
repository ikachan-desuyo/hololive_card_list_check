/**
 * 戌神ころね (hBP06-069) 紫・1st・HP160（#JP #ゲーマーズ #ケモミミ）
 * コラボエフェクト「こぉねのことだけ見ててね？♡」:
 *   自分の〈ゆび〉が付いているホロメンがいるなら、自分のデッキを1枚引く。
 * アーツ「しばきあげパンチング」(30+):
 *   このターンにこのホロメンが自分の推しスキル「無限の体力」でアクティブになっていたなら、このアーツ+50。
 *   → 推しスキル「無限の体力」(hBP03-006) がアクティブ化時に積むターン修正
 *      kind:'activatedByOshiSkill'（skillName:'無限の体力'・match でホロメン限定）を読んで +50。
 *      ベースダメージ30はエンジンが扱う。
 */
export default {
  number: 'hBP06-069',
  collabEffect: {
    name: 'こぉねのことだけ見ててね？♡',
    *run(ctx) {
      // 自分のステージに〈ゆび〉（カード名「ゆび」のツール）が付いているホロメンがいるか
      const hasYubi = ctx.holomems('self', (e) =>
        (e.holomem.attachments || []).some((a) => a.name === 'ゆび')).length > 0;
      if (hasYubi) ctx.draw(1);
    },
  },
  arts: {
    'しばきあげパンチング': {
      // このターンにこのホロメンが「無限の体力」でアクティブになっていたなら +50
      dmgBonus(ctx) {
        const activated = ctx.engine.state.modifiers.some(
          (m) =>
            m.kind === 'activatedByOshiSkill' &&
            m.skillName === '無限の体力' &&
            (!m.match || m.match(ctx.sourceHolomem)),
        );
        return activated ? 50 : 0;
      },
    },
  },
};
