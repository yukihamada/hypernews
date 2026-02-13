#!/usr/bin/env python3
"""Generate even more feeds — targeting 2000+ extra to reach 3000 total."""

import sys

feeds = []

def add(url, source, category):
    feeds.append((url, source, category))

# ============================================================
# GOOGLE NEWS — Granular Japanese topic queries (~400)
# ============================================================

# Companies & brands
jp_companies = [
    "トヨタ", "ホンダ", "日産", "スバル", "マツダ", "三菱自動車",
    "ソニー", "パナソニック", "シャープ", "東芝", "日立", "富士通",
    "NEC", "キヤノン", "ニコン", "オリンパス", "京セラ",
    "任天堂", "カプコン", "スクエニ", "バンダイナムコ", "コナミ", "セガ",
    "ソフトバンク", "KDDI", "NTTドコモ", "楽天モバイル",
    "メルカリ", "LINE", "サイバーエージェント", "DeNA", "グリー", "ミクシィ",
    "ファーストリテイリング", "セブンイレブン", "イオン", "ローソン",
    "JAL", "ANA", "JR東日本", "JR東海", "JR西日本",
    "三菱UFJ", "みずほ", "三井住友", "野村證券", "大和証券",
    "東京海上", "日本生命", "第一生命",
    "武田薬品", "アステラス製薬", "大塚製薬", "エーザイ",
    "旭化成", "住友化学", "三井化学",
    "清水建設", "大成建設", "鹿島建設", "竹中工務店",
    "電通", "博報堂", "リクルート",
    "キリン", "サントリー", "アサヒ", "味の素", "日清食品",
]

for company in jp_companies:
    add(
        f"https://news.google.com/rss/search?q={company}&hl=ja&gl=JP&ceid=JP:ja",
        f"GN: {company}",
        "business"
    )

# Japanese regions & cities
jp_regions = [
    "北海道 札幌", "青森", "岩手 盛岡", "宮城 仙台", "秋田",
    "山形", "福島", "茨城 水戸", "栃木 宇都宮", "群馬 前橋",
    "埼玉 さいたま", "千葉", "東京", "神奈川 横浜",
    "新潟", "富山", "石川 金沢", "福井",
    "山梨 甲府", "長野 松本", "岐阜", "静岡 浜松",
    "愛知 名古屋", "三重 津", "滋賀 大津", "京都",
    "大阪", "兵庫 神戸", "奈良", "和歌山",
    "鳥取", "島根 松江", "岡山", "広島", "山口",
    "徳島", "香川 高松", "愛媛 松山", "高知",
    "福岡", "佐賀", "長崎", "熊本", "大分",
    "宮崎", "鹿児島", "沖縄 那覇",
]

for region in jp_regions:
    q = region.replace(" ", "+")
    label = region.split()[0]
    add(
        f"https://news.google.com/rss/search?q={q}+ニュース&hl=ja&gl=JP&ceid=JP:ja",
        f"GN: {label}ニュース",
        "general"
    )

# Japanese specific topics
jp_topics = [
    "確定申告 税金", "年金 社会保障", "マイナンバー",
    "国会 法案", "憲法改正", "安全保障",
    "コロナ 感染症", "ワクチン 予防接種",
    "地震 津波 防災", "台風 気象", "原発 再稼働",
    "新幹線 リニア", "高速道路 渋滞",
    "甲子園 高校野球", "箱根駅伝", "大相撲",
    "受験 入試", "大学 研究", "奨学金",
    "保育園 待機児童", "子育て 育児",
    "働き方改革 残業", "テレワーク リモートワーク",
    "円安 円高 為替", "株式 投資信託",
    "NISA iDeCo", "住宅ローン 金利",
    "食品 値上げ", "電気代 ガス代",
    "訪日外国人 インバウンド", "万博 2025",
    "宇宙 JAXA", "量子コンピュータ",
    "EV 電気自動車", "水素 燃料電池",
    "再生可能エネルギー 太陽光 風力",
    "農業 スマート農業", "漁業 水産",
    "ふるさと納税", "移住 地方創生",
    "ペット 犬 猫", "料理 レシピ",
    "美容 コスメ", "健康 ダイエット",
    "旅行 温泉", "キャンプ アウトドア",
    "鉄道 電車 ダイヤ", "飛行機 空港",
    "NFT デジタルアート", "メタバース VR",
    "ドローン 空飛ぶクルマ",
    "ChatGPT 使い方", "AI画像生成",
    "プログラミング教育", "STEM教育",
]

