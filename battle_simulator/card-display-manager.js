// CardDisplayManager.js - カード表示・UI管理機能

class CardDisplayManager {
  constructor(battleEngine) {
    this.battleEngine = battleEngine;
    this.isUpdating = false;
    this.updateQueue = [];
    this.updateDebounceTimer = null;
  }

  /**
   * 全カードエリアの表示を更新（デバウンス対応）
   */
  updateCardAreas() {
    // 既に更新中の場合はキューに追加
    if (this.isUpdating) {
      if (this.updateDebounceTimer) {
        clearTimeout(this.updateDebounceTimer);
      }
      this.updateDebounceTimer = setTimeout(() => this.updateCardAreas(), 50);
      return;
    }
    
    this.isUpdating = true;
    
    try {
      
      // プレイヤーとCPUの両方のエリアを更新
      [1, 2].forEach(playerId => {
        // Battle Engineから直接プレイヤーデータを取得
        const player = this.battleEngine.players[playerId];
        if (!player) {
          console.warn(`updateCardAreas: プレイヤー${playerId}の状態が見つかりません`);
          return;
        }
        
        
        const sectionClass = playerId === 1 ? '.battle-player' : '.battle-opponent';
        
        // 各エリアのデータと要素を取得
        const areas = [
          { id: 'life', data: player.life, isMultiple: true },
          { id: 'collab', data: player.collab, isMultiple: false },
          { id: 'center', data: player.center, isMultiple: false },
          { id: 'oshi', data: player.oshi, isMultiple: false },
          { id: 'holo', data: player.holoPower, isMultiple: true },
          { id: 'deck', data: player.deck, isMultiple: true },
          { id: 'yell-deck', data: player.yellDeck, isMultiple: true },
          { id: 'backs', data: null, isMultiple: true }, // バックスは特別処理
          { id: 'archive', data: player.archive, isMultiple: true }
        ];
        
        areas.forEach(areaInfo => {
          const area = document.querySelector(`${sectionClass} .${areaInfo.id}`);
          if (!area) {
            console.warn(`❌ [Card Display] エリア要素が見つかりません: ${sectionClass} .${areaInfo.id}`);
            return;
          }
          
          
          if (areaInfo.id === 'backs') {
            // バックスロットの特別処理
            const playerType = playerId === 1 ? 'player' : 'cpu';
            this.updateBackSlots(playerType);
          } else {
            this.displayCardsInArea(area, areaInfo.data, areaInfo.id, playerId, areaInfo.isMultiple);
          }
        });
      });
      
      // フェーズハイライトの更新
      this.updatePhaseHighlight();
      
    } catch (error) {
      window.errorLog('UI更新中にエラーが発生しました:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * 特定エリアにカードを表示
   */
  displayCardsInArea(area, cards, areaId, playerId, isMultiple = false) {
    try {
      if (!area) {
        console.warn(`❌ [displayCardsInArea] エリア要素がnull: ${areaId}`);
        return;
      }
      
      
      // プレイヤーIDの特定（エリアのクラス名から判定）
      const isPlayerArea = area.closest('.battle-player') !== null;
      const actualPlayerId = isPlayerArea ? 1 : 2;
      
      // 既存のイベントリスナーをクリーンアップ
      this.cleanupAreaEventListeners(area);
      
      // エリアをクリア（カウンターは残す）
      const counters = area.querySelectorAll('.card-counter');
      area.innerHTML = '';
      counters.forEach(counter => area.appendChild(counter));
      
      let cardsToDisplay = [];
      let displayType = 'stack'; // 'stack', 'spread', 'single'
      
      // エリアIDに基づいてカードデータと表示タイプを決定
      switch (areaId) {
        case 'life':
          cardsToDisplay = cards || [];
          displayType = 'vertical';
          break;
        case 'collab':
          if (cards) {
            // コラボカード表示処理
            if (!cards.cardState) {
              console.warn(`⚠️ コラボカードに状態情報がありません:`, cards);
            }
            cardsToDisplay = [cards];
          } else {
            // コラボポジションにカードなし
          }
          displayType = 'single';
          break;
        case 'center':
          if (cards) {
            // センターカード表示処理
            if (!cards.cardState) {
              console.warn(`⚠️ センターカードに状態情報がありません:`, cards);
            }
            cardsToDisplay = [cards];
          }
          displayType = 'single';
          break;
      case 'oshi':
        if (cards) {
          cardsToDisplay = [cards];
        } else {
        }
        displayType = 'single';
        break;
      case 'holo':
        cardsToDisplay = cards || [];
        displayType = 'stack';
        break;
      case 'deck':
        cardsToDisplay = (cards || []).slice(0, 3); // 上3枚のみ表示
        displayType = 'stack';
        break;
      case 'yell-deck':
        cardsToDisplay = (cards || []).slice(0, 3); // 上3枚のみ表示
        displayType = 'stack';
        break;
      case 'archive':
        cardsToDisplay = (cards || []).slice(0, 3); // 上3枚のみ表示
        displayType = 'stack';
        break;
    }
    
    // カードを表示
    cardsToDisplay.forEach((card, index) => {
      if (card) {
        // フィールドから最新のカードデータを取得（装備データを含む）
        const latestCard = this.getLatestCardData(card, areaId, playerId);
        
        // プレイヤーIDに基づいて判定（現在のプレイヤーのカードのみドラッグ可能）
        const currentPlayer = this.battleEngine?.stateManager?.state?.turn?.currentPlayer || 1;
        const isPlayerCard = (playerId === currentPlayer);
        const cardElement = this.createCardElement(latestCard, areaId, index, isPlayerCard);
        area.appendChild(cardElement);
        
        // 推しホロメンエリアの場合は追加ログ
        if (areaId === 'oshi') {
        }
        
        // エールカードがある場合は追加
        if (latestCard.yellCards && latestCard.yellCards.length > 0) {
          // console.log(`🎨 [エール表示] ${latestCard.name}: ${latestCard.yellCards.length}枚のエールカードを表示`);
          this.addYellCardsToArea(area, latestCard, areaId, index);
        }
      }
    });
    
    // カードカウンターの追加
    const player = this.battleEngine.players[actualPlayerId];
    const totalCount = this.getCardCount(player, areaId);
    if (totalCount > 1) {
      this.updateCardCounter(area, totalCount);
    }
    
    // エリアの状態クラス更新
    if (totalCount > 0) {
      area.classList.add('has-card');
    } else {
      area.classList.remove('has-card');
    }
    
    } catch (error) {
      window.errorLog(`カード表示中にエラーが発生しました (${areaId}):`, error);
    }
  }

  /**
   * フィールドから最新のカードデータを取得（装備データを含む）
   * @param {Object} card - 元のカードデータ
   * @param {string} areaId - エリアID
   * @param {number} playerId - プレイヤーID
   * @returns {Object} 最新のカードデータ
   */
  getLatestCardData(card, areaId, playerId) {
    
    // まずState Managerから最新データを取得を試みる
    if (this.battleEngine.stateManager && this.battleEngine.stateManager.state) {
      const statePlayer = this.battleEngine.stateManager.state.players[playerId];
      if (statePlayer && statePlayer.cards) {
        
        if (['center', 'collab', 'oshi'].includes(areaId)) {
          const stateCard = statePlayer.cards[areaId];
          if (stateCard && stateCard.id === card.id) {
            return stateCard;
          }
        }
        
        if (areaId === 'backs') {
          const positions = ['back1', 'back2', 'back3', 'back4', 'back5'];
          for (const pos of positions) {
            const stateCard = statePlayer.cards[pos];
            if (stateCard && stateCard.id === card.id) {
              return stateCard;
            }
          }
        }
        
        // 直接バックポジション指定の場合
        if (['back1', 'back2', 'back3', 'back4', 'back5'].includes(areaId)) {
          const stateCard = statePlayer.cards[areaId];
          if (stateCard && stateCard.id === card.id) {
            return stateCard;
          }
        }
      }
    }
    
    // State Managerにデータがない場合はBattle Engineから取得
    const player = this.battleEngine.players[playerId];
    if (!player) return card;
    
    // フィールドのホロメンカードの場合、最新データを取得
    if (['center', 'collab', 'oshi'].includes(areaId)) {
      const fieldCard = player[areaId];
      if (fieldCard && fieldCard.id === card.id) {
        return fieldCard;
      }
    }
    
    // バックスロットの場合
    if (areaId === 'backs') {
      const positions = ['back1', 'back2', 'back3', 'back4', 'back5'];
      for (const pos of positions) {
        const fieldCard = player[pos];
        if (fieldCard && fieldCard.id === card.id) {
          return fieldCard;
        }
      }
    }
    
    return card;
  }

  /**
   * エリア内のイベントリスナーをクリーンアップ
   */
  cleanupAreaEventListeners(area) {
    try {
      const existingCards = area.querySelectorAll('.card');
      existingCards.forEach(cardElement => {
        // クローンして古いイベントリスナーを削除
        const newElement = cardElement.cloneNode(true);
        cardElement.parentNode.replaceChild(newElement, cardElement);
      });
    } catch (error) {
      window.errorLog('カードエリアのイベントリスナークリーンアップ中にエラー:', error);
    }
  }

  /**
   * カード要素を作成
   */
  createCardElement(card, areaId, cardIndex = 0, isPlayerCard = true) {
    const cardElement = document.createElement('div');
    cardElement.className = 'card face-down'; // デフォルトは裏向き
    cardElement.setAttribute('data-card-id', card.id);
    cardElement.setAttribute('data-area-id', areaId);
    cardElement.setAttribute('data-card-index', cardIndex);
    
    // 情報パネル用のdata属性を設定
    if (card) {
      cardElement.setAttribute('data-card-name', card.name || '不明なカード');
      cardElement.setAttribute('data-card-type', card.card_type || '不明');
      cardElement.setAttribute('data-card-description', card.description || '');
      
      if (card.color && Array.isArray(card.color)) {
        cardElement.setAttribute('data-card-color', card.color.join('・'));
      } else if (card.color) {
        cardElement.setAttribute('data-card-color', card.color);
      }
      
      if (card.level !== undefined) {
        cardElement.setAttribute('data-card-level', card.level);
      }
      
      if (card.hp !== undefined) {
        cardElement.setAttribute('data-card-hp', card.hp);
      }
      
      if (card.attack !== undefined) {
        cardElement.setAttribute('data-card-attack', card.attack);
      }
    }
    
    // ホロメンカードのz-indexを確実に設定
    cardElement.style.zIndex = '100';
    cardElement.style.position = 'relative';
    
    // 横向き状態の判定と適切なクラス管理
    if (card && card.isResting) {
      cardElement.classList.add('resting');
    } else {
      cardElement.classList.remove('resting');
    }
    
    // ホロパワーエリアのカードに回転クラスを追加
    if (areaId === 'holo') {
      cardElement.classList.add('holo-power-card');
    }
    
    const shouldShowFaceUp = this.shouldCardBeFaceUp(card, areaId);
    
    if (shouldShowFaceUp && card) {
      cardElement.classList.remove('face-down');
      cardElement.classList.add('face-up');
      
      // カード画像の設定
      if (card.image_url) {
        cardElement.style.backgroundImage = `url(${card.image_url})`;
        cardElement.style.backgroundSize = 'cover';
        cardElement.style.backgroundPosition = 'center';
        cardElement.style.backgroundRepeat = 'no-repeat';
      } else {
        // 画像がない場合はカード内容を表示
        cardElement.innerHTML = `
          <div class="card-content">
            <div class="card-name">${card.name || 'Unknown'}</div>
            <div class="card-type">${card.card_type || ''}</div>
          </div>
        `;
      }

      // HP表示を追加（ホロメンカードでHPがある場合）
      if (card.hp && card.card_type && card.card_type.includes('ホロメン')) {
        this.addHPDisplay(cardElement, card, isPlayerCard);
      }
    } else {
      // 裏向きカード
      cardElement.style.backgroundImage = 'url(images/card_sleeve.jpg)';
      cardElement.style.backgroundSize = 'cover';
      cardElement.style.backgroundPosition = 'center';
      cardElement.style.backgroundRepeat = 'no-repeat';
    }
    
    // ツールチップ表示
    if (shouldShowFaceUp && card) {
      cardElement.title = card.name;
    }
    
    // 効果発動ボタンを追加（条件を満たす場合のみ）
    this.addEffectButtonIfNeeded(cardElement, card, areaId, isPlayerCard);
    
    // カードクリック処理の追加
    if (areaId !== 'deck' && areaId !== 'yell-deck') {
      const clickHandler = (e) => {
        e.stopPropagation();
        
        // 装備モード中はカード詳細表示をスキップ
        if (this.battleEngine.handManager?.equipmentMode?.active) {
          return;
        }
        
        if (areaId === 'archive') {
          // アーカイブエリアのカードクリック時：そのプレイヤーのアーカイブモーダルを表示
          const targetPlayerId = isPlayerCard ? 1 : 2;
          if (this.battleEngine.showArchiveModal) {
            this.battleEngine.showArchiveModal(targetPlayerId);
          } else {
          }
        } else {
          // その他のエリア：通常のカード詳細表示
          // 装備モード中はカード詳細表示をスキップ
          if (this.battleEngine.handManager?.equipmentMode?.active) {
            return;
          }
          
          if (this.battleEngine.cardInteractionManager) {
            this.battleEngine.cardInteractionManager.showCardInfo(card, areaId);
          } else if (typeof this.battleEngine.showCardModal === 'function') {
            this.battleEngine.showCardModal(card, areaId);
          } else {
          }
        }
      };
      
      cardElement.addEventListener('click', clickHandler);
      // ハンドラーを要素に保存（後でremoveEventListenerするため）
      cardElement._clickHandler = clickHandler;
    }
    
    // 配置済みカードのドラッグ機能を追加（プレイヤー1のセンター、バックのホロメンカードのみ）
    if (shouldShowFaceUp && card && isPlayerCard && 
        this.battleEngine.isHolomenCard && this.battleEngine.isHolomenCard(card) && 
        (areaId === 'collab' || areaId === 'center' || areaId === 'backs' || 
         ['back1', 'back2', 'back3', 'back4', 'back5'].includes(areaId))) {
      cardElement.draggable = true;
      cardElement.setAttribute('data-card-id', card.id);
      cardElement.setAttribute('data-area-id', areaId);
      cardElement.setAttribute('data-area-index', cardIndex);

      
      // バックスロットの場合は、スロットインデックスも設定
      if (areaId === 'backs' || ['back1', 'back2', 'back3', 'back4', 'back5'].includes(areaId)) {
        cardElement.setAttribute('data-slot-index', cardIndex);
      }
      
      // ドラッグイベントハンドラーを安全に設定
      if (this.battleEngine.handlePlacedCardDragStart) {
        const dragStartHandler = (e) => this.battleEngine.handlePlacedCardDragStart(e, card, areaId, cardIndex);
        cardElement.addEventListener('dragstart', dragStartHandler);
        cardElement._dragStartHandler = dragStartHandler;
      }
      if (this.battleEngine.handlePlacedCardDragEnd) {
        const dragEndHandler = (e) => this.battleEngine.handlePlacedCardDragEnd(e);
        cardElement.addEventListener('dragend', dragEndHandler);
        cardElement._dragEndHandler = dragEndHandler;
      }
    } else {

    }
    
    // 表示タイプによる位置調整
    this.applyDisplayTypeStyles(cardElement, areaId, cardIndex);
    
    // 装備カードの表示を追加（ホロメンカードのみ）
    if (shouldShowFaceUp && card && card.card_type && card.card_type.includes('ホロメン') && 
        ['center', 'collab', 'backs', 'back1', 'back2', 'back3', 'back4', 'back5'].includes(areaId)) {
      this.addEquippedCardsDisplay(cardElement, card);
    }
    
    return cardElement;
  }
  
  /**
   * 表示タイプに応じたスタイルを適用
   */
  applyDisplayTypeStyles(cardElement, areaId, cardIndex) {
    switch (areaId) {
      case 'deck':
      case 'yell-deck':
      case 'archive':
        // スタック表示
        cardElement.style.position = 'absolute';
        cardElement.style.top = '50%';
        cardElement.style.left = '50%';
        if (cardIndex === 0) {
          cardElement.style.transform = 'translate(-50%, -50%)';
          cardElement.style.zIndex = '10';
        } else {
          const offset = cardIndex * 2;
          cardElement.style.transform = `translate(${-50 + offset}%, ${-50 + offset}%)`;
          cardElement.style.zIndex = `${10 - cardIndex}`;
        }
        break;
      case 'life':
        // ライフカード用の縦並び表示（基本スタイルはCSSで、動的部分のみJSで）
        cardElement.style.zIndex = `${20 - cardIndex}`; // 上のカードほど前面に（動的計算）
        break;
      case 'holo':
        // ホロパワーの縦スタック表示（エリア自体が90度回転済み）
        cardElement.style.zIndex = `${20 - cardIndex}`; // 上のカードほど前面に
        cardElement.style.position = 'relative';
        cardElement.style.display = 'block';
        // margin: -60px 0 はCSSで設定済み
        break;
      default:
        // その他（センター、推し、バック）は単体表示
        cardElement.style.position = 'relative';
        break;
    }
  }

  /**
   * バックスロットの更新
   */
  updateBackSlots(playerType) {
    const playerId = playerType === 'player' ? 1 : 2;
    const sectionClass = playerId === 1 ? '.battle-player' : '.battle-opponent';
    const backSlots = document.querySelectorAll(`${sectionClass} .back-slot`);
    if (!backSlots.length) return;
    
    // State Managerから状態を取得
    const playerState = this.battleEngine.stateManager.getStateByPath(`players.${playerId}`);
    if (!playerState || !playerState.cards) {
      console.warn(`updateBackSlots: プレイヤー${playerId}の状態が見つかりません`, playerState);
      return;
    }
    
    const player = playerState.cards;
    const backPositions = ['back1', 'back2', 'back3', 'back4', 'back5'];
    
    
    // センター①があるかどうかで最大使用スロット数を決定
    // コラボ時のback5制限を無効化
    const maxSlots = 5; // player.collab ? 4 : 5;
    
    backSlots.forEach((slot, index) => {
      // 既存のカード要素をクリア（スロット自体は保持）
      const existingCards = slot.querySelectorAll('.card');
      existingCards.forEach(card => card.remove());
      
      // 既存のエールカードコンテナをクリア
      const existingYellContainers = slot.querySelectorAll('.yell-cards');
      existingYellContainers.forEach(container => container.remove());
      
      // 使用不可スロットの処理
      if (index >= maxSlots) {
        slot.classList.add('disabled');
        slot.classList.remove('has-card');
        slot.style.opacity = '0.3';
        slot.style.pointerEvents = 'none';
        slot.textContent = '使用不可';
        return;
      } else {
        slot.classList.remove('disabled');
        slot.style.opacity = '1';
        slot.style.pointerEvents = 'auto';
      }
      
      // 対応するバックポジションにカードがある場合は表示
      const card = player[backPositions[index]];
      if (card) {
        // フィールドから最新のカードデータを取得（装備データを含む）
        // 正確なバックポジションを渡す
        const latestCard = this.getLatestCardData(card, backPositions[index], playerId);
        
        // カード表示処理
        if (latestCard.cardState?.bloomedThisTurn) {
        }
        if (!latestCard.cardState) {
          console.warn(`⚠️ バックカード${index + 1}に状態情報がありません:`, latestCard);
        }
        const currentPlayer = this.battleEngine?.stateManager?.state?.turn?.currentPlayer || 1;
        const isPlayerCard = (playerId === currentPlayer); // 現在のプレイヤーのカードのみドラッグ可能
        const cardElement = this.createCardElement(latestCard, backPositions[index], index, isPlayerCard);
        // バックスロット内でのサイズ調整
        cardElement.style.width = '100%';
        cardElement.style.height = '100%';
        cardElement.style.position = 'absolute';
        cardElement.style.top = '0';
        cardElement.style.left = '0';
        
        slot.appendChild(cardElement);
        slot.classList.add('has-card');
        slot.style.position = 'relative'; // 子要素の絶対配置のため
        
        // エールカードがある場合は表示
        if (latestCard.yellCards && latestCard.yellCards.length > 0) {
          this.addYellCardsToArea(slot, latestCard, 'backs', index);
        }
      } else {
        slot.classList.remove('has-card');
        slot.style.position = 'static';
        // 空のスロットには元のテキストを表示
        if (slot.children.length === 0) {
          slot.textContent = `バック${index + 1}`;
        }
      }
    });
  }

  /**
   * フェーズハイライトの更新
   */
  updatePhaseHighlight() {
    // Battle Engine本体のupdatePhaseHighlightに委任
    // 数値フェーズと文字列フェーズの不一致を避けるため
    if (this.battleEngine && this.battleEngine.updatePhaseHighlight) {
      this.battleEngine.updatePhaseHighlight();
    } else {
      // フォールバック: すべてのハイライトを削除のみ
      document.querySelectorAll('.phase-highlight').forEach(el => {
        el.classList.remove('phase-highlight');
      });
    }
  }

  /**
   * エールカードをエリアに追加
   */
  addYellCardsToArea(area, holomenCard, areaId, cardIndex) {
    if (!holomenCard.yellCards || holomenCard.yellCards.length === 0) {
      return;
    }
    
    // console.log(`🎯 [エール描画] ${holomenCard.name} (${areaId}): ${holomenCard.yellCards.length}枚のエールカードを描画開始`);
    
    // 既存のエールカードコンテナを削除（重複防止）
    const existingYellContainer = area.querySelector(`.yell-cards[data-card-index="${cardIndex}"]`);
    if (existingYellContainer) {
      existingYellContainer.remove();
    }
    
    const yellContainer = document.createElement('div');
    yellContainer.className = 'yell-cards';
    yellContainer.setAttribute('data-card-index', cardIndex);
    
    // センター、コラボ、バックで配置を変える
    if (areaId === 'center') {
      yellContainer.classList.add('center');
    } else if (areaId === 'collab') {
      yellContainer.classList.add('collab');
    } else {
      yellContainer.classList.add('back');
    }
    
    // エリア内での絶対配置
    yellContainer.style.position = 'absolute';
    yellContainer.style.top = '0';
    yellContainer.style.left = '0';
    yellContainer.style.width = '100%';
    yellContainer.style.height = '100%';
    yellContainer.style.zIndex = '5'; // ホロメンカードより後ろだが、ホバー時は子要素が前面に
    yellContainer.style.pointerEvents = 'auto'; // マウスイベントを有効にしてエールカードがホバー可能に
    
    holomenCard.yellCards.forEach((yellCard, index) => {
      const yellElement = document.createElement('div');
      yellElement.className = 'yell-card';
      yellElement.title = yellCard.name || 'エールカード';
      
      // エールカード用のdata属性を設定（情報パネル表示用）
      yellElement.setAttribute('data-card-id', yellCard.id || '');
      yellElement.setAttribute('data-card-name', yellCard.name || 'エールカード');
      yellElement.setAttribute('data-card-type', yellCard.card_type || 'エールカード');
      yellElement.setAttribute('data-card-description', yellCard.description || '');
      
      if (yellCard.color && Array.isArray(yellCard.color)) {
        yellElement.setAttribute('data-card-color', yellCard.color.join('・'));
      } else if (yellCard.color) {
        yellElement.setAttribute('data-card-color', yellCard.color);
      }
      
      if (yellCard.level !== undefined) {
        yellElement.setAttribute('data-card-level', yellCard.level);
      }
      
      if (yellCard.hp !== undefined) {
        yellElement.setAttribute('data-card-hp', yellCard.hp);
      }
      
      if (yellCard.attack !== undefined) {
        yellElement.setAttribute('data-card-attack', yellCard.attack);
      }
      
      // エールカードをライフカードのように重ねて配置
      yellElement.style.position = 'absolute';
      yellElement.style.width = '120px'; // 他のカードと同じサイズに統一
      yellElement.style.height = '168px'; // 他のカードと同じサイズに統一
      
      // センター、コラボ、バックで異なる重なり方（ホロメンカードから少しずらす）
      if (areaId === 'center') {
        // センター配置：ホロメンカードの下に、右部分が少しはみ出るように配置
        // 上下は同じ高さ、左右は右にずらして重ねる
        const offsetX = -100 + (index * 25); // 右にもっと大きくはみ出し
        const offsetY = 0; // 上下は同じ高さ
        yellElement.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(1)`;
        yellElement.style.zIndex = `${5 - index}`; // 通常時は後ろに、ホバー時はCSSで250に
      } else if (areaId === 'collab') {
        // コラボ配置：ホロメンカードの左下に、左下部分が少しはみ出るように配置
        // センターとは異なる独自の配置
        const offsetX = -30 - (index * 15); // 左にずらして重ねる
        const offsetY = 20 + (index * 10); // 下にずらして重ねる
        yellElement.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(1)`;
        yellElement.style.zIndex = `${5 - index}`; // 通常時は後ろに、ホバー時はCSSで250に
      } else if (areaId === 'backs') {
        // バック配置：ホロメンカードの背後に、上部が少しはみ出るように配置
        // 左右は同じ場所、上下は上にずらして重ねる
        const offsetX = 0; // 左右は同じ場所
        const offsetY = -20 - (index * 15); // 上により大きくはみ出し
        yellElement.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(1)`;
        yellElement.style.zIndex = `${5 - index}`; // 後ろのエールほど低いz-index、ホバー時はCSSで250に
      } else {
        // その他のエリア：左下にずらして重ねる  
        const offsetX = -8 - (index * 3);
        const offsetY = 8 + (index * 3);
        yellElement.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(1)`;
        yellElement.style.zIndex = `${5 - index}`;
      }
      
      // エールカードの画像を表示
      if (yellCard.image_url) {
        yellElement.style.backgroundImage = `url(${yellCard.image_url})`;
        yellElement.style.backgroundSize = 'cover';
        yellElement.style.backgroundPosition = 'center';
        yellElement.style.backgroundRepeat = 'no-repeat';
      } else {
        // 画像がない場合は最初の文字を表示
        yellElement.textContent = yellCard.name.charAt(0);
        yellElement.style.display = 'flex';
        yellElement.style.alignItems = 'center';
        yellElement.style.justifyContent = 'center';
        yellElement.style.fontSize = '12px';
        yellElement.style.fontWeight = 'bold';
      }
      
      yellContainer.appendChild(yellElement);
    });
    
    // エリア内の最初の子要素として追加（ホロメンカードより後ろに）
    area.insertBefore(yellContainer, area.firstChild);
  }

  /**
   * エールカードをカード表示に追加（旧関数・互換性のため残す）
   */
  addYellCardsToDisplay(cardElement, holomenCard, areaId) {
    // console.log(`🔍 [エールカード配置] areaId: "${areaId}", yellCards: ${holomenCard.yellCards?.length || 0}枚`);
    if (!holomenCard.yellCards || holomenCard.yellCards.length === 0) return;
    
    // 既存のエールカードコンテナを削除（重複防止）
    const existingYellContainer = cardElement.querySelector('.yell-cards');
    if (existingYellContainer) {
      existingYellContainer.remove();
    }
    
    const yellContainer = document.createElement('div');
    yellContainer.className = 'yell-cards';
    
    // センターかバックかで配置を変える
    if (areaId === 'center') {
      yellContainer.classList.add('center');
    } else {
      yellContainer.classList.add('back');
    }
    
    // カード要素内での絶対配置
    yellContainer.style.position = 'absolute';
    yellContainer.style.top = '0';
    yellContainer.style.left = '0';
    yellContainer.style.width = '100%';
    yellContainer.style.height = '100%';
    yellContainer.style.zIndex = '5'; // ホロメンカードより後ろだが、ホバー時は子要素が前面に
    yellContainer.style.pointerEvents = 'auto'; // マウスイベントを有効にしてエールカードがホバー可能に
    
    holomenCard.yellCards.forEach((yellCard, index) => {
      const yellElement = document.createElement('div');
      yellElement.className = 'yell-card';
      yellElement.title = yellCard.name || 'エールカード';
      
      // エールカード用のdata属性を設定（情報パネル表示用）
      yellElement.setAttribute('data-card-id', yellCard.id || '');
      yellElement.setAttribute('data-card-name', yellCard.name || 'エールカード');
      yellElement.setAttribute('data-card-type', yellCard.card_type || 'エールカード');
      yellElement.setAttribute('data-card-description', yellCard.description || '');
      
      if (yellCard.color && Array.isArray(yellCard.color)) {
        yellElement.setAttribute('data-card-color', yellCard.color.join('・'));
      } else if (yellCard.color) {
        yellElement.setAttribute('data-card-color', yellCard.color);
      }
      
      if (yellCard.level !== undefined) {
        yellElement.setAttribute('data-card-level', yellCard.level);
      }
      
      if (yellCard.hp !== undefined) {
        yellElement.setAttribute('data-card-hp', yellCard.hp);
      }
      
      if (yellCard.attack !== undefined) {
        yellElement.setAttribute('data-card-attack', yellCard.attack);
      }
      
      // エールカードをライフカードのように重ねて配置
      yellElement.style.position = 'absolute';
      yellElement.style.width = '120px'; // 他のカードと同じサイズに統一
      yellElement.style.height = '168px'; // 他のカードと同じサイズに統一
      
      // センターとバックで異なる重なり方（ホロメンカードから少しずらす）
      if (areaId === 'center') {
        // センター配置：ホロメンカードの下に、右部分が少しはみ出るように配置
        // 上下は同じ高さ、左右は右にずらして重ねる
        const offsetX = -100 + (index * 25); // 右にもっと大きくはみ出し
        const offsetY = 0; // 上下は同じ高さ
        yellElement.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(1)`;
        yellElement.style.zIndex = `${5 - index}`; // 通常時は後ろに、ホバー時はCSSで250に
      } else if (areaId === 'backs') {
        // バック配置：ホロメンカードの背後に、上部が少しはみ出るように配置
        // 左右は同じ場所、上下は上にずらして重ねる
        const offsetX = 0; // 左右は同じ場所
        const offsetY = -20 - (index * 15); // 上により大きくはみ出し
        yellElement.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(1)`;
        yellElement.style.zIndex = `${5 - index}`; // 後ろのエールほど低いz-index、ホバー時はCSSで250に
      } else {
        // その他のエリア：左下にずらして重ねる  
        const offsetX = -8 - (index * 3);
        const offsetY = 8 + (index * 3);
        yellElement.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(1)`;
        yellElement.style.zIndex = `${5 - index}`;
      }
      
      // エールカードの画像を表示
      if (yellCard.image_url) {
        yellElement.style.backgroundImage = `url(${yellCard.image_url})`;
        yellElement.style.backgroundSize = 'cover';
        yellElement.style.backgroundPosition = 'center';
        yellElement.style.backgroundRepeat = 'no-repeat';
      } else {
        // 画像がない場合は最初の文字を表示
        yellElement.textContent = yellCard.name.charAt(0);
        yellElement.style.display = 'flex';
        yellElement.style.alignItems = 'center';
        yellElement.style.justifyContent = 'center';
        yellElement.style.fontSize = '12px';
        yellElement.style.fontWeight = 'bold';
      }
      
      yellContainer.appendChild(yellElement);
    });
    
    // カード要素の最初の子要素として追加（ホロメンカードより後ろに）
    cardElement.insertBefore(yellContainer, cardElement.firstChild);
  }

  /**
   * カードが表向きで表示されるべきかチェック
   */
  shouldCardBeFaceUp(card, areaId) {
    if (!card) return false;
    
    // 推しホロメンは常に表向き
    if (card.card_type === '推しホロメン') {
      return true;
    }
    
    // 表向きで表示すべきエリア
    const faceUpAreas = ['collab', 'center', 'backs', 'back1', 'back2', 'back3', 'back4', 'back5', 'archive'];
    return faceUpAreas.includes(areaId);
  }

  /**
   * カード数を取得
   */
  getCardCount(player, areaId) {
    // State Managerからの構造に対応
    const cards = player.cards || player;
    
    switch (areaId) {
      case 'life': return cards.life?.length || 0;
      case 'collab': return cards.collab ? 1 : 0;
      case 'center': return cards.center ? 1 : 0;
      case 'oshi': return cards.oshi ? 1 : 0;
      case 'holo': return cards.holoPower?.length || 0;
      case 'deck': return cards.deck?.length || 0;
      case 'yell-deck': return cards.yellDeck?.length || 0;
      case 'backs': return (cards.back1 ? 1 : 0) + (cards.back2 ? 1 : 0) + (cards.back3 ? 1 : 0) + (cards.back4 ? 1 : 0) + (cards.back5 ? 1 : 0);
      case 'archive': return cards.archive?.length || 0;
      default: return 0;
    }
  }

  /**
   * カードカウンターの更新
   */
  updateCardCounter(area, count) {
    let counter = area.querySelector('.card-counter');
    
    if (count > 1) { // 2枚以上の時のみカウンター表示
      if (!counter) {
        counter = document.createElement('div');
        counter.className = 'card-counter';
        area.appendChild(counter);
      }
      counter.textContent = count;
    } else if (counter) {
      counter.remove();
    }
  }

  /**
   * 個別カードの表示を即座に更新
   * @param {Object} card - カードオブジェクト
   * @param {string} position - カードの位置
   * @param {number} playerId - プレイヤーID
   */
  updateCardDisplay(card, position, playerId) {
    if (!card || !position || !playerId) return;
    
    
    // バックポジションの場合の特別処理
    if (position.startsWith('back')) {
      this.updateBackCardDisplay(card, position, playerId);
      return;
    }
    
    // コラボポジションの場合の特別処理
    if (position === 'collab') {
      this.updateCollabCardDisplay(card, playerId);
      return;
    }
    
    // その他のエリアの処理（必要に応じて追加）
  }

  /**
   * コラボエリアの個別カード表示を更新
   * @param {Object} card - カードオブジェクト
   * @param {number} playerId - プレイヤーID
   */
  updateCollabCardDisplay(card, playerId) {
    const sectionClass = playerId === 1 ? '.battle-player' : '.battle-opponent';
    const collabArea = document.querySelector(`${sectionClass} .collab`);
    
    if (!collabArea) {
      console.warn(`🔄 [Card Display] コラボエリアが見つかりません (player ${playerId})`);
      return;
    }
    
    // 既存のカード要素を取得
    const existingCardElement = collabArea.querySelector('.card');
    if (!existingCardElement) {
      console.warn(`🔄 [Card Display] コラボエリアにカード要素が見つかりません`);
      // 要素がない場合は全体更新に委ねる
      this.updateCardAreas();
      return;
    }
    
    // お休み状態のクラス管理
    if (card.isResting || card.cardState?.resting) {
      existingCardElement.classList.add('resting');
    } else {
      existingCardElement.classList.remove('resting');
    }
    
    // カード画像の更新
    if (card.image_url) {
      existingCardElement.style.backgroundImage = `url(${card.image_url})`;
      existingCardElement.style.backgroundSize = 'cover';
      existingCardElement.style.backgroundPosition = 'center';
      existingCardElement.style.backgroundRepeat = 'no-repeat';
    }
    
    // data属性の更新
    existingCardElement.setAttribute('data-card-name', card.name || '不明なカード');
    existingCardElement.setAttribute('data-card-id', card.id);
    
    // 強制的にレンダリングを再実行
    existingCardElement.style.display = 'none';
    existingCardElement.offsetHeight; // リフロー強制
    existingCardElement.style.display = '';
    
  }

  /**
   * バックエリアの個別カード表示を更新
   * @param {Object} card - カードオブジェクト
   * @param {string} position - カードの位置（back1, back2など）
   * @param {number} playerId - プレイヤーID
   */
  updateBackCardDisplay(card, position, playerId) {
    const sectionClass = playerId === 1 ? '.battle-player' : '.battle-opponent';
    const slotIndex = parseInt(position.replace('back', '')) - 1; // back1 -> 0, back2 -> 1...
    
    // 該当するバックスロットを取得
    const backSlots = document.querySelectorAll(`${sectionClass} .back-slot`);
    if (!backSlots[slotIndex]) {
      console.warn(`🔄 [Card Display] バックスロット${slotIndex + 1}が見つかりません`);
      return;
    }
    
    const slot = backSlots[slotIndex];
    
    // 既存のカード要素を取得
    const existingCardElement = slot.querySelector('.card');
    if (!existingCardElement) {
      console.warn(`🔄 [Card Display] バックスロット${slotIndex + 1}にカード要素が見つかりません`);
      // 要素がない場合は全体更新に委ねる
      this.updateBackSlots(playerId === 1 ? 'player' : 'cpu');
      return;
    }
    
    // お休み状態のクラス管理（直接CSSクラスを制御）
    if (card.isResting || card.cardState?.resting) {
      existingCardElement.classList.add('resting');
    } else {
      existingCardElement.classList.remove('resting');
    }
    
    // カード画像の更新
    const cardImg = existingCardElement.querySelector('img');
    if (cardImg && card.image_url) {
      cardImg.src = card.image_url;
      cardImg.alt = card.name;
    }
    
    // カード名の更新
    const cardName = existingCardElement.querySelector('.card-name');
    if (cardName) {
      cardName.textContent = card.name;
    }
    
        // 強制的にレンダリングを再実行
    existingCardElement.style.display = 'none';
    existingCardElement.offsetHeight; // リフロー強制
    existingCardElement.style.display = '';
    
  }

  /**
   * 効果発動ボタンを必要に応じて追加
   */
  addEffectButtonIfNeeded(cardElement, card, areaId, isPlayerCard) {
    
    // プレイヤーのカードのみ
    if (!isPlayerCard) {
      return;
    }
    
    // アーカイブエリアのカードには効果ボタンを表示しない
    if (areaId === 'archive') {
      return;
    }
    
    // フェーズ判定
    const currentPhase = this.battleEngine.gameState?.currentPhase;
    const gameState = this.battleEngine.gameState;
    
    // メインステップでのみ効果ボタンを表示（文字列と数値の両方に対応）
    if (currentPhase !== 3 && currentPhase !== 'main') {
      return;
    }
    
    
    // 効果発動可能なエリアを定義（archiveは明示的に除外）
    const validAreas = ['hand', 'center', 'collab', 'back1', 'back2', 'back3', 'back4', 'back5', 'backs', 'oshi'];
    if (!validAreas.includes(areaId)) {
      return;
    }
    
    // エリア別の効果発動可能性チェック
    if (areaId === 'hand') {
      // 手札：サポートカードのみ効果発動可能
      const isSupport = card.card_type?.includes('サポート');
      
      if (!isSupport) {
        return;
      }
      
      // 装備可能なサポートカード（ファン・ツール・マスコット）にドラッグ機能を追加
      const isEquippableSupport = card.card_type?.includes('ファン') || 
                                  card.card_type?.includes('ツール') || 
                                  card.card_type?.includes('マスコット');
      
      if (isEquippableSupport) {
        this.addSupportCardDragAndDrop(cardElement, card);
      }
    } else if (['center', 'collab', 'backs', 'back1', 'back2', 'back3', 'back4', 'back5'].includes(areaId)) {
      // フィールド：ホロメンカードの効果発動可能
      const isHolomen = card.card_type?.includes('ホロメン');
      if (!isHolomen) {
        return;
      }
      
      // ホロメンカードにサポートカードのドロップターゲット機能を追加
      if (isPlayerCard) {
        this.addSupportCardDropTarget(cardElement, card, areaId);
      }
    } else if (areaId === 'oshi') {
      // 推しホロメン：カードは常に表示、効果ボタンのみ条件チェック
      
      // 推しスキル発動可能性をチェック（ボタン表示用）
      let canActivateSkill = false;
      if (this.battleEngine.cardInteractionManager && this.battleEngine.cardInteractionManager.canActivateOshiSkill) {
        canActivateSkill = this.battleEngine.cardInteractionManager.canActivateOshiSkill(card, 'oshi');
      }
      
      // 推しスキルが発動できない場合でも、カードは表示し続ける
      // 効果ボタンのみ表示しない
    } else if (['life', 'holo', 'archive'].includes(areaId)) {
      // その他のエリア：通常は効果発動不可だが、特定の効果があれば可能
    }
    
    // デバッグ用：特定のカードは強制的にボタンを表示
    const isTestCard = card.id === 'hSD01-016' || card.number === 'hSD01-016';
    
    // 追加デバッグ：通常の手動効果を持つカードも強制表示（一時的）
    const hasManualTiming = window.cardEffects?.[card.id]?.effects && 
      Object.values(window.cardEffects[card.id].effects).some(effect => 
        effect.timing === 'manual' || effect.timing === 'activate' || effect.timing === 'gift'
      );
    
    
    // カードに効果があるか確認（またはテストカード）
    const hasEffect = this.cardHasActivatableEffect(card, areaId) || isTestCard;
    
    if (!hasEffect) {
      return;
    }
    
    
    // 既存の効果ボタンを削除（重複防止）
    const existingButtons = cardElement.querySelectorAll('.card-effect-button');
    existingButtons.forEach(button => {
      button.remove();
    });
    
    const effectButton = document.createElement('div');
    effectButton.className = 'card-effect-button';
    
    // 推しホロメンの場合は推しスキルの発動可能性に応じてボタンスタイルを変更
    if (areaId === 'oshi' && card.card_type?.includes('推しホロメン')) {
      let canActivateSkill = false;
      if (this.battleEngine.cardInteractionManager && this.battleEngine.cardInteractionManager.canActivateOshiSkill) {
        canActivateSkill = this.battleEngine.cardInteractionManager.canActivateOshiSkill(card, 'oshi');
      }
      
      if (canActivateSkill) {
        effectButton.textContent = '推しスキル';
        effectButton.classList.add('oshi-skill-active');
      } else {
        effectButton.textContent = '推しスキル';
        effectButton.classList.add('oshi-skill-inactive');
        effectButton.style.opacity = '0.5';
        effectButton.style.cursor = 'not-allowed';
      }
    } else {
      // 通常のカード効果ボタン
      const isLimited = this.isLimitedSupport(card);
      if (isLimited) {
        effectButton.classList.add('limited');
        effectButton.textContent = 'LIMITED効果';
      } else {
        effectButton.textContent = '効果発動';
      }
    }
    
    // ボタンクリックイベント
    effectButton.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // 推しホロメンで発動不可の場合はクリックを無効化
      if (areaId === 'oshi' && effectButton.classList.contains('oshi-skill-inactive')) {
        return;
      }
      
      this.activateCardEffect(card, areaId);
    });
    
    cardElement.appendChild(effectButton);
  }

  /**
   * カードに発動可能な効果があるかチェック
   */
  cardHasActivatableEffect(card, areaId) {
    // デバッグログ追加
    
    // 推しホロメンの場合は特別扱い（常に効果があるとみなす）
    if (areaId === 'oshi' && card.card_type?.includes('推しホロメン')) {
      return true;
    }
    
    // 装備カードの場合の特別処理
    if (card.card_type?.includes('ファン') || card.card_type?.includes('マスコット') || card.card_type?.includes('ツール')) {
      // 手札にある装備カードは効果発動可能
      if (areaId === 'hand') {
        return true;
      }
      
      // 装備エリアにある装備カードは個別効果をチェック
      if (areaId === 'equipment' || areaId.includes('equipment')) {
        const cardId = card.id || card.card_id;
        if (window.cardEffects && window.cardEffects[cardId]) {
          const cardEffect = window.cardEffects[cardId];
          return cardEffect.effects && cardEffect.effects.supportEffect;
        }
        return false;
      }
    }
    
    // カード効果定義をチェック
    if (!window.cardEffects || !window.cardEffects[card.id]) {
      return false;
    }
    
    const cardEffect = window.cardEffects[card.id];
    
    // 新形式の効果定義をチェック
    if (cardEffect.effects) {
      const manualEffects = Object.values(cardEffect.effects).filter(effect => {
        
        // 自動効果を除外（timing: 'on_collab', 'arts', 'on_bloom' 等 または auto_trigger プロパティあり）
        const automaticTimings = ['on_collab', 'arts', 'on_bloom', 'on_center', 'on_stage'];
        const isAutomatic = automaticTimings.includes(effect.timing) || effect.auto_trigger;
        
        // Snow flower と うぅ… は強制的に自動効果として扱う
        const isSnowFlowerOrUuu = effect.name === 'Snow flower' || effect.name === 'うぅ…';
        
        // 手動発動可能な効果のみをチェック（manual、gift、activate）
        const isManual = !isAutomatic && !isSnowFlowerOrUuu && (effect.timing === 'manual' || effect.timing === 'activate' || effect.timing === 'gift');
        
        // 自動効果の場合は手動発動ボタンを表示しない（この効果をフィルタリング）
        if (isAutomatic || effect.auto_trigger || isSnowFlowerOrUuu) {
          return false; // この効果のみを除外
        }
        
        let conditionMet = true;
        
        // conditionが定義されている場合のみチェック
        if (effect.condition && typeof effect.condition === 'function') {
          try {
            const result = effect.condition(card, this.battleEngine.gameState, this.battleEngine);
            // undefinedやnullの場合はtrueとして扱う
            conditionMet = result !== false;
          } catch (error) {
            console.warn(`🔶 [効果チェック] 条件関数エラー: ${effect.name}`, error);
            conditionMet = false;
          }
        } else if (effect.condition === undefined) {
          // 条件が未定義の場合は常に発動可能とみなす
          conditionMet = true;
        }
        
        return isManual && conditionMet;
      });
      return manualEffects.length > 0;
    }
    
    return false;
  }

  /**
   * サポートカードがLIMITED効果を持つかチェック
   */
  isLimitedSupport(card) {
    // カード効果定義をチェック
    if (!window.cardEffects || !window.cardEffects[card.id]) {
      return false;
    }
    
    const cardEffect = window.cardEffects[card.id];
    
    // 効果にLIMITEDが含まれるかチェック
    if (cardEffect.effects) {
      return Object.values(cardEffect.effects).some(effect => 
        effect.timing === 'manual' && 
        (effect.name?.includes('LIMITED') || effect.description?.includes('LIMITED'))
      );
    }
    
    return false;
  }

  /**
   * カード効果を発動
   */
  async activateCardEffect(card, areaId) {
    console.log(`🎯 [効果発動] 開始: ${card.name || card.id}, エリア: ${areaId}`);
    
    if (!this.battleEngine.cardInteractionManager) {
      console.warn('🚨 [効果発動] CardInteractionManager not available');
      alert('カードインタラクションシステムが初期化されていません');
      return;
    }
    
    console.log(`✅ [効果発動] CardInteractionManager確認OK`);

    // LIMITED使用前チェック（早期ブロック）
    try {
      const cim = this.battleEngine.cardInteractionManager;
      const isLimitedCard = cim && typeof cim.isLimitedCard === 'function' ? cim.isLimitedCard(card) : card.card_type?.includes('LIMITED');
      if (isLimitedCard) {
        const stateManager = this.battleEngine.stateManager;
        if (stateManager && typeof stateManager.canUseLimitedNow === 'function') {
          const check = stateManager.canUseLimitedNow(this.battleEngine.gameState.currentPlayer);
          if (!check.canUse) {
            if (check.reason === 'first_player_first_turn') {
              alert('先行1ターン目はLIMITEDカードの効果を使用できません');
            } else if (check.reason === 'already_used_this_turn') {
              alert('このターンには既にLIMITED効果を使用しています');
            } else {
              alert('LIMITEDカードの効果を現在使用できません');
            }
            return;
          }
        }
      }
    } catch (e) {
      console.warn('LIMITED事前チェック中にエラー:', e);
    }
    
    try {
      // 推しホロメンの場合は専用処理
      if (areaId === 'oshi' && card.card_type?.includes('推しホロメン')) {
        await this.battleEngine.cardInteractionManager.activateOshiHolomenEffect(card, areaId);
      } else {
        console.log(`🔄 [効果発動] 一般カード効果呼び出し中...`);
        await this.battleEngine.cardInteractionManager.activateCardEffect(card, areaId);
      }
      console.log(`✅ [効果発動] 効果発動完了`);
    } catch (error) {
      console.error('🚨 [効果発動] Effect activation error:', error);
      alert('効果の発動中にエラーが発生しました: ' + error.message);
    }
  }

  /**
   * カードにHP表示を追加
   * @param {Element} cardElement - カード要素
   * @param {Object} card - カード情報
   * @param {boolean} isPlayerCard - プレイヤーカードかどうか
   */
  addHPDisplay(cardElement, card, isPlayerCard = true) {
    // 既存のHP表示があれば削除
    const existingHP = cardElement.querySelector('.hp-display');
    if (existingHP) {
      existingHP.remove();
    }

    const playerId = isPlayerCard ? 1 : 2;
    const stateManager = this.battleEngine.stateManager;
    
    if (!stateManager) {
      console.warn('StateManager not found for HP display');
      return;
    }

    const maxHP = stateManager.getMaxHP(card);
    const currentHP = stateManager.getCurrentHP(card, playerId);

    console.log(`🩹 [HP表示] ${card.name}: ${currentHP}/${maxHP} (プレイヤー${playerId})`);

    // HP表示要素を作成
    const hpDisplay = document.createElement('div');
    hpDisplay.className = 'hp-display';
    
    // HP値によって色を変更
    let hpClass = 'hp-full';
    const hpPercentage = currentHP / maxHP;
    if (hpPercentage <= 0.25) {
      hpClass = 'hp-critical';
    } else if (hpPercentage <= 0.5) {
      hpClass = 'hp-low';
    } else if (hpPercentage <= 0.75) {
      hpClass = 'hp-medium';
    }

    hpDisplay.classList.add(hpClass);
    hpDisplay.innerHTML = `
      <div class="hp-bar">
        <div class="hp-fill" style="width: ${(currentHP / maxHP) * 100}%"></div>
        <div class="hp-text">${currentHP}/${maxHP}</div>
      </div>
    `;

    // カード要素に追加
    cardElement.appendChild(hpDisplay);
    
    // ダメージ処理のイベントリスナーを追加
    hpDisplay.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showDamageDialog(card, playerId);
    });
  }

  /**
   * ダメージ入力ダイアログを表示
   * @param {Object} card - カード情報
   * @param {number} playerId - プレイヤーID
   */
  showDamageDialog(card, playerId) {
    const stateManager = this.battleEngine.stateManager;
    const currentHP = stateManager.getCurrentHP(card, playerId);
    const maxHP = stateManager.getMaxHP(card);

    const damage = prompt(`${card.name}にダメージを与える\n現在のHP: ${currentHP}/${maxHP}\n\nダメージ量を入力してください（負の値で回復）:`);
    
    if (damage === null) return; // キャンセル
    
    const damageAmount = parseInt(damage);
    if (isNaN(damageAmount)) {
      alert('有効な数値を入力してください');
      return;
    }

    if (damageAmount > 0) {
      // ダメージを与える
      const result = stateManager.dealDamage(card, playerId, damageAmount);
      if (result.success) {
        console.log(`💥 ${card.name}に${damageAmount}ダメージ: ${result.previousHP} → ${result.currentHP}`);
        if (result.isKnockOut) {
          alert(`${card.name}は気絶しました！`);
        }
      }
    } else if (damageAmount < 0) {
      // 回復
      const healAmount = Math.abs(damageAmount);
      const result = stateManager.healCard(card, playerId, healAmount);
      if (result.success) {
        console.log(`💚 ${card.name}を${result.healAmount}回復: ${result.previousHP} → ${result.currentHP}`);
      }
    }

    // HP表示を即座に更新
    this.updateCardHPDisplay(card, playerId);
    
    // 少し遅延させて全体更新も実行
    setTimeout(() => {
      this.updateCardAreas();
    }, 100);
  }

  /**
   * 特定のカードのHP表示を更新
   * @param {Object} card - カード情報
   * @param {number} playerId - プレイヤーID
   */
  updateCardHPDisplay(card, playerId) {
    const cardElement = document.querySelector(`[data-card-id="${card.id}"]`);
    if (cardElement) {
      this.addHPDisplay(cardElement, card, playerId === 1);
    }
  }

  /**
   * サポートカードにドラッグ機能を追加
   * @param {HTMLElement} cardElement - カード要素
   * @param {Object} card - カード情報
   */
  addSupportCardDragAndDrop(cardElement, card) {
    cardElement.draggable = true;
    cardElement.style.cursor = 'grab';
    
    cardElement.addEventListener('dragstart', (e) => {
      cardElement.style.cursor = 'grabbing';
      e.dataTransfer.setData('application/json', JSON.stringify({
        type: 'support-equipment',
        card: card,
        sourceElement: cardElement
      }));
      
      // ドラッグ中にホロメンをハイライト
      this.highlightEquipmentTargets();
    });
    
    cardElement.addEventListener('dragend', (e) => {
      cardElement.style.cursor = 'grab';
      this.clearEquipmentTargetHighlight();
    });
  }

  /**
   * ホロメンカードにサポートカードのドロップターゲット機能を追加
   * @param {HTMLElement} cardElement - カード要素
   * @param {Object} card - カード情報
   * @param {string} areaId - エリアID
   */
  addSupportCardDropTarget(cardElement, card, areaId) {
    cardElement.addEventListener('dragover', (e) => {
      e.preventDefault();
      const dragData = this.getDragData(e);
      if (dragData?.type === 'support-equipment') {
        cardElement.classList.add('equipment-drop-target');
      }
    });
    
    cardElement.addEventListener('dragleave', (e) => {
      cardElement.classList.remove('equipment-drop-target');
    });
    
    cardElement.addEventListener('drop', (e) => {
      e.preventDefault();
      cardElement.classList.remove('equipment-drop-target');
      
      const dragData = this.getDragData(e);
      if (dragData?.type === 'support-equipment') {
        this.handleSupportCardDrop(dragData.card, card);
      }
    });
  }

  /**
   * ドラッグ中のデータを取得
   * @param {Event} e - ドラッグイベント
   * @returns {Object|null} ドラッグデータ
   */
  getDragData(e) {
    try {
      return JSON.parse(e.dataTransfer.getData('application/json'));
    } catch {
      return null;
    }
  }

  /**
   * 装備可能なホロメンをハイライト
   */
  highlightEquipmentTargets() {
    // フィールドのホロメンカードのみをハイライト（推しホロメンは除外）
    const fieldAreas = ['.center', '.collab', '.back-slot'];
    
    fieldAreas.forEach(areaSelector => {
      const holomenElements = document.querySelectorAll(`.battle-player ${areaSelector} .card[data-card-type*="ホロメン"]`);
      holomenElements.forEach(element => {
        element.classList.add('equipment-potential-target');
      });
    });
  }

  /**
   * 装備ターゲットのハイライトをクリア
   */
  clearEquipmentTargetHighlight() {
    document.querySelectorAll('.equipment-potential-target').forEach(element => {
      element.classList.remove('equipment-potential-target');
    });
    document.querySelectorAll('.equipment-drop-target').forEach(element => {
      element.classList.remove('equipment-drop-target');
    });
  }

  /**
   * サポートカードのドロップ処理
   * @param {Object} supportCard - サポートカード
   * @param {Object} targetHolomem - 装備対象ホロメン
   */
  handleSupportCardDrop(supportCard, targetHolomem) {
    // 推しホロメンへの装備を明示的にブロック
    if (targetHolomem.card_type === '推しホロメン') {
      alert('推しホロメンにはサポートカードを装備できません');
      return;
    }
    
    // HandManagerの装備確認モーダルを使用
    if (this.battleEngine.handManager) {
      // 手札からカードのインデックスを取得
      const handIndex = this.battleEngine.players[1].hand.findIndex(card => card.id === supportCard.id);
      if (handIndex === -1) {
        alert('手札にカードが見つかりません');
        return;
      }
      
      // 装備確認モーダルを表示
      this.battleEngine.handManager.showEquipmentConfirmation(targetHolomem, supportCard, handIndex);
    }
  }

  /**
   * 装備されたカードの表示を追加（エールカード風表示）
   * @param {HTMLElement} holomenElement - ホロメンカード要素
   * @param {Object} holomenCard - ホロメンカード情報
   */
  addEquippedCardsDisplay(holomenElement, holomenCard) {
    // 既存の装備表示をクリア
    const existingEquipment = holomenElement.querySelector('.equipped-cards');
    if (existingEquipment) {
      existingEquipment.remove();
    }

    // 装備データが存在するかチェック
    if (!holomenCard.equipment) {
      return;
    }

    // 装備されているカードがあるかチェック
    const allEquipment = [
      ...(holomenCard.equipment.fans || []),
      ...(holomenCard.equipment.mascots || []),
      ...(holomenCard.equipment.tools || [])
    ];

    if (allEquipment.length === 0) {
      return;
    }

    // 装備カード表示コンテナを作成（ホロメンカードの背景レイヤーに配置）
    const equipmentContainer = document.createElement('div');
    equipmentContainer.className = 'equipped-cards';
    
    // エリア内での絶対配置（ホロメンカードより後ろに配置）
    equipmentContainer.style.position = 'absolute';
    equipmentContainer.style.top = '0';
    equipmentContainer.style.left = '0';
    equipmentContainer.style.width = '100%';
    equipmentContainer.style.height = '100%';
    equipmentContainer.style.zIndex = '1'; // ホロメンカード（z-index:100）より後ろ
    equipmentContainer.style.pointerEvents = 'auto';

    // 装備されているカードを表示順序でソート
    allEquipment.sort((a, b) => this.getEquipmentDisplayOrder(a) - this.getEquipmentDisplayOrder(b));

    // 各装備カードを表示（エールカード風の重なり表示）
    allEquipment.forEach((equipment, index) => {
      const equipCard = equipment.card;
      if (!equipCard) return;

      const equipElement = document.createElement('div');
      equipElement.className = 'equipped-card';
      equipElement.title = `装備: ${equipCard.name}`;
      
      // 装備カード用のdata属性を設定
      equipElement.setAttribute('data-card-id', equipCard.id || '');
      equipElement.setAttribute('data-card-name', equipCard.name || '装備カード');
      equipElement.setAttribute('data-card-type', equipCard.card_type || '装備カード');
      equipElement.setAttribute('data-equipment-category', equipment.category);
      
      // エールカードと同じサイズに統一
      equipElement.style.position = 'absolute';
      equipElement.style.width = '120px';
      equipElement.style.height = '168px';
      equipElement.style.border = '2px solid #333';
      equipElement.style.borderRadius = '8px';
      equipElement.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      equipElement.style.cursor = 'pointer';
      
      // 装備タイプ別の境界線色
      const borderColor = this.getEquipmentTypeColor(equipment.category);
      equipElement.style.borderColor = borderColor;
      
      // 装備カードの配置（ホロメンカードの左側に重ねて表示）
      const offsetX = -25 - (index * 15); // 左にずらして重ねる
      const offsetY = 5 + (index * 8); // 少し下にずらして重ねる
      equipElement.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(0.8)`;
      equipElement.style.zIndex = `${5 + index}`; // 装備カード同士での重なり順序（ホロメンより低い値）

      // 装備カードの画像を設定
      if (equipCard.image_url) {
        equipElement.style.backgroundImage = `url(${equipCard.image_url})`;
        equipElement.style.backgroundSize = 'cover';
        equipElement.style.backgroundPosition = 'center';
        equipElement.style.backgroundRepeat = 'no-repeat';
      } else {
        // 画像がない場合はタイプ別のカラーとアイコンを表示
        const bgColor = this.getEquipmentTypeColor(equipment.category);
        equipElement.style.backgroundColor = bgColor;
        equipElement.style.display = 'flex';
        equipElement.style.alignItems = 'center';
        equipElement.style.justifyContent = 'center';
        equipElement.style.fontSize = '24px';
        equipElement.style.color = 'white';
        equipElement.style.fontWeight = 'bold';
        equipElement.textContent = this.getEquipmentTypeIcon(equipment.category);
      }

      // ホバー効果（装備カードが一時的に前面に出るが、ホロメンカードは越えない）
      equipElement.addEventListener('mouseenter', () => {
        equipElement.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(1.0)`;
        equipElement.style.zIndex = '50'; // ホロメンカード（100）より低い値
        
        // ツールチップ表示
        this.showEquipmentTooltip(equipElement, equipCard);
      });

      equipElement.addEventListener('mouseleave', () => {
        equipElement.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(0.8)`;
        equipElement.style.zIndex = `${5 + index}`; // 元のz-indexに戻す
        
        // ツールチップ削除
        this.hideEquipmentTooltip();
      });

      // 装備カードクリック時の詳細表示
      equipElement.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.battleEngine.cardInteractionManager) {
          this.battleEngine.cardInteractionManager.showCardInfo(equipCard, 'equipment');
        }
      });

      equipmentContainer.appendChild(equipElement);
    });

    // ホロメンカードの親要素に追加（エールカードと同じ方式）
    holomenElement.appendChild(equipmentContainer);
  }

  /**
   * 装備カードの表示順序を取得
   * @param {Object} equipment - 装備データ
   * @returns {number} 表示順序
   */
  getEquipmentDisplayOrder(equipment) {
    switch (equipment.category) {
      case 'fans': return 1;
      case 'mascots': return 2;
      case 'tools': return 3;
      default: return 4;
    }
  }

  /**
   * 装備タイプ別のカラーを取得
   * @param {string} category - 装備カテゴリ
   * @returns {string} カラーコード
   */
  getEquipmentTypeColor(category) {
    switch (category) {
      case 'fans': return '#ff6b6b';
      case 'mascots': return '#4ecdc4';
      case 'tools': return '#45b7d1';
      default: return '#95a5a6';
    }
  }

  /**
   * 装備タイプ別のアイコンを取得
   * @param {string} category - 装備カテゴリ
   * @returns {string} アイコン文字
   */
  getEquipmentTypeIcon(category) {
    switch (category) {
      case 'fans': return '♥';
      case 'mascots': return '🧸';
      case 'tools': return '🔧';
      default: return '?';
    }
  }

  /**
   * 装備カードのツールチップを表示
   * @param {HTMLElement} element - 装備カード要素
   * @param {Object} equipCard - 装備カード情報
   */
  showEquipmentTooltip(element, equipCard) {
    // 既存のツールチップを削除
    this.hideEquipmentTooltip();

    const tooltip = document.createElement('div');
    tooltip.className = 'equipment-tooltip';
    tooltip.innerHTML = `
      <div class="tooltip-content">
        <strong>${equipCard.name}</strong><br>
        <small>${equipCard.card_type}</small>
      </div>
    `;
    
    tooltip.style.cssText = `
      position: fixed;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 8px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
      pointer-events: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      max-width: 200px;
    `;

    document.body.appendChild(tooltip);

    // 位置を調整
    const rect = element.getBoundingClientRect();
    tooltip.style.left = `${rect.right + 5}px`;
    tooltip.style.top = `${rect.top}px`;

    // ツールチップの参照を保存
    this._currentTooltip = tooltip;
  }

  /**
   * 装備カードのツールチップを非表示
   */
  hideEquipmentTooltip() {
    if (this._currentTooltip) {
      this._currentTooltip.remove();
      this._currentTooltip = null;
    }
  }
}

// グローバルスコープに公開
window.CardDisplayManager = CardDisplayManager;
