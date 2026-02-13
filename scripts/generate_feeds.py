#!/usr/bin/env python3
"""Generate massive feeds.toml entries to reach 3000+ feeds."""

import sys

feeds = []

def add(url, source, category):
    feeds.append((url, source, category))

# ============================================================
# GOOGLE NEWS RSS — Topic & Search feeds (~600)
# ============================================================

# Google News section topics (encoded IDs)
GN_TOPICS_JA = {
    "WORLD": "CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtcGhHZ0pLVUNnQVAB",
    "NATION": "CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtcGhHZ0pLVUNnQVAB",
    "BUSINESS": "CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtcGhHZ0pLVUNnQVAB",
    "TECHNOLOGY": "CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtcGhHZ0pLVUNnQVAB",
    "ENTERTAINMENT": "CAAqJggKIiBDQkFTRWdvSUwyMHZNREpxYW5RU0FtcGhHZ0pLVUNnQVAB",
    "SPORTS": "CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp1ZEdvU0FtcGhHZ0pLVUNnQVAB",
    "SCIENCE": "CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp0Y1RjU0FtcGhHZ0pLVUNnQVAB",
    "HEALTH": "CAAqJggKIiBDQkFTRWdvSUwyMHZNR3QwTlRFU0FtcGhHZ0pLVUNnQVAB",
}

# Google News search queries — Japanese
gn_ja_queries = [
    # Tech
    "AI 人工知能", "ChatGPT", "生成AI", "ロボット", "自動運転", "量子コンピュータ",
    "ブロックチェーン", "メタバース", "5G 6G", "サイバーセキュリティ",
    "iPhone Apple", "Google Android", "Microsoft", "Amazon AWS", "半導体",
    "スタートアップ 資金調達", "DX デジタルトランスフォーメーション",
    "プログラミング", "クラウド SaaS", "IoT",
    # Business
    "株式市場 日経平均", "為替 円ドル", "日銀 金融政策", "不動産", "仮想通貨 ビットコイン",
    "IPO 上場", "M&A 買収", "ベンチャーキャピタル", "ESG SDGs", "インフレ 物価",
    "トヨタ 自動車", "ソニー", "任天堂", "ソフトバンク", "楽天",
    # Science
    "宇宙 JAXA NASA", "ノーベル賞", "iPS細胞 再生医療", "気候変動 温暖化",
    "新薬 創薬", "原子力 エネルギー", "地震 防災", "DNA ゲノム",
    # Entertainment
    "アニメ 新作", "漫画 コミック", "映画 興行収入", "音楽 ヒットチャート",
    "ゲーム 新作", "VTuber", "Netflix", "ジャニーズ",
    # Sports
    "プロ野球 NPB", "Jリーグ サッカー", "大谷翔平 MLB", "NBA バスケ",
    "ラグビー", "テニス", "ゴルフ", "フィギュアスケート",
    "箱根駅伝 マラソン", "相撲", "F1 モータースポーツ", "オリンピック",
    # Society
    "教育 学校", "医療 病院", "介護 高齢化", "少子化 人口",
    "選挙 政治", "裁判 法律", "事件 事故", "環境 リサイクル",
    "観光 インバウンド", "グルメ 飲食", "ファッション", "住宅 不動産",
]

for q in gn_ja_queries:
    safe_q = q.replace(" ", "+")
    add(
        f"https://news.google.com/rss/search?q={safe_q}&hl=ja&gl=JP&ceid=JP:ja",
        f"Google News: {q.split()[0]}",
        "general"
    )

# Google News search queries — English
gn_en_queries = [
    # Tech
    "artificial intelligence", "machine learning", "large language model",
    "OpenAI GPT", "Google Gemini AI", "Anthropic Claude",
    "Apple Vision Pro", "Tesla Elon Musk", "NVIDIA GPU",
    "cybersecurity data breach", "cloud computing", "quantum computing",
    "robotics automation", "autonomous vehicles", "blockchain web3",
    "programming developer", "open source software", "startup funding",
    "semiconductor chip", "social media platform",
    # Business
    "stock market S&P500", "Federal Reserve interest rate", "cryptocurrency bitcoin",
    "IPO SPAC", "venture capital", "mergers acquisitions",
    "real estate housing", "inflation economy", "oil energy prices",
    "supply chain logistics", "fintech banking",
    # Science
    "NASA space exploration", "climate change environment", "CRISPR gene editing",
    "nuclear fusion energy", "neuroscience brain", "vaccine pandemic",
    "archaeology discovery", "ocean marine science", "renewable energy solar",
    "artificial general intelligence",
    # Entertainment
    "Marvel DC movies", "Netflix streaming", "video games gaming",
    "K-pop music", "anime manga Japan", "Broadway theater",
    "celebrity entertainment", "book publishing", "podcast trending",
    # Sports
    "NFL football", "NBA basketball", "Premier League soccer",
    "MLB baseball", "UFC MMA", "Formula 1 racing",
    "Olympics", "tennis grand slam", "golf PGA", "cricket",
    # World
    "Ukraine Russia war", "China Taiwan", "Middle East",
    "European Union", "United Nations", "Africa development",
    "India economy", "Latin America", "ASEAN Southeast Asia",
    "immigration refugee",
]

for q in gn_en_queries:
    safe_q = q.replace(" ", "+")
    add(
        f"https://news.google.com/rss/search?q={safe_q}&hl=en&gl=US&ceid=US:en",
        f"GNews: {q.split()[0].title()} {q.split()[1].title() if len(q.split()) > 1 else ''}".strip(),
        "general"
    )

# Google News — other languages
gn_other = [
    # Chinese
    ("科技 人工智能", "zh-TW", "TW", "TW:zh-Hant", "Google News 科技"),
    ("财经 股市", "zh-TW", "TW", "TW:zh-Hant", "Google News 財經"),
    ("娱乐 影视", "zh-TW", "TW", "TW:zh-Hant", "Google News 娛樂"),
    # Korean
    ("인공지능 AI", "ko", "KR", "KR:ko", "Google News AI (KR)"),
    ("경제 주식", "ko", "KR", "KR:ko", "Google News 경제"),
    ("연예 K-pop", "ko", "KR", "KR:ko", "Google News 연예"),
    ("스포츠 축구", "ko", "KR", "KR:ko", "Google News 스포츠"),
    # French
    ("intelligence artificielle", "fr", "FR", "FR:fr", "Google News IA (FR)"),
    ("économie finance", "fr", "FR", "FR:fr", "Google News Économie"),
    ("sport football", "fr", "FR", "FR:fr", "Google News Sport (FR)"),
    # German
    ("künstliche intelligenz", "de", "DE", "DE:de", "Google News KI (DE)"),
    ("wirtschaft börse", "de", "DE", "DE:de", "Google News Wirtschaft"),
    ("sport fußball", "de", "DE", "DE:de", "Google News Sport (DE)"),
    # Spanish
    ("inteligencia artificial", "es", "ES", "ES:es", "Google News IA (ES)"),
    ("economía finanzas", "es", "ES", "ES:es", "Google News Economía"),
    ("deportes fútbol", "es", "ES", "ES:es", "Google News Deportes"),
    # Portuguese
    ("inteligência artificial", "pt-BR", "BR", "BR:pt-419", "Google News IA (BR)"),
    ("economia negócios", "pt-BR", "BR", "BR:pt-419", "Google News Economia (BR)"),
    # Hindi
    ("प्रौद्योगिकी", "hi", "IN", "IN:hi", "Google News Tech (IN)"),
    # Arabic
    ("ذكاء اصطناعي", "ar", "SA", "SA:ar", "Google News AI (AR)"),
    # Italian
    ("intelligenza artificiale", "it", "IT", "IT:it", "Google News IA (IT)"),
    ("economia finanza", "it", "IT", "IT:it", "Google News Economia (IT)"),
]