for topic in jp_topics:
    q = topic.replace(" ", "+")
    label = topic.split()[0]
    cat = "general"
    if any(w in topic for w in ["株", "為替", "NISA", "投資", "ローン", "値上げ", "電気代"]):
        cat = "business"
    elif any(w in topic for w in ["宇宙", "量子", "EV", "水素", "再生可能", "AI", "プログラミング"]):
        cat = "tech"
    elif any(w in topic for w in ["甲子園", "駅伝", "相撲"]):
        cat = "sports"
    elif any(w in topic for w in ["ワクチン", "コロナ", "感染"]):
        cat = "science"
    add(
        f"https://news.google.com/rss/search?q={q}&hl=ja&gl=JP&ceid=JP:ja",
        f"GN: {label}",
        cat
    )

# ============================================================
# GOOGLE NEWS — English granular queries (~300)
# ============================================================

en_company_queries = [
    "Apple iPhone", "Apple Mac", "Apple Watch", "Apple Vision Pro",
    "Google Pixel", "Google Search", "Google Cloud", "YouTube",
    "Microsoft Windows", "Microsoft Office", "Microsoft Azure", "Xbox",
    "Amazon retail", "Amazon Prime", "Amazon Kindle",
    "Meta Facebook", "Meta Instagram", "WhatsApp", "Threads app",
    "Tesla Model", "Tesla Cybertruck", "SpaceX Starship", "SpaceX Starlink",
    "NVIDIA RTX", "NVIDIA data center", "AMD Ryzen", "Intel processor",
    "Samsung Galaxy", "Samsung semiconductor",
    "Netflix", "Disney Plus streaming", "Spotify", "TikTok",
    "Uber", "Airbnb", "DoorDash", "Instacart",
    "Coinbase", "Binance", "FTX crypto",
    "Salesforce CRM", "Snowflake data", "Palantir",
    "Stripe payments", "PayPal", "Square Block",
    "OpenAI ChatGPT", "Anthropic Claude", "Google Gemini",
    "Midjourney", "Stability AI", "Mistral AI", "Perplexity AI",
    "Hugging Face models", "Cohere AI",
    "Unity game engine", "Unreal Engine Epic",
    "Docker container", "Kubernetes", "Terraform HashiCorp",
    "Cloudflare", "Vercel", "Supabase", "MongoDB",
    "Figma design", "Canva", "Adobe Creative",
    "Zoom video", "Slack messaging", "Notion productivity",
    "GitHub Copilot", "VS Code extensions",
    "Shopify ecommerce", "Wix website",
    "Reddit IPO", "Twitter X Elon",
    "Boeing aviation", "Airbus", "SpaceX launch",
    "Toyota electric", "Volkswagen EV", "BYD electric car",
    "Rivian", "Lucid Motors", "NIO electric",
    "Sony PlayStation", "Nintendo Switch", "Steam Valve",
]

for q in en_company_queries:
    safe_q = q.replace(" ", "+")
    label = q.split()[0]
    cat = "tech" if any(w in q.lower() for w in ["ai", "gpu", "processor", "software", "engine", "cloud", "code", "container"]) else "business"
    add(
        f"https://news.google.com/rss/search?q={safe_q}&hl=en&gl=US&ceid=US:en",
        f"GN: {label} {q.split()[1] if len(q.split()) > 1 else ''}".strip(),
        cat
    )

