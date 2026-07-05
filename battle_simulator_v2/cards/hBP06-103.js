/**
 * まつりす (hBP06-103) サポート・ファン
 * 効果: 自分の[推しホロメンか#1期生を持つホロメン]の能力でサイコロを振った時、このファンをアーカイブできる：
 *   そのサイコロの目の数1つを4として扱う。
 *   → onDiceRollReact（ダイス割り込み。発生源が推し or #1期生なら、ファンをアーカイブして目を4に）。
 * 付け先: 自分の〈夏色まつり〉だけ・1人につき何枚でも。
 */
export default {
  number: 'hBP06-103',
  attachRule: {
    canAttach: (h) => h.stack[0].name === '夏色まつり',
    unlimited: true,
  },
  onDiceRollReact: {
    title: 'まつりすをアーカイブして、出目を4として扱う？',
    yesLabel: 'アーカイブする（目を4に）',
    canUse(engine, info) {
      if (info.value === 4) return false; // 既に4なら無意味
      const rc = info.rollerCard;
      if (!rc) return false;
      return rc.kind === 'oshi' || (rc.tags || []).includes('1期生'); // 推し or #1期生の能力
    },
    apply(engine, info) {
      const h = info.fanHolomem;
      const i = h.attachments.indexOf(info.fanCard);
      if (i !== -1) {
        h.attachments.splice(i, 1);
        engine.state.players[info.ownerIdx].archive.push(info.fanCard);
        engine.log(`まつりすをアーカイブ → 出目を4として扱う`);
      }
      return 4;
    },
  },
};
