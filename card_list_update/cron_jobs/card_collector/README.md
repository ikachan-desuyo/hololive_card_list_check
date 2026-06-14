# Card Collector Cron Job

這個 cron job 負責從 Hololive TCG 官方網站收集卡片資料。

## 功能

- 自動爬取卡片資訊
- 解析卡片數據（基本信息、技能等）
- 保存到 JSON 文件
- 支持增量更新

## 目錄結構

```
card_collector/
├── src/                    # 源代碼目錄
│   ├── collectors/        # 爬蟲相關代碼
│   ├── parsers/          # 解析器相關代碼
│   ├── models/           # 資料模型
│   └── utils/            # 工具函數
├── data/                  # 資料存儲目錄
├── logs/                  # 日誌目錄
└── requirements.txt       # 依賴配置
```

## 運行方式

1. 安裝依賴：
```bash
pip install -r requirements.txt
```

2. 運行程式：
```bash
python -m src
```

## 輸出

- 卡片數據保存在 `data/card_data.json`
- 運行日誌保存在 `logs/card_collector.log`