en_topic_queries = [
    # Science & Space
    "Mars mission", "James Webb telescope", "dark matter", "black hole discovery",
    "exoplanet habitable", "fusion reactor", "particle physics CERN",
    "CRISPR gene therapy", "mRNA vaccine", "brain computer interface",
    "quantum supremacy", "superconductor", "graphene material",
    "biodiversity extinction", "coral reef", "deforestation Amazon",
    "Arctic ice melting", "sea level rise", "carbon capture",
    "nuclear energy SMR", "hydrogen economy", "solid state battery",
    # Sports
    "Premier League transfer", "Champions League", "World Cup",
    "Super Bowl NFL", "NBA Finals", "World Series MLB",
    "Wimbledon tennis", "Masters golf", "Tour de France",
    "UFC pay per view", "boxing heavyweight", "WWE wrestling",
    "Olympics 2028", "Paralympics",
    "esports tournament", "League of Legends", "Valorant esports",
    # Entertainment
    "Oscar nominations", "Emmy Awards", "Grammy Awards",
    "box office weekend", "Marvel Cinematic Universe",
    "Star Wars", "Lord of the Rings", "James Bond",
    "Taylor Swift", "BTS K-pop", "Drake music",
    "PlayStation exclusive", "Xbox Game Pass", "Nintendo Direct",
    "Steam sale", "indie game", "virtual reality gaming",
    "manga sales Japan", "anime season", "Crunchyroll",
    "webtoon comics", "cosplay convention",
    # Society
    "housing crisis", "student loan", "minimum wage",
    "healthcare reform", "mental health", "opioid crisis",
    "gun control", "abortion rights", "LGBTQ rights",
    "immigration policy", "border security",
    "social media regulation", "data privacy GDPR",
    "antitrust big tech", "Section 230",
    "remote work trend", "four day work week",
    "universal basic income", "gig economy",
    # Geopolitics
    "NATO expansion", "BRICS summit", "G7 summit",
    "US China relations", "Taiwan strait", "South China Sea",
    "North Korea missile", "Iran nuclear", "Israel Palestine",
    "Saudi Arabia oil", "OPEC production",
    "Ukraine counteroffensive", "Russia sanctions",
    "EU enlargement", "Brexit impact",
    "India Pakistan", "Myanmar conflict",
    "Africa coup", "Venezuela crisis",
]

for q in en_topic_queries:
    safe_q = q.replace(" ", "+")
    words = q.split()
    label = f"{words[0].title()} {words[1].title() if len(words) > 1 else ''}"
    cat = "general"
    if any(w in q.lower() for w in ["mars", "telescope", "quantum", "crispr", "fusion", "particle", "biodiversity", "coral", "carbon", "nuclear", "vaccine", "brain", "superconductor"]):
        cat = "science"
    elif any(w in q.lower() for w in ["premier", "champion", "super bowl", "nba", "mlb", "wimbledon", "masters", "tour de france", "ufc", "boxing", "wrestling", "olympics", "esports", "league of legends", "valorant"]):
        cat = "sports"
    elif any(w in q.lower() for w in ["oscar", "emmy", "grammy", "box office", "marvel", "star wars", "playstation", "xbox", "nintendo", "steam", "anime", "manga", "cosplay", "gaming"]):
        cat = "entertainment"
    add(
        f"https://news.google.com/rss/search?q={safe_q}&hl=en&gl=US&ceid=US:en",
        f"GN: {label.strip()}",
        cat
    )

# ============================================================
# GOOGLE NEWS — More languages (~200)
# ============================================================

# German topics
de_topics = [
    "Politik Deutschland", "Wirtschaft Deutschland", "Sport Bundesliga",
    "Technologie KI", "Wissenschaft Forschung", "Kultur Film",
    "Gesundheit Medizin", "Umwelt Klima", "Auto Elektro",
    "Bildung Schule", "Immobilien Wohnung", "Reise Urlaub",
    "Finanzen Börse", "Startup Gründer", "Datenschutz DSGVO",
    "Energie Atomkraft", "Fußball Champions League", "Formel 1 Motorsport",
    "Handball Weltmeisterschaft", "Tennis ATP",
]
for q in de_topics:
    safe_q = q.replace(" ", "+")
    label = q.split()[0]
    add(f"https://news.google.com/rss/search?q={safe_q}&hl=de&gl=DE&ceid=DE:de", f"GN DE: {label}", "general")