for q, hl, gl, ceid, source in gn_other:
    safe_q = q.replace(" ", "+")
    add(
        f"https://news.google.com/rss/search?q={safe_q}&hl={hl}&gl={gl}&ceid={ceid}",
        source,
        "general"
    )

# ============================================================
# REDDIT RSS (~200)
# ============================================================

reddit_subs = {
    "tech": [
        "technology", "programming", "MachineLearning", "artificial",
        "Python", "javascript", "rust", "golang", "java", "csharp",
        "webdev", "devops", "linux", "apple", "android",
        "netsec", "cybersecurity", "hacking", "sysadmin",
        "datascience", "deeplearning", "LocalLLaMA", "ChatGPT",
        "singularity", "Futurology", "gadgets", "hardware",
        "raspberry_pi", "arduino", "selfhosted", "homelab",
        "computerscience", "learnprogramming", "coding",
        "reactjs", "node", "typescript", "docker", "kubernetes",
        "aws", "googlecloud", "Azure", "terraform",
        "vim", "neovim", "emacs", "vscode",
        "gamedev", "Unity3D", "unrealengine", "godot",
        "opensource", "github", "git",
        "compsci", "algorithms", "softwarearchitecture",
        "ArtificialInteligence", "StableDiffusion", "midjourney",
    ],
    "science": [
        "science", "space", "physics", "chemistry", "biology",
        "astronomy", "astrophysics", "neuro", "medicine",
        "environment", "climate", "geology", "oceanography",
        "genetics", "Anthropology", "archaeology",
        "EverythingScience", "AskScience", "askscience",
        "quantumcomputing", "biotech",
    ],
    "business": [
        "business", "economics", "finance", "investing",
        "stocks", "CryptoCurrency", "Bitcoin", "ethereum",
        "wallstreetbets", "personalfinance", "startups",
        "entrepreneur", "smallbusiness", "realestate",
        "fintech", "NFT",
    ],
    "entertainment": [
        "movies", "television", "anime", "manga",
        "gaming", "Games", "PS5", "NintendoSwitch", "pcgaming",
        "Music", "hiphopheads", "indieheads", "kpop",
        "books", "Fantasy", "scifi",
        "Comics", "MarvelStudios", "DC_Cinematic",
        "Vtuber",
    ],
    "sports": [
        "sports", "soccer", "nba", "nfl", "baseball",
        "MMA", "boxing", "tennis", "golf", "formula1",
        "cycling", "running", "swimming", "olympics",
        "SquaredCircle", "hockey", "rugbyunion",
        "cricket", "volleyball",
    ],
    "general": [
        "worldnews", "news", "geopolitics", "TrueReddit",
        "InDepthStories", "longform", "japan", "korea",
        "China", "europe", "india", "brasil",
        "UpliftingNews", "TodayILearned",
        "Documentaries", "dataisbeautiful",
        "explainlikeimfive", "OutOfTheLoop",
    ],
}

for cat, subs in reddit_subs.items():
    for sub in subs:
        add(f"https://www.reddit.com/r/{sub}/.rss", f"r/{sub}", cat)

# ============================================================
# BBC CATEGORY FEEDS (~30)
# ============================================================
bbc_feeds = [
    ("uk", "BBC UK"), ("world/africa", "BBC Africa"),
    ("world/asia", "BBC Asia"), ("world/europe", "BBC Europe"),
    ("world/latin_america", "BBC Latin America"),
    ("world/middle_east", "BBC Middle East"),
    ("world/us_and_canada", "BBC US & Canada"),
    ("business", "BBC Business"), ("politics", "BBC Politics"),
    ("health", "BBC Health"), ("education", "BBC Education"),
    ("science_and_environment", "BBC Science"),
    ("technology", "BBC Technology"), ("entertainment_and_arts", "BBC Entertainment"),
]
for path, name in bbc_feeds:
    add(f"http://feeds.bbci.co.uk/news/{path}/rss.xml", name, "general")

bbc_sport_feeds = [
    ("football", "BBC Football"), ("cricket", "BBC Cricket"),
    ("rugby-union", "BBC Rugby"), ("tennis", "BBC Tennis"),
    ("golf", "BBC Golf"), ("athletics", "BBC Athletics"),
    ("cycling", "BBC Cycling"), ("motorsport", "BBC Motorsport"),
]
for path, name in bbc_sport_feeds:
    add(f"http://feeds.bbci.co.uk/sport/{path}/rss.xml", name, "sports")

# ============================================================
# GUARDIAN CATEGORY FEEDS (~40)
# ============================================================
guardian_sections = [
    ("uk-news", "general"), ("us-news", "general"),
    ("australia-news", "general"), ("international", "general"),
    ("politics", "general"), ("environment", "science"),
    ("business", "business"), ("technology", "tech"),
    ("science", "science"), ("culture", "entertainment"),
    ("lifeandstyle", "entertainment"), ("sport", "sports"),
    ("football", "sports"), ("film", "entertainment"),
    ("music", "entertainment"), ("books", "entertainment"),
    ("tv-and-radio", "entertainment"), ("artanddesign", "entertainment"),
    ("games", "entertainment"), ("food", "entertainment"),
    ("travel", "entertainment"), ("money", "business"),
    ("education", "general"), ("media", "general"),
    ("society", "general"), ("law", "general"),
    ("commentisfree", "general"),
]
for section, cat in guardian_sections:
    add(f"https://www.theguardian.com/{section}/rss", f"Guardian {section.replace('-', ' ').title()}", cat)

# ============================================================
# REUTERS CATEGORY FEEDS (~15)
# ============================================================
reuters_topics = [
    ("business", "business"), ("markets", "business"),
    ("world", "general"), ("technology", "tech"),
    ("sports", "sports"), ("science", "science"),
    ("lifestyle", "entertainment"), ("health", "science"),
]
for topic, cat in reuters_topics:
    add(f"https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best&best-topics={topic}", f"Reuters {topic.title()}", cat)

# ============================================================
# COUNTRY-SPECIFIC NEWS (~500)
# ============================================================

