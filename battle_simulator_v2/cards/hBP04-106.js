/**
 * 雪民（サポート・ファン）
 * このファンが付いているホロメンが、相手のセンターホロメンに与える特殊ダメージ+10。
 * このファンは、自分の〈雪花ラミィ〉だけに付けられ、1人につき何枚でも付けられる。
 */
export default {
  number: 'hBP04-106',
  attachRule: {
    canAttach(holomem) {
      return holomem.stack[0].name === '雪花ラミィ';
    },
    unlimited: true,
  },
  attached: {
    specialDmgPlus(sourceHolomem, targetEntry) {
      // 対象が相手のセンターホロメンの時のみ+10（付いている枚数ぶん加算される）
      return targetEntry.pos.zone === 'center' ? 10 : 0;
    },
  },
};