# French topics
fr_topics = [
    "politique France", "économie entreprise", "sport football Ligue1",
    "technologie numérique", "science recherche", "culture cinéma",
    "santé médecine", "environnement climat", "automobile électrique",
    "éducation université", "immobilier logement", "voyage tourisme",
    "finance bourse", "startup innovation", "cybersécurité",
    "énergie nucléaire", "rugby Top14", "tennis Roland Garros",
    "cyclisme Tour France", "JO Paris olympique",
]
for q in fr_topics:
    safe_q = q.replace(" ", "+")
    label = q.split()[0]
    add(f"https://news.google.com/rss/search?q={safe_q}&hl=fr&gl=FR&ceid=FR:fr", f"GN FR: {label}", "general")

# Spanish topics
es_topics = [
    "política España", "economía empresa", "deporte fútbol LaLiga",
    "tecnología digital", "ciencia investigación", "cultura cine",
    "salud medicina", "medioambiente clima", "automóvil eléctrico",
    "educación universidad", "inmobiliaria vivienda", "viaje turismo",
    "finanzas bolsa", "startup emprendimiento",
    "energía renovable", "baloncesto ACB", "tenis Nadal",
    "MotoGP motociclismo", "Fórmula 1",
]
for q in es_topics:
    safe_q = q.replace(" ", "+")
    label = q.split()[0]
    add(f"https://news.google.com/rss/search?q={safe_q}&hl=es&gl=ES&ceid=ES:es", f"GN ES: {label}", "general")

# Portuguese topics
pt_topics = [
    "política Brasil", "economia negócios", "esporte futebol Brasileirão",
    "tecnologia digital", "ciência pesquisa", "cultura cinema",
    "saúde medicina", "meio ambiente clima", "carro elétrico",
    "educação universidade", "imóveis moradia",
    "finanças bolsa", "startup inovação",
    "energia renovável", "MMA UFC brasileiro",
]
for q in pt_topics:
    safe_q = q.replace(" ", "+")
    label = q.split()[0]
    add(f"https://news.google.com/rss/search?q={safe_q}&hl=pt-BR&gl=BR&ceid=BR:pt-419", f"GN BR: {label}", "general")

# Italian topics
it_topics = [
    "politica Italia", "economia impresa", "sport calcio SerieA",
    "tecnologia digitale", "scienza ricerca", "cultura cinema",
    "salute medicina", "ambiente clima", "auto elettrica",
    "finanza borsa", "startup innovazione",
    "energia nucleare", "basket NBA", "tennis Sinner",
    "Formula1 Ferrari", "ciclismo Giro Italia",
]
for q in it_topics:
    safe_q = q.replace(" ", "+")
    label = q.split()[0]
    add(f"https://news.google.com/rss/search?q={safe_q}&hl=it&gl=IT&ceid=IT:it", f"GN IT: {label}", "general")

# Chinese topics
zh_topics = [
    "科技 芯片", "人工智能 大模型", "经济 GDP", "房地产 楼市",
    "汽车 电动车", "医疗 健康", "教育 高考",
    "环境 碳中和", "军事 国防", "太空 航天",
    "游戏 电竞", "影视 电影", "动漫 漫画",
    "足球 中超", "篮球 CBA", "乒乓球",
    "股市 A股", "基金 理财", "区块链 加密货币",
    "5G 通信", "量子计算", "机器人 自动化",
]
for q in zh_topics:
    safe_q = q.replace(" ", "+")
    label = q.split()[0]
    add(f"https://news.google.com/rss/search?q={safe_q}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant", f"GN ZH: {label}", "general")

# Korean topics
ko_topics = [
    "정치 국회", "경제 주식시장", "스포츠 야구 KBO",
    "기술 반도체", "과학 우주", "문화 영화",
    "건강 의료", "환경 기후", "자동차 전기차",
    "교육 수능", "부동산 아파트",
    "금융 투자", "스타트업 벤처",
    "에너지 원전", "축구 K리그", "배구 프로배구",
    "e스포츠 게임", "K-pop 아이돌", "드라마 방송",
    "AI 인공지능", "삼성 반도체", "현대차 기아",
]
for q in ko_topics:
    safe_q = q.replace(" ", "+")
    label = q.split()[0]
    add(f"https://news.google.com/rss/search?q={safe_q}&hl=ko&gl=KR&ceid=KR:ko", f"GN KR: {label}", "general")

