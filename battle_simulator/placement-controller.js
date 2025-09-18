/**
 * Placement Controller
 * フェーズや状態に応じたカード配置制御を管理
 */

class HololivePlacementController {
  constructor(battleEngine) {
    this.engine = battleEngine;
    this.gameState = battleEngine.gameState;
    this.players = battleEngine.players;
    
    // 配置ルール定義
    this.placementRules = this.initializePlacementRules();
    
  }

  /**
   * 配置ルールの初期化
   */
  initializePlacementRules() {
    return {
      // 準備ステップ（フェーズ -1）
      PREPARATION: {
        phase: -1,
        name: '準備ステップ',
        description: 'ゲーム開始準備中',
        allowedPlacements: {
          collab: { allowed: false, reason: '準備ステップでは配置不可' },
          center: { allowed: false, reason: '準備ステップでは配置不可' },
          back1: { allowed: false, reason: '準備ステップでは配置不可' },
          back2: { allowed: false, reason: '準備ステップでは配置不可' },
          back3: { allowed: false, reason: '準備ステップでは配置不可' },
          back4: { allowed: false, reason: '準備ステップでは配置不可' },
          back5: { allowed: false, reason: '準備ステップでは配置不可' },
          support: { allowed: false, reason: '準備ステップでは配置不可' }
        }
      },

      // Debut配置フェーズ（特別フェーズ）
      DEBUT_PLACEMENT: {
        phase: 'debut',
        name: 'Debut配置フェーズ',
        description: 'Debutホロメンの初期配置',
        allowedPlacements: {
          collab: { 
            allowed: false, 
            reason: 'Debut配置フェーズではコラボに配置不可'
          },
          center: { 
            allowed: true, 
            conditions: [
              { type: 'cardType', value: 'ホロメン', message: 'ホロメンカードのみ配置可能' },
              { type: 'bloomLevel', value: 'Debut', message: 'Debutレベルのみ配置可能' },
              { type: 'required', value: true, message: 'センターへの配置は必須' }
            ]
          },
          back1: { 
            allowed: true, 
            conditions: [
              { type: 'cardType', value: 'ホロメン', message: 'ホロメンカードのみ配置可能' },
              { type: 'bloomLevel', value: 'Debut', message: 'Debutレベルのみ配置可能' }
            ]
          },
          back2: { 
            allowed: true, 
            conditions: [
              { type: 'cardType', value: 'ホロメン', message: 'ホロメンカードのみ配置可能' },
              { type: 'bloomLevel', value: 'Debut', message: 'Debutレベルのみ配置可能' }
            ]
          },
          back3: { 
            allowed: true, 
            conditions: [
              { type: 'cardType', value: 'ホロメン', message: 'ホロメンカードのみ配置可能' },
              { type: 'bloomLevel', value: 'Debut', message: 'Debutレベルのみ配置可能' }
            ]
          },
          back4: { 
            allowed: true, 
            conditions: [
              { type: 'cardType', value: 'ホロメン', message: 'ホロメンカードのみ配置可能' },
              { type: 'bloomLevel', value: 'Debut', message: 'Debutレベルのみ配置可能' }
            ]
          },
          back5: { 
            allowed: true, 
            conditions: [
              { type: 'cardType', value: 'ホロメン', message: 'ホロメンカードのみ配置可能' },
              { type: 'bloomLevel', value: 'Debut', message: 'Debutレベルのみ配置可能' }
            ]
          },
          support: { 
            allowed: false, 
            reason: 'Debut配置フェーズではサポート使用不可'
          }
        }
      },

      // リセットステップ（フェーズ 0）
      RESET_STEP: {
        phase: 0,
        name: 'リセットステップ',
        description: 'お休みホロメンをアクティブ化、コラボホロメンをお休み化',
        allowedPlacements: {
          center: { allowed: false, reason: 'リセットステップでは配置不可' },
          collab: { allowed: false, reason: 'リセットステップでは配置不可' },
          back1: { allowed: false, reason: 'リセットステップでは配置不可' },
          back2: { allowed: false, reason: 'リセットステップでは配置不可' },
          back3: { allowed: false, reason: 'リセットステップでは配置不可' },
          back4: { allowed: false, reason: 'リセットステップでは配置不可' },
          back5: { allowed: false, reason: 'リセットステップでは配置不可' },
          support: { allowed: false, reason: 'リセットステップでは配置不可' }
        }
      },

      // 手札ステップ（フェーズ 1）
      HAND_STEP: {
        phase: 1,
        name: '手札ステップ',
        description: 'デッキからカード1枚ドロー',
        allowedPlacements: {
          center: { allowed: false, reason: '手札ステップでは配置不可' },
          collab: { allowed: false, reason: '手札ステップでは配置不可' },
          back1: { allowed: false, reason: '手札ステップでは配置不可' },
          back2: { allowed: false, reason: '手札ステップでは配置不可' },
          back3: { allowed: false, reason: '手札ステップでは配置不可' },
          back4: { allowed: false, reason: '手札ステップでは配置不可' },
          back5: { allowed: false, reason: '手札ステップでは配置不可' },
          support: { allowed: false, reason: '手札ステップでは配置不可' }
        }
      },

      // エールステップ（フェーズ 2）
      YELL_STEP: {
        phase: 2,
        name: 'エールステップ',
        description: 'エールデッキから1枚をステージのホロメンに送る',
        allowedPlacements: {
          center: { 
            allowed: true, 
            conditions: [
              { type: 'targetType', value: 'yell', message: 'エールカードのみ配置可能' },
              { type: 'targetHolomen', value: true, message: 'センターホロメンが配置されている必要があります' }
            ]
          },
          collab: { 
            allowed: true, 
            conditions: [
              { type: 'targetType', value: 'yell', message: 'エールカードのみ配置可能' },
              { type: 'targetHolomen', value: true, message: 'コラボホロメンが配置されている必要があります' }
            ]
          },
          back1: { 
            allowed: true, 
            conditions: [
              { type: 'targetType', value: 'yell', message: 'エールカードのみ配置可能' },
              { type: 'targetHolomen', value: true, message: 'バックホロメンが配置されている必要があります' }
            ]
          },
          back2: { 
            allowed: true, 
            conditions: [
              { type: 'targetType', value: 'yell', message: 'エールカードのみ配置可能' },
              { type: 'targetHolomen', value: true, message: 'バックホロメンが配置されている必要があります' }
            ]
          },
          back3: { 
            allowed: true, 
            conditions: [
              { type: 'targetType', value: 'yell', message: 'エールカードのみ配置可能' },
              { type: 'targetHolomen', value: true, message: 'バックホロメンが配置されている必要があります' }
            ]
          },
          back4: { 
            allowed: true, 
            conditions: [
              { type: 'targetType', value: 'yell', message: 'エールカードのみ配置可能' },
              { type: 'targetHolomen', value: true, message: 'バックホロメンが配置されている必要があります' }
            ]
          },
          back5: { 
            allowed: true, 
            conditions: [
              { type: 'targetType', value: 'yell', message: 'エールカードのみ配置可能' },
              { type: 'targetHolomen', value: true, message: 'バックホロメンが配置されている必要があります' }
            ]
          },
          support: { allowed: false, reason: 'エールステップではサポート使用不可' }
        }
      },

      // メインステップ（フェーズ 3）
      MAIN_STEP: {
        phase: 3,
        name: 'メインステップ',
        description: 'ホロメン配置・サポート使用・コラボ',
        allowedPlacements: {
          center: { 
            allowed: true, 
            conditions: [
              { type: 'cardType', value: 'ホロメン', message: 'ホロメンカードのみ配置可能' }
            ]
          },
          collab: { 
            allowed: true, 
            conditions: [
              { type: 'cardType', value: 'ホロメン', message: 'ホロメンカードのみ配置可能' }
            ]
          },
          back1: { 
            allowed: true, 
            conditions: [
              { type: 'cardType', value: 'ホロメン', message: 'ホロメンカードのみ配置可能' }
            ]
          },
          back2: { 
            allowed: true, 
            conditions: [
              { type: 'cardType', value: 'ホロメン', message: 'ホロメンカードのみ配置可能' }
            ]
          },
          back3: { 
            allowed: true, 
            conditions: [
              { type: 'cardType', value: 'ホロメン', message: 'ホロメンカードのみ配置可能' }
            ]
          },
          back4: { 
            allowed: true, 
            conditions: [
              { type: 'cardType', value: 'ホロメン', message: 'ホロメンカードのみ配置可能' }
            ]
          },
          back5: { 
            allowed: true, 
            conditions: [
              { type: 'cardType', value: 'ホロメン', message: 'ホロメンカードのみ配置可能' }
            ]
          },
          support: { 
            allowed: true, 
            conditions: [
              { type: 'cardType', value: 'サポート', message: 'サポートカードのみ使用可能' },
              { type: 'oncePerTurn', value: true, message: '1ターンに1枚まで使用可能' }
            ]
          }
        }
      },

      // パフォーマンスステップ（フェーズ 4）
      PERFORMANCE_STEP: {
        phase: 4,
        name: 'パフォーマンスステップ',
        description: 'センター・コラボホロメンのアーツ使用',
        allowedPlacements: {
          center: { allowed: false, reason: 'パフォーマンスステップでは配置不可' },
          collab: { allowed: false, reason: 'パフォーマンスステップでは配置不可' },
          back1: { allowed: false, reason: 'パフォーマンスステップでは配置不可' },
          back2: { allowed: false, reason: 'パフォーマンスステップでは配置不可' },
          back3: { allowed: false, reason: 'パフォーマンスステップでは配置不可' },
          back4: { allowed: false, reason: 'パフォーマンスステップでは配置不可' },
          back5: { allowed: false, reason: 'パフォーマンスステップでは配置不可' },
          support: { allowed: false, reason: 'パフォーマンスステップでは配置不可' }
        }
      },

      // エンドステップ（フェーズ 5）
      END_STEP: {
        phase: 5,
        name: 'エンドステップ',
        description: 'ターン終了、相手にターンを渡す',
        allowedPlacements: {
          center: { allowed: false, reason: 'エンドステップでは配置不可' },
          collab: { allowed: false, reason: 'エンドステップでは配置不可' },
          back1: { allowed: false, reason: 'エンドステップでは配置不可' },
          back2: { allowed: false, reason: 'エンドステップでは配置不可' },
          back3: { allowed: false, reason: 'エンドステップでは配置不可' },
          back4: { allowed: false, reason: 'エンドステップでは配置不可' },
          back5: { allowed: false, reason: 'エンドステップでは配置不可' },
          support: { allowed: false, reason: 'エンドステップでは配置不可' }
        }
      }
    };
  }

