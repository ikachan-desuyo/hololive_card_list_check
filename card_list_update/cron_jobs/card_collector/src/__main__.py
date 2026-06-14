"""主程式入口"""
import logging
from src.collectors.card_collector import CardCollector
from src.utils.logger import setup_logger

def main():
    """主程式入口點"""
    # 設置日誌
    setup_logger()
    logging.info("Starting card collection process...")
    
    try:
        # 創建收集器實例並開始收集
        collector = CardCollector()
        collector.fetch_cards()
    except Exception as e:
        logging.error(f"Error in main process: {e}")
    
    logging.info("Card collection process completed")

if __name__ == "__main__":
    main()
