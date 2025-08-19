#!/bin/bash

# カード効果ファイルのアーツ効果タイミングを一括修正するスクリプト

CARD_EFFECTS_DIR="/home/tsubasa-murakami/work/hololive_card_list_check/battle_simulator/card-effects/cards"

echo "🔧 アーツ効果のタイミング設定を一括修正中..."

# アーツ効果のtiming: 'manual'の後にauto_trigger: 'arts'を追加
find "$CARD_EFFECTS_DIR" -name "*.js" -exec sed -i 's/timing: '\''manual'\'',$/timing: '\''manual'\'',\n      auto_trigger: '\''arts'\'', \/\/ アーツ使用時に自動モーダル表示/g' {} \;

# type: 'art'の行があるファイルのみを対象にして、timingがmanualでauto_triggerがないものを修正
for file in "$CARD_EFFECTS_DIR"/*.js; do
  # type: 'art'があるかチェック
  if grep -q "type: 'art'" "$file"; then
    echo "  📋 処理中: $(basename "$file")"
    
    # timing: 'manual'があってauto_triggerがない行を修正
    sed -i '/type: '\''art'\''/,/},/{
      s/timing: '\''manual'\'',$/timing: '\''manual'\'',\
      auto_trigger: '\''arts'\'', \/\/ アーツ使用時に自動モーダル表示/
    }' "$file"
  fi
done

echo "✅ 一括修正完了！"