  /**
   * 現在のフェーズに基づく配置ルールを取得
   */
  getCurrentPlacementRules() {
    const currentPhase = this.gameState.currentPhase;
    
    // Debut配置フェーズのチェック（最優先）
    if (this.gameState.debutPlacementPhase) {
      return this.placementRules.DEBUT_PLACEMENT;
    }
    
    // 通常フェーズのマッピング（公式ルールに基づく）
    const phaseMap = {
      '-1': 'PREPARATION',
      '0': 'RESET_STEP',
      '1': 'HAND_STEP',      // 変更: DRAW_STEP → HAND_STEP
      '2': 'YELL_STEP',
      '3': 'MAIN_STEP',
      '4': 'PERFORMANCE_STEP',
      '5': 'END_STEP'        // 追加: エンドステップ
    };
    
    const ruleKey = phaseMap[currentPhase.toString()];
    return this.placementRules[ruleKey] || this.placementRules.PREPARATION;
  }

  /**
   * 特定の位置への配置が可能かチェック
   */
  canPlaceCard(card, position, playerId = 1, sourceType = 'hand') {
    const rules = this.getCurrentPlacementRules();
    
    // ポジション名を正規化
    const normalizedPosition = this.normalizePositionId(position);
    const positionRule = rules.allowedPlacements[normalizedPosition];
    
    if (!positionRule) {
      // 開発用警告: 意図しないポジションID
      if (window && window.warnLog) {
        window.warnLog(`⚠️ 未定義の配置ポジションにアクセス: ${position} (正規化: ${normalizedPosition})`);
      } else {
        console.warn('[PlacementController] 未定義の配置ポジション:', position, '=>', normalizedPosition);
      }
      return {
        allowed: false,
        reason: '無効な配置位置です'
      };
    }
    
    if (!positionRule.allowed) {
      return {
        allowed: false,
        reason: positionRule.reason
      };
    }

    // 6枚フィールド制限チェック（ホロメンのみ）
    if (card.card_type?.includes('ホロメン')) {
      const fieldLimitCheck = this.checkFieldCardLimit(playerId, normalizedPosition, sourceType);
      if (!fieldLimitCheck.valid) {
        return {
          allowed: false,
          reason: fieldLimitCheck.reason
        };
      }
    }
    
    // 条件チェック
    if (positionRule.conditions) {
      for (const condition of positionRule.conditions) {
        const check = this.checkCondition(card, normalizedPosition, condition, playerId);
        if (!check.valid) {
          return {
            allowed: false,
            reason: check.message
          };
        }
      }
    }
    
    return {
      allowed: true,
      reason: '配置可能'
    };
  }

