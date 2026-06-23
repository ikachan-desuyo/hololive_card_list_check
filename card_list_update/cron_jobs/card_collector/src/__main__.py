"""メインプログラムのエントリポイント"""
import logging
from src.collectors.card_collector import CardCollector
from src.utils.logger import setup_logger

def main():
    """メインプログラムのエントリポイント"""
    # ロガーを設定
    setup_logger()
    logging.info("Starting card collection process...")
    
    try:
        # コレクターのインスタンスを作成して収集を開始
        collector = CardCollector()
        collector.fetch_cards()
    except Exception as e:
        logging.error(f"Error in main process: {e}")
    
    logging.info("Card collection process completed")

if __name__ == "__main__":
    main()