# --- USA ---
us_feeds = [
    ("https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", "NYT Home", "general"),
    ("https://rss.nytimes.com/services/xml/rss/nyt/World.xml", "NYT World", "general"),
    ("https://rss.nytimes.com/services/xml/rss/nyt/US.xml", "NYT US", "general"),
    ("https://rss.nytimes.com/services/xml/rss/nyt/Business.xml", "NYT Business", "business"),
    ("https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml", "NYT Technology", "tech"),
    ("https://rss.nytimes.com/services/xml/rss/nyt/Science.xml", "NYT Science", "science"),
    ("https://rss.nytimes.com/services/xml/rss/nyt/Sports.xml", "NYT Sports", "sports"),
    ("https://rss.nytimes.com/services/xml/rss/nyt/Arts.xml", "NYT Arts", "entertainment"),
    ("https://rss.nytimes.com/services/xml/rss/nyt/Movies.xml", "NYT Movies", "entertainment"),
    ("https://rss.nytimes.com/services/xml/rss/nyt/Health.xml", "NYT Health", "science"),
    ("https://rss.nytimes.com/services/xml/rss/nyt/Climate.xml", "NYT Climate", "science"),
    ("https://feeds.washingtonpost.com/rss/world", "WashPost World", "general"),
    ("https://feeds.washingtonpost.com/rss/national", "WashPost National", "general"),
    ("https://feeds.washingtonpost.com/rss/business", "WashPost Business", "business"),
    ("https://feeds.washingtonpost.com/rss/politics", "WashPost Politics", "general"),
    ("https://feeds.washingtonpost.com/rss/technology", "WashPost Tech", "tech"),
    ("https://feeds.washingtonpost.com/rss/sports", "WashPost Sports", "sports"),
    ("https://feeds.washingtonpost.com/rss/climate-environment", "WashPost Climate", "science"),
    ("https://www.latimes.com/world-nation/rss2.0.xml", "LA Times World", "general"),
    ("https://www.latimes.com/california/rss2.0.xml", "LA Times California", "general"),
    ("https://www.latimes.com/entertainment-arts/rss2.0.xml", "LA Times Entertainment", "entertainment"),
    ("https://www.latimes.com/sports/rss2.0.xml", "LA Times Sports", "sports"),
    ("https://www.latimes.com/business/rss2.0.xml", "LA Times Business", "business"),
    ("https://feeds.a]politico.com/playbook-rss", "Politico Playbook", "general"),
    ("https://www.vox.com/rss/index.xml", "Vox", "general"),
    ("https://www.theatlantic.com/feed/all/", "The Atlantic", "general"),
    ("https://slate.com/feeds/all.rss", "Slate", "general"),
    ("https://www.salon.com/feed/", "Salon", "general"),
    ("https://www.thedailybeast.com/rss", "Daily Beast", "general"),
    ("https://www.axios.com/feeds/feed.rss", "Axios", "general"),
    ("https://theintercept.com/feed/?rss", "The Intercept", "general"),
    ("https://www.propublica.org/feeds/propublica/main", "ProPublica", "general"),
    ("https://www.usatoday.com/rss/", "USA Today", "general"),
    ("https://feeds.foxnews.com/foxnews/latest", "Fox News", "general"),
    ("https://abcnews.go.com/abcnews/topstories", "ABC News", "general"),
    ("https://feeds.nbcnews.com/nbcnews/public/news", "NBC News", "general"),
    ("https://feeds.cbsnews.com/CBSNewsMain", "CBS News", "general"),
    ("https://www.pbs.org/newshour/feeds/rss/headlines", "PBS NewsHour", "general"),
]
for url, src, cat in us_feeds:
    add(url, src, cat)

# --- UK ---
uk_feeds = [
    ("https://www.independent.co.uk/news/rss", "The Independent", "general"),
    ("https://www.independent.co.uk/news/science/rss", "Independent Science", "science"),
    ("https://www.telegraph.co.uk/rss.xml", "The Telegraph", "general"),
    ("https://www.dailymail.co.uk/articles.rss", "Daily Mail", "general"),
    ("https://www.mirror.co.uk/news/rss.xml", "Mirror", "general"),
    ("https://metro.co.uk/feed/", "Metro UK", "general"),
    ("https://www.standard.co.uk/rss", "Evening Standard", "general"),
    ("https://inews.co.uk/feed", "iNews", "general"),
    ("https://www.cityam.com/feed/", "City AM", "business"),
    ("https://www.thisismoney.co.uk/money/rss.xml", "This Is Money", "business"),
]
for url, src, cat in uk_feeds:
    add(url, src, cat)

# --- Europe ---
eu_feeds = [
    ("https://www.lemonde.fr/rss/une.xml", "Le Monde", "general"),
    ("https://www.lefigaro.fr/rss/figaro_actualites.xml", "Le Figaro", "general"),
    ("https://www.liberation.fr/arc/outboundfeeds/rss/?outputType=xml", "Libération", "general"),
    ("https://www.spiegel.de/international/index.rss", "Der Spiegel (EN)", "general"),
    ("https://www.faz.net/rss/aktuell/", "FAZ", "general"),
    ("https://www.sueddeutsche.de/rss/Topthemen", "Süddeutsche Zeitung", "general"),
    ("https://www.zeit.de/index", "Die Zeit", "general"),
    ("https://feeds.elpais.com/mrss-s/pages/ep/site/english.elpais.com/portada", "El País (EN)", "general"),
    ("https://www.elmundo.es/rss/portada.xml", "El Mundo", "general"),
    ("https://www.corriere.it/rss/homepage.xml", "Corriere della Sera", "general"),
    ("https://www.repubblica.it/rss/homepage/rss2.0.xml", "la Repubblica", "general"),
    ("https://www.ansa.it/sito/ansait_rss.xml", "ANSA", "general"),
    ("https://nlp.nieuwsblad.be/rss/section/95dfe684-a59f-11eb-be6e-02b7b76bf47f", "Het Nieuwsblad", "general"),
    ("https://nos.nl/rss/nieuws.xml", "NOS Nieuws", "general"),
    ("https://www.thelocal.se/feed", "The Local (SE)", "general"),
    ("https://www.thelocal.de/feed", "The Local (DE)", "general"),
    ("https://www.thelocal.fr/feed", "The Local (FR)", "general"),
    ("https://www.thelocal.it/feed", "The Local (IT)", "general"),
    ("https://www.thelocal.es/feed", "The Local (ES)", "general"),
    ("https://www.swissinfo.ch/eng/rss/all-news.xml", "SWI swissinfo", "general"),
    ("https://www.irishtimes.com/cmlink/the-irish-times-news-1.1319192", "Irish Times", "general"),
    ("https://www.rte.ie/news/rss/news-headlines.xml", "RTÉ News", "general"),
    ("https://feeds.feedburner.com/euaborserverfullrss", "EU Observer", "general"),
    ("https://www.euronews.com/rss", "Euronews", "general"),
    ("https://www.politico.eu/feed/", "Politico EU", "general"),
]
for url, src, cat in eu_feeds:
    add(url, src, cat)

