/**
 * カード効果共通ユーティリティ
 * 頻繁に使用される処理を共有メソッドとして提供
 */

class CardEffectUtils {
  constructor(battleEngine) {
    this.battleEngine = battleEngine;
  }

  /**
   * デッキからカードを選択
   * @param {number} playerId - プレイヤーID
   * @param {Object} options - 選択オプション
   * @param {number} options.count - 選択枚数
   * @param {Array} options.types - カードタイプフィルター ['ホロメン', 'サポート', 'エール']
   * @param {Array} options.colors - 色フィルター ['赤', '青', '緑', '黄', '紫', '白', '無']
   * @param {string} options.bloomLevel - ブルームレベルフィルター ('Debut', '1st', '2nd', 'Buzz')
   * @param {boolean} options.excludeBuzz - Buzzを除外するか
   * @param {Array} options.customFilter - カスタムフィルター関数の配列
   * @param {string} options.description - 選択UI表示用の説明文
   * @param {boolean} options.mandatory - 必須選択かどうか
   * @param {boolean} options.allowLess - 指定枚数未満でも許可するか
   */
  async selectCardsFromDeck(playerId, options = {}) {
    const {
      count = 1,
      types = [],
      colors = [],
      bloomLevel = null,
      excludeBuzz = false,
      customFilter = [],
      description = `カードを${count}枚選択してください`,
      mandatory = true,
      allowLess = false
    } = options;

    const player = this.battleEngine.players[playerId];
    if (!player || !player.deck) {
      return { success: false, reason: 'プレイヤーまたはデッキが見つかりません', cards: [] };
    }

    // デッキからフィルター条件に合うカードを検索
    let matchingCards = player.deck.filter(card => {
      // タイプフィルター
      if (types.length > 0) {
        const cardType = card.card_type || '';
        const hasMatchingType = types.some(type => cardType.includes(type));
        if (!hasMatchingType) return false;
      }

      // 色フィルター
      if (colors.length > 0) {
        const cardColor = card.card_color || '';
        if (!colors.includes(cardColor)) return false;
      }

      // ブルームレベルフィルター
      if (bloomLevel && card.bloom_level !== bloomLevel) {
        return false;
      }

      // Buzz除外
      if (excludeBuzz && card.card_type?.includes('Buzz')) {
        return false;
      }

      // カスタムフィルター
      for (const filter of customFilter) {
        if (!filter(card)) return false;
      }

      return true;
    });

    if (matchingCards.length === 0) {
      return { 
        success: false, 
        reason: '条件に合うカードがデッキにありません', 
        cards: [] 
      };
    }

    // 選択可能枚数を調整
    const actualCount = allowLess ? Math.min(count, matchingCards.length) : count;
    
    if (matchingCards.length < actualCount && !allowLess) {
      return { 
        success: false, 
        reason: `デッキに条件に合うカードが${actualCount}枚ありません`, 
        cards: [] 
      };
    }

    try {
      // プレイヤーにカード選択させる
      const selectedCards = await this.showCardSelectionUI(
        matchingCards, 
        actualCount, 
        description,
        mandatory
      );

      if (!selectedCards || selectedCards.length === 0) {
        if (mandatory) {
          return { success: false, reason: '選択がキャンセルされました', cards: [] };
        } else {
          return { success: true, reason: '選択なし', cards: [] };
        }
      }

      return { success: true, reason: '選択完了', cards: selectedCards };
    } catch (error) {
      return { success: false, reason: 'エラーが発生しました', cards: [], error };
    }
  }

