/**
 * 手札管理マネージャー
 * 手札の表示・更新・ドラッグ&ドロップ処理・カードプレイ処理・カード位置交換を管理する
 */

class HandManager {
  constructor(battleEngine) {
    this.battleEngine = battleEngine;
    this.handArea = null;
    // 重複アラート防止機能
    this.lastAlertTime = {};
    this.alertCooldown = 1000; // 1秒間のクールダウン
    
    // 装備モード状態
    this.equipmentMode = { active: false };
    
    // グローバル参照を設定（モーダルから呼び出すため）
    window.handManager = this;
  }

  /**
   * 重複防止付きアラート表示
   * @param {string} message - 表示メッセージ
   * @param {string} key - 重複チェック用のキー
   */
  showAlert(message, key = 'default') {
    const now = Date.now();
    if (!this.lastAlertTime[key] || now - this.lastAlertTime[key] > this.alertCooldown) {
      this.lastAlertTime[key] = now;
      alert(message);
    }
  }

  // 手札エリアの初期化
  setupHandArea() {
    // CSSで定義されている.hand-areaクラスを使用
    let handArea = document.querySelector('.hand-area');
    
    if (!handArea) {
      // 手札エリアが存在しない場合は動的作成
      handArea = document.createElement('div');
      handArea.className = 'hand-area';
      
      // プレイヤーエリアの下に配置
      const playerArea = document.querySelector('.battle-player');
      if (playerArea) {
        playerArea.appendChild(handArea);
      } else {
        document.body.appendChild(handArea);
      }
    }
    
    this.handArea = handArea;
    window.debugLog('手札エリア初期化完了');
  }

  // 手札表示の更新
  updateHandDisplay() {
    try {
      // .hand-areaクラスの要素を取得
      let handArea = document.querySelector('.hand-area');
      
      if (!handArea) {
        window.errorLog('手札エリアが見つかりません');
        this.setupHandArea(); // 手札エリアを作成
        handArea = this.handArea;
      }
      
      const player = this.battleEngine.players[1]; // プレイヤーの手札のみ表示
      
      // 既存のイベントリスナーを削除してからクリア
      this.cleanupHandEventListeners(handArea);
      
      // 既存の手札を完全にクリア
      handArea.innerHTML = '';
      
      // 手札が存在する場合のみ表示
      if (player.hand && Array.isArray(player.hand)) {
        console.log(`🎴 [手札表示] 手札カード数: ${player.hand.length}`);
        player.hand.forEach((card, index) => {
          console.log(`🎴 [手札表示] ${index}: ${card.name} (${card.id})`);
          const cardElement = this.createHandCardElement(card, index);
          handArea.appendChild(cardElement);
        });
      }
    } catch (error) {
      window.errorLog('手札表示更新中にエラーが発生しました:', error);
    }
  }

  // イベントリスナーのクリーンアップ
  cleanupHandEventListeners(handArea) {
    try {
      const existingCards = handArea.querySelectorAll('.hand-card');
      existingCards.forEach(cardElement => {
        // クローンして古いイベントリスナーを削除
        const newElement = cardElement.cloneNode(true);
        cardElement.parentNode.replaceChild(newElement, cardElement);
      });
    } catch (error) {
      window.errorLog('イベントリスナークリーンアップ中にエラー:', error);
    }
  }

  // 手札カード要素の作成
  createHandCardElement(card, index) {
    const cardElement = document.createElement('div');
    cardElement.className = 'hand-card';
    
    // 画像URLの確認とフォールバック
    const imageUrl = card.image_url || 'images/placeholder.png';
    cardElement.style.backgroundImage = `url(${imageUrl})`;
    cardElement.style.backgroundSize = 'cover';
    cardElement.style.backgroundPosition = 'center';
    cardElement.style.backgroundRepeat = 'no-repeat';
    
    cardElement.title = card.name || 'カード';
    cardElement.setAttribute('data-card-id', card.id || index);
    cardElement.setAttribute('data-card-index', index);
    
    // 情報パネル用のdata属性を設定
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
    
    // イベントハンドラーを保存（removeEventListenerで使用）
    const dragStartHandler = (e) => this.handleHandCardDragStart(e, card, index);
    const dragEndHandler = (e) => this.handleHandCardDragEnd(e);
    const clickHandler = () => this.handleHandCardClick(card, index);
    
    // ドラッグ機能を追加
    cardElement.draggable = true;
    cardElement.addEventListener('dragstart', dragStartHandler);
    cardElement.addEventListener('dragend', dragEndHandler);
    
    // クリックイベント
    cardElement.addEventListener('click', clickHandler);
    
    // ハンドラーを要素に保存（後でremoveEventListenerするため）
    cardElement._dragStartHandler = dragStartHandler;
    cardElement._dragEndHandler = dragEndHandler;
    cardElement._clickHandler = clickHandler;
    
    // 効果ボタンを追加（CardDisplayManagerを使用）
    if (this.battleEngine.cardDisplayManager) {
      this.battleEngine.cardDisplayManager.addEffectButtonIfNeeded(cardElement, card, 'hand', true);
    }
    
    return cardElement;
  }

  // 手札カードのクリック処理
  handleHandCardClick(card, index) {
    // まずinfo-panelにカード詳細を表示
    if (this.battleEngine.cardInteractionManager) {
      this.battleEngine.cardInteractionManager.showCardInfo(card, 'hand');
    }
    
    // メインステップでのみカードをプレイ可能（従来の処理も残す）
    if (this.battleEngine.gameState.currentPhase === 3) {
      // プレイ処理は一旦コメントアウト（詳細表示を優先）
      // this.battleEngine.playCard(card, index);
    } else {
      window.debugLog('メインステップでのみカードをプレイできます');
    }
  }