  /**
   * 条件のチェック
   */
  checkCondition(card, position, condition, playerId) {
    const player = this.players[playerId];
    
    switch (condition.type) {
      case 'cardType':
        return {
          valid: card.card_type && card.card_type.includes(condition.value),
          message: condition.message
        };
        
      case 'bloomLevel':
        return {
          valid: card.bloom_level === condition.value,
          message: condition.message
        };
        
      case 'maxCount':
        // 配置枚数制限を削除 - 常に許可
        return {
          valid: true,
          message: '配置可能'
        };
        
      case 'required':
        // 必須条件（配置完了時にチェック）
        return {
          valid: true,
          message: condition.message
        };
        
      case 'targetType':
        return {
          valid: condition.value === 'yell' ? card.card_type === 'エール' : true,
          message: condition.message
        };
        
      case 'targetHolomen':
        const hasHolomen = player[position] && player[position].card_type && 
                          player[position].card_type.includes('ホロメン');
        return {
          valid: hasHolomen,
          message: condition.message
        };
        
      case 'oncePerTurn':
        // サポートカードの1ターン1回制限を削除（LIMITEDのみ別途チェック）
        return {
          valid: true,
          message: '配置可能'
        };
        
      default:
        return {
          valid: true,
          message: '不明な条件'
        };
    }
  }

