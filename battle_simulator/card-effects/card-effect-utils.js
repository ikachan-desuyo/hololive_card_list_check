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
      console.error(`🚨 [selectCardsFromDeck] エラー:`, error);
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
    console.log(`🃏 [addCardsToHand] 開始: プレイヤー${playerId}, ${cards.length}枚のカードを手札に追加`);
    console.log(`🃏 [addCardsToHand] 追加対象カード:`, cards.map(c => c.name || c.id));
    
    const player = this.battleEngine.players[playerId];
    if (!player) {
      console.error(`❌ [addCardsToHand] プレイヤー${playerId}が見つかりません`);
      return { success: false, reason: 'プレイヤーが見つかりません' };
    }

    console.log(`🃏 [addCardsToHand] 手札追加前: ${player.hand.length}枚`);
    console.log(`🃏 [addCardsToHand] デッキ枚数: ${player.deck.length}枚`);

    const addedCards = [];

    for (const card of cards) {
      console.log(`🃏 [addCardsToHand] カード処理中: ${card.name || card.id}`);
      
      // デッキから除去
      const deckIndex = player.deck.indexOf(card);
      if (deckIndex !== -1) {
        player.deck.splice(deckIndex, 1);
        player.hand.push(card);
        addedCards.push(card);
        console.log(`✅ [addCardsToHand] ${card.name || card.id} を手札に追加完了`);
        console.log(`✅ [addCardsToHand] 手札枚数: ${player.hand.length}枚 (+1)`);
      } else {
        console.warn(`⚠️ [addCardsToHand] ${card.name || card.id} がデッキに見つかりません`);
        console.warn(`⚠️ [addCardsToHand] デッキ内容:`, player.deck.map(c => c.name || c.id));
      }
    }

    // デッキシャッフル
    if (shuffle && addedCards.length > 0) {
      console.log(`🔀 [addCardsToHand] デッキをシャッフル`);
      this.shuffleDeck(playerId);
    }

    console.log(`✅ [addCardsToHand] 完了: ${addedCards.length}枚を手札に追加`);
    console.log(`✅ [addCardsToHand] 最終手札枚数: ${player.hand.length}枚`);
    console.log(`✅ [addCardsToHand] 最終デッキ枚数: ${player.deck.length}枚`);
    
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
   * カード選択UIの表示
   * @param {Array} cards - 選択可能なカード配列
   * @param {number} count - 選択枚数
   * @param {string} description - 選択の説明文
   * @param {boolean} mandatory - 必須選択かどうか
   * @returns {Promise<Array>} 選択されたカード配列
   */
  async showCardSelectionUI(cards, count, description, mandatory = true) {
    if (cards.length === 0) return [];
    
    return new Promise((resolve) => {
      // 既存のモーダルを削除
      const existingModal = document.querySelector('.card-selection-modal');
      if (existingModal) {
        existingModal.remove();
      }

      // モーダル要素を作成
      const modal = document.createElement('div');
      modal.className = 'card-selection-modal';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease-out;
      `;

      // モーダルコンテンツ
      const content = document.createElement('div');
      content.style.cssText = `
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border: 2px solid #4a9eff;
        border-radius: 15px;
        padding: 25px;
        max-width: 95%;
        max-height: 85%;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(74, 158, 255, 0.3);
        animation: slideIn 0.3s ease-out;
      `;

      // タイトル
      const title = document.createElement('h3');
      title.textContent = description;
      title.style.cssText = `
        color: #4a9eff;
        text-align: center;
        margin: 0 0 20px 0;
        font-size: 18px;
        text-shadow: 0 0 10px rgba(74, 158, 255, 0.5);
      `;

      // 選択状況表示
      const selectionInfo = document.createElement('div');
      selectionInfo.style.cssText = `
        color: #ffffff;
        text-align: center;
        margin-bottom: 15px;
        font-size: 14px;
      `;
      const updateSelectionInfo = (selectedCount) => {
        selectionInfo.textContent = `選択済み: ${selectedCount}/${count}`;
      };
      updateSelectionInfo(0);

      // カードグリッド
      const cardGrid = document.createElement('div');
      cardGrid.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
        margin-bottom: 20px;
        max-height: 500px;
        overflow-y: auto;
        justify-content: center;
        padding: 10px;
      `;

      const selectedCards = [];

      // カードを画像表示
      cards.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.style.cssText = `
          width: 120px;
          height: 168px;
          border: 3px solid #666;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          background-image: url('${card.image_url || card.imageUrl || ''}');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          background-color: #2a2a4e;
          overflow: hidden;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        `;

        // カード名オーバーレイ
        const nameOverlay = document.createElement('div');
        nameOverlay.textContent = card.name || card.card_name || `カード${index + 1}`;
        nameOverlay.style.cssText = `
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
          color: white;
          padding: 8px 4px 4px;
          font-size: 11px;
          font-weight: bold;
          text-align: center;
          line-height: 1.2;
        `;

        cardElement.appendChild(nameOverlay);

        // クリックイベント
        cardElement.addEventListener('click', () => {
          const isSelected = selectedCards.includes(card);
          
          if (isSelected) {
            // 選択解除
            const idx = selectedCards.indexOf(card);
            selectedCards.splice(idx, 1);
            cardElement.style.border = '3px solid #666';
            cardElement.style.transform = 'scale(1)';
            cardElement.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
          } else if (selectedCards.length < count) {
            // 選択
            selectedCards.push(card);
            cardElement.style.border = '3px solid #4a9eff';
            cardElement.style.transform = 'scale(1.05)';
            cardElement.style.boxShadow = '0 6px 20px rgba(74, 158, 255, 0.5)';
          }
          
          updateSelectionInfo(selectedCards.length);
          confirmButton.disabled = mandatory && selectedCards.length === 0;
          confirmButton.style.opacity = confirmButton.disabled ? '0.5' : '1';
        });

        cardGrid.appendChild(cardElement);
      });

      // ボタンコンテナ
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = `
        display: flex;
        justify-content: center;
        gap: 15px;
      `;

      // 確定ボタン
      const confirmButton = document.createElement('button');
      confirmButton.textContent = '確定';
      confirmButton.disabled = mandatory;
      confirmButton.style.cssText = `
        background: linear-gradient(135deg, #4a9eff 0%, #357abd 100%);
        color: white;
        border: none;
        padding: 10px 25px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: bold;
        transition: all 0.3s ease;
        opacity: ${mandatory ? '0.5' : '1'};
      `;
      
      confirmButton.addEventListener('click', () => {
        console.log(`🎯 [showCardSelectionUI] 確定ボタンクリック: ${selectedCards.length}枚選択`);
        console.log(`🎯 [showCardSelectionUI] 選択されたカード:`, selectedCards.map(c => c.name || c.id));
        modal.remove();
        resolve(selectedCards);
      });

      // キャンセルボタン（任意選択の場合のみ）
      if (!mandatory) {
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'キャンセル';
        cancelButton.style.cssText = `
          background: linear-gradient(135deg, #666 0%, #444 100%);
          color: white;
          border: none;
          padding: 10px 25px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s ease;
        `;
        
        cancelButton.addEventListener('click', () => {
          modal.remove();
          resolve([]);
        });
        
        buttonContainer.appendChild(cancelButton);
      }

      buttonContainer.appendChild(confirmButton);

      // 要素を組み立て
      content.appendChild(title);
      content.appendChild(selectionInfo);
      content.appendChild(cardGrid);
      content.appendChild(buttonContainer);
      modal.appendChild(content);

      // CSSアニメーションを追加
      const style = document.createElement('style');
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: scale(0.8) translateY(-20px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);

      // DOMに追加
      document.body.appendChild(modal);

      // モーダル外クリックで閉じる（任意選択の場合のみ）
      if (!mandatory) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            modal.remove();
            resolve([]);
          }
        });
      }
    });
  }

  /**
   * UI更新
   */
  updateDisplay() {
    if (this.battleEngine.updateDisplay) {
      this.battleEngine.updateDisplay();
    }
  }

  /**
   * サポートカードをホロメンに装備
   * @param {number} playerId - プレイヤーID
   * @param {Object} targetHolomem - 装備対象のホロメン
   * @param {Object} supportCard - 装備するサポートカード
   * @returns {Object} 装備結果
   */
  attachSupportCard(playerId, targetHolomem, supportCard) {
    // カードタイプによる装備制限チェック
    const cardType = supportCard.card_type || supportCard.cardType || '';
    
    // 装備カテゴリの決定
    let equipCategory = null;
    let maxCount = 1; // デフォルトは1枚制限
    
    if (cardType.includes('ファン')) {
      equipCategory = 'fans';
      // 雪民は複数枚装備可能
      if (supportCard.name?.includes('雪民')) {
        maxCount = Infinity;
      }
    } else if (cardType.includes('マスコット')) {
      equipCategory = 'mascots';
      maxCount = 1; // マスコットは1枚制限
    } else if (cardType.includes('ツール')) {
      equipCategory = 'tools';
      maxCount = 1; // ツールは1枚制限
    } else if (cardType.includes('スタッフ')) {
      // スタッフは装備ではなく使い切り
      return { success: false, reason: 'スタッフカードは装備できません' };
    } else {
      return { success: false, reason: '装備できないカードタイプです' };
    }

    // 装備配列の初期化
    if (!targetHolomem.equipment) {
      targetHolomem.equipment = {
        fans: [],
        mascots: [],
        tools: []
      };
    }

    // 装備制限チェック
    const currentCount = targetHolomem.equipment[equipCategory].length;
    if (currentCount >= maxCount) {
      return { 
        success: false, 
        reason: `${equipCategory}は最大${maxCount}枚まで装備可能です` 
      };
    }

    // 特定の装備制限チェック（雪民は雪花ラミィのみ）
    if (supportCard.name?.includes('雪民') && !targetHolomem.name?.includes('雪花ラミィ')) {
      return { 
        success: false, 
        reason: '雪民は雪花ラミィにのみ装備できます' 
      };
    }

    // 装備実行
    const equipmentData = {
      card: supportCard,
      category: equipCategory,
      attachedAt: Date.now(),
      effects: this.getEquipmentEffects(supportCard, targetHolomem)
    };

    targetHolomem.equipment[equipCategory].push(equipmentData);

    // 装備効果を適用
    this.applyEquipmentEffects(targetHolomem, equipmentData);

    return { 
      success: true, 
      message: `${supportCard.name}を${targetHolomem.name}に装備しました`,
      equipment: equipmentData 
    };
  }

  /**
   * 装備カードの効果を取得
   */
  getEquipmentEffects(supportCard, targetHolomem) {
    const effects = {};
    
    if (supportCard.name?.includes('だいふく')) {
      effects.artBonus = 10;
      if (targetHolomem.name?.includes('雪花ラミィ')) {
        effects.hpBonus = 20;
      }
    } else if (supportCard.name?.includes('雪民')) {
      effects.specialDamageBonus = 10;
      effects.targetType = 'opponent_center';
    }

    return effects;
  }

  /**
   * 装備効果をホロメンに適用
   */
  applyEquipmentEffects(holomem, equipmentData) {
    if (!holomem.equipmentEffects) {
      holomem.equipmentEffects = {
        artBonus: 0,
        hpBonus: 0,
        specialDamageBonus: 0
      };
    }

    const effects = equipmentData.effects;
    if (effects.artBonus) holomem.equipmentEffects.artBonus += effects.artBonus;
    if (effects.hpBonus) holomem.equipmentEffects.hpBonus += effects.hpBonus;
    if (effects.specialDamageBonus) holomem.equipmentEffects.specialDamageBonus += effects.specialDamageBonus;
  }

  /**
   * ブルーム時の装備引き継ぎ
   */
  transferEquipmentOnBloom(fromCard, toCard) {
    if (fromCard.equipment) {
      toCard.equipment = JSON.parse(JSON.stringify(fromCard.equipment));
      toCard.equipmentEffects = JSON.parse(JSON.stringify(fromCard.equipmentEffects || {}));
      
      console.log(`📦 [装備引き継ぎ] ${fromCard.name} → ${toCard.name}`, toCard.equipment);
    }
  }

  /**
   * 装備されたカードの表示順序を取得
   * ホロメン(一番上) → ファン → マスコット → ツール → エール(一番下)
   */
  getCardDisplayOrder(card) {
    if (card.cardType?.includes('ホロメン')) return 0;
    if (card.card_type?.includes('ファン')) return 1;
    if (card.card_type?.includes('マスコット')) return 2;
    if (card.card_type?.includes('ツール')) return 3;
    if (card.cardType?.includes('エール') || card.card_type?.includes('エール')) return 4;
    return 2; // デフォルトは中間
  }
}

// グローバルエクスポート
if (typeof window !== 'undefined') {
  window.CardEffectUtils = CardEffectUtils;
}

// グローバルエクスポート
if (typeof window !== 'undefined') {
  window.CardEffectUtils = CardEffectUtils;
}
