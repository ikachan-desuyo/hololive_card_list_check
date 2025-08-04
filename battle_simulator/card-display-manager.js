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
      console.log(`🔄 [Card Display] updateCardAreas開始`);
      
      // プレイヤーとCPUの両方のエリアを更新
      [1, 2].forEach(playerId => {
        console.log(`🔄 [Card Display] プレイヤー${playerId}の更新開始`);
        // Battle Engineから直接プレイヤーデータを取得
        const player = this.battleEngine.players[playerId];
        if (!player) {
          console.warn(`updateCardAreas: プレイヤー${playerId}の状態が見つかりません`);
          return;
        }
        
        console.log(`🔄 [Card Display] プレイヤー${playerId}データ:`, player);
        
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
          if (!area) return;
          
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
      if (!area) return;
      
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
            // console.log(`🎨 コラボポジションにカード表示: ${cards.name}`);
            cardsToDisplay = [cards];
          }
          displayType = 'single';
          break;
        case 'center':
          if (cards) {
            console.log(`🎨 センターポジションにカード表示: ${cards.name}`, cards);
            console.log(`🎨 センター画像URL: ${cards.image_url}`);
            console.log(`🎨 センターカード状態:`, cards.cardState);
            if (!cards.cardState) {
              console.warn(`⚠️ センターカードに状態情報がありません:`, cards);
            }
            cardsToDisplay = [cards];
          } else {
            console.log('🎨 センターポジションにカードなし');
          }
          displayType = 'single';
          break;
      case 'oshi':
        if (cards) cardsToDisplay = [cards];
        displayType = 'single';
        break;
      case 'holo':
        cardsToDisplay = cards || [];
        displayType = 'spread';
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
        // プレイヤー1のカードのみドラッグ可能
        const isPlayerCard = (actualPlayerId === 1);
        const cardElement = this.createCardElement(card, areaId, index, isPlayerCard);
        area.appendChild(cardElement);
        
        // エールカードがある場合は追加
        if (card.yellCards && card.yellCards.length > 0) {
          // console.log(`🎨 [エール表示] ${card.name}: ${card.yellCards.length}枚のエールカードを表示`);
          this.addYellCardsToArea(area, card, areaId, index);
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
    
    // 横向き状態の判定
    if (card && card.isResting) {
      cardElement.classList.add('resting');
    }
    
    // ホロパワーエリアのカードに回転クラスを追加
    if (areaId === 'holo') {
      cardElement.classList.add('holo-power-card');
    }
    
    const shouldShowFaceUp = this.shouldCardBeFaceUp(card, areaId);
    
    if (shouldShowFaceUp && card) {
      cardElement.classList.remove('face-down');
      cardElement.classList.add('face-up');
      
      console.log(`🎨 [Card Element] 表向きカード作成: ${card.name}, 画像URL: ${card.image_url}`);
      
      // カード画像の設定
      if (card.image_url) {
        cardElement.style.backgroundImage = `url(${card.image_url})`;
        cardElement.style.backgroundSize = 'cover';
        cardElement.style.backgroundPosition = 'center';
        cardElement.style.backgroundRepeat = 'no-repeat';
        console.log(`🎨 [Card Element] 画像設定完了: ${card.image_url}`);
      } else {
        console.log(`⚠️ [Card Element] 画像URLなし: ${card.name}`);
        // 画像がない場合はカード内容を表示
        cardElement.innerHTML = `
          <div class="card-content">
            <div class="card-name">${card.name || 'Unknown'}</div>
            <div class="card-type">${card.card_type || ''}</div>
          </div>
        `;
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
    
    // カードクリック処理の追加
    if (areaId !== 'deck' && areaId !== 'yell-deck') {
      const clickHandler = (e) => {
        if (typeof this.battleEngine.showCardModal === 'function') {
          this.battleEngine.showCardModal(card);
        } else {
          console.log('カード情報:', card);
        }
        e.stopPropagation();
      };
      
      cardElement.addEventListener('click', clickHandler);
      // ハンドラーを要素に保存（後でremoveEventListenerするため）
      cardElement._clickHandler = clickHandler;
    }
    
    // 配置済みカードのドラッグ機能を追加（プレイヤー1のセンター、バックのホロメンカードのみ）
    if (shouldShowFaceUp && card && isPlayerCard && 
        this.battleEngine.isHolomenCard && this.battleEngine.isHolomenCard(card) && 
        (areaId === 'collab' || areaId === 'center' || areaId === 'backs')) {
      cardElement.draggable = true;
      cardElement.setAttribute('data-card-id', card.id);
      cardElement.setAttribute('data-area-id', areaId);
      cardElement.setAttribute('data-area-index', cardIndex);
      
      console.log(`[DEBUG] ドラッグ要素設定: ${card.name} in ${areaId}`, { 
        card, 
        areaId, 
        cardIndex, 
        shouldShowFaceUp, 
        isPlayerCard,
        isHolomenCard: this.battleEngine.isHolomenCard(card),
        draggable: cardElement.draggable
      });
      
      // バックスロットの場合は、スロットインデックスも設定
      if (areaId === 'backs') {
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
      // ドラッグが設定されなかった理由をログ出力
      if (card && (areaId === 'collab' || areaId === 'center' || areaId === 'backs')) {
        console.log(`[DEBUG] ドラッグ設定されず: ${card.name} in ${areaId}`, {
          shouldShowFaceUp,
          isPlayerCard,
          isHolomenCard: this.battleEngine.isHolomenCard ? this.battleEngine.isHolomenCard(card) : 'メソッドなし',
          reason: !shouldShowFaceUp ? 'shouldShowFaceUp=false' :
                  !isPlayerCard ? 'isPlayerCard=false' :
                  !this.battleEngine.isHolomenCard ? 'isHolomenCardメソッドなし' :
                  !this.battleEngine.isHolomenCard(card) ? 'ホロメンカードではない' : '不明'
        });
      }
    }
    
    // 表示タイプによる位置調整
    this.applyDisplayTypeStyles(cardElement, areaId, cardIndex);
    
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
        // ホロパワーの展開表示（CSSのrotate(90deg)を維持）
        cardElement.style.position = 'relative';
        cardElement.style.display = 'inline-block';
        cardElement.style.margin = '2px';
        // transform: rotate(90deg) はCSSで設定済みなので、ここでは上書きしない
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
    
    console.log(`updateBackSlots: プレイヤー${playerId}の状態`, { player, collab: player.collab });
    
    // センター①があるかどうかで最大使用スロット数を決定
    const maxSlots = player.collab ? 4 : 5;
    
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
        console.log(`🎨 バックスロット${index + 1}にカード表示: ${card.name}`);
        console.log(`🎨 バック画像URL: ${card.image_url}`);
        console.log(`🎨 バックカード状態:`, card.cardState);
        console.log(`🎨 カードレベル: ${card.bloom_level || 'レベル不明'}`);
        console.log(`🎨 エール枚数: ${card.yellCards?.length || 0}枚`);
        if (card.cardState?.bloomedThisTurn) {
          console.log(`🌸 このターンにブルームしたカード: ${card.name}`);
        }
        if (!card.cardState) {
          console.warn(`⚠️ バックカード${index + 1}に状態情報がありません:`, card);
        }
        const isPlayerCard = (playerId === 1); // プレイヤー1のカードのみドラッグ可能
        const cardElement = this.createCardElement(card, 'backs', index, isPlayerCard);
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
        if (card.yellCards && card.yellCards.length > 0) {
          this.addYellCardsToArea(slot, card, 'backs', index);
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
    // すべてのハイライトを削除
    document.querySelectorAll('.phase-highlight').forEach(el => {
      el.classList.remove('phase-highlight');
    });
    
    // 現在のフェーズに応じてハイライト
    const phase = this.battleEngine.gameState.currentPhase;
    let highlightSelector = '';
    
    switch (phase) {
      case 'reset':
        highlightSelector = '#reset-phase';
        break;
      case 'draw':
        highlightSelector = '#draw-phase';
        break;
      case 'cheer':
        highlightSelector = '#cheer-phase';
        break;
      case 'main':
        highlightSelector = '#main-phase';
        break;
      case 'performance':
        highlightSelector = '#performance-phase';
        break;
    }
    
    if (highlightSelector) {
      const element = document.querySelector(highlightSelector);
      if (element) {
        element.classList.add('phase-highlight');
      }
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
    
    // センターかバックかで配置を変える
    if (areaId === 'collab' || areaId === 'center') {
      yellContainer.classList.add('center');
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
      
      // センターとバックで異なる重なり方（ホロメンカードから少しずらす）
      if (areaId === 'collab' || areaId === 'center') {
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
        const offsetY = -20 - (index * 8); // 上により大きくはみ出し
        yellElement.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(1)`;
        yellElement.style.zIndex = `${5 + index}`; // 通常時は後ろに、ホバー時はCSSで250に
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
    if (areaId === 'collab' || areaId === 'center') {
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
      if (areaId === 'collab' || areaId === 'center') {
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
        const offsetY = -20 - (index * 8); // 上により大きくはみ出し
        yellElement.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(1)`;
        yellElement.style.zIndex = `${5 + index}`; // 通常時は後ろに、ホバー時はCSSで250に
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
    const faceUpAreas = ['collab', 'center', 'backs', 'archive'];
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
}

// グローバルスコープに公開
window.CardDisplayManager = CardDisplayManager;