  /**
   * 配置可能な位置のリストを取得
   */
  getValidDropZones(card, playerId = 1) {
    const validZones = [];
    const rules = this.getCurrentPlacementRules();
    
    for (const [position, rule] of Object.entries(rules.allowedPlacements)) {
      const result = this.canPlaceCard(card, position, playerId, 'hand');
      if (result.allowed) {
        validZones.push({
          position,
          element: document.getElementById(`${position}-${playerId}`) || 
                  document.querySelector(`[data-position="${position}"]`)
        });
      }
    }
    
    return validZones;
  }

  /**
   * 配置制限の説明を取得
   */
  getPlacementDescription() {
    const rules = this.getCurrentPlacementRules();
    return {
      phase: rules.name,
      description: rules.description,
      restrictions: this.formatRestrictions(rules.allowedPlacements)
    };
  }

  /**
   * 制限をフォーマット
   */
  formatRestrictions(placements) {
    const restrictions = [];
    
    for (const [position, rule] of Object.entries(placements)) {
      if (rule.allowed && rule.conditions) {
        const conditionTexts = rule.conditions.map(c => c.message);
        restrictions.push(`${this.getPositionName(position)}: ${conditionTexts.join(', ')}`);
      } else if (!rule.allowed) {
        restrictions.push(`${this.getPositionName(position)}: ${rule.reason}`);
      }
    }
    
    return restrictions;
  }

