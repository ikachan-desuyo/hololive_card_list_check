"""負責解析卡片數據的模組"""
import re
import logging
from bs4 import BeautifulSoup
from src.models.card_mappings import CardMappings

class CardParser:
    def __init__(self, card_element):
        self.card_element = card_element
        self.card_data = {}
    
    def parse_basic_info(self):
        """解析基本信息（編號、名稱、圖片）"""
        try:
            self.card_data['number'] = self._get_text('p', 'number')
            self.card_data['name'] = self._get_text('p', 'name')
            
            img_element = self.card_element.find('div', class_='img').find('img')
            if img_element:
                self.card_data['image_url'] = 'https://hololive-official-cardgame.com' + img_element['src']
                self.card_data['image_alt'] = img_element.get('alt', '')
        except Exception as e:
            logging.error(f"Error parsing basic info: {e}")
    
    def parse_card_info(self):
        """解析卡片信息（類型、標籤等）"""
        try:
            info_dl = self.card_element.find('div', class_='info').find('dl')
            if not info_dl:
                return
            
            for dt, dd in zip(info_dl.find_all('dt'), info_dl.find_all('dd')):
                field = dt.text.strip()
                if field in CardMappings.FIELD_MAPPING:
                    key, transform = CardMappings.FIELD_MAPPING[field]
                    if key == 'product':
                        tmp_dd = str(dd)
                        self.card_data[key] = transform(tmp_dd.replace('<dd>','').replace('<br/>',',').replace('</dd>','').replace(' ',''))
                    else:
                        self.card_data[key] = transform(dd.text)
        except Exception as e:
            logging.error(f"Error parsing card info: {e}")
    
    def parse_detail_info(self):
        """解析詳細信息（顏色、HP等）"""
        try:
            info_detail = self.card_element.find('dl', class_='info_Detail')
                
            if not info_detail:
                # OSR, OUR, SECの場合
                for dt, dd in zip(self.card_element.find_all('dt'), self.card_element.find_all('dd')):
                    key = dt.text.strip()
                    
                    if key not in CardMappings.DETAIL_MAPPING:
                        continue
                    if key == "色":
                        value = dd.text.strip()
                        if value == "":
                            test_soup = BeautifulSoup(str(dd), 'html.parser')
                            value = test_soup.find('img')['alt']

                        if value == "◇":
                            value = "無色"

                        if value:
                            self.card_data['color'] = value
            else:
                for dt, dd in zip(info_detail.find_all('dt'), info_detail.find_all('dd')):
                    key = dt.text.strip()
                    if key not in CardMappings.DETAIL_MAPPING:
                        continue

                    field_name = CardMappings.DETAIL_MAPPING[key]

                    # バトンタッチは ◇◇（2nd/Buzz 等）のようにアイコンが複数ある。
                    # find('img')（先頭1個のみ）では個数が失われるため、全 <img> の alt を個数ぶん収集して色配列にする。
                    if field_name == 'baton_touch':
                        imgs = BeautifulSoup(str(dd), 'html.parser').find_all('img')
                        colors = []
                        for im in imgs:
                            alt = (im.get('alt') or '').strip()
                            colors.append('無色' if alt == '◇' else alt)
                        if colors:
                            self.card_data['baton_touch'] = colors
                        else:
                            txt = dd.text.strip()
                            if txt:
                                self.card_data['baton_touch'] = [txt]
                        continue

                    value = dd.text.strip()
                    if value == "":
                        test_soup = BeautifulSoup(str(dd), 'html.parser')
                        value = test_soup.find('img')['alt']
                    if value == "◇":
                        value = "無色"
                    if value:
                        self.card_data[field_name] = value
        except Exception as e:
            logging.error(f"Error parsing detail info: {e}")
    
    def parse_skills(self):
        """解析所有技能"""
        try:
            skills = []
            
            # 解析支援效果
            if self._is_support_card():
                support_skill = self._parse_support_skill()
                if support_skill:
                    skills.append(support_skill)
            
            # 解析其他技能（'extra' = エクストラ「このホロメンはデッキに何枚でも入れられる」等のキーワード枠）
            for skill_div in self.card_element.find_all('div', class_=['oshi', 'sp', 'arts', 'keyword', 'extra']):
                skill = self._parse_skill(skill_div)
                if skill:
                    skills.append(skill)
            
            if skills:
                self.card_data['skills'] = skills
        except Exception as e:
            logging.error(f"Error parsing skills: {e}")
    
    def _get_text(self, tag, class_name):
        """獲取指定元素的文本"""
        element = self.card_element.find(tag, class_=class_name)
        return element.text.strip() if element else ''
    
    def _parse_color(self, element):
        """解析顏色信息"""
        img = element.find('img')
        if img:
            src = img.get('src', '')
            return next((color for img_name, color in CardMappings.COLOR_MAPPING.items() 
                       if img_name in src), None)
        return None
    
    def _parse_baton_touch(self, element):
        """解析接力信息
        返回接力位置列表，每個位置可以是：
        - 'any': 表示可以接任意顏色（顯示為null圖標）
        - 'no': 表示該位置不能接力（沒有圖標）
        """
        result = []
        icons = element.find_all('img')
        
        # 如果沒有任何圖標，表示不能接力
        if not icons:
            return ['no']
            
        # 解析每個圖標
        for img in icons:
            src = img.get('src', '')
            for icon_src, color in CardMappings.ICON_MAPPING.items():
                if icon_src in src:
                    result.append(color)
                    break
                
        return result 
    
    def _is_support_card(self):
        """檢查是否為支援卡片"""
        return 'card_type' in self.card_data and 'サポート' in self.card_data['card_type']
    
    def _parse_support_skill(self):
        """解析支援技能"""
        info_dl = self.card_element.find('div', class_='info').find('dl')
        if not info_dl:
            return None
            
        for dt, dd in zip(info_dl.find_all('dt'), info_dl.find_all('dd')):
            if dt.text.strip() == '能力テキスト':
                return {
                    'type': 'サポート効果',
                    'name': dd.text.strip()
                }
        return None
    
    def _parse_skill(self, skill_div):
        """解析單個技能"""
        try:
            skill_type = skill_div.find('p').text.strip()
            skill_text = skill_div.find_all('p')[-1].text.strip()
            
            skill_data = {'type': skill_type}
            
            # 解析關鍵字技能的子類型
            if skill_type == 'キーワード':
                subtype = self._parse_keyword_subtype(skill_div)
                if subtype:
                    skill_data['subtype'] = subtype
            
            # 解析技能文本
            skill_data.update(self._parse_skill_text(skill_text, skill_type))
            
            # 只在非推し技能時解析技能圖標（エクストラはアイコンを持たないため対象外）
            if skill_type not in ['推しスキル', 'SP推しスキル', 'キーワード', 'エクストラ']:
                icons = self._parse_skill_icons(skill_div)
                if icons:
                    skill_data['icons'] = icons
            
            return skill_data
        except Exception as e:
            logging.error(f"Error parsing skill: {e}")
            return None
    
    def _parse_keyword_subtype(self, skill_div):
        """解析關鍵字技能的子類型"""
        img = skill_div.find('img')
        if img:
            src = img.get('src', '')
            return next((subtype for img_name, subtype in CardMappings.KEYWORD_SUBTYPES.items() 
                       if img_name in src), None)
        return None
    
    def _parse_skill_text(self, skill_text, skill_type):
        """解析技能文本"""
        if skill_type == 'アーツ':
            return self._parse_arts_skill(skill_text)
        elif skill_type == 'キーワード':
            return self._parse_keyword_skill(skill_text)
        else:
            return {'text': skill_text}
    
    def _parse_arts_skill(self, skill_text):
        """解析アーツ技能文本"""
        parts = skill_text.split('\n', 1)
        first_part = parts[0].strip()
        
        match = re.match(r'^(.+?)\s*(\d+\+?|\?\+?)$', first_part)
        if not match:
            return {'text': skill_text}
        
        result = {
            'name': match.group(1).strip(),
            'dmg': match.group(2).strip()
        }
        
        if len(parts) > 1 and parts[1].strip():
            result['description'] = parts[1].strip()
        
        return result
    
    def _parse_keyword_skill(self, skill_text):
        """解析キーワード技能文本"""
        parts = skill_text.split('\n', 1)
        return {
            'name': parts[0].strip(),
            'description': parts[1].strip() if len(parts) > 1 else ''
        }
    
    def _parse_skill_icons(self, skill_div):
        """解析技能圖標"""
        icons = []
        # 先處理主要圖標
        for img in skill_div.select('img:not(.tokkou img)'):  # 排除tokkou中的圖標
            src = img.get('src', '')
            for icon_src, color in CardMappings.ICON_MAPPING.items():
                if icon_src in src:
                    icons.append(color)
                    break
        
        result = {'main': icons if icons else None}
        
        # 處理tokkou圖標
        tokkou_span = skill_div.find('span', class_='tokkou')
        if tokkou_span and tokkou_span.find('img'):
            tokkou_alt = tokkou_span.find('img').get('alt', '')
            if tokkou_alt:
                result['tokkou'] = [tokkou_alt]
                
        return result
    
    def parse_id(self):
        """解析卡片的唯一識別碼"""
        image_url = self.card_data.get('image_url', '')
        card_id = image_url.split('/')[-1].split('.')[0] if image_url else f"{self.card_data['number']}-{self.card_data.get('rarity', '')}"
        self.card_data['id'] = card_id
        return card_id
