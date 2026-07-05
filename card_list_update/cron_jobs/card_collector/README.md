# Card Collector Cron Job

ホロライブTCG公式サイトからカード情報を収集する cron ジョブです。

## 機能

- カード情報の自動クロール
- カードデータ（基本情報・スキルなど）の解析
- JSON ファイルへの保存
- 差分更新のサポート

## ディレクトリ構成

```
card_collector/
├── src/                    # ソースコードディレクトリ
│   ├── collectors/        # クローラー関連コード
│   ├── parsers/          # パーサー関連コード
│   ├── models/           # データモデル
│   └── utils/            # ユーティリティ関数
├── data/                  # データ保存ディレクトリ
├── logs/                  # ログディレクトリ
└── requirements.txt       # 依存関係の設定
```

## 実行方法

1. 依存関係をインストール:
```bash
pip install -r requirements.txt
```

2. プログラムを実行:
```bash
python -m src
```

## 出力

- カードデータは `data/card_data.json` に保存されます
- 実行ログは `logs/card_collector.log` に保存されます