  /**
   * 位置名を取得
   */
  getPositionName(position) {
    const names = {
      collab: 'コラボ',
      center: 'センター',
      back1: 'バック①',
      back2: 'バック②',
      back3: 'バック③',
      back4: 'バック④',
      back5: 'バック⑤',
      support: 'サポート'
    };
    return names[position] || position;
  }

  /**
   * ポジションIDの正規化（公式ルールに基づく）
   * 古いポジション名を新しい名前にマッピング
   */
  normalizePositionId(positionId) {
    // オブジェクト形式 {type: 'back', index: 0} の場合
    if (typeof positionId === 'object' && positionId.type) {
      if (positionId.type === 'back' && positionId.index !== undefined) {
        return `back${positionId.index + 1}`; // index 0 → back1
      }
      return positionId.type;
    }
    
    // 基本的にはそのまま返す（必要に応じて拡張可能）
    return positionId;
  }

  /**
   * ドラッグ&ドロップでのカード交換が可能かチェック
   * @param {Object} sourceCard - 移動元のカード
   * @param {string} sourcePosition - 移動元のポジション
   * @param {Object} targetCard - 移動先のカード（null可）
   * @param {string} targetPosition - 移動先のポジション
   * @param {number} playerId - プレイヤーID
   * @returns {Object} チェック結果
   */
  canSwapCards(sourceCard, sourcePosition, targetCard, targetPosition, playerId = 1) {
    const currentPhase = this.gameState.currentPhase;
    const isDebutPhase = this.gameState.debutPlacementPhase;
    
    // 1. フェーズチェック（公式仕様: Debut配置フェーズ / メインステップのみ）
    if (!isDebutPhase && currentPhase !== 3) {
      return {
        valid: false,
        reason: 'カードの交換は準備ステップのDebut配置時、またはメインステップでのみ可能です'
      };
    }

    // 2. ブルームのチェック
    if (targetCard && this.isBloomMove(sourceCard, targetCard)) {
      const stateManager = this.engine.stateManager;
      const bloomCheck = stateManager.canBloom(sourceCard, targetCard, playerId);
      if (!bloomCheck.valid) {
        return bloomCheck;
      }
    }

    // 3. コラボ移動のチェック
    if (targetPosition === 'collab' && sourcePosition.startsWith('back')) {
      const stateManager = this.engine.stateManager;
      const collabCheck = stateManager.canMoveToCollab(sourceCard, playerId);
      if (!collabCheck.valid) {
        return collabCheck;
      }
    }

    // 4. コラボからの移動チェック
    if (sourcePosition === 'collab' && targetPosition !== 'collab') {
      const stateManager = this.engine.stateManager;
      const fromCollabCheck = stateManager.canMoveFromCollab(sourceCard, playerId);
      if (!fromCollabCheck.valid) {
        return fromCollabCheck;
      }
    }

    return {
      valid: true,
      reason: '交換可能'
    };
  }

