"""集中管理所有卡片相關的映射關係"""

class CardMappings:
    FIELD_MAPPING = {
        'LIFE': ('life', lambda x: int(x)),
        'カードタイプ': ('card_type', lambda x: x.strip()),
        'タグ': ('tags', lambda x: [tag.strip('#') for tag in x.strip().split()]),
        'レアリティ': ('rarity', lambda x: x.strip()),
        '収録商品': ('product', lambda x: x.strip()),
        '色': ('color', lambda x: x.strip()),
        'HP': ('hp', lambda x: x.strip()),
        'Bloomレベル': ('bloom_level', lambda x: x.strip()),
        'バトンタッチ': ('baton_touch', lambda x: x.strip())
    }
    
    COLOR_MAPPING = {
        'type_red.png': 'red',
        'type_blue.png': 'blue',
        'type_yellow.png': 'yellow',
        'type_green.png': 'green',
        'type_purple.png': 'purple',
        'type_white.png': 'white'
    }
    
    DETAIL_MAPPING = {
        '色': 'color',
        'HP': 'hp',
        'LIFE': 'life',
        'Bloomレベル': 'bloom_level',
        'バトンタッチ': 'baton_touch'
    }
    
    ICON_MAPPING = {
        'arts_null.png': 'any',
        'arts_red.png': 'red',
        'arts_blue.png': 'blue',
        'arts_yellow.png': 'yellow',
        'arts_green.png': 'green',
        'arts_purple.png': 'purple',
        'arts_white.png': 'white'
    }
    
    KEYWORD_SUBTYPES = {
        'bloomEF.png': 'ブルームエフェクト',
        'collabEF.png': 'コラボエフェクト',
        'gift.png': 'ギフト'
    }