# --- Asia Pacific ---
asia_feeds = [
    # China / HK / Taiwan
    ("https://www.scmp.com/rss/2/feed", "SCMP HK", "general"),
    ("https://www.scmp.com/rss/5/feed", "SCMP China", "general"),
    ("https://www.scmp.com/rss/4/feed", "SCMP Asia", "general"),
    ("https://www.scmp.com/rss/3/feed", "SCMP Business", "business"),
    ("https://www.scmp.com/rss/36/feed", "SCMP Tech", "tech"),
    ("https://www.taiwannews.com.tw/en/rss", "Taiwan News", "general"),
    ("https://focustaiwan.tw/rss", "Focus Taiwan", "general"),
    ("https://www.chinadaily.com.cn/rss/world_rss.xml", "China Daily World", "general"),
    ("https://www.chinadaily.com.cn/rss/business_rss.xml", "China Daily Business", "business"),
    ("https://www.globaltimes.cn/rss/outbrain.xml", "Global Times", "general"),
    # Korea
    ("https://en.yna.co.kr/RSS/news.xml", "Yonhap EN", "general"),
    ("https://koreajoongangdaily.joins.com/rss", "Korea JoongAng Daily", "general"),
    ("https://www.koreaherald.com/rss", "Korea Herald", "general"),
    ("https://www.kedglobal.com/rss", "KED Global", "business"),
    # India
    ("https://feeds.feedburner.com/ndtvnews-top-stories", "NDTV", "general"),
    ("https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml", "Hindustan Times", "general"),
    ("https://economictimes.indiatimes.com/rssfeedstopstories.cms", "Economic Times", "business"),
    ("https://www.livemint.com/rss/news", "Mint", "business"),
    ("https://indianexpress.com/feed/", "Indian Express", "general"),
    ("https://theprint.in/feed/", "The Print", "general"),
    ("https://thewire.in/feed", "The Wire", "general"),
    # SE Asia
    ("https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml", "CNA", "general"),
    ("https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=6511", "CNA Asia", "general"),
    ("https://www.bangkokpost.com/rss/data/topstories.xml", "Bangkok Post", "general"),
    ("https://www.straitstimes.com/news/asia/rss.xml", "Straits Times Asia", "general"),
    ("https://www.straitstimes.com/news/world/rss.xml", "Straits Times World", "general"),
    ("https://www.rappler.com/feed/", "Rappler", "general"),
    ("https://en.tempo.co/rss/terkini", "Tempo (EN)", "general"),
    ("https://e.vnexpress.net/rss/news.rss", "VnExpress (EN)", "general"),
    # Australia / NZ
    ("https://www.abc.net.au/news/feed/51120/rss.xml", "ABC AU World", "general"),
    ("https://www.abc.net.au/news/feed/45924/rss.xml", "ABC AU Business", "business"),
    ("https://www.abc.net.au/news/feed/2942460/rss.xml", "ABC AU Top", "general"),
    ("https://www.smh.com.au/rss/feed.xml", "Sydney Morning Herald", "general"),
    ("https://www.stuff.co.nz/rss", "Stuff NZ", "general"),
    ("https://www.nzherald.co.nz/arc/outboundfeeds/rss/curated/78/?outputType=xml", "NZ Herald", "general"),
]
for url, src, cat in asia_feeds:
    add(url, src, cat)

# --- Middle East ---
me_feeds = [
    ("https://www.aljazeera.com/xml/rss/all.xml", "Al Jazeera", "general"),
    ("https://english.alarabiya.net/tools/rss", "Al Arabiya EN", "general"),
    ("https://www.middleeasteye.net/rss", "Middle East Eye", "general"),
    ("https://www.al-monitor.com/rss", "Al-Monitor", "general"),
    ("https://www.timesofisrael.com/feed/", "Times of Israel", "general"),
    ("https://www.jpost.com/rss/rssfeedsheadlines.aspx", "Jerusalem Post", "general"),
    ("https://www.haaretz.com/cmlink/1.628765", "Haaretz", "general"),
    ("https://gulfnews.com/rss", "Gulf News", "general"),
    ("https://www.thenationalnews.com/rss", "The National UAE", "general"),
    ("https://www.iranintl.com/en/feed", "Iran International", "general"),
]
for url, src, cat in me_feeds:
    add(url, src, cat)

# --- Africa ---
africa_feeds = [
    ("https://mg.co.za/feed/", "Mail & Guardian", "general"),
    ("https://www.news24.com/rss", "News24 SA", "general"),
    ("https://www.dailymaverick.co.za/feed/", "Daily Maverick", "general"),
    ("https://www.theeastafrican.co.ke/feed", "East African", "general"),
    ("https://www.nation.africa/rss.xml", "Daily Nation", "general"),
    ("https://guardian.ng/feed/", "Guardian Nigeria", "general"),
    ("https://punchng.com/feed/", "Punch NG", "general"),
    ("https://www.premiumtimesng.com/feed", "Premium Times", "general"),
    ("https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf", "AllAfrica", "general"),
]
for url, src, cat in africa_feeds:
    add(url, src, cat)

# --- Latin America ---
latam_feeds = [
    ("https://rss.uol.com.br/feed/noticias.xml", "UOL Notícias", "general"),
    ("https://feeds.folha.uol.com.br/mundo/rss091.xml", "Folha de São Paulo", "general"),
    ("https://www.bbc.com/portuguese/index.xml", "BBC Portuguese", "general"),
    ("https://www.bbc.com/mundo/index.xml", "BBC Mundo", "general"),
    ("https://www.eltiempo.com/rss/portada.xml", "El Tiempo", "general"),
    ("https://www.clarin.com/rss/lo-ultimo/", "Clarín", "general"),
    ("https://www.lanacion.com.ar/arcio/rss/", "La Nación AR", "general"),
    ("https://www.eluniversal.com.mx/rss.xml", "El Universal MX", "general"),
    ("https://www.jornada.com.mx/rss/edicion.xml", "La Jornada", "general"),
    ("https://www.bbc.com/mundo/topics/c2lej05epw3t/rss.xml", "BBC Mundo Tech", "tech"),
]
for url, src, cat in latam_feeds:
    add(url, src, cat)