# Hindi topics
hi_topics = [
    "राजनीति भारत", "अर्थव्यवस्था", "खेल क्रिकेट",
    "प्रौद्योगिकी", "विज्ञान अनुसंधान", "बॉलीवुड फिल्म",
    "स्वास्थ्य चिकित्सा", "पर्यावरण जलवायु", "शिक्षा परीक्षा",
    "रक्षा सेना", "अंतरिक्ष इसरो",
]
for q in hi_topics:
    safe_q = q.replace(" ", "+")
    label = q.split()[0][:6]
    add(f"https://news.google.com/rss/search?q={safe_q}&hl=hi&gl=IN&ceid=IN:hi", f"GN HI: {label}", "general")

# Arabic topics
ar_topics = [
    "سياسة عربية", "اقتصاد أعمال", "رياضة كرة قدم",
    "تكنولوجيا ذكاء اصطناعي", "علوم فضاء", "ثقافة سينما",
    "صحة طب", "بيئة مناخ", "طاقة نفط",
    "تعليم جامعات", "عقارات",
]
for q in ar_topics:
    safe_q = q.replace(" ", "+")
    label = q.split()[0][:6]
    add(f"https://news.google.com/rss/search?q={safe_q}&hl=ar&gl=SA&ceid=SA:ar", f"GN AR: {label}", "general")

# Thai topics
th_topics = [
    "การเมือง ไทย", "เศรษฐกิจ ธุรกิจ", "กีฬา ฟุตบอล",
    "เทคโนโลยี AI", "วิทยาศาสตร์", "บันเทิง ภาพยนตร์",
    "สุขภาพ การแพทย์", "ท่องเที่ยว",
]
for q in th_topics:
    safe_q = q.replace(" ", "+")
    label = q.split()[0][:6]
    add(f"https://news.google.com/rss/search?q={safe_q}&hl=th&gl=TH&ceid=TH:th", f"GN TH: {label}", "general")

# Vietnamese topics
vi_topics = [
    "chính trị Việt Nam", "kinh tế doanh nghiệp", "thể thao bóng đá",
    "công nghệ AI", "khoa học vũ trụ", "giải trí phim",
    "sức khỏe y tế", "du lịch",
]
for q in vi_topics:
    safe_q = q.replace(" ", "+")
    label = q.split()[0]
    add(f"https://news.google.com/rss/search?q={safe_q}&hl=vi&gl=VN&ceid=VN:vi", f"GN VI: {label}", "general")

# Indonesian topics
id_topics = [
    "politik Indonesia", "ekonomi bisnis", "olahraga sepak bola",
    "teknologi AI", "sains antariksa", "hiburan film",
    "kesehatan medis", "wisata pariwisata",
]
for q in id_topics:
    safe_q = q.replace(" ", "+")
    label = q.split()[0]
    add(f"https://news.google.com/rss/search?q={safe_q}&hl=id&gl=ID&ceid=ID:id", f"GN ID: {label}", "general")

# Turkish topics
tr_topics = [
    "siyaset Türkiye", "ekonomi iş", "spor futbol Süper Lig",
    "teknoloji yapay zeka", "bilim uzay", "eğlence sinema",
    "sağlık tıp", "eğitim üniversite",
]
for q in tr_topics:
    safe_q = q.replace(" ", "+")
    label = q.split()[0]
    add(f"https://news.google.com/rss/search?q={safe_q}&hl=tr&gl=TR&ceid=TR:tr", f"GN TR: {label}", "general")

# Polish topics
pl_topics = [
    "polityka Polska", "gospodarka biznes", "sport piłka nożna",
    "technologia AI", "nauka kosmos", "kultura film",
    "zdrowie medycyna",
]
for q in pl_topics:
    safe_q = q.replace(" ", "+")
    label = q.split()[0]
    add(f"https://news.google.com/rss/search?q={safe_q}&hl=pl&gl=PL&ceid=PL:pl", f"GN PL: {label}", "general")

