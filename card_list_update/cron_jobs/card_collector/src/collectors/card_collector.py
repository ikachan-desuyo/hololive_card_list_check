"""負責收集卡片數據的主要模組"""
import requests
import json
import os
import time
import logging
from bs4 import BeautifulSoup
from src.parsers.card_parser import CardParser

class CardCollector:
    def __init__(self):
        self.base_url = 'https://hololive-official-cardgame.com/cardlist/cardsearch_ex'
        self.headers = {
            'Cookie': 'cardlist_view=text; cardlist_search_sort=new'
        }
        self.data_file = os.path.join('data', 'card_data.json')
        self.existing_cards = self.load_existing_data()

    def load_existing_data(self):
        try:
            if os.path.exists(self.data_file):
                with open(self.data_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            return {}
        except Exception as e:
            logging.error(f"Error loading existing data: {e}")
            return {}

    def save_data(self, data):
        try:
            with open(self.data_file, 'w', encoding='utf-8') as f:
                json.dump(data, ensure_ascii=False, indent=2, fp=f)
            logging.info("Data saved successfully")
        except Exception as e:
            logging.error(f"Error saving data: {e}")

    def parse_card(self, card_element):
        """解析卡片元素並返回卡片數據"""
        try:
            parser = CardParser(card_element)
            parser.parse_basic_info()
            parser.parse_card_info()
            parser.parse_detail_info()
            parser.parse_skills()
            card_key = parser.parse_id()
            return parser.card_data, card_key
        except Exception as e:
            logging.error(f"Error parsing card: {e}")
            return None, None

    def fetch_cards(self):
        page = 1
        all_cards = self.existing_cards.copy()
        total_processed_count = 0
        total_new_cards_count = 0
        
        while True:
            try:
                logging.info(f"Processing page {page}")
                params = {
                    'keyword': '',
                    'attribute[0]': 'all',
                    'expansion_name': '',
                    'card_kind[0]': 'all',
                    'rare[0]': 'all',
                    'bloom_level[0]': 'all',
                    'parallel[0]': 'all',
                    'page': str(page)
                }
                
                response = requests.get(self.base_url, headers=self.headers, params=params)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.text, 'html.parser')
                cards = soup.find_all('li', class_='ex-item')
                
                if not cards:
                    logging.info(f"No more cards found on page {page}")
                    break
                
                page_processed_count = 0
                page_new_cards_count = 0
                
                for card_element in cards:
                    page_processed_count += 1
                    card_data, card_key = self.parse_card(card_element)
                    if card_data:
                        # if card_key not in all_cards:
                        all_cards[card_key] = card_data
                        page_new_cards_count += 1
                        logging.info(f"Added new card: {card_key}")
                
                total_processed_count += page_processed_count
                total_new_cards_count += page_new_cards_count
                
                logging.info(f"Page {page} completed. Cards processed: {page_processed_count}, New cards: {page_new_cards_count}")
                
                # 保存每頁的進度
                self.save_data(all_cards)
                
                # 繼續下一頁
                page += 1
                time.sleep(1)  # 避免請求過於頻繁
                
            except Exception as e:
                logging.error(f"Error on page {page}: {e}")
                break
        
        logging.info(f"Collection completed. Total cards processed: {total_processed_count}, Total new cards: {total_new_cards_count}")