# ============================================================
# TECH BLOGS & AI (~100)
# ============================================================
tech_blogs = [
    # AI/ML
    ("https://www.anthropic.com/feed.xml", "Anthropic Blog", "tech"),
    ("https://openai.com/blog/rss/", "OpenAI Blog", "tech"),
    ("https://blog.google/technology/ai/rss/", "Google AI", "tech"),
    ("https://ai.meta.com/blog/rss/", "Meta AI", "tech"),
    ("https://blogs.microsoft.com/ai/feed/", "Microsoft AI", "tech"),
    ("https://developer.nvidia.com/blog/feed/", "NVIDIA Developer Blog", "tech"),
    ("https://www.assemblyai.com/blog/rss/", "AssemblyAI Blog", "tech"),
    ("https://lilianweng.github.io/index.xml", "Lilian Weng (OpenAI)", "tech"),
    ("https://colah.github.io/rss.xml", "colah's blog", "tech"),
    ("https://karpathy.github.io/feed.xml", "Karpathy Blog", "tech"),
    ("https://jalammar.github.io/feed.xml", "Jay Alammar", "tech"),
    ("https://distill.pub/rss.xml", "Distill", "tech"),
    ("https://bair.berkeley.edu/blog/feed.xml", "BAIR Blog", "tech"),
    ("https://ai.stanford.edu/blog/feed.xml", "Stanford AI Blog", "tech"),
    # Major tech companies
    ("https://netflixtechblog.com/feed", "Netflix Tech Blog", "tech"),
    ("https://engineering.atspotify.com/feed/", "Spotify Engineering", "tech"),
    ("https://slack.engineering/feed/", "Slack Engineering", "tech"),
    ("https://blog.discord.com/feed", "Discord Blog", "tech"),
    ("https://engineering.linkedin.com/blog.rss.html", "LinkedIn Engineering", "tech"),
    ("https://uber.com/blog/engineering/rss/", "Uber Engineering", "tech"),
    ("https://dropbox.tech/feed", "Dropbox Tech Blog", "tech"),
    ("https://blog.cloudflare.com/rss/", "Cloudflare Blog", "tech"),
    ("https://blog.twitter.com/engineering/en_us/blog.rss", "X Engineering", "tech"),
    ("https://medium.com/feed/airbnb-engineering", "Airbnb Engineering", "tech"),
    ("https://stripe.com/blog/feed.rss", "Stripe Blog", "tech"),
    ("https://github.blog/engineering/feed/", "GitHub Engineering", "tech"),
    ("https://shopify.engineering/blog.atom", "Shopify Engineering", "tech"),
    ("https://doordash.engineering/feed/", "DoorDash Engineering", "tech"),
    # Dev tools
    ("https://blog.rust-lang.org/feed.xml", "Rust Blog", "tech"),
    ("https://go.dev/blog/feed.atom", "Go Blog", "tech"),
    ("https://blog.python.org/feeds/posts/default", "Python Blog", "tech"),
    ("https://blog.jetbrains.com/feed/", "JetBrains Blog", "tech"),
    ("https://code.visualstudio.com/feed.xml", "VS Code Blog", "tech"),
    ("https://deno.com/feed", "Deno Blog", "tech"),
    ("https://bun.sh/blog/rss.xml", "Bun Blog", "tech"),
    ("https://vercel.com/blog/rss.xml", "Vercel Blog", "tech"),
    ("https://supabase.com/blog/rss.xml", "Supabase Blog", "tech"),
    ("https://tailwindcss.com/feeds/feed.xml", "Tailwind Blog", "tech"),
    ("https://svelte.dev/blog/rss.xml", "Svelte Blog", "tech"),
    ("https://vuejs.org/feed.rss", "Vue.js Blog", "tech"),
    ("https://react.dev/rss.xml", "React Blog", "tech"),
    ("https://angular.dev/feed.xml", "Angular Blog", "tech"),
    ("https://nextjs.org/feed.xml", "Next.js Blog", "tech"),
    # Security
    ("https://blog.talosintelligence.com/feeds/posts/default", "Cisco Talos", "tech"),
    ("https://www.darkreading.com/rss.xml", "Dark Reading", "tech"),
    ("https://threatpost.com/feed/", "Threatpost", "tech"),
    ("https://thehackernews.com/feeds/posts/default", "The Hacker News", "tech"),
    ("https://www.securityweek.com/feed/", "SecurityWeek", "tech"),
    # Hardware
    ("https://www.anandtech.com/rss/", "AnandTech", "tech"),
    ("https://www.notebookcheck.net/News.152.100.html", "Notebookcheck", "tech"),
    ("https://liliputing.com/feed", "Liliputing", "tech"),
    # Japanese tech additions
    ("https://www.itmedia.co.jp/aiplus/rss/2.0/aiplus.xml", "ITmedia AI+", "tech"),
    ("https://xtech.nikkei.com/rss/index.rdf", "日経クロステック", "tech"),
    ("https://logmi.jp/tech/feed", "logmi Tech", "tech"),
    ("https://type.jp/et/feature/feed/", "type エンジニアtype", "tech"),
    ("https://findy-code.io/engineer-lab/feed", "Findy Engineer Lab", "tech"),
]
for url, src, cat in tech_blogs:
    add(url, src, cat)

# ============================================================
# BUSINESS & FINANCE (~50)
# ============================================================
biz_feeds = [
    ("https://feeds.bloomberg.com/technology/news.rss", "Bloomberg Tech", "tech"),
    ("https://feeds.bloomberg.com/politics/news.rss", "Bloomberg Politics", "general"),
    ("https://feeds.bloomberg.com/crypto/news.rss", "Bloomberg Crypto", "business"),
    ("https://finance.yahoo.com/news/rssindex", "Yahoo Finance", "business"),
    ("https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines", "MarketWatch RT", "business"),
    ("https://www.investopedia.com/feedbuilder/feed/getfeed?feedName=rss_headline", "Investopedia", "business"),
    ("https://www.fool.com/feeds/index.aspx", "Motley Fool", "business"),
    ("https://seekingalpha.com/feed.xml", "Seeking Alpha", "business"),
    ("https://www.morningstar.com/rss/most-read-articles", "Morningstar", "business"),
    ("https://coingecko.com/en/news/feed", "CoinGecko News", "business"),
    ("https://www.coindesk.com/arc/outboundfeeds/rss/", "CoinDesk", "business"),
    ("https://cointelegraph.com/rss/tag/bitcoin", "CoinTelegraph BTC", "business"),
    ("https://www.pymnts.com/feed/", "PYMNTS", "business"),
    ("https://fintechmagazine.com/articles/rss", "FinTech Magazine", "business"),
    # Japanese biz
    ("https://www.watch.impress.co.jp/data/rss/1.0/ipw/feed.rdf", "Impress Watch Biz", "business"),
    ("https://www.itmedia.co.jp/business/rss/2.0/bizmakoto_all.xml", "ITmedia ビジネス全体", "business"),
    ("https://xtrend.nikkei.com/rss/index.rdf", "日経クロストレンド", "business"),
    ("https://www.sbbit.jp/rss/HotTopics.rss", "ビジネス+IT", "business"),
    ("https://www.nikkei.com/rss/", "日経電子版", "business"),
]
for url, src, cat in biz_feeds:
    add(url, src, cat)