  // 手札からのドラッグ開始処理
  handleHandCardDragStart(e, card, index) {
    // ドラッグ中のカードデータを保存
    this.battleEngine.draggedCard = {
      card: card,
      index: index,
      source: 'hand'
    };
    
    // StateManagerにドラッグ状態を通知
    if (this.battleEngine.stateManager) {
      this.battleEngine.stateManager.setDragState(true, card, 'hand');
    }
    
    // ドラッグエフェクトを追加
    e.target.classList.add('dragging');
    
    // サポートカードの場合は専用エリアを表示
    if (this.battleEngine.isSupportCard(card)) {
      this.battleEngine.showSupportDropZone();
    }
    
    // 有効なドロップゾーンをハイライト
    this.battleEngine.highlightValidDropZones(card);
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({
      cardId: card.id,
      cardIndex: index,
      source: 'hand'
    }));
  }

  // 手札からのドラッグ終了処理
  handleHandCardDragEnd(e) {
    // ドラッグエフェクトを削除
    e.target.classList.remove('dragging');
    
    // サポートエリアを非表示
    this.battleEngine.hideSupportDropZone();
    
    // ハイライトを削除
    this.battleEngine.clearDropZoneHighlights();
    
    // StateManagerのドラッグ状態をクリア
    if (this.battleEngine.stateManager) {
      this.battleEngine.stateManager.setDragState(false, null, null);
    }
    
    // ドラッグ状態をクリア
    this.battleEngine.draggedCard = null;
  }

  // カードプレイ処理
  playCard(card, handIndex) {
    const player = this.battleEngine.players[this.battleEngine.gameState.currentPlayer];
    
    // カードプレイのログ
    if (window.logCardEvent) {
      const playerType = this.battleEngine.gameState.currentPlayer === 1 ? 'player' : 'opponent';
      const cardName = card.name || '不明なカード';
      window.logCardEvent(playerType, 'プレイ', cardName);
    }
    
    if (card.card_type === 'ホロメン') {
      this.playHolomenCard(card, handIndex);
    } else if (card.card_type.includes('サポート')) {
      this.playSupportCard(card, handIndex);
    }
  }

  // ホロメンカード配置処理
  playHolomenCard(card, handIndex) {
    const currentPhase = this.battleEngine.gameState.currentPhase;
    
    // メインステップでのカード配置（制限なし）
    if (currentPhase === 3) {
      return this.placeHolomenCardMainStep(card, handIndex);
    }
    
    // Debut配置フェーズでの配置
    if (this.battleEngine.gameState.debutPlacementPhase) {
      return this.placeHolomenCardDebut(card, handIndex);
    }
    
    window.debugLog('現在のフェーズではホロメンカードを配置できません');
  }

  // メインステップでのホロメンカード配置（6枚制限あり）
  placeHolomenCardMainStep(card, handIndex) {
    const player = this.battleEngine.players[this.battleEngine.gameState.currentPlayer];
    const cardCopy = this.createCardCopy(card);
    
    // 6枚フィールド制限チェック
    if (this.battleEngine.placementController) {
      const fieldCount = this.battleEngine.placementController.countFieldCards(this.battleEngine.gameState.currentPlayer);
      if (fieldCount >= 6) {
        window.debugLog(`配置不可: フィールドには最大6枚のホロメンまで配置できます（現在${fieldCount}枚）`);
        return;
      }
    }
    
    // 空きスロットを順番に探す（優先順位：コラボ > センター > バック）
    const availableSlots = this.findAvailableSlots(player);
    
    if (availableSlots.length === 0) {
      return;
    }

    // 最初に見つかった空きスロットに配置
    const targetSlot = availableSlots[0];
    
    // ステートマネージャーを使用して配置と履歴管理
    if (this.battleEngine.stateManager) {
      // 配置の妥当性チェック
      const validation = this.battleEngine.stateManager.checkDropValidity(
        cardCopy, 
        targetSlot, 
        this.battleEngine.gameState.currentPlayer
      );
      
      if (!validation.valid) {
        window.debugLog(`配置不可: ${validation.reason}`);
        return;
      }
      
      // ブルーム追跡機能付きで配置
      this.battleEngine.stateManager.placeCardWithBloomTracking(
        this.battleEngine.gameState.currentPlayer,
        cardCopy,
        targetSlot
      );
    } else {
      // フォールバック：直接配置
      player[targetSlot] = cardCopy;
    }
    
    // 手札から除去
    player.hand.splice(handIndex, 1);
    
    this.battleEngine.updateUI();
  }

  // Debut配置フェーズでの配置
  placeHolomenCardDebut(card, handIndex) {
    const player = this.battleEngine.players[this.battleEngine.gameState.currentPlayer];
    
    // 6枚フィールド制限チェック
    if (this.battleEngine.placementController) {
      const fieldCount = this.battleEngine.placementController.countFieldCards(this.battleEngine.gameState.currentPlayer);
      if (fieldCount >= 6) {
        window.debugLog(`配置不可: フィールドには最大6枚のホロメンまで配置できます（現在${fieldCount}枚）`);
        return;
      }
    }
    
    // カードのディープコピーを作成
    const cardCopy = this.createCardCopy(card);
    
    // 空いているステージポジションを探す
    if (!player.collab) {
      player.collab = cardCopy;
      player.hand.splice(handIndex, 1);
    } else if (!player.center) {
      player.center = cardCopy;
      player.hand.splice(handIndex, 1);
    } else if (!player.back1) {
      player.back1 = cardCopy;
      player.hand.splice(handIndex, 1);
    } else if (!player.back2) {
      player.back2 = cardCopy;
      player.hand.splice(handIndex, 1);
    } else if (!player.back3) {
      player.back3 = cardCopy;
      player.hand.splice(handIndex, 1);
    } else {
      return;
    }
    
    this.battleEngine.updateUI();
  }

  // 利用可能なスロットを見つける
  findAvailableSlots(player) {
    const slots = [];
    
    // コラボスロット
    if (!player.collab) {
      // コラボ配置の条件チェック
      const hasRestingBackCard = this.hasNonRestingBackCard(player);
      if (hasRestingBackCard) {
        slots.push('collab');
      }
    }
    
    // センタースロット
    if (!player.center) {
      slots.push('center');
    }
    
    // バックスロット
    for (let i = 1; i <= 5; i++) {
      const slotName = `back${i}`;
      if (!player[slotName]) {
        slots.push(slotName);
      }
    }
    
    return slots;
  }

  // お休みしていないバックカードがあるかチェック
  hasNonRestingBackCard(player) {
    for (let i = 1; i <= 5; i++) {
      const backCard = player[`back${i}`];
      if (backCard && !backCard.resting) {
        return true;
      }
    }
    return false;
  }

  // サポートカード使用処理
  playSupportCard(card, handIndex) {
    console.log(`🚨 [DEBUG] playSupportCard呼び出し: ${card.name}, handIndex: ${handIndex}`);
    console.trace('playSupportCard call stack');
    
    const player = this.battleEngine.players[this.battleEngine.gameState.currentPlayer];
    
    // LIMITED制限チェック（統一管理関数を使用）
    if (card.card_type.includes('LIMITED')) {
      if (this.battleEngine.cardInteractionManager) {
        const canUse = this.battleEngine.cardInteractionManager.canUseLimitedEffect(card, 'hand');
        if (!canUse) {
          window.debugLog('LIMITED制限により使用できません');
          return;
        }
      } else {
        // フォールバック（旧来の方式）
        if (player.usedLimitedThisTurn) {
          window.debugLog('このターンには既にLIMITEDカードを使用しています');
          return;
        }
        player.usedLimitedThisTurn = true;
      }
    }
    
    // サポート効果の実行（簡易版）
    window.debugLog(`${card.name}を使用しました`);
    
    // 手札から除去してアーカイブへ
    console.log(`🚨 [DEBUG] カードを手札から除去: ${card.name}`);
    player.hand.splice(handIndex, 1);
    player.archive.push(card);
    
    this.battleEngine.updateUI();
  }

  // カードオブジェクトのディープコピーを作成
  createCardCopy(card) {
    if (!card) return null;
    
    // カードオブジェクトのディープコピーを作成
    const cardCopy = JSON.parse(JSON.stringify(card));
    
    // エールカードリストを保持（既存のものがあれば維持、なければ初期化）
    if (!cardCopy.yellCards) {
      cardCopy.yellCards = [];
    }
    
    // 回転状態などの状態情報を保持
    if (card.isResting) {
      cardCopy.isResting = card.isResting;
    }
    
    // HPの初期化（ホロメンカードの場合）
    if (card.hp && !cardCopy.current_hp) {
      cardCopy.current_hp = card.hp;
    }
    
    return cardCopy;
  }

  // サポートカード判定
  isSupportCard(card) {
    return card.card_type && card.card_type.includes('サポート');
  }

  /**
   * フィールドのホロメンカードを取得
   * @returns {Array} フィールド上のホロメンカードの配列
   */
  getFieldHolomens() {
    const fieldHolomens = [];
    
    try {
      // フィールド上のホロメンカード要素を直接取得（推しエリアを除外）
      const holomenElements = document.querySelectorAll('.battle-player .center .card[data-card-type*="ホロメン"], .battle-player .collab .card[data-card-type*="ホロメン"], .battle-player .back-slot .card[data-card-type*="ホロメン"]');
      
      holomenElements.forEach((element, index) => {
        const cardId = element.dataset.cardId;
        const cardName = element.dataset.cardName;
        const cardType = element.dataset.cardType;
        
        if (cardId && cardName) {
          // ポジションを特定（フィールドホロメンのみ：center, collab, back）
          let position = 'unknown';
          const parentElement = element.closest('.center, .collab, .back-slot');
          
          if (parentElement) {
            if (parentElement.classList.contains('center')) {
              position = 'center';
            } else if (parentElement.classList.contains('collab')) {
              position = 'collab';
            } else if (parentElement.classList.contains('back-slot')) {
              const slotIndex = parentElement.dataset.slot;
              if (slotIndex !== undefined) {
                position = `back${parseInt(slotIndex) + 1}`;
              }
            }
          }
          
          // プレイヤー判定（プレイヤー1のカードのみ対象）
          const isPlayer1Card = element.closest('.battle-player') !== null;
          const isPlayer2Card = element.closest('.battle-cpu') !== null;
          
          console.log(`🔍 ポジション特定:`, position, 'プレイヤー判定:', isPlayer1Card ? 'P1' : isPlayer2Card ? 'P2' : '不明');
          
          // プレイヤー1のカードで、かつフィールドポジション（推し以外）の場合のみ追加
          if (isPlayer1Card && position !== 'unknown' && position !== 'oshi') {
            const holomenData = {
              id: cardId,
              card_id: cardId,
              name: cardName,
              card_type: cardType,
              position: position,
              equipment: { fans: [], tools: [], mascots: [] } // 初期装備データ
            };
            
            fieldHolomens.push(holomenData);
            console.log(`✅ ホロメン追加:`, holomenData.name, holomenData.position);
          } else {
            console.log(`❌ スキップ:`, cardName, `(${position}, ${isPlayer1Card ? 'P1' : isPlayer2Card ? 'P2' : '不明'})`);
          }
        }
      });
      
      if (fieldHolomens.length === 0) {
        console.warn('⚠️ DOM要素からホロメンが見つかりませんでした');
        // 代替: センター・コラボエリアから直接検索
        const centerElement = document.querySelector('.battle-player .center .card');
        const collabElement = document.querySelector('.battle-player .collab .card');
        
        if (centerElement) {
          const cardId = centerElement.dataset.cardId;
          const cardName = centerElement.dataset.cardName;
          if (cardId && cardName) {
            fieldHolomens.push({
              id: cardId,
              card_id: cardId,
              name: cardName,
              position: 'center',
              equipment: { fans: [], tools: [], mascots: [] }
            });
            console.log('✅ センター要素から追加:', cardName);
          }
        }
        
        if (collabElement) {
          const cardId = collabElement.dataset.cardId;
          const cardName = collabElement.dataset.cardName;
          if (cardId && cardName) {
            fieldHolomens.push({
              id: cardId,
              card_id: cardId,
              name: cardName,
              position: 'collab',
              equipment: { fans: [], tools: [], mascots: [] }
            });
            console.log('✅ コラボ要素から追加:', cardName);
          }
        }
        
        // バックスロットも確認
        for (let i = 0; i < 5; i++) {
          const backElement = document.querySelector(`.battle-player .back-slot[data-slot="${i}"] .card`);
          if (backElement) {
            const cardId = backElement.dataset.cardId;
            const cardName = backElement.dataset.cardName;
            if (cardId && cardName) {
              fieldHolomens.push({
                id: cardId,
                card_id: cardId,
                name: cardName,
                position: `back${i + 1}`,
                equipment: { fans: [], tools: [], mascots: [] }
              });
              console.log(`✅ バック${i + 1}要素から追加:`, cardName);
            }
          }
        }
      }
      
    } catch (e) {
      console.error('DOM要素取得エラー:', e);
    }
    
    console.log('フィールドホロメン取得結果:', fieldHolomens.map(h => `${h.name}(${h.position})`));
    console.log('=== getFieldHolomens 終了 ===');
    return fieldHolomens;
  }

  // サポートカード効果使用
  useSupportCard(card, handIndex) {
    console.log('HandManager.useSupportCard 実行開始:', card.name, 'インデックス:', handIndex);
    
    // サポートカードのタイプを判定
    const cardType = card.card_type || '';
    
    // 装備可能なサポートカード（ファン、ツール、マスコット）の場合
    if (cardType.includes('ファン') || cardType.includes('ツール') || cardType.includes('マスコット')) {
      console.log('装備可能なカード:', cardType);
      
      // 装備可能なホロメンを取得（正しいパス）
      const fieldHolomens = this.getFieldHolomens();
      
      if (fieldHolomens.length === 0) {
        console.log('フィールドにホロメンが存在しない');
        this.showAlert('フィールドにホロメンがいません。');
        return false;
      }
      
      console.log('フィールドのホロメン数:', fieldHolomens.length);
      console.log('装備ダイアログ表示処理開始');
      
      this.showSupportCardEquipmentDialog(card, handIndex, fieldHolomens);
    } else {
      console.log('通常のサポートカード処理:', cardType);
      // その他のサポートカード（スタッフなど）の場合は従来の処理
      const useCard = confirm(`「${card.name}」の効果を使用しますか？`);
      
      if (useCard) {
        // 手札から削除
        this.battleEngine.players[1].hand.splice(handIndex, 1);
        
        // アーカイブに移動
        this.battleEngine.players[1].archive.push(card);
        
        // カード効果の実行（効果管理システムを使用）
        if (this.battleEngine.cardEffectManager) {
          this.battleEngine.cardEffectManager.executeCardEffect(card, 'support');
        } else {
          alert(`${card.name}の効果を発動しました！`);
        }
        
        // UI更新
        this.updateHandDisplay();
        this.battleEngine.updateUI();
      }
    }
  }

  /**
   * サポートカード装備モードを開始
   * @param {Object} card - 装備するサポートカード
   * @param {number} handIndex - 手札でのインデックス
   * @param {Array} fieldHolomens - 装備可能なホロメン一覧（オプション）
   */
  showSupportCardEquipmentDialog(card, handIndex, fieldHolomens = null) {
    console.log('装備ダイアログ表示:', card.name);
    
    // fieldHolomensが渡されていない場合は取得
    if (!fieldHolomens) {
      fieldHolomens = this.getFieldHolomens(); // プレイヤー1のホロメン
    }
    
    console.log('取得したホロメン数:', fieldHolomens.length);
    
    if (fieldHolomens.length === 0) {
      this.showAlert('装備可能なホロメンがフィールドにいません');
      return;
    }
    
    // 装備モードを開始（ホロメンをハイライト表示）
    this.startEquipmentMode(card, handIndex, fieldHolomens);
  }

  /**
   * 装備モードを開始（ホロメンをハイライト表示）
   * @param {Object} card - 装備するサポートカード
   * @param {number} handIndex - 手札でのインデックス
   * @param {Array} fieldHolomens - 装備可能なホロメン一覧
   */
  startEquipmentMode(card, handIndex, fieldHolomens) {
    console.log('装備モード開始:', card.name);
    console.log('装備対象ホロメン数:', fieldHolomens.length, fieldHolomens.map(h => h.name));
    
    // 既存の装備モードをクリア
    this.clearEquipmentMode();
    
    // 装備モード状態を保存
    this.equipmentMode = {
      active: true,
      card: card,
      handIndex: handIndex,
      targetHolomens: fieldHolomens
    };
    
    // ホロメンカードをハイライト表示
    fieldHolomens.forEach((holomem, index) => {
      console.log(`ホロメン${index + 1}をハイライト:`, holomem.name);
      this.highlightHolomenForEquipment(holomem);
    });
    
    // 装備モード案内を表示
    this.showEquipmentModeUI(card);
    
    // ESCキーで装備モードをキャンセル
    this.setupEquipmentModeKeyListener();
    
    console.log('装備モード設定完了。ホロメンをクリックしてください。');
  }

  /**
   * ホロメンカードを装備可能としてハイライト
   * @param {Object} holomem - ハイライトするホロメン
   */
  highlightHolomenForEquipment(holomem) {
    console.log('ハイライト処理開始 - ホロメン:', holomem.name);
    
    // ホロメンの位置を特定
    const position = this.findHolomenPosition(holomem);
    if (!position) {
      console.error('ホロメンの位置が見つからない:', holomem.name);
      return;
    }
    
    console.log('ホロメンの位置:', position);
    
    // カード要素を取得
    const cardElement = this.getCardElementByPosition(position);
    if (!cardElement) {
      console.error('カード要素が見つからない:', position);
      return;
    }
    
    console.log('カード要素取得成功:', cardElement);
    
    // ハイライト用のクラスを追加
    cardElement.classList.add('equipment-target');
    console.log('equipment-targetクラス追加完了');
    
    // クリックイベントを追加
    const clickHandler = (e) => {
      console.log('ホロメンクリック検出:', holomem.name);
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation(); // 他のクリックハンドラーの実行も停止
      this.showEquipmentConfirmationClick(holomem);
    };
    
    cardElement.addEventListener('click', clickHandler, true); // キャプチャーフェーズで実行
    cardElement._equipmentClickHandler = clickHandler; // 後で削除するために保存
    
    console.log('クリックハンドラー追加完了');
  }

  /**
   * 装備確認モーダルを表示（クリック用）
   * @param {Object} targetHolomem - 装備対象のホロメン
   */
  showEquipmentConfirmationClick(targetHolomem) {
    console.log('装備確認モーダル表示:', targetHolomem.name);
    
    const { card, handIndex } = this.equipmentMode;
    
    if (!card) {
      console.error('装備モードのカード情報が見つからない');
      return;
    }
    
    console.log('装備予定カード:', card.name);
    
    // 装備制限をチェック
    const canEquip = this.checkEquipmentRestrictions(card, targetHolomem);
    
    if (!canEquip.success) {
      console.log('装備制限エラー:', canEquip.reason);
      this.showAlert(canEquip.reason);
      return;
    }
    
    console.log('装備制限チェック通過');
    
    // 確認モーダルを表示
    const modal = this.createEquipmentConfirmationModal(card, targetHolomem, handIndex);
    document.body.appendChild(modal);
    
    console.log('装備確認モーダル表示完了');
  }

  /**
   * 装備確認モーダルを表示（ドラッグ&ドロップ用）
   * @param {Object} targetHolomem - 装備対象のホロメン
   * @param {Object} card - サポートカード
   * @param {number} handIndex - 手札インデックス
   */
  showEquipmentConfirmation(targetHolomem, card, handIndex) {
    // 装備制限をチェック
    const canEquip = this.checkEquipmentRestrictions(card, targetHolomem);
    
    if (!canEquip.success) {
      this.showAlert(canEquip.reason);
      return;
    }
    
    // 確認モーダルを表示
    const modal = this.createEquipmentConfirmationModal(card, targetHolomem, handIndex);
    document.body.appendChild(modal);
  }

  /**
   * 装備制限をチェック（実際の装備処理は行わない）
   * @param {Object} card - サポートカード
   * @param {Object} targetHolomem - 装備対象ホロメン
   * @returns {Object} チェック結果
   */
  checkEquipmentRestrictions(card, targetHolomem) {
    // カードタイプによる装備制限チェック
    const cardType = card.card_type || card.cardType || '';
    
    // 装備カテゴリの決定
    let equipCategory = null;
    let maxCount = 1; // デフォルトは1枚制限
    
    if (cardType.includes('ファン')) {
      equipCategory = 'fans';
      // 雪民は複数枚装備可能
      if (card.name?.includes('雪民')) {
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

    // 装備配列の初期化チェック
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
    if (card.name?.includes('雪民') && !targetHolomem.name?.includes('雪花ラミィ')) {
      return { 
        success: false, 
        reason: '雪民は雪花ラミィにのみ装備できます' 
      };
    }

    return { success: true, message: '装備可能です' };
  }

  /**
   * 装備確認モーダルを作成（改良版）
   * @param {Object} card - サポートカード
   * @param {Object} targetHolomem - 装備対象ホロメン
   * @param {number} handIndex - 手札インデックス
   * @returns {HTMLElement} モーダル要素
   */
  createEquipmentConfirmationModal(card, targetHolomem, handIndex) {
    const modal = document.createElement('div');
    modal.className = 'equipment-confirmation-modal';
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>サポートカード装備確認</h3>
          <button class="modal-close" onclick="this.closest('.equipment-confirmation-modal').remove(); window.handManager.clearEquipmentMode();">×</button>
        </div>
        <div class="modal-body">
          <div class="equipment-preview">
            <div class="support-card">
              <img src="${card.image_url || '/images/placeholder.png'}" alt="${card.name}" />
              <p><strong>${card.name}</strong></p>
              <p class="card-type">${card.card_type}</p>
            </div>
            <div class="arrow">→</div>
            <div class="target-holomem">
              <img src="${targetHolomem.image_url || '/images/placeholder.png'}" alt="${targetHolomem.name}" />
              <p><strong>${targetHolomem.name}</strong></p>
            </div>
          </div>
          <p class="confirmation-text">「${card.name}」を「${targetHolomem.name}」に装備しますか？</p>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" onclick="this.closest('.equipment-confirmation-modal').remove(); window.handManager.clearEquipmentMode();">キャンセル</button>
          <button class="btn-confirm" onclick="window.handManager.confirmEquipmentByModal('${targetHolomem.id}', '${card.id}', ${handIndex}); this.closest('.equipment-confirmation-modal').remove();">装備する</button>
        </div>
      </div>
    `;
    
    return modal;
  }

  /**
   * モーダルからの装備確定
   * @param {string} targetHolomenId - 装備対象ホロメンのID
   * @param {string} cardId - サポートカードのID
   * @param {number} handIndex - 手札インデックス
   */
  confirmEquipmentByModal(targetHolomenId, cardId, handIndex) {
    const card = this.battleEngine.players[1].hand[handIndex];
    const fieldHolomens = this.getFieldHolomens();
    const targetHolomem = fieldHolomens.find(h => h.id === targetHolomenId);
    
    if (!card || card.id !== cardId) {
      this.showAlert('カードが見つかりません');
      this.clearEquipmentMode();
      return;
    }
    
    if (!targetHolomem) {
      this.showAlert('装備対象が見つかりません');
      this.clearEquipmentMode();
      return;
    }
    
    // 実際の装備処理を実行
    this.equipSupportCard(card, handIndex, targetHolomem);
    this.clearEquipmentMode();
  }

  /**
   * 装備を確定
   * @param {string} targetHolomenId - 装備対象ホロメンのID
   */
  confirmEquipment(targetHolomenId) {
    const { card, handIndex, targetHolomens } = this.equipmentMode;
    const targetHolomem = targetHolomens.find(h => h.id === targetHolomenId);
    
    if (!targetHolomem) {
      this.showAlert('装備対象が見つかりません');
      this.clearEquipmentMode();
      return;
    }
    
    // 実際の装備処理を実行
    this.equipSupportCard(card, handIndex, targetHolomem);
    this.clearEquipmentMode();
  }

  /**
   * 装備モードをクリア
   */
  clearEquipmentMode() {
    if (!this.equipmentMode?.active) return;
    
    // ハイライトを削除
    document.querySelectorAll('.equipment-target').forEach(element => {
      element.classList.remove('equipment-target');
      
      // クリックハンドラーを削除
      if (element._equipmentClickHandler) {
        element.removeEventListener('click', element._equipmentClickHandler, true); // キャプチャーフェーズで削除
        delete element._equipmentClickHandler;
      }
    });
    
    // 装備モードUIを削除
    const modeUI = document.querySelector('.equipment-mode-ui');
    if (modeUI) modeUI.remove();
    
    // キーリスナーを削除
    if (this.equipmentModeKeyListener) {
      document.removeEventListener('keydown', this.equipmentModeKeyListener);
      delete this.equipmentModeKeyListener;
    }
    
    // 装備モード状態をクリア
    this.equipmentMode = { active: false };
  }

  /**
   * 装備モードUI案内を表示
   * @param {Object} card - 装備するサポートカード
   */
  showEquipmentModeUI(card) {
    const modeUI = document.createElement('div');
    modeUI.className = 'equipment-mode-ui';
    modeUI.innerHTML = `
      <div class="equipment-mode-message">
        <span class="card-name">「${card.name}」</span>を装備します
        <br>
        <small>装備先のホロメンをクリックしてください（ESCでキャンセル）</small>
      </div>
    `;
    
    // 適切な位置に表示（手札エリアの上など）
    const handArea = document.querySelector('.hand-area');
    if (handArea) {
      handArea.appendChild(modeUI);
    } else {
      document.body.appendChild(modeUI);
    }
  }

  /**
   * 装備モード用のキーリスナーを設定
   */
  setupEquipmentModeKeyListener() {
    this.equipmentModeKeyListener = (e) => {
      if (e.key === 'Escape') {
        this.clearEquipmentMode();
      }
    };
    
    document.addEventListener('keydown', this.equipmentModeKeyListener);
  }

  /**
   * ホロメンの位置を特定
   * @param {Object} holomem - ホロメンオブジェクト
   * @returns {string|null} ポジション文字列
   */
  findHolomenPosition(holomem) {
    // position プロパティがある場合はそれを使用
    if (holomem.position) {
      return holomem.position;
    }
    
    // fallback: State Manager から検索
    const player = this.battleEngine.players[1];
    
    if (player.center?.id === holomem.id) return 'center';
    if (player.collab?.id === holomem.id) return 'collab';
    
    for (let i = 1; i <= 5; i++) {
      if (player[`back${i}`]?.id === holomem.id) return `back${i}`;
    }
    
    return null;
  }

  /**
   * ポジションからカード要素を取得
   * @param {string} position - ポジション文字列
   * @returns {HTMLElement|null} カード要素
   */
  getCardElementByPosition(position) {
    const sectionClass = '.battle-player';
    
    if (position.startsWith('back')) {
      const backSlot = position.replace('back', '');
      const slotIndex = parseInt(backSlot) - 1;
      return document.querySelector(`${sectionClass} .backs .back-slot[data-slot="${slotIndex}"] .card`);
    } else {
      return document.querySelector(`${sectionClass} .${position} .card`);
    }
  }

  /**
   * サポートカードを装備
   * @param {Object} card - 装備するサポートカード
   * @param {number} handIndex - 手札でのインデックス
   * @param {Object} targetHolomem - 装備対象のホロメン
   */
  equipSupportCard(card, handIndex, targetHolomem) {
    // CardEffectUtilsを使用して装備
    const utils = new CardEffectUtils(this.battleEngine);
    const result = utils.attachSupportCard(1, targetHolomem, card);
    
    if (result.success) {
      // 手札から削除
      this.battleEngine.players[1].hand.splice(handIndex, 1);
      
      this.showAlert(`${card.name}を${targetHolomem.name}に装備しました！`, 'success');
      
      // フィールド上の実際のホロメンオブジェクトを更新
      this.updateFieldHolomenEquipment(targetHolomem);
      
      // UI更新を複数回実行して確実に反映
      this.updateHandDisplay();
      this.battleEngine.updateUI();
      this.battleEngine.cardDisplayManager.updateCardAreas();
      
      // 少し遅延してもう一度更新（装備データが確実に反映されるように）
      setTimeout(() => {
        this.battleEngine.cardDisplayManager.updateCardAreas();
      }, 100);
    } else {
      this.showAlert(`装備できませんでした: ${result.reason}`, 'error');
    }
  }

  /**
   * フィールド上のホロメンの装備データを確実に更新（個別管理対応）
   * @param {Object} targetHolomem - 装備対象のホロメン
   */
  updateFieldHolomenEquipment(targetHolomem) {
    // 個別カードの装備管理 - 各カードインスタンスを個別に更新
    
    // State Manager経由で個別更新
    if (this.battleEngine.stateManager) {
      // カードIDと位置を組み合わせた一意キーで管理
      const positions = ['center', 'collab', 'back1', 'back2', 'back3', 'back4', 'back5'];
      let updatedCount = 0;
      
      positions.forEach(pos => {
        const cardData = this.battleEngine.stateManager.getStateByPath(`players.1.cards.${pos}`);
        // 完全一致チェック：IDと位置の両方が一致する場合のみ更新
        if (cardData && cardData.id === targetHolomem.id && targetHolomem.position === pos) {
          // 装備データを深いコピーで更新（参照問題を回避）
          cardData.equipment = JSON.parse(JSON.stringify(targetHolomem.equipment));
          updatedCount++;
        }
      });
      
      // State Managerの更新アクションを実行
      this.battleEngine.stateManager.updateState('UPDATE_CARD_EQUIPMENT', {
        player: 1,
        cardId: targetHolomem.id,
        position: targetHolomem.position,
        equipment: targetHolomem.equipment
      });
      
    } else {
      console.error('🔧 State Manager が存在しません');
    }
    
    // プロキシシステムの個別更新
    try {
      if (this.battleEngine.players && this.battleEngine.players[1]) {
        const player = this.battleEngine.players[1];
        const targetPosition = targetHolomem.position;
        
        // 特定位置のカードのみを更新（同一カードの他インスタンスには影響しない）
        if (targetPosition && player[targetPosition] && player[targetPosition].id === targetHolomem.id) {
          player[targetPosition].equipment = JSON.parse(JSON.stringify(targetHolomem.equipment));
        }
      }
    } catch (e) {
      console.warn('🔧 プロキシ更新はスキップ:', e.message);
    }
  }

  /**
   * カード位置交換の処理
   * @param {Object} sourceCard - 移動元のカード
   * @param {string} sourcePosition - 移動元のポジション
   * @param {Object} targetCard - 移動先のカード（null可）
   * @param {string} targetPosition - 移動先のポジション
   * @param {number} playerId - プレイヤーID
   */
  swapCards(sourceCard, sourcePosition, targetCard, targetPosition, playerId = 1) {
    // 引数の検証
    if (!sourceCard || !sourceCard.name || !sourcePosition || !targetPosition) {
      window.errorLog('HAND MANAGER: カード交換に必要な引数が不足しています');
      alert('⚠️ エラー: カード交換に必要な情報が不足しています');
      return false;
    }
    
    // Placement Controllerで新しいルールをチェック
    const placementCheck = this.battleEngine.placementController.canSwapCards(
      sourceCard, sourcePosition, targetCard, targetPosition, playerId
    );
    
    if (!placementCheck.valid) {
      alert(`⚠️ カード交換不可\n\n${placementCheck.reason}`);
      return false;
    }
    
    // 特別なケースの判定
    const isBloom = targetCard && this.battleEngine.placementController.isBloomMove(sourceCard, targetCard);
    const isCollabMove = targetPosition === 'collab' && sourcePosition.startsWith('back');
    const isCollabToBackMove = sourcePosition === 'collab' && targetPosition.startsWith('back');
    
    // コラボからバックへの移動チェック（State Managerの機能を活用）
    if (isCollabToBackMove) {
      if (this.battleEngine.stateManager) {
        const fromCollabCheck = this.battleEngine.stateManager.canMoveFromCollab(sourceCard, playerId);
        
        if (!fromCollabCheck.valid) {
          alert(`⚠️ カード移動不可\n\n${fromCollabCheck.reason}`);
          return false;
        }
      }
    }
    
    // ブルーム移動かもう一度確認
    const isBloomFromState = this.battleEngine.stateManager && targetCard && 
                             this.battleEngine.stateManager.isBloom(sourceCard, targetCard);
    
    // 実際の交換処理
    const player = this.battleEngine.players[playerId];
    
    // コラボ移動の場合は専用処理を先に実行
    if (isCollabMove) {
      // State Managerでの移動可能性事前チェック
      if (this.battleEngine.stateManager) {
        // デバッグ: 現在の状態を詳しく確認
        const playerState = this.battleEngine.stateManager.state.players[playerId];
        const currentTurn = this.battleEngine.stateManager.state.turn.currentPlayer;
        const currentPhase = this.battleEngine.stateManager.state.turn.currentPhase;
        
        const collabCheck = this.battleEngine.stateManager.canMoveToCollab(sourceCard, playerId);
        
        if (!collabCheck.valid) {
          window.warnLog(`⚠️ コラボ移動拒否: ${collabCheck.reason}`);
          // デバッグ情報も含めたエラーメッセージ
          const debugInfo = `
              プレイヤー: ${playerId} (現在ターン: ${currentTurn})
              フェーズ: ${currentPhase}
              コラボフラグ: ${playerState.gameState.collabMovedThisTurn}
              理由: ${collabCheck.reason}`;
                        console.log('コラボ移動チェック詳細:', debugInfo);
          alert(`コラボ移動不可:\n${collabCheck.reason}`);
          return false;
        }
      }
      
      // 【公式ルール準拠】コラボ手順：
      // 1. 先にホロパワーカード配置を実行
      const holoPowerPlaced = this.placeHoloPowerFromDeck(playerId);
      
      if (!holoPowerPlaced) {
        // ホロパワー配置に失敗した場合、コラボ移動を中止
        window.errorLog('ホロパワー配置失敗のためコラボ移動を中止');
        return false;
      }
      
      // 2. 移動元カードのエール情報を保持（Battle Engineのplayerオブジェクトを使用）
      const battleEnginePlayer = this.battleEngine.players[playerId];
      let originalCard = battleEnginePlayer[sourcePosition];
      
      // カードが見つからない場合、sourceCardを代替として使用
      if (!originalCard && sourceCard) {
        window.warnLog(`⚠️ Battle Engineでカードが見つからないため、sourceCardを使用: ${sourceCard.name}`);
        originalCard = sourceCard;
      }
      
      if (!originalCard) {
        window.errorLog(`❌ コラボ移動エラー: ${sourcePosition}にカードがありません`);
        return false;
      }
      
      // yellCardsプロパティを確実に初期化
      if (!originalCard.yellCards || !Array.isArray(originalCard.yellCards)) {
        originalCard.yellCards = [];
      }
      
      window.debugLog(`🔄 コラボ移動: ${originalCard?.name} (エール: ${originalCard?.yellCards?.length || 0}枚)`);
      
      // 3. コラボ移動の記録（カード状態ベース）
      const updatedSourceCard = this.battleEngine.stateManager.recordCollabMove(sourceCard, playerId);
      
      // 4. エール情報を新しいカードに確実に引き継ぎ
      if (originalCard?.yellCards && Array.isArray(originalCard.yellCards)) {
        updatedSourceCard.yellCards = [...originalCard.yellCards];
        // コラボ移動: エール引継ぎ完了
      } else {
        // yellCardsが未初期化の場合は空配列を設定
        updatedSourceCard.yellCards = [];
      }
      
      // 5. コラボ移動実行（State Managerがコラボロックを自動設定）
      this.battleEngine.stateManager.updateState('SWAP_CARDS', {
        player: playerId,
        sourcePosition: sourcePosition,
        targetPosition: targetPosition
      });
      
      // 7. エール情報が確実に反映されるよう再度設定（SWAP_CARDS実行後）
      setTimeout(() => {
        const collabCard = battleEnginePlayer[targetPosition];
        if (collabCard) {
          // yellCardsプロパティを初期化
          if (!collabCard.yellCards || !Array.isArray(collabCard.yellCards)) {
            collabCard.yellCards = [];
          }
          
          if (originalCard?.yellCards?.length > 0) {
            // エール情報を確実に設定
            collabCard.yellCards = [...originalCard.yellCards];
            window.debugLog(`コラボ移動後エール再設定: ${collabCard.name} (エール: ${collabCard.yellCards.length}枚)`);
          }
        }
        
        // エール再設定の確実性を高める
        if (targetPosition === 'collab') {
          
          // State Managerにも反映
          if (this.battleEngine.stateManager.state.players[playerId].cards[targetPosition]) {
            // yellCardsの初期化を確認
            if (!originalCard.yellCards || !Array.isArray(originalCard.yellCards)) {
              originalCard.yellCards = [];
            }
            this.battleEngine.stateManager.state.players[playerId].cards[targetPosition].yellCards = [...originalCard.yellCards];
            // State Manager同期: エール情報設定完了
          }
        }
        
        // 🔒 コラボロック状態を確実に設定
        if (collabCard) {
          // シンプルな方法：直接設定のみ
          if (!collabCard.cardState) {
            collabCard.cardState = {};
          }
          collabCard.cardState.collabLocked = true;
          
          window.debugLog(`🔒 [シンプル設定] コラボロック状態設定: ${collabCard.name} (collabLocked: ${collabCard.cardState.collabLocked})`);
          
          // カード状態確認（デバッグ用コールバック）
          setTimeout(() => {
            const checkCard = battleEnginePlayer[targetPosition];
            // コラボロック状態確認完了
          }, 10);
        }
        
        // コラボ移動後のUI更新
        this.battleEngine.updateUI();
        
        // 🎯 コラボ効果の自動チェック - カードがコラボ位置に移動した後
        setTimeout(() => {
          this.checkAndTriggerCollabEffects(playerId, targetPosition);
        }, 100);
        
      }, 50);
      
      return true; // コラボ移動完了、以降の処理はスキップ
    }
    
    // State Managerで交換可能性をチェック（コラボ移動・コラボからの移動以外）
    if (!isCollabMove && !isCollabToBackMove) {
      const swapCheck = this.battleEngine.stateManager.checkSwapValidity(
        sourceCard, sourcePosition, targetCard, targetPosition, playerId
      );
      
      if (!swapCheck.valid) {
        alert(`⚠️ カード交換不可\n\n${swapCheck.reason}`);
        return false;
      }
    }
    
    // ブルームの場合は重ね置き処理を実行
    if (isBloom) {
      // 手札からカードを削除（手札からのブルームの場合のみ）
      if (sourcePosition === 'hand') {
        // より精密な検索：IDと名前の両方を確認し、完全一致するものを探す
        let handIndex = -1;
        for (let i = 0; i < player.hand.length; i++) {
          const handCard = player.hand[i];
          // IDが一致する場合を優先、IDがない場合は名前とbloom_levelで判定
          if (sourceCard.id && handCard.id === sourceCard.id) {
            handIndex = i;
            break;
          } else if (!sourceCard.id && handCard.name === sourceCard.name && 
                     handCard.bloom_level === sourceCard.bloom_level) {
            handIndex = i;
            break;
          }
        }
        
        if (handIndex !== -1) {
          const removedCard = player.hand.splice(handIndex, 1)[0];
          window.debugLog(`swapCards: 手札から削除: ${removedCard.name} (${removedCard.bloom_level}) インデックス: ${handIndex}`);
        } else {
          window.warnLog(`swapCards: 手札で対象カードが見つかりません:`, sourceCard);
        }
      }
      
      // PLACE_CARDで重ね置き実行
      const placeResult = this.battleEngine.stateManager.updateState('PLACE_CARD', {
        player: playerId,
        card: sourceCard,
        position: targetPosition
      });

      // ブルーム履歴の記録のみ（重ね置きはPLACE_CARDで実行済み）
      this.battleEngine.stateManager.addBloomHistory(playerId, targetPosition);
    } else {
      // 通常の交換処理（コラボ移動以外）- エール情報保持強化
      
      this.battleEngine.stateManager.updateState('SWAP_CARDS', {
        player: playerId,
        sourcePosition: sourcePosition,
        targetPosition: targetPosition
      });
      
      // エール情報保持の追加確認（通常交換でも適用）
      setTimeout(() => {
        const battleEnginePlayer = this.battleEngine.players[playerId];
        
        // 移動元のエール情報を移動先に確実に反映
        if (sourceCard?.yellCards?.length > 0) {
          const movedCard = battleEnginePlayer[targetPosition];
          if (movedCard && movedCard.name === sourceCard.name) {
            movedCard.yellCards = [...sourceCard.yellCards];
            // 通常交換後エール保持完了
          }
        }
        
        // 移動先のエール情報を移動元に確実に反映
        if (targetCard?.yellCards?.length > 0) {
          const movedCard = battleEnginePlayer[sourcePosition];
          if (movedCard && movedCard.name === targetCard.name) {
            movedCard.yellCards = [...targetCard.yellCards];
            // 通常交換後エール保持完了
          }
        }
        
        this.battleEngine.updateUI();
      }, 30);
    }

    // Debutカード配置の記録（カード状態ベース）
    if (sourceCard.bloom_level === 'Debut' && !targetCard) {
      const updatedSourceCard = this.battleEngine.stateManager.recordJustPlayedDebut(sourceCard, playerId);
      // 更新されたカードで状態を再設定
      player[targetPosition] = updatedSourceCard;
    }
    
    // UI更新（State Managerとの同期を確実にする）
    this.battleEngine.updateUI();
    
    // 追加の遅延更新でState Manager状態を確実に反映
    setTimeout(() => {
      this.battleEngine.updateUI();
    }, 50);
    
    return true;
  }

  /**
   * デッキからホロパワーカードを1枚配置（コラボ移動時の強制処理）
   * @param {number} playerId - プレイヤーID
   * @returns {boolean} 配置成功/失敗
   */
  placeHoloPowerFromDeck(playerId) {
    const player = this.battleEngine.players[playerId];
    
    // デッキからホロパワーカードを取得
    if (player.deck && player.deck.length > 0) {
      const holoPowerCard = player.deck.shift(); // デッキの先頭から取得
      
      // ホロパワーエリアに配置
      if (!player.holoPower) {
        player.holoPower = [];
      }
      player.holoPower.push(holoPowerCard);
      
      // UI更新
      this.battleEngine.updateUI();
      
      // アニメーション効果（オプション）
      this.showHoloPowerPlacementEffect(holoPowerCard);
      
      return true; // 配置成功
    } else {
      window.errorLog(`プレイヤー${playerId}のデッキが空です - ホロパワー配置失敗`);
      return false; // 配置失敗
    }
  }

  /**
   * ホロパワー配置エフェクトの表示
   * @param {Object} card - 配置されたカード
   */
  showHoloPowerPlacementEffect(card) {
    // 簡単な通知を表示
    const message = `ホロパワーカード配置: ${card.name}`;
    
    // 一時的な通知を表示
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      z-index: 1000;
      font-size: 14px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      animation: fadeInOut 3s ease-in-out;
    `;
    
    // CSS アニメーションを追加
    if (!document.querySelector('#holopower-animation-style')) {
      const style = document.createElement('style');
      style.id = 'holopower-animation-style';
      style.textContent = `
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateX(100%); }
          15% { opacity: 1; transform: translateX(0); }
          85% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(100%); }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // 3秒後に削除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  /**
   * ドラッグ&ドロップでの配置処理（交換対応版）
   * @param {Object} card - 配置するカード
   * @param {number} handIndex - 手札のインデックス
   * @param {Object} dropZone - ドロップ先情報
   */
  placeCardFromHandWithSwap(card, handIndex, dropZone) {
    const player = this.battleEngine.players[1];
    
    if (dropZone.type === 'support') {
      this.useSupportCard(card, handIndex);
      return;
    }
    
    // 移動先の現在のカード状況を確認
    let targetCard = null;
    let targetPosition = '';
    
    switch (dropZone.type) {
      case 'center':
        targetCard = player.center;
        targetPosition = 'center';
        break;
      case 'collab':
        targetCard = player.collab;
        targetPosition = 'collab';
        break;
      case 'back':
        const backPositions = ['back1', 'back2', 'back3', 'back4', 'back5'];
        targetPosition = backPositions[dropZone.index];
        targetCard = player[targetPosition];
        break;
      default:
        return;
    }

    // 6枚フィールド制限チェック（ホロメンカードで、空の位置への配置の場合のみ）
    if (card.card_type?.includes('ホロメン') && !targetCard) {
      if (this.battleEngine.placementController) {
        const fieldLimitCheck = this.battleEngine.placementController.checkFieldCardLimit(1, targetPosition, 'hand');
        if (!fieldLimitCheck.valid) {
          // アラート表示は battle_engine.js に委任
          return;
        }
      }
    }
    
    // ドロップ先にカードがある場合は交換処理またはブルーム処理
    if (targetCard) {
      // ブルーム判定: 同名カードかつレベル進化の場合
      const isBloom = this.battleEngine.stateManager.isBloom(card, targetCard);
      
      if (isBloom) {
        // ブルーム可能性をチェック
        const bloomCheck = this.battleEngine.stateManager.canBloom(card, targetCard, 1);
        
        if (!bloomCheck.valid) {
          this.showAlert(`⚠️ ブルーム不可\n\n${bloomCheck.reason}`, `bloom_failed_${targetPosition}`);
          return;
        }
        
        // ブルーム確認画面
        const confirmBloom = confirm(
          `🌸 ブルーム確認\n\n` +
          `${targetCard.name} (${targetCard.bloom_level})\n` +
          `↓ ブルーム ↓\n` +
          `${card.name} (${card.bloom_level})\n\n` +
          `ブルームを実行しますか？`
        );
        
        if (!confirmBloom) {
          return;
        }
        
        // ブルーム実行: PLACE_CARDアクションでスタック
        const cardCopy = JSON.parse(JSON.stringify(card));
        cardCopy.yells = cardCopy.yells || [];
        
        // 既存カードのエール情報を新しいカードに引き継ぎ
        if (targetCard && targetCard.yellCards && Array.isArray(targetCard.yellCards)) {
          cardCopy.yellCards = [...targetCard.yellCards];
          // エール引継ぎ完了
        }
        
        // その他の重要な状態情報も引き継ぎ
        if (targetCard && targetCard.cardState) {
          // 既存の状態情報を基に新しい状態を作成
          cardCopy.cardState = {
            ...targetCard.cardState,
            bloomedThisTurn: true,  // ブルームフラグを設定
            playedTurn: targetCard.cardState.playedTurn || 1  // 元の配置ターンを保持
          };
        }
        
        // お休み状態（isResting）を引き継ぎ
        if (targetCard && targetCard.isResting) {
          cardCopy.isResting = targetCard.isResting;
          // ブルーム時にお休み状態を引き継ぎました
        }
        
        // State Managerでブルーム実行（カード重ね）
        const result = this.battleEngine.stateManager.updateState('PLACE_CARD', {
          card: cardCopy,
          source: 'hand',
          position: targetPosition,
          player: 1,
          action: 'bloom'
        });
        
        // Battle Engineとの同期を確実にする
        if (result && result.success) {
          // 手札からカードを削除（正確なインデックスを使用）
          if (handIndex !== undefined && handIndex >= 0 && handIndex < player.hand.length) {
            // 元の手札インデックスを使用して正確に削除
            const removedCard = player.hand.splice(handIndex, 1)[0];
            // 手札から削除完了
          } else {
            window.warnLog(`手札インデックスが無効: ${handIndex}`);
          }
          
          // State Managerの状態更新が完了してからUI更新を実行
          const waitForBloomCompletion = () => {
            if (this.battleEngine.stateManager.bloomCompleted) {
              this.battleEngine.stateManager.bloomCompleted = false; // フラグをリセット
              this.updateHandDisplay();
              this.battleEngine.updateUI();
              // ブルーム後のUI更新完了
            } else {
              // ブルーム完了を待つ
              setTimeout(waitForBloomCompletion, 10);
            }
          };
          
          setTimeout(waitForBloomCompletion, 30);
          
          return;
          
        } else {
          window.errorLog('ブルーム処理が失敗しました:', result);
          alert('⚠️ ブルーム処理でエラーが発生しました');
          return;
        }
        
      } else if (targetCard) {
        // ホロライブTCGでは基本的にブルーム以外の自由な交換は許可されない
        this.showAlert(`⚠️ カード交換不可\n\nブルーム以外での交換はできません。\n\n- 同名カードでレベルが進化する場合のみブルーム可能\n- 空いている位置への配置は可能`, `exchange_failed_${targetPosition}`);
        return;
      }
    } else {
      // 通常の配置処理（空の場所に配置）
      const cardCopy = this.createCardCopy(card);
      
      // カードに状態情報を追加
      const cardWithState = this.battleEngine.stateManager.addCardState(cardCopy, {
        playedTurn: this.battleEngine.gameState.turnCount || 1,
        playedByPlayer: 1,
        bloomedThisTurn: false,
        resting: false,
        damage: 0,
        yellCards: cardCopy.yellCards || []  // 既存のエール情報を保持
      });
      
      player[targetPosition] = cardWithState;
      player.hand.splice(handIndex, 1);
      
      // 通常配置完了
    }
    
    // UI更新（ブルーム処理が成功した場合は遅延更新が既に実行されるためスキップ）
    if (!targetCard || !this.battleEngine.stateManager.isBloom(card, targetCard)) {
      this.updateHandDisplay();
      this.battleEngine.updateUI();
    }
  }

  /**
   * コラボ移動後にコラボ効果をチェックして自動発動モーダルを表示
   * @param {number} playerId - プレイヤーID
   * @param {string} position - カード位置（'collab'）
   */
  checkAndTriggerCollabEffects(playerId, position) {
    try {
      const card = this.battleEngine.players[playerId][position];
      if (!card) {
        return;
      }
      
      // カード効果定義を取得
      const cardEffects = window.cardEffects?.[card.id || card.cardId];
      if (!cardEffects?.effects) {
        return;
      }
      
      // コラボ効果をチェック
      const collabEffect = cardEffects.effects.collabEffect;
      if (!collabEffect || collabEffect.auto_trigger !== 'on_collab') {
        return;
      }
      
      console.log(`🤝 [コラボ効果] ${collabEffect.name} 発動`);
      this.showCollabEffectModal(card, collabEffect, playerId, position);
      
    } catch (error) {
      console.error('🚨 [コラボ効果チェック] エラー:', error);
    }
  }

  /**
   * コラボ効果発動確認モーダルを表示
   * @param {Object} card - カード情報
   * @param {Object} collabEffect - コラボ効果定義
   * @param {number} playerId - プレイヤーID
   * @param {string} position - カード位置
   */
  showCollabEffectModal(card, collabEffect, playerId, position) {
    try {
      // 既存のモーダルを除去
      const existingModal = document.querySelector('.collab-effect-modal');
      if (existingModal) {
        existingModal.remove();
      }
      
      // モーダル要素を作成
      const modal = document.createElement('div');
      modal.className = 'collab-effect-modal';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: Arial, sans-serif;
      `;
      
      // モーダルコンテンツ
      const content = document.createElement('div');
      content.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 15px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        max-width: 500px;
        width: 90%;
        text-align: center;
        border: 3px solid #4A90E2;
      `;
      
      // タイトル
      const title = document.createElement('h3');
      title.textContent = 'コラボエフェクト発動';
      title.style.cssText = `
        margin: 0 0 20px 0;
        color: #4A90E2;
        font-size: 24px;
        font-weight: bold;
      `;
      
      // カード名
      const cardNameElement = document.createElement('div');
      cardNameElement.textContent = card.name || card.id;
      cardNameElement.style.cssText = `
        font-size: 20px;
        font-weight: bold;
        margin-bottom: 15px;
        color: #333;
      `;
      
      // 効果名
      const effectNameElement = document.createElement('div');
      effectNameElement.textContent = `「${collabEffect.name}」`;
      effectNameElement.style.cssText = `
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 15px;
        color: #E74C3C;
      `;
      
      // 効果説明
      const description = document.createElement('div');
      description.textContent = collabEffect.description || 'コラボエフェクトを発動します';
      description.style.cssText = `
        margin-bottom: 25px;
        line-height: 1.6;
        color: #555;
        font-size: 14px;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 8px;
        border-left: 4px solid #4A90E2;
      `;
      
      // ボタンコンテナ
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = `
        display: flex;
        gap: 15px;
        justify-content: center;
      `;
      
      // 発動ボタン
      const activateButton = document.createElement('button');
      activateButton.textContent = '効果を発動';
      activateButton.style.cssText = `
        padding: 12px 25px;
        background: #4A90E2;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: background 0.3s;
      `;
      activateButton.addEventListener('mouseenter', () => {
        activateButton.style.background = '#357ABD';
      });
      activateButton.addEventListener('mouseleave', () => {
        activateButton.style.background = '#4A90E2';
      });
      
      // キャンセルボタン
      const cancelButton = document.createElement('button');
      cancelButton.textContent = 'キャンセル';
      cancelButton.style.cssText = `
        padding: 12px 25px;
        background: #95A5A6;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        cursor: pointer;
        transition: background 0.3s;
      `;
      cancelButton.addEventListener('mouseenter', () => {
        cancelButton.style.background = '#7F8C8D';
      });
      cancelButton.addEventListener('mouseleave', () => {
        cancelButton.style.background = '#95A5A6';
      });
      
      // イベントリスナー
      activateButton.addEventListener('click', () => {
        modal.remove();
        this.executeCollabEffect(card, collabEffect, playerId, position);
      });
      
      cancelButton.addEventListener('click', () => {
        modal.remove();
        console.log(`❌ [コラボ効果モーダル] キャンセル: ${collabEffect.name}`);
      });
      
      // モーダル外クリックで閉じる
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
          console.log(`❌ [コラボ効果モーダル] 外クリックでキャンセル: ${collabEffect.name}`);
        }
      });
      
      // ESCキーで閉じる
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          modal.remove();
          document.removeEventListener('keydown', handleEscape);
          console.log(`❌ [コラボ効果モーダル] ESCでキャンセル: ${collabEffect.name}`);
        }
      };
      document.addEventListener('keydown', handleEscape);
      
      // 要素を組み立て
      buttonContainer.appendChild(activateButton);
      buttonContainer.appendChild(cancelButton);
      
      content.appendChild(title);
      content.appendChild(cardNameElement);
      content.appendChild(effectNameElement);
      content.appendChild(description);
      content.appendChild(buttonContainer);
      
      modal.appendChild(content);
      document.body.appendChild(modal);
      
      console.log(`✅ [コラボ効果モーダル] 表示完了: ${collabEffect.name}`);
      
    } catch (error) {
      console.error('🚨 [コラボ効果モーダル] 作成エラー:', error);
    }
  }

  /**
   * コラボ効果を実行
   * @param {Object} card - カード情報
   * @param {Object} collabEffect - コラボ効果定義
   * @param {number} playerId - プレイヤーID
   * @param {string} position - カード位置
   */
  async executeCollabEffect(card, collabEffect, playerId, position) {
    try {
      // 条件チェック
      if (collabEffect.condition) {
        const conditionMet = collabEffect.condition(card, this.battleEngine.gameState, this.battleEngine);
        if (!conditionMet) {
          alert('この効果の発動条件を満たしていません。');
          return;
        }
      }
      
      // 効果実行
      if (collabEffect.effect) {
        const result = await collabEffect.effect(card, this.battleEngine);
        
        if (result?.success) {
          if (result.message) {
            // 成功メッセージを表示（簡易版）
            setTimeout(() => {
              alert(`効果発動成功！\n${result.message}`);
            }, 100);
          }
        } else {
          if (result?.message) {
            alert(`効果発動失敗:\n${result.message}`);
          }
        }
      } else {
        console.warn(`⚠️ [コラボ効果実行] 効果関数未定義: ${collabEffect.name}`);
      }
      
    } catch (error) {
      console.error('🚨 [コラボ効果実行] エラー:', error);
      alert('効果の実行中にエラーが発生しました。');
    }
  }

  /**
   * アーツ使用時にアーツ効果をチェックして自動発動モーダルを表示
   * @param {Object} card - カード情報
   * @param {string} artName - 使用するアーツ名
   * @param {number} playerId - プレイヤーID
   * @param {string} position - カード位置
   */
  checkAndTriggerArtsEffects(card, artName, playerId, position) {
    try {
      // カード効果定義を取得
      const cardEffects = window.cardEffects?.[card.id || card.cardId];
      if (!cardEffects?.effects) {
        return;
      }
      
      // 該当するアーツ効果を検索
      const artsEffect = Object.values(cardEffects.effects).find(effect => 
        effect.type === 'art' && effect.name === artName
      );
      
      if (!artsEffect || artsEffect.auto_trigger !== 'arts') {
        return;
      }
      
      console.log(`🎨 [アーツ効果] ${artsEffect.name} 発動`);
      this.showArtsEffectModal(card, artsEffect, playerId, position);
      
    } catch (error) {
      console.error('🚨 [アーツ効果チェック] エラー:', error);
    }
  }

  /**
   * アーツ効果発動確認モーダルを表示
   * @param {Object} card - カード情報
   * @param {Object} artsEffect - アーツ効果定義
   * @param {number} playerId - プレイヤーID
   * @param {string} position - カード位置
   */
  showArtsEffectModal(card, artsEffect, playerId, position) {
    try {
      // 既存のモーダルを除去
      const existingModal = document.querySelector('.arts-effect-modal');
      if (existingModal) {
        existingModal.remove();
      }
      
      // モーダル要素を作成
      const modal = document.createElement('div');
      modal.className = 'arts-effect-modal';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: Arial, sans-serif;
      `;
      
      // モーダルコンテンツ
      const content = document.createElement('div');
      content.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 15px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        max-width: 500px;
        width: 90%;
        text-align: center;
        border: 3px solid #E74C3C;
      `;
      
      // タイトル
      const title = document.createElement('h3');
      title.textContent = 'アーツ効果発動';
      title.style.cssText = `
        margin: 0 0 20px 0;
        color: #E74C3C;
        font-size: 24px;
        font-weight: bold;
      `;
      
      // カード名
      const cardNameElement = document.createElement('div');
      cardNameElement.textContent = card.name || card.id;
      cardNameElement.style.cssText = `
        font-size: 20px;
        font-weight: bold;
        margin-bottom: 15px;
        color: #333;
      `;
      
      // 效果名
      const effectNameElement = document.createElement('div');
      effectNameElement.textContent = `「${artsEffect.name}」`;
      effectNameElement.style.cssText = `
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 15px;
        color: #4A90E2;
      `;
      
      // 効果説明
      const description = document.createElement('div');
      description.textContent = artsEffect.description || 'アーツ効果を発動します';
      description.style.cssText = `
        margin-bottom: 25px;
        line-height: 1.6;
        color: #555;
        font-size: 14px;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 8px;
        border-left: 4px solid #E74C3C;
      `;
      
      // ボタンコンテナ
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = `
        display: flex;
        gap: 15px;
        justify-content: center;
      `;
      
      // 発動ボタン
      const activateButton = document.createElement('button');
      activateButton.textContent = 'アーツを使用';
      activateButton.style.cssText = `
        padding: 12px 25px;
        background: #E74C3C;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: background 0.3s;
      `;
      activateButton.addEventListener('mouseenter', () => {
        activateButton.style.background = '#C0392B';
      });
      activateButton.addEventListener('mouseleave', () => {
        activateButton.style.background = '#E74C3C';
      });
      
      // キャンセルボタン
      const cancelButton = document.createElement('button');
      cancelButton.textContent = 'キャンセル';
      cancelButton.style.cssText = `
        padding: 12px 25px;
        background: #95A5A6;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        cursor: pointer;
        transition: background 0.3s;
      `;
      cancelButton.addEventListener('mouseenter', () => {
        cancelButton.style.background = '#7F8C8D';
      });
      cancelButton.addEventListener('mouseleave', () => {
        cancelButton.style.background = '#95A5A6';
      });
      
      // イベントリスナー
      activateButton.addEventListener('click', () => {
        modal.remove();
        this.executeArtsEffect(card, artsEffect, playerId, position);
      });
      
      cancelButton.addEventListener('click', () => {
        modal.remove();
        console.log(`❌ [アーツ效果モーダル] キャンセル: ${artsEffect.name}`);
      });
      
      // モーダル外クリックで閉じる
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
          console.log(`❌ [アーツ效果モーダル] 外クリックでキャンセル: ${artsEffect.name}`);
        }
      });
      
      // ESCキーで閉じる
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          modal.remove();
          document.removeEventListener('keydown', handleEscape);
          console.log(`❌ [アーツ效果モーダル] ESCでキャンセル: ${artsEffect.name}`);
        }
      };
      document.addEventListener('keydown', handleEscape);
      
      // 要素を組み立て
      buttonContainer.appendChild(activateButton);
      buttonContainer.appendChild(cancelButton);
      
      content.appendChild(title);
      content.appendChild(cardNameElement);
      content.appendChild(effectNameElement);
      content.appendChild(description);
      content.appendChild(buttonContainer);
      
      modal.appendChild(content);
      document.body.appendChild(modal);
      
      console.log(`✅ [アーツ效果モーダル] 表示完了: ${artsEffect.name}`);
      
    } catch (error) {
      console.error('🚨 [アーツ效果モーダル] 作成エラー:', error);
    }
  }

  /**
   * アーツ効果を実行
   * @param {Object} card - カード情報
   * @param {Object} artsEffect - アーツ効果定義
   * @param {number} playerId - プレイヤーID
   * @param {string} position - カード位置
   */
  async executeArtsEffect(card, artsEffect, playerId, position) {
    try {
      // 条件チェック
      if (artsEffect.condition) {
        const conditionMet = artsEffect.condition(card, this.battleEngine.gameState, this.battleEngine);
        if (!conditionMet) {
          alert('このアーツの発動条件を満たしていません。');
          return;
        }
      }
      
      // 効果実行
      if (artsEffect.effect) {
        const result = await artsEffect.effect(card, this.battleEngine);
        
        if (result?.success) {
          if (result.message) {
            // 成功メッセージを表示（簡易版）
            setTimeout(() => {
              alert(`アーツ効果発動成功！\n${result.message}`);
            }, 100);
          }
        } else {
          if (result?.message) {
            alert(`アーツ効果発動失敗:\n${result.message}`);
          }
        }
      } else {
        console.warn(`⚠️ [アーツ効果実行] 効果関数未定義: ${artsEffect.name}`);
      }
      
    } catch (error) {
      console.error('🚨 [アーツ効果実行] エラー:', error);
      alert('アーツ効果の実行中にエラーが発生しました。');
    }
  }

  /**
   * ブルーム時にブルーム効果をチェックして自動発動モーダルを表示
   * @param {Object} card - ブルームしたカード情報
   * @param {number} playerId - プレイヤーID
   * @param {string} position - カード位置
   */
  checkAndTriggerBloomEffects(card, playerId, position) {
    console.log(`🌸 [ブルーム効果チェック] 開始: ${card.name || card.id}, プレイヤー${playerId}, ポジション${position}`);
    console.log(`🔍 [ブルーム効果チェック] カードオブジェクト:`, card);
    try {
      // カード効果定義を取得
      const cardId = card.id || card.cardId || card.number;
      const cardEffects = window.cardEffects?.[cardId];
      console.log(`🔍 [ブルーム効果チェック] カードID: ${cardId}, 効果定義: ${!!cardEffects}`);
      
      if (!cardEffects?.effects) {
        console.log(`❌ [ブルーム効果チェック] カード${cardId}に効果定義なし`);
        return;
      }
      
      // ブルーム効果を検索
      const bloomEffects = Object.values(cardEffects.effects).filter(effect => 
        effect.type === 'bloom' && effect.auto_trigger === 'on_bloom'
      );
      console.log(`🔍 [ブルーム効果チェック] ブルーム効果数: ${bloomEffects.length}`);
      
      if (bloomEffects.length === 0) {
        console.log(`❌ [ブルーム効果チェック] カード${cardId}にブルーム効果なし`);
        return;
      }
      
      // 各ブルーム効果をチェック
      bloomEffects.forEach((bloomEffect, index) => {
        console.log(`🔍 [ブルーム効果チェック] 効果${index + 1}: ${bloomEffect.name}, タイミング: ${bloomEffect.timing}, トリガー: ${bloomEffect.auto_trigger}`);
        
        // 条件チェック
        let conditionMet = true;
        try {
          if (bloomEffect.condition) {
            console.log(`🔍 [ブルーム効果チェック] 条件関数実行中...`);
            conditionMet = bloomEffect.condition(card, this.battleEngine.gameState, this.battleEngine);
            console.log(`🔍 [ブルーム効果チェック] 条件チェック結果: ${conditionMet}`);
          } else {
            console.log(`🔍 [ブルーム効果チェック] 条件なし（常に発動可能）`);
          }
        } catch (error) {
          console.error(`🚨 [ブルーム効果チェック] 条件チェックエラー:`, error);
          conditionMet = false;
        }
        
        // 条件に関係なくモーダルを表示（条件状態を渡す）
        console.log(`🌸 [ブルーム効果] ${bloomEffect.name} モーダル表示開始 (条件満足: ${conditionMet})`);
        this.showBloomEffectModal(card, bloomEffect, playerId, position, conditionMet);
      });
      
    } catch (error) {
      console.error('🚨 [ブルーム効果チェック] エラー:', error);
    }
  }

  /**
   * ブルーム効果発動モーダルを表示
   * @param {Object} card - カード情報
   * @param {Object} bloomEffect - ブルーム効果定義
   * @param {number} playerId - プレイヤーID
   * @param {string} position - カード位置
   * @param {boolean} conditionMet - 発動条件が満たされているか
   */
  showBloomEffectModal(card, bloomEffect, playerId, position, conditionMet = true) {
    console.log(`🌸 [ブルームモーダル] 表示開始: ${bloomEffect.name}, カード: ${card.name}, プレイヤー: ${playerId}, ポジション: ${position}, 条件満足: ${conditionMet}`);
    try {
      // 既存のモーダルを閉じる
      const existingModal = document.getElementById('bloom-effect-modal');
      if (existingModal) {
        existingModal.remove();
      }
      
      // モーダル作成
      const modal = document.createElement('div');
      modal.id = 'bloom-effect-modal';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: Arial, sans-serif;
      `;
      
      // モーダルコンテンツ
      const content = document.createElement('div');
      content.style.cssText = `
        background: linear-gradient(135deg, #FFF3E0, #FFE0B2);
        border: 3px solid #FF9800;
        border-radius: 15px;
        padding: 25px;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 10px 30px rgba(255, 152, 0, 0.3);
        text-align: center;
        position: relative;
      `;
      
      // アイコンとタイトル
      const titleText = conditionMet ? 'ブルーム効果発動！' : 'ブルーム効果（条件未満足）';
      const titleColor = conditionMet ? '#E65100' : '#757575';
      const iconColor = conditionMet ? '🌸' : '🌸💔';
      
      content.innerHTML = `
        <div style="margin-bottom: 20px;">
          <div style="font-size: 48px; margin-bottom: 10px;">${iconColor}</div>
          <h2 style="color: ${titleColor}; margin: 0; font-size: 24px; text-shadow: 1px 1px 2px rgba(0,0,0,0.1);">
            ${titleText}
          </h2>
        </div>
        
        <div style="background: rgba(255, 255, 255, 0.8); border-radius: 10px; padding: 20px; margin: 20px 0; border: 2px solid #FFB74D;">
          <h3 style="color: #BF360C; margin: 0 0 10px 0; font-size: 20px;">
            ${bloomEffect.name || 'ブルーム効果'}
          </h3>
          <p style="color: #5D4037; margin: 0; font-size: 16px; line-height: 1.4;">
            ${bloomEffect.description || '効果説明がありません'}
          </p>
          ${!conditionMet ? `
            <div style="background: #FFECB3; border: 2px solid #FFC107; border-radius: 8px; padding: 15px; margin-top: 15px;">
              <p style="color: #E65100; margin: 0; font-weight: bold; font-size: 14px;">
                ⚠️ この効果の発動条件が満たされていません
              </p>
            </div>
          ` : ''}
        </div>
        
        <div style="margin-top: 25px; display: flex; gap: 15px; justify-content: center;">
        </div>
      `;
      
      const buttonContainer = content.querySelector('div:last-child');
      
      // 発動ボタン
      const activateButton = document.createElement('button');
      activateButton.textContent = conditionMet ? '効果を発動' : '発動不可';
      
      const buttonBg = conditionMet ? '#FF9800' : '#BDBDBD';
      const buttonHoverBg = conditionMet ? '#F57C00' : '#BDBDBD';
      
      activateButton.style.cssText = `
        padding: 12px 25px;
        background: ${buttonBg};
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        cursor: ${conditionMet ? 'pointer' : 'not-allowed'};
        transition: all 0.3s ease;
        box-shadow: 0 4px 8px rgba(255, 152, 0, 0.3);
        opacity: ${conditionMet ? '1' : '0.6'};
      `;
      
      if (conditionMet) {
        activateButton.addEventListener('mouseenter', () => {
          activateButton.style.background = buttonHoverBg;
          activateButton.style.transform = 'translateY(-2px)';
          activateButton.style.boxShadow = '0 6px 12px rgba(255, 152, 0, 0.4)';
        });
        activateButton.addEventListener('mouseleave', () => {
          activateButton.style.background = buttonBg;
          activateButton.style.transform = 'translateY(0)';
          activateButton.style.boxShadow = '0 4px 8px rgba(255, 152, 0, 0.3)';
        });
      }
      
      // キャンセルボタン
      const cancelButton = document.createElement('button');
      cancelButton.textContent = 'キャンセル';
      cancelButton.style.cssText = `
        padding: 12px 25px;
        background: #95A5A6;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.3s ease;
      `;
      
      cancelButton.addEventListener('mouseenter', () => {
        cancelButton.style.background = '#7F8C8D';
      });
      cancelButton.addEventListener('mouseleave', () => {
        cancelButton.style.background = '#95A5A6';
      });
      
      // イベントリスナー
      activateButton.addEventListener('click', () => {
        if (conditionMet) {
          modal.remove();
          this.executeBloomEffect(card, bloomEffect, playerId, position);
        } else {
          // 条件が満たされていない場合は何もしない（ボタンは無効化されているが念のため）
          console.log(`❌ [ブルームモーダル] 発動条件未満足のため実行不可: ${bloomEffect.name}`);
        }
      });
      
      cancelButton.addEventListener('click', () => {
        console.log(`❌ [ブルームモーダル] キャンセル: ${bloomEffect.name}`);
        modal.remove();
      });
      
      // ESCキーでキャンセル
      document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
          modal.remove();
          document.removeEventListener('keydown', escHandler);
        }
      });
      
      buttonContainer.appendChild(activateButton);
      buttonContainer.appendChild(cancelButton);
      modal.appendChild(content);
      document.body.appendChild(modal);
      
    } catch (error) {
      console.error('🚨 [ブルームモーダル] エラー:', error);
    }
  }

  /**
   * ブルーム効果を実行
   * @param {Object} card - カード情報
   * @param {Object} bloomEffect - ブルーム効果定義
   * @param {number} playerId - プレイヤーID
   * @param {string} position - カード位置
   */
  executeBloomEffect(card, bloomEffect, playerId, position) {
    try {
      if (bloomEffect.effect && typeof bloomEffect.effect === 'function') {
        const result = bloomEffect.effect(card, this.battleEngine, playerId, position);
        
        if (result) {
          if (result.success) {
            if (result.message) {
              alert(`ブルーム効果発動:\n${result.message}`);
            }
          } else {
            alert(`ブルーム効果発動失敗:\n${result.message}`);
          }
        }
      }
      
    } catch (error) {
      console.error('🚨 [ブルーム効果実行] エラー:', error);
      alert('ブルーム効果の実行中にエラーが発生しました。');
    }
  }
}

// グローバルアクセス用
window.HandManager = HandManager;