  /**
   * 選択されたカードを手札に加える
   * @param {number} playerId - プレイヤーID
   * @param {Array} cards - 追加するカード配列
   * @param {boolean} shuffle - 追加後にデッキをシャッフルするか
   */
  addCardsToHand(playerId, cards, shuffle = true) {
    const player = this.battleEngine.players[playerId];
    if (!player) return { success: false, reason: 'プレイヤーが見つかりません' };

    const addedCards = [];

    for (const card of cards) {
      // デッキから除去
      const deckIndex = player.deck.indexOf(card);
      if (deckIndex !== -1) {
        player.deck.splice(deckIndex, 1);
        player.hand.push(card);
        addedCards.push(card);
      }
    }

    // デッキシャッフル
    if (shuffle && addedCards.length > 0) {
      this.shuffleDeck(playerId);
    }

    return { 
      success: true, 
      reason: `${addedCards.length}枚を手札に加えました`,
      cards: addedCards 
    };
  }

  /**
   * カードドロー
   * @param {number} playerId - プレイヤーID
   * @param {number} count - ドロー枚数
   * @param {boolean} force - デッキが足りなくても可能な分だけドローするか
   */
  drawCards(playerId, count, force = false) {
    const player = this.battleEngine.players[playerId];
    if (!player) return { success: false, reason: 'プレイヤーが見つかりません', cards: [] };

    if (player.deck.length < count && !force) {
      return { 
        success: false, 
        reason: `デッキに${count}枚のカードがありません`, 
        cards: [] 
      };
    }

    const actualCount = Math.min(count, player.deck.length);
    const drawnCards = [];

    for (let i = 0; i < actualCount; i++) {
      const card = player.deck.shift(); // デッキの上から
      if (card) {
        player.hand.push(card);
        drawnCards.push(card);
      }
    }

    return { 
      success: true, 
      reason: `${drawnCards.length}枚ドローしました`,
      cards: drawnCards 
    };
  }

  /**
   * デッキシャッフル
   * @param {number} playerId - プレイヤーID
   */
  shuffleDeck(playerId) {
    const player = this.battleEngine.players[playerId];
    if (!player || !player.deck) return false;

    // Fisher-Yates シャッフルアルゴリズム
    for (let i = player.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [player.deck[i], player.deck[j]] = [player.deck[j], player.deck[i]];
    }

    return true;
  }

  /**
   * カードをアーカイブに送る
   * @param {number} playerId - プレイヤーID
   * @param {Array} cards - アーカイブするカード配列
   * @param {string} source - 移動元 ('hand', 'deck', 'stage')
   */
  archiveCards(playerId, cards, source = 'hand') {
    const player = this.battleEngine.players[playerId];
    if (!player) return { success: false, reason: 'プレイヤーが見つかりません' };

    const archivedCards = [];

    for (const card of cards) {
      let removed = false;

      switch (source) {
        case 'hand':
          const handIndex = player.hand.indexOf(card);
          if (handIndex !== -1) {
            player.hand.splice(handIndex, 1);
            removed = true;
          }
          break;
        case 'deck':
          const deckIndex = player.deck.indexOf(card);
          if (deckIndex !== -1) {
            player.deck.splice(deckIndex, 1);
            removed = true;
          }
          break;
        case 'stage':
          // ステージからの除去（実装予定）
          break;
      }

      if (removed) {
        player.archive.push(card);
        archivedCards.push(card);
      }
    }

    return { 
      success: true, 
      reason: `${archivedCards.length}枚をアーカイブしました`,
      cards: archivedCards 
    };
  }

  /**
   * ダメージ処理
   * @param {number} targetPlayerId - 対象プレイヤーID
   * @param {number} damage - ダメージ量
   * @param {Object} source - ダメージソース情報
   */
  dealDamage(targetPlayerId, damage, source = {}) {
    const player = this.battleEngine.players[targetPlayerId];
    if (!player) return { success: false, reason: 'プレイヤーが見つかりません' };

    const originalLife = player.life || 0;
    const newLife = Math.max(0, originalLife - damage);
    player.life = newLife;

    // 新システムでのイベント通知（将来的に実装）
    // TODO: cardEffectManagerにイベント通知機能を追加

    return { 
      success: true, 
      reason: `${damage}ダメージを与えました`,
      damage: damage,
      originalLife: originalLife,
      newLife: newLife
    };
  }