# Dutch topics
nl_topics = [
    "politiek Nederland", "economie bedrijf", "sport voetbal Eredivisie",
    "technologie AI", "wetenschap ruimte", "cultuur film",
    "gezondheid geneeskunde",
]
for q in nl_topics:
    safe_q = q.replace(" ", "+")
    label = q.split()[0]
    add(f"https://news.google.com/rss/search?q={safe_q}&hl=nl&gl=NL&ceid=NL:nl", f"GN NL: {label}", "general")

# Russian topics
ru_topics = [
    "политика Россия", "экономика бизнес", "спорт футбол",
    "технологии искусственный интеллект", "наука космос",
    "культура кино", "здоровье медицина",
]
for q in ru_topics:
    safe_q = q.replace(" ", "+")
    label = q.split()[0]
    add(f"https://news.google.com/rss/search?q={safe_q}&hl=ru&gl=RU&ceid=RU:ru", f"GN RU: {label}", "general")

# ============================================================
# MORE REDDIT — niche subreddits (~200)
# ============================================================

reddit_extra = {
    "tech": [
        "Frontend", "backend", "ExperiencedDevs", "cscareerquestions",
        "SoftwareEngineering", "iOSProgramming", "AndroidDev",
        "FlutterDev", "SwiftUI", "reactnative",
        "datascience", "dataengineering", "MLOps",
        "reinforcementlearning", "computervision", "NLP",
        "Cybersecurity", "pentesting", "malware",
        "homeautomation", "smarthome", "3Dprinting",
        "Bitcoin", "CryptoTechnology", "solana", "cardano",
        "CloudFlare", "aws", "GoogleCloud",
        "LanguageTechnology", "MachineLearningNews",
        "learnmachinelearning", "bioinformatics",
        "robotics", "drones", "electricvehicles",
        "RISCV", "FPGA", "embedded",
        "PostgreSQL", "redis", "elasticsearch",
        "rust", "zig", "elixir", "haskell", "scala",
        "rails", "django", "FastAPI", "nextjs",
        "sveltejs", "htmx", "tailwindcss",
    ],
    "science": [
        "Astronomy", "cosmology", "QuantumPhysics",
        "Paleontology", "Anthropology", "linguistics",
        "neuroscience", "psychology", "cognitivescience",
        "climate", "renewable", "nuclear",
        "math", "statistics", "MachineLearning",
        "biotech", "microbiology", "virology",
        "geology", "volcanoes", "earthquakes",
        "materials", "nanotechnology",
        "philosophy", "askphilosophy",
    ],
    "business": [
        "Entrepreneur", "venturecapital", "SaaS",
        "Accounting", "tax", "FinancialPlanning",
        "ValueInvesting", "options", "Forex",
        "RealEstate", "commercialrealestate",
        "SupplyChain", "logistics",
        "ecommerce", "dropshipping",
        "marketing", "SEO", "analytics",
    ],
    "entertainment": [
        "anime_irl", "animesuggest", "LightNovels",
        "webtoons", "manhwa", "manhua",
        "PCGameDeals", "FreeGameFindings", "GameDeals",
        "retrogaming", "emulation",
        "vinyl", "audiophile", "headphones",
        "Photography", "videography", "filmmaking",
        "Screenwriting", "writing", "worldbuilding",
        "DnD", "tabletopgaming", "boardgames",
        "cosplay", "lego", "modelmakers",
    ],
    "sports": [
        "soccer", "FantasyPL", "LaLiga", "Bundesliga", "SerieA",
        "MLS", "jleague",
        "baseball", "NPB",
        "CollegeBasketball", "collegebaseball",
        "CFB", "CollegeFootball",
        "SquaredCircle", "AEWOfficial",
        "Parkour", "bouldering", "climbing",
        "Triathlon", "ultrarunning",
        "rowing", "sailing",
    ],
    "general": [
        "anime", "todayilearned", "Futurology",
        "Showerthoughts", "mildlyinteresting",
        "history", "AskHistorians",
        "MapPorn", "geography",
        "urbanplanning", "architecture",
        "legaladvice", "law",
        "Teachers", "education",
        "Parenting", "daddit",
        "gardening", "cooking", "MealPrepSunday",
        "personalfinance", "frugal",
        "minimalism", "zerowaste",
    ],
}