# ============================================================
# SCIENCE & ACADEMIC (~50)
# ============================================================
sci_feeds = [
    # arXiv additional categories
    ("https://rss.arxiv.org/rss/cs.RO", "arXiv Robotics", "science"),
    ("https://rss.arxiv.org/rss/cs.SE", "arXiv Software Eng", "science"),
    ("https://rss.arxiv.org/rss/cs.CR", "arXiv Cryptography", "science"),
    ("https://rss.arxiv.org/rss/cs.DC", "arXiv Distributed", "science"),
    ("https://rss.arxiv.org/rss/cs.HC", "arXiv Human-Computer", "science"),
    ("https://rss.arxiv.org/rss/cs.IR", "arXiv Info Retrieval", "science"),
    ("https://rss.arxiv.org/rss/stat.ML", "arXiv Stat ML", "science"),
    ("https://rss.arxiv.org/rss/eess.SP", "arXiv Signal Proc", "science"),
    ("https://rss.arxiv.org/rss/physics.pop-ph", "arXiv Popular Physics", "science"),
    ("https://rss.arxiv.org/rss/q-bio", "arXiv Quantitative Bio", "science"),
    ("https://rss.arxiv.org/rss/astro-ph", "arXiv Astrophysics", "science"),
    ("https://rss.arxiv.org/rss/hep-ph", "arXiv HEP Phenom", "science"),
    ("https://rss.arxiv.org/rss/cond-mat", "arXiv Condensed Matter", "science"),
    # Journals
    ("https://www.nature.com/natmachintell.rss", "Nature Machine Intel", "science"),
    ("https://www.nature.com/nphys.rss", "Nature Physics", "science"),
    ("https://www.nature.com/nbt.rss", "Nature Biotech", "science"),
    ("https://www.nature.com/neuro.rss", "Nature Neuroscience", "science"),
    ("https://www.nature.com/nclimate.rss", "Nature Climate Change", "science"),
    ("https://www.nature.com/nenergy.rss", "Nature Energy", "science"),
    ("https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=science", "Science", "science"),
    ("https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=sciadv", "Science Advances", "science"),
    ("https://www.thelancet.com/rssfeed/lancet_online.xml", "Lancet Online", "science"),
    ("https://www.bmj.com/rss/recent.xml", "BMJ", "science"),
    ("https://www.nejm.org/action/showFeed?jc=nejm&type=etoc&feed=rss", "NEJM", "science"),
    # Science media
    ("https://arstechnica.com/science/feed/", "Ars Technica Science", "science"),
    ("https://www.eurekalert.org/feeds/main.xml", "EurekAlert!", "science"),
    ("https://www.sciencenews.org/feed", "Science News", "science"),
    ("https://www.the-scientist.com/rss", "The Scientist", "science"),
    ("https://www.symmetrymagazine.org/feed", "Symmetry Magazine", "science"),
    ("https://www.earthmagazine.org/rss", "EARTH Magazine", "science"),
]
for url, src, cat in sci_feeds:
    add(url, src, cat)

# ============================================================
# ENTERTAINMENT & CULTURE (~50)
# ============================================================
ent_feeds = [
    # Movies & TV
    ("https://www.indiewire.com/feed/", "IndieWire", "entertainment"),
    ("https://theplaylist.net/feed/", "The Playlist", "entertainment"),
    ("https://www.slashfilm.com/feed/", "SlashFilm", "entertainment"),
    ("https://www.avclub.com/rss", "AV Club", "entertainment"),
    ("https://www.rottentomatoes.com/feeds/news.xml", "Rotten Tomatoes", "entertainment"),
    # Music
    ("https://www.stereogum.com/feed/", "Stereogum", "entertainment"),
    ("https://consequenceofsound.net/feed/", "Consequence of Sound", "entertainment"),
    ("https://www.nme.com/feed", "NME", "entertainment"),
    # Games
    ("https://www.gamesindustry.biz/feed", "GamesIndustry.biz", "entertainment"),
    ("https://www.eurogamer.net/feed", "Eurogamer", "entertainment"),
    ("https://www.rockpapershotgun.com/feed", "Rock Paper Shotgun", "entertainment"),
    ("https://www.pcgamer.com/rss/", "PC Gamer", "entertainment"),
    ("https://nichegamer.com/feed/", "Niche Gamer", "entertainment"),
    ("https://www.siliconera.com/feed/", "Siliconera", "entertainment"),
    # Anime & Manga
    ("https://myanimelist.net/rss/news.xml", "MyAnimeList News", "entertainment"),
    ("https://www.animenewsnetwork.com/newsfeed/rss.xml?ann-hierarchical-topic=anime", "ANN Anime", "entertainment"),
    ("https://www.animenewsnetwork.com/newsfeed/rss.xml?ann-hierarchical-topic=manga", "ANN Manga", "entertainment"),
    ("https://otakuusamagazine.com/feed/", "Otaku USA", "entertainment"),
    # Books
    ("https://lithub.com/feed/", "Literary Hub", "entertainment"),
    ("https://www.publishersweekly.com/pw/feeds/recent/index.xml", "Publishers Weekly", "entertainment"),
    # Pop culture
    ("https://boingboing.net/feed", "Boing Boing", "entertainment"),
    ("https://laughingsquid.com/feed/", "Laughing Squid", "entertainment"),
    ("https://www.themarysue.com/feed/", "The Mary Sue", "entertainment"),
    # Japanese
    ("https://www.inside-games.jp/rss/index.rdf", "Inside Games", "entertainment"),
    ("https://www.gamer.ne.jp/rss/", "Gamer", "entertainment"),
    ("https://www.4gamer.net/rss/index.xml", "4Gamer RSS", "entertainment"),
    ("https://jp.ign.com/feed", "IGN Japan", "entertainment"),
    ("https://game.watch.impress.co.jp/data/rss/1.0/gmw/feed.rdf", "GAME Watch RSS", "entertainment"),
    ("https://www.nicovideo.jp/feed/news.rss", "ニコニコニュース", "entertainment"),
    ("https://togetter.com/rss/index.xml", "Togetter", "entertainment"),
    ("https://nlab.itmedia.co.jp/rss/2.0/nl_all.xml", "ねとらぼ全体", "entertainment"),
]
for url, src, cat in ent_feeds:
    add(url, src, cat)

# ============================================================
# SPORTS (~30)
# ============================================================
sports_extra = [
    ("https://www.espn.com/espn/rss/nfl/news", "ESPN NFL", "sports"),
    ("https://www.espn.com/espn/rss/nba/news", "ESPN NBA", "sports"),
    ("https://www.espn.com/espn/rss/mlb/news", "ESPN MLB", "sports"),
    ("https://www.espn.com/espn/rss/soccer/news", "ESPN Soccer", "sports"),
    ("https://www.espn.com/espn/rss/rpm/news", "ESPN F1", "sports"),
    ("https://www.marca.com/en/rss/football.xml", "Marca Football", "sports"),
    ("https://www.transfermarkt.com/rss/news", "Transfermarkt", "sports"),
    ("https://talksport.com/feed/", "talkSPORT", "sports"),
    ("https://www.sportingnews.com/rss", "Sporting News", "sports"),
    ("https://sportsnavi.yahoo.co.jp/rss/all/headlines", "スポーツナビ", "sports"),
    ("https://www.superhero-soccer.jp/feed/", "超ワールドサッカー", "sports"),
    ("https://web.gekisaka.jp/feed", "ゲキサカ", "sports"),
    ("https://baseball-data.com/feed/", "Baseball Data", "sports"),
    ("https://pacificleague.com/feed/", "パ・リーグ.com", "sports"),
    ("https://www.basketball-zine.com/feed/", "バスケットボールZine", "sports"),
    ("https://www.rugbyrepublic.jp/feed/", "ラグビーリパブリック", "sports"),
    ("https://www.nbadraft.net/feed/", "NBA Draft", "sports"),
    ("https://www.badmintonplanet.com/feed/", "Badminton Planet", "sports"),
]
for url, src, cat in sports_extra:
    add(url, src, cat)