  /**
   * ブルーム移動かどうかを判定
   * @param {Object} sourceCard - 移動元のカード
   * @param {Object} targetCard - 移動先のカード
   * @returns {boolean} ブルーム移動かどうか
   */
  isBloomMove(sourceCard, targetCard) {
    // 両方ホロメンで、同じキャラクターの場合はブルーム
    if (sourceCard.card_type?.includes('ホロメン') && 
        targetCard.card_type?.includes('ホロメン')) {
      
      // カード名から基本キャラクター名を抽出して比較
      const sourceName = this.extractCharacterName(sourceCard.name);
      const targetName = this.extractCharacterName(targetCard.name);
      // デバッグログ（必要に応じて無効化可能）
      if (window && window.debugLog) {
        window.debugLog('[BloomCheck] raw=', sourceCard.name, targetCard.name, 'normalized=', sourceName, targetName);
      }
      
      return sourceName === targetName;
    }
    return false;
  }

  /**
   * カード名からキャラクター名を抽出
   * @param {string} cardName - カード名
   * @returns {string} キャラクター名
   */
  extractCharacterName(cardName) {
    if (!cardName || typeof cardName !== 'string') return '';
    let name = cardName;
    // 前後空白除去
    name = name.trim();
    // 全角・半角スペース除去（内部差異も合わせる）
    name = name.replace(/[\s　]+/g, '');
    // 末尾括弧付きバージョン/派生表記 (例: 「(Debut)」「（1st）」など) を削除
    name = name.replace(/[（(][^)）]*[)）]$/g, '');
    // 記号類（#、☆、★ 等）が末尾に単独付与されている場合は除去（キャラ本体名ではない想定）
    name = name.replace(/[★☆#]+$/g, '');
    return name;
  }

  /**
   * フィールドカード数をカウント（推しホロメンを除く）
   * @param {number} playerId - プレイヤーID
   * @returns {number} フィールドカード数
   */
  countFieldCards(playerId) {
    const player = this.players[playerId];
    if (!player) return 0;

    let count = 0;
    
    // センター、コラボ、バック1-5をチェック（推しホロメンは除外）
    const positions = ['center', 'collab', 'back1', 'back2', 'back3', 'back4', 'back5'];
    
    for (const position of positions) {
      if (player[position] && player[position].card_type?.includes('ホロメン')) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * 6枚フィールド制限をチェック
   * @param {number} playerId - プレイヤーID
   * @param {string} targetPosition - 配置予定位置
   * @param {string} sourceType - ソースタイプ ('hand' | 'field')
   * @returns {Object} チェック結果
   */
  checkFieldCardLimit(playerId, targetPosition, sourceType = 'hand') {
    const player = this.players[playerId];
    if (!player) {
      return { valid: false, reason: 'プレイヤーが見つかりません' };
    }

    // 推しホロメン位置は制限対象外
    if (targetPosition === 'oshi') {
      return { valid: true, reason: '推しホロメンは制限対象外' };
    }

    // 既存カードの移動（field→field）は制限対象外
    if (sourceType === 'field') {
      return { valid: true, reason: 'フィールド内移動は制限対象外' };
    }

    // コラボ移動は常に制限対象外（フィールド内移動のため）
    if (targetPosition === 'collab') {
      return { valid: true, reason: 'コラボ移動は制限対象外' };
    }

    // 現在のフィールドカード数を取得
    const currentCount = this.countFieldCards(playerId);
    
    // 配置予定位置に既にカードがある場合は、交換なので制限対象外
    if (player[targetPosition]) {
      return { valid: true, reason: '既存カードとの交換は制限対象外' };
    }

    // 新規配置で6枚制限チェック
    if (currentCount >= 6) {
      return { 
        valid: false, 
        reason: `フィールドには最大6枚のホロメンまで配置できます（現在${currentCount}枚）` 
      };
    }

    return { valid: true, reason: 'フィールド制限内' };
  }

  /**
   * フェーズ変更時の制御更新
   */
  updatePlacementControls() {
    const description = this.getPlacementDescription();
    
    // UI更新イベントを発火
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('placementRulesUpdated', {
        detail: description
      }));
    }
    
  }
}

// グローバルスコープに公開
window.HololivePlacementController = HololivePlacementController;