  /**
   * エール操作
   * @param {number} playerId - プレイヤーID
   * @param {string} targetPosition - 対象カード位置
   * @param {Array} yellCards - 追加するエールカード
   */
  attachYell(playerId, targetPosition, yellCards) {
    const player = this.battleEngine.players[playerId];
    if (!player) return { success: false, reason: 'プレイヤーが見つかりません' };

    const targetCard = this.getCardAtPosition(player, targetPosition);
    if (!targetCard) {
      return { success: false, reason: '対象カードが見つかりません' };
    }

    if (!targetCard.yellCards) targetCard.yellCards = [];

    for (const yellCard of yellCards) {
      targetCard.yellCards.push(yellCard);
    }

    // 新システムでのイベント通知（将来的に実装）
    // TODO: cardEffectManagerにイベント通知機能を追加

    return { 
      success: true, 
      reason: `${yellCards.length}枚のエールを付けました`,
      yellCards: yellCards 
    };
  }

  /**
   * 指定位置のカードを取得
   * @param {Object} player - プレイヤーオブジェクト
   * @param {string} position - 位置 ('center', 'collab', 'back1-5')
   */
  getCardAtPosition(player, position) {
    if (position === 'center') return player.center;
    if (position === 'collab') return player.collab;
    if (position.startsWith('back')) return player[position];
    return null;
  }

  /**
   * ステージの全ホロメンを取得
   * @param {number} playerId - プレイヤーID
   * @param {Array} areas - 対象エリア（省略時は全エリア）
   */
  getStageHolomens(playerId, areas = ['center', 'collab', 'back1', 'back2', 'back3', 'back4', 'back5']) {
    const player = this.battleEngine.players[playerId];
    if (!player) return [];

    const holomens = [];

    for (const area of areas) {
      const card = player[area];
      if (card && card.card_type?.includes('ホロメン')) {
        holomens.push({
          card: card,
          position: area
        });
      }
    }

    return holomens;
  }

  /**
   * 条件チェックユーティリティ
   * @param {number} playerId - プレイヤーID
   * @param {Object} conditions - チェック条件
   */
  checkConditions(playerId, conditions = {}) {
    const player = this.battleEngine.players[playerId];
    if (!player) return false;

    // ステージの色数チェック
    if (conditions.minColors) {
      const stageHolomens = this.getStageHolomens(playerId);
      const colors = [...new Set(stageHolomens
        .map(h => h.card.card_color)
        .filter(color => color && color !== '無'))];
      if (colors.length < conditions.minColors) return false;
    }

    // 手札枚数チェック
    if (conditions.maxHandSize && player.hand.length > conditions.maxHandSize) {
      return false;
    }

    if (conditions.minHandSize && player.hand.length < conditions.minHandSize) {
      return false;
    }

    // フェーズチェック
    if (conditions.phase) {
      const currentPhase = this.battleEngine.stateManager?.state.turn.currentPhase;
      if (currentPhase !== conditions.phase) return false;
    }

    return true;
  }

  /**
   * カード選択UIの表示（プレースホルダー）
   * 実際のUI実装に置き換える必要があります
   */
  async showCardSelectionUI(cards, count, description, mandatory = true) {
    // TODO: 実際のUI実装
    // 現在は先頭から指定枚数を自動選択
    
    if (cards.length === 0) return [];
    
    // 自動選択（開発用）
    return cards.slice(0, Math.min(count, cards.length));
  }

  /**
   * UI更新
   */
  updateDisplay() {
    if (this.battleEngine.updateDisplay) {
      this.battleEngine.updateDisplay();
    }
  }
}

// グローバルエクスポート
if (typeof window !== 'undefined') {
  window.CardEffectUtils = CardEffectUtils;
}