# ============================================================
# PODCASTS EXTRA (~30)
# ============================================================
pod_extra = [
    ("https://feeds.simplecast.com/K1KI0sKR", "Lex Clips", "podcast"),
    ("https://feeds.megaphone.fm/no-stupid-questions", "No Stupid Questions", "podcast"),
    ("https://feeds.megaphone.fm/WMHY7571569798", "a]The Prof G Pod", "podcast"),
    ("https://feeds.megaphone.fm/WWO3519750118", "Strict Scrutiny", "podcast"),
    ("https://rss.art19.com/the-journal", "The Journal (WSJ)", "podcast"),
    ("https://feeds.megaphone.fm/GLT1412515089", "Decoder with Nilay Patel", "podcast"),
    ("https://feeds.megaphone.fm/recodedecode", "On with Kara Swisher", "podcast"),
    ("https://feeds.npr.org/510313/podcast.xml", "How I Built This", "podcast"),
    ("https://feeds.npr.org/510299/podcast.xml", "TED Radio Hour", "podcast"),
    ("https://feeds.megaphone.fm/startup", "StartUp", "podcast"),
    ("https://anchor.fm/s/98ab0404/podcast/rss", "AI日本語ポッドキャスト", "podcast"),
    ("https://feeds.buzzsprout.com/2036096.rss", "Tech系ポッドキャスト", "podcast"),
    ("https://rss.art19.com/60-minutes-podcast", "60 Minutes", "podcast"),
    ("https://feeds.simplecast.com/4T39_jAj", "The Ezra Klein Show", "podcast"),
    ("https://feeds.megaphone.fm/the-daily-show-ears-edition", "Daily Show", "podcast"),
    ("https://feeds.simplecast.com/wgl4xEgL", "Conan O'Brien Needs a Friend", "podcast"),
    ("https://rss.art19.com/smartless", "SmartLess", "podcast"),
    ("https://feeds.megaphone.fm/armchairexpert", "Armchair Expert", "podcast"),
]
for url, src, cat in pod_extra:
    add(url, src, cat)

# ============================================================
# SUBSTACK & NEWSLETTER (~80)
# ============================================================
substacks = [
    # Tech/AI
    ("https://thealgorithmicbridge.substack.com/feed", "The Algorithmic Bridge", "tech"),
    ("https://importai.substack.com/feed", "Import AI", "tech"),
    ("https://thesequence.substack.com/feed", "TheSequence", "tech"),
    ("https://newsletter.pragmaticengineer.com/feed", "Pragmatic Engineer", "tech"),
    ("https://blog.bytebytego.com/feed", "ByteByteGo", "tech"),
    ("https://lethain.com/feeds/", "Will Larson", "tech"),
    ("https://blog.pragmaticengineer.com/rss/", "Pragmatic Engineer Blog", "tech"),
    ("https://www.lennysnewsletter.com/feed", "Lenny's Newsletter", "business"),
    ("https://stratechery.com/feed/", "Stratechery", "tech"),
    ("https://every.to/feed.xml", "Every", "tech"),
    ("https://www.platformer.news/rss/", "Platformer", "tech"),
    ("https://www.semianalysis.com/feed", "SemiAnalysis", "tech"),
    ("https://www.notboring.co/feed", "Not Boring", "business"),
    ("https://www.newcomer.co/feed", "Newcomer", "business"),
    ("https://www.theinformation.com/feed", "The Information", "tech"),
    ("https://www.ben-evans.com/benedictevans/rss.xml", "Benedict Evans", "tech"),
    ("https://www.oreilly.com/radar/feed/", "O'Reilly Radar", "tech"),
    ("https://sifted.eu/feed.xml", "Sifted", "business"),
    # Science
    ("https://www.science.org/do/10.1126/science.adn8782/rss", "Science News Feed", "science"),
    # General / Politics
    ("https://thedispatch.com/feed/", "The Dispatch", "general"),
    ("https://www.slowboring.com/feed", "Slow Boring", "general"),
    ("https://noahpinion.substack.com/feed", "Noahpinion", "general"),
    ("https://astralcodexten.substack.com/feed", "Astral Codex Ten", "science"),
    ("https://marginalrevolution.com/feed", "Marginal Revolution", "business"),
    ("https://kottke.org/feed/json", "kottke.org", "general"),
    ("https://drudgereport.com/rss.xml", "Drudge Report", "general"),
    ("https://daringfireball.net/feeds/main", "Daring Fireball", "tech"),
    ("https://www.macrumors.com/macrumors.xml", "MacRumors", "tech"),
    ("https://9to5google.com/feed/", "9to5Google", "tech"),
    # Japanese newsletters
    ("https://weekly.ascii.jp/rss/index.xml", "週刊アスキー RSS", "tech"),
    ("https://note.com/api/v1/popular_notes.rss", "note 人気記事", "general"),
]
for url, src, cat in substacks:
    add(url, src, cat)

