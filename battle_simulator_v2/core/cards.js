/**
 * カードデータの読み込みと正規化
 *
 * json_file/card_data.json の生データを、エンジンが扱う統一形式に変換する。
 * 生データの形式（実データから確認済み 2026-06-13）:
 *   - キー: フルID（例 "hBP01-024_02_C"）
 *   - number: カードナンバー（例 "hBP01-024"）… デッキ構築の同一判定はこれ
 *   - card_type: 'ホロメン' | 'Buzzホロメン' | '推しホロメン' | 'サポート・○○[・LIMITED]' | 'エール'
 *   - hp: 文字列 / life: 数値 / bloom_level: 'Debut'|'1st'|'2nd'|'Spot' / baton_touch: 色配列 ['無色'] / ['無色','無色']（旧: 単一文字列 '無色'）
 *   - skills[]: { type: 'アーツ'|'キーワード'|'推しスキル'|'SP推しスキル'|'サポート効果',
 *                 dmg: '50'|'90+', icons: { main: ['white','any'], tokkou: ['紫+50'] },
 *                 subtype: 'ブルームエフェクト'|'コラボエフェクト'|'ギフト', ... }
 */

import { ICON_COLOR_MAP } from './constants.js';

/** カードタイプの大分類 */
export const CardKind = {
  OSHI: 'oshi',
  HOLOMEN: 'holomen',
  SUPPORT: 'support',
  CHEER: 'cheer',
};

/**
 * 制限カードリスト（デッキ構築ルール §4 / 公式デッキ構築ルールページ）: デッキに1枚まで。
 * カードナンバー → 表示名。新しい制限が出たらここに追記する。
 */
export const DECK_LIMIT_1 = {
  'hBP01-030': 'IRyS',
  'hBP07-101': 'ASMRマイク',
};

function parseTokkou(tokkouList) {
  // 例: ['紫+50'] → [{ color: '紫', value: 50 }]
  if (!Array.isArray(tokkouList)) return [];
  return tokkouList
    .map((t) => {
      const m = /^(.+?)\+(\d+)$/.exec(String(t));
      return m ? { color: m[1], value: Number(m[2]) } : null;
    })
    .filter(Boolean);
}

function parseArtCost(icons) {
  // icons.main の英語色名 → 日本語色の配列（'any' → '無色'）
  const main = icons?.main || [];
  return main.map((c) => ICON_COLOR_MAP[c] || '無色');
}

// カードテキスト中の半角コロンを全角に正規化する。
// 公式カードリストは「[ホロパワー:-6]」「LIMITED:」のように半角コロンを使うが、
// 既存のパーサ（推しスキルコスト等）とテキストコンパイラの正規表現は全角「：」前提のため統一する。
function fwColon(s) {
  return (s || '').replace(/:/g, '：');
}

function parseOshiSkill(skill) {
  const text = fwColon(skill.text || '');
  // コスト表記は2形式ある: "[ホロパワー：-1]" と "[ホロパワー：2消費]"
  const costMatch = /\[ホロパワー：-?(\d+|X)(?:消費)?\]/.exec(text);
  return {
    sp: skill.type === 'SP推しスキル',
    cost: costMatch ? (costMatch[1] === 'X' ? 'X' : Number(costMatch[1])) : 0,
    text,
  };
}