for cat, subs in reddit_extra.items():
    for sub in subs:
        add(f"https://www.reddit.com/r/{sub}/.rss", f"r/{sub}", cat)

# ============================================================
# MORE COUNTRY NEWS OUTLETS (~100)
# ============================================================

more_country = [
    # Nordics
    ("https://www.dn.se/rss/", "Dagens Nyheter", "general"),
    ("https://www.svd.se/feed/articles.rss", "Svenska Dagbladet", "general"),
    ("https://www.dr.dk/nyheder/service/feeds/allenyheder", "DR (Denmark)", "general"),
    ("https://www.vg.no/rss/feed/", "VG (Norway)", "general"),
    ("https://www.hs.fi/rss/", "Helsingin Sanomat", "general"),
    # Eastern Europe
    ("https://www.gazeta.pl/0,0.xml", "Gazeta.pl (PL)", "general"),
    ("https://www.novinky.cz/rss", "Novinky.cz", "general"),
    ("https://index.hu/24ora/rss/", "Index.hu (HU)", "general"),
    ("https://www.dnevnik.bg/rssc/", "Dnevnik (BG)", "general"),
    ("https://www.b92.net/eng/rss/news.xml", "B92 (Serbia)", "general"),
    # More Asia
    ("https://www.dawn.com/feed", "Dawn (Pakistan)", "general"),
    ("https://www.thedailystar.net/rss.xml", "Daily Star (BD)", "general"),
    ("https://www.dailymirror.lk/RSS_Feeds/breaking-news.xml", "Daily Mirror (SL)", "general"),
    ("https://kathmandupost.com/rss", "Kathmandu Post", "general"),
    ("https://www.manilatimes.net/feed/", "Manila Times", "general"),
    ("https://www.thestar.com.my/rss/News", "The Star (MY)", "general"),
    ("https://www.scmp.com/rss/17/feed", "SCMP Sport", "sports"),
    ("https://koreabiomed.com/rss/allArticle.xml", "Korea Biomed", "science"),
    # More Africa
    ("https://www.theeastafrican.co.ke/feed", "East African", "general"),
    ("https://www.citizen.digital/rss", "Citizen Digital (KE)", "general"),
    ("https://www.timeslive.co.za/rss/", "TimesLIVE (SA)", "general"),
    ("https://www.iol.co.za/rss", "IOL (SA)", "general"),
    # More Latin America
    ("https://www.elcomercio.pe/feed/", "El Comercio (Peru)", "general"),
    ("https://www.latercera.com/feed/", "La Tercera (Chile)", "general"),
    ("https://www.elespectador.com/rss/", "El Espectador (Colombia)", "general"),
    ("https://www.prensa.com/feed/", "La Prensa (Panama)", "general"),
    ("https://www.laprensagrafica.com/feed/", "La Prensa Gráfica (SV)", "general"),
]
for url, src, cat in more_country:
    add(url, src, cat)

# ============================================================
# HATENA BOOKMARK HOT ENTRIES (~10)
# ============================================================
hatena_cats = [
    ("it", "はてブ IT", "tech"),
    ("economics", "はてブ 政治経済", "business"),
    ("game", "はてブ ゲーム", "entertainment"),
    ("fun", "はてブ おもしろ", "entertainment"),
    ("entertainment", "はてブ エンタメ", "entertainment"),
    ("life", "はてブ 暮らし", "general"),
    ("knowledge", "はてブ 学び", "science"),
    ("social", "はてブ 世の中", "general"),
    ("all", "はてブ 総合", "general"),
]
for slug, name, cat in hatena_cats:
    add(f"https://b.hatena.ne.jp/hotentry/{slug}.rss", name, cat)

# ============================================================
# PRINT
# ============================================================
seen = set()
unique_feeds = []
for url, src, cat in feeds:
    if url not in seen:
        seen.add(url)
        unique_feeds.append((url, src, cat))

print(f"# Generated {len(unique_feeds)} additional feeds", file=sys.stderr)

for url, src, cat in unique_feeds:
    safe_src = src.replace('"', '\\"')
    safe_url = url.replace('"', '\\"')
    print(f'\n[[feeds]]\nurl = "{safe_url}"\nsource = "{safe_src}"\ncategory = "{cat}"')