# ============================================================
# YOUTUBE RSS FEEDS (~50)
# ============================================================
yt_channels = [
    # Tech
    ("UCBcRF18a7Qf58cCRy5xuWwQ", "MKBHD", "tech"),
    ("UCXuqSBlHAE6Xw-yeJA0Tunw", "Linus Tech Tips", "tech"),
    ("UC0vBXGSyV14uvJ4hECDOl0Q", "Two Minute Papers", "tech"),
    ("UCbmNph6atAoGfqLoCL_res0g", "Fireship", "tech"),
    ("UCsBjURrPoezykLs9EqgamOA", "Fireship Extra", "tech"),
    ("UC4QZ_LsYcvcq7qOsOhpAI4A", "ColdFusion", "tech"),
    ("UCvjgXvBlCQM63hYgVhJUaVw", "Tech With Tim", "tech"),
    ("UCVHFbqXqoYvEWM1Ddxl0QDg", "Android Authority YT", "tech"),
    ("UC_x5XG1OV2P6uZZ5FSM9Ttw", "Google Developers", "tech"),
    ("UCJ0-OtVpF0wOKEqT2Z1HEtA", "ElectroBOOM", "tech"),
    # Science
    ("UC7_gcs09iThXybpVgjHZ_7g", "PBS Space Time", "science"),
    ("UCsXVk37bltHxD1rDPwtNM8Q", "Kurzgesagt", "science"),
    ("UCUHW94eEFW7hkUMVaZz4eDg", "MinutePhysics", "science"),
    ("UCsooa4yRKGN_zEE8iknghZA", "TED-Ed", "science"),
    ("UCHnyfMqiRRG1u-2MsSQLbXA", "Veritasium", "science"),
    ("UC6nSFpj9HTCZ5t-N3Rm3-HA", "Vsauce", "science"),
    ("UCZYTClx2T1of7BRZ86-8fow", "SciShow", "science"),
    ("UC7DdEm33SyaTDtWYGO2CwdA", "Physics Girl", "science"),
    # Business
    ("UCWX3yGbODDrGoMTrCN_LSyg", "CNBC YT", "business"),
    ("UCIALMKvObZNtJ6AmdCLP7Lg", "Bloomberg YT", "business"),
    ("UC8butISFwT-Wl7EV0hUK0BQ", "freeCodeCamp", "tech"),
    # Entertainment
    ("UCq-Fj5jknLsUf-MWSy4_brA", "IGN YT", "entertainment"),
    ("UCKy1dAqELo0zrOtPkf0eTMw", "GameSpot", "entertainment"),
    # Japanese
    ("UCiZm3MImlQQ0MFqMRNNC1Sw", "日経テレ東大学", "business"),
    ("UC67Wr_9pA4I0glIxDt_Cpyw", "さまぁ〜ずチャンネル", "entertainment"),
    ("UCNOCvMn3PgYYnlW6lF0hTiA", "QuizKnock", "entertainment"),
    ("UCLkAepWjdylmXSltofFvsYQ", "BUSKER K-POP", "entertainment"),
]
for chan_id, name, cat in yt_channels:
    add(f"https://www.youtube.com/feeds/videos.xml?channel_id={chan_id}", f"YT: {name}", cat)

# ============================================================
# HACKER NEWS SPECIAL FEEDS (~5)
# ============================================================
hn_feeds = [
    ("https://hnrss.org/newest?points=100", "HN 100+ Points", "tech"),
    ("https://hnrss.org/show?points=50", "HN Show 50+", "tech"),
    ("https://hnrss.org/ask?points=50", "HN Ask 50+", "tech"),
    ("https://hnrss.org/jobs", "HN Jobs", "tech"),
    ("https://hnrss.org/best", "HN Best", "tech"),
]
for url, src, cat in hn_feeds:
    add(url, src, cat)

# ============================================================
# GOVERNMENT & INSTITUTIONAL (~30)
# ============================================================
gov_feeds = [
    ("https://www.whitehouse.gov/feed/", "White House", "general"),
    ("https://www.state.gov/rss-feed/press-releases/feed/", "US State Dept", "general"),
    ("https://www.federalreserve.gov/feeds/press_all.xml", "Federal Reserve", "business"),
    ("https://www.ecb.europa.eu/rss/press.html", "ECB", "business"),
    ("https://www.boj.or.jp/en/rss/whatsnew.xml", "Bank of Japan", "business"),
    ("https://www.who.int/feeds/entity/mediacentre/news/en/rss.xml", "WHO News", "science"),
    ("https://www.un.org/feed/view/en/news/topic/news/all/rss.xml", "UN News", "general"),
    ("https://www.imf.org/en/News/RSS?dtype=Feeds", "IMF News", "business"),
    ("https://www.worldbank.org/en/news/rss.xml", "World Bank", "business"),
    ("https://www.oecd.org/newsroom/index.xml", "OECD", "business"),
    ("https://www.cao.go.jp/others/rss/whatsnew.xml", "内閣府", "general"),
    ("https://www.meti.go.jp/rss/press.xml", "経済産業省", "business"),
    ("https://www.mof.go.jp/rss/whatsnew.xml", "財務省", "business"),
    ("https://www.mhlw.go.jp/stf/rss/recentinfo.xml", "厚生労働省", "science"),
    ("https://www.mext.go.jp/b_menu/rss/index.xml", "文部科学省", "science"),
    ("https://www.env.go.jp/rss/press.xml", "環境省", "science"),
    ("https://www.soumu.go.jp/menu_news/rss/news.xml", "総務省", "general"),
    ("https://www.digital.go.jp/feed", "デジタル庁", "tech"),
    ("https://www.kantei.go.jp/jp/rss/index.xml", "首相官邸", "general"),
]
for url, src, cat in gov_feeds:
    add(url, src, cat)

# ============================================================
# LIFESTYLE & HEALTH (~30)
# ============================================================
life_feeds = [
    ("https://www.healthline.com/rss/nutrition", "Healthline", "science"),
    ("https://www.webmd.com/rss/rss.aspx", "WebMD", "science"),
    ("https://www.medicalnewstoday.com/newsrss", "Medical News Today", "science"),
    ("https://www.statnews.com/feed/", "STAT News", "science"),
    ("https://www.fiercebiotech.com/rss/xml", "Fierce Biotech", "science"),
    ("https://endpts.com/feed/", "Endpoints News", "science"),
    ("https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/well/rss.xml", "NYT Well", "science"),
    # Food & Travel
    ("https://www.eater.com/rss/index.xml", "Eater", "entertainment"),
    ("https://www.seriouseats.com/feeds/serious-eats", "Serious Eats", "entertainment"),
    ("https://www.lonelyplanet.com/feed.xml", "Lonely Planet", "entertainment"),
    ("https://www.cntraveler.com/feed/rss", "Condé Nast Traveler", "entertainment"),
    # Design
    ("https://www.dezeen.com/feed/", "Dezeen", "entertainment"),
    ("https://www.designboom.com/feed/", "designboom", "entertainment"),
    ("https://www.fastcompany.com/co-design/rss", "Co.Design", "entertainment"),
    # Japanese lifestyle
    ("https://www.roomie.jp/feed/", "ROOMIE", "entertainment"),
    ("https://www.lifehacker.jp/feed/", "ライフハッカー日本版", "entertainment"),
    ("https://tabi-labo.com/feed", "TABI LABO", "entertainment"),
    ("https://macaro-ni.jp/feed", "macaroni", "entertainment"),
]
for url, src, cat in life_feeds:
    add(url, src, cat)

# ============================================================
# PRINT TOTAL AND GENERATE TOML
# ============================================================

# Deduplicate by URL
seen = set()
unique_feeds = []
for url, src, cat in feeds:
    if url not in seen:
        seen.add(url)
        unique_feeds.append((url, src, cat))

print(f"# Generated {len(unique_feeds)} additional feeds", file=sys.stderr)

# Output TOML
for url, src, cat in unique_feeds:
    # Escape any quotes in source names
    safe_src = src.replace('"', '\\"')
    safe_url = url.replace('"', '\\"')
    print(f'\n[[feeds]]\nurl = "{safe_url}"\nsource = "{safe_src}"\ncategory = "{cat}"')