/** 生データ1件をエンジン形式に正規化 */
export function normalizeCard(raw) {
  const cardType = raw.card_type || '';
  let kind;
  if (cardType === '推しホロメン') kind = CardKind.OSHI;
  else if (cardType === 'ホロメン' || cardType === 'Buzzホロメン') kind = CardKind.HOLOMEN;
  else if (cardType.startsWith('サポート')) kind = CardKind.SUPPORT;
  else if (cardType === 'エール') kind = CardKind.CHEER;
  else kind = CardKind.SUPPORT; // 未知タイプはサポート扱い（ログで気づけるようにする）

  const typeParts = cardType.split('・');

  const card = {
    id: raw.id,
    number: raw.number || (raw.id || '').split('_')[0],
    name: raw.name || '',
    kind,
    rawType: cardType,
    buzz: cardType === 'Buzzホロメン',
    // サポート補助タイプ（'スタッフ'|'アイテム'|'イベント'|'ツール'|'マスコット'|'ファン'）
    supportType: kind === CardKind.SUPPORT ? (typeParts[1] || null) : null,
    limited: typeParts.includes('LIMITED'),
    color: raw.color || null,
    hp: raw.hp ? Number(raw.hp) : null,
    bloomLevel: raw.bloom_level || null,
    // baton_touch は色配列 ["無色","無色"]（個数付き）。旧形式の単一文字列 "無色" にも後方互換
    batonTouch: Array.isArray(raw.baton_touch)
      ? [...raw.baton_touch]
      : (raw.baton_touch ? [raw.baton_touch] : []),
    life: raw.life != null ? Number(raw.life) : null,
    tags: raw.tags || [],
    imageUrl: raw.image_url || '',
    arts: [],
    keywords: [],
    oshiSkills: [],
    supportText: null,
  };

  for (const skill of raw.skills || []) {
    if (skill.type === 'アーツ') {
      const dmgStr = String(skill.dmg ?? '0');
      card.arts.push({
        name: skill.name || '',
        dmg: parseInt(dmgStr, 10) || 0,
        dmgPlus: dmgStr.includes('+'),
        cost: parseArtCost(skill.icons),
        tokkou: parseTokkou(skill.icons?.tokkou),
        text: fwColon(skill.description || ''),
      });
    } else if (skill.type === 'キーワード') {
      card.keywords.push({
        subtype: skill.subtype || '',
        name: skill.name || '',
        text: fwColon(skill.description || ''),
      });
    } else if (skill.type === '推しスキル' || skill.type === 'SP推しスキル') {
      card.oshiSkills.push(parseOshiSkill(skill));
    } else if (skill.type === 'サポート効果') {
      card.supportText = fwColon(skill.name || skill.description || '');
    } else if (skill.type === 'エクストラ') {
      // エクストラ（永続のカード特性）。keywords にも積んで既存のサーチ判定（kw.text を見る）で拾えるようにする。
      const text = fwColon(skill.text || skill.name || '');
      card.keywords.push({ subtype: 'エクストラ', name: '', text });
      // ①「このホロメンはデッキに何枚でも入れられる」: デッキ構築の同名上限を無視
      if (text.includes('デッキに何枚でも入れられる')) card.unlimitedInDeck = true;
      // ②「ダウンした時、自分のライフ-N」: ダウン時に減るライフ枚数（Buzz=2 の明示。非Buzzでも-2の特殊カードあり）
      const lm = /ダウンした時.*ライフ-(\d+)/.exec(text);
      if (lm) card.extraLifeLossOnDown = Number(lm[1]);
      // ③「このホロメンはBloomできない」: Bloム不可（Spotは元々不可だが念のため明示フラグ）
      if (text.includes('Bloomできない')) card.cannotBloom = true;
      // ④「このホロメンは〈X〉〈Y〉としても扱う」: 別名（合体ユニット。Bloム・〈名称〉参照で別名も一致）
      const am = /このホロメンは(.+?)としても扱う/.exec(text);
      if (am) {
        const names = am[1].match(/〈([^〉]+)〉/g);
        if (names) card.nameAliases = names.map((s) => s.replace(/[〈〉]/g, ''));
      }
    } else if (skill.type === '推しステージスキル') {
      // 推しホロメンの常時能力（永続）。テキストを保持し、効果はカード定義の oshiStageSkill フックで実装する。
      card.oshiStageText = fwColon(skill.text || skill.name || '');
    }
  }

  return card;
}

/** カードライブラリ: 全カードの正規化済みデータを保持 */
export class CardLibrary {
  constructor(rawData) {
    this.cards = new Map();
    this.byNumber = new Map(); // カードナンバー → 代表カード（最初のバリアント）
    for (const [id, raw] of Object.entries(rawData)) {
      const card = normalizeCard({ ...raw, id });
      this.cards.set(id, card);
      if (!this.byNumber.has(card.number)) this.byNumber.set(card.number, card);
    }
  }

  getByNumber(number) {
    return this.byNumber.get(number) || null;
  }

  static async load(url = 'json_file/card_data.json') {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`カードデータの読み込みに失敗: HTTP ${res.status}`);
    return new CardLibrary(await res.json());
  }

  get(id) {
    return this.cards.get(id) || null;
  }

  /**
   * 入力デッキ定義を { フルID: 枚数 } の形に正規化する。
   * 受け付ける形式:
   *   - { id: 枚数 }                         … 本ツール標準
   *   - [ id, id, ... ]                      … デッキビルダー保存形式（カードIDの配列。1枚=1要素）
   *   - { oshi, holomen[], support[], yell[] } … deck_manager の構造化形式（要素はカードオブジェクトかID）
   * 配列をそのまま buildGameDeck に渡すと Object.entries が添字(0,1,2…)をIDとして拾い
   * 「カードが見つかりません: 0」になるため、ここで吸収する。
   */
  static normalizeDeckMap(deckMap) {
    const idOf = (c) => (typeof c === 'string' ? c : (c && (c.id || c.number)) || null);
    const countInto = (map, items) => {
      for (const it of items || []) {
        const id = idOf(it);
        if (id) map[id] = (map[id] || 0) + 1;
      }
    };
    if (Array.isArray(deckMap)) {
      const map = {};
      countInto(map, deckMap);
      return map;
    }
    if (deckMap && (deckMap.holomen || deckMap.support || deckMap.yell || deckMap.oshi)) {
      const map = {};
      if (deckMap.oshi) countInto(map, [deckMap.oshi]);
      countInto(map, deckMap.holomen);
      countInto(map, deckMap.support);
      countInto(map, deckMap.yell);
      return map;
    }
    return deckMap || {};
  }

  /**
   * デッキ定義（{ フルID: 枚数 } / カードID配列 / 構造化形式）を検証付きでゲームデッキに展開する。
   * 戻り値: { oshi, deck: [card...], cheerDeck: [card...], errors: [...] }
   */
  buildGameDeck(deckMap) {
    const errors = [];
    let oshi = null;
    const deck = [];
    const cheerDeck = [];

    const normalized = CardLibrary.normalizeDeckMap(deckMap);
    for (const [id, count] of Object.entries(normalized)) {
      const card = this.get(id);
      if (!card) {
        errors.push(`カードが見つかりません: ${id}`);
        continue;
      }
      for (let i = 0; i < count; i++) {
        // 物理カード1枚ごとに独立したオブジェクトにする（浅いコピー）。
        // 参照を共有すると「どの1枚を選んだか」の識別ができず、
        // 選択UI・Set管理などの同一性に依存する処理が壊れる
        const copy = { ...card };
        if (copy.kind === CardKind.OSHI) {
          if (oshi) errors.push(`推しホロメンが複数あります: ${copy.name}`);
          oshi = copy;
        } else if (copy.kind === CardKind.CHEER) {
          cheerDeck.push(copy);
        } else {
          deck.push(copy);
        }
      }
    }

    if (!oshi) errors.push('推しホロメンがありません');
    if (deck.length !== 50) errors.push(`デッキは50枚必要です（現在 ${deck.length}枚）`);
    if (cheerDeck.length !== 20) errors.push(`エールデッキは20枚必要です（現在 ${cheerDeck.length}枚）`);

    // メインデッキの同一カードナンバー枚数制限（デッキ構築ルール §4 / 6.1）:
    //  ・通常は同番号4枚まで。
    //  ・エクストラ能力「デッキに何枚でも入れられる」(card.unlimitedInDeck) を持つカードは例外（無制限）。
    //  ・制限カードリストのカードは1枚まで。
    const tally = new Map(); // number -> { count, name, unlimited }
    for (const c of deck) {
      const t = tally.get(c.number) || { count: 0, name: c.name, unlimited: !!c.unlimitedInDeck };
      t.count++;
      tally.set(c.number, t);
    }
    for (const [number, t] of tally) {
      if (DECK_LIMIT_1[number]) {
        if (t.count > 1) errors.push(`「${t.name}」(${number}) はデッキに1枚までです（制限カード・現在 ${t.count}枚）`);
      } else if (!t.unlimited && t.count > 4) {
        errors.push(`「${t.name}」(${number}) は同一カードナンバー4枚までです（現在 ${t.count}枚）`);
      }
    }

    return { oshi, deck, cheerDeck, errors };
  }
}
