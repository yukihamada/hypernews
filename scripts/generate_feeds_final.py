#!/usr/bin/env python3
"""Final batch of feeds to push past 3000 total."""

import sys

feeds = []

def add(url, source, category):
    feeds.append((url, source, category))

# ============================================================
# GOOGLE NEWS — Industry verticals EN (~200)
# ============================================================

industry_queries = [
    # Healthcare & Pharma
    ("Pfizer drug", "business"), ("Moderna vaccine", "science"),
    ("Johnson Johnson pharma", "business"), ("Eli Lilly obesity", "science"),
    ("Novo Nordisk Ozempic", "science"), ("AbbVie pharma", "business"),
    ("clinical trial FDA", "science"), ("telemedicine digital health", "science"),
    ("wearable health device", "tech"), ("biotech startup", "business"),
    ("hospital healthcare", "science"), ("pharmacy drug pricing", "business"),
    ("mental health therapy", "science"), ("nutrition diet research", "science"),
    ("sleep research insomnia", "science"), ("cancer treatment", "science"),
    ("Alzheimer research", "science"), ("rare disease therapy", "science"),
    # Energy
    ("solar panel installation", "business"), ("wind farm offshore", "business"),
    ("oil prices OPEC", "business"), ("natural gas LNG", "business"),
    ("EV charging infrastructure", "tech"), ("battery technology", "tech"),
    ("smart grid energy", "tech"), ("carbon credit trading", "business"),
    ("geothermal energy", "science"), ("tidal wave energy", "science"),
    # Real Estate & Construction
    ("commercial real estate", "business"), ("housing market mortgage", "business"),
    ("construction technology", "tech"), ("smart building IoT", "tech"),
    ("property technology proptech", "business"), ("office space coworking", "business"),
    # Agriculture
    ("precision agriculture", "tech"), ("vertical farming", "tech"),
    ("food technology cultured meat", "science"), ("organic farming", "science"),
    ("agritech startup", "business"), ("climate smart agriculture", "science"),
    # Transportation
    ("electric vehicle sales", "business"), ("autonomous driving Waymo", "tech"),
    ("urban air mobility drone", "tech"), ("high speed rail", "general"),
    ("shipping logistics port", "business"), ("aviation airline", "business"),
    ("ride sharing Uber Lyft", "business"), ("electric bike scooter", "tech"),
    # Education
    ("edtech online learning", "tech"), ("university research grant", "science"),
    ("STEM education program", "science"), ("student loan policy", "general"),
    ("coding bootcamp", "tech"), ("AI education classroom", "tech"),
    # Legal & Governance
    ("Supreme Court ruling", "general"), ("antitrust regulation tech", "general"),
    ("patent lawsuit technology", "tech"), ("EU regulation digital", "general"),
    ("privacy law CCPA", "tech"), ("crypto regulation SEC", "business"),
    # Fashion & Luxury
    ("fashion week designer", "entertainment"), ("luxury brand LVMH", "business"),
    ("sustainable fashion", "business"), ("sneaker streetwear", "entertainment"),
    # Food & Beverage
    ("restaurant industry", "business"), ("food delivery app", "business"),
    ("craft beer brewery", "entertainment"), ("wine vineyard", "entertainment"),
    ("Michelin star restaurant", "entertainment"), ("food safety recall", "general"),
    # Media & Advertising
    ("streaming wars subscription", "entertainment"), ("podcast advertising", "business"),
    ("social media marketing", "business"), ("influencer economy", "business"),
    ("journalism media news", "general"), ("digital advertising Google", "business"),
    # Space
    ("SpaceX launch Falcon", "science"), ("Blue Origin space", "science"),
    ("Artemis moon mission", "science"), ("Mars colonization", "science"),
    ("satellite internet Starlink", "tech"), ("space tourism", "science"),
    ("asteroid mining", "science"), ("space debris cleanup", "science"),
    # Climate & Environment
    ("wildfire forest", "general"), ("flood climate", "general"),
    ("drought water shortage", "general"), ("air pollution", "science"),
    ("ocean acidification", "science"), ("permafrost thawing", "science"),
    ("endangered species", "science"), ("plastic pollution ocean", "science"),
    ("recycling circular economy", "science"), ("green hydrogen", "science"),
]

for q, cat in industry_queries:
    safe_q = q.replace(" ", "+")
    words = q.split()
    add(
        f"https://news.google.com/rss/search?q={safe_q}&hl=en&gl=US&ceid=US:en",
        f"GN: {words[0].title()} {words[1].title()}",
        cat
    )

# ============================================================
# GOOGLE NEWS — Industry verticals JA (~150)
# ============================================================

jp_industry = [
    # Healthcare
    ("医療 AI 診断", "science"), ("製薬 新薬 治験", "science"),
    ("介護 老人ホーム", "general"), ("歯科 歯医者", "science"),
    ("眼科 視力", "science"), ("精神科 メンタルヘルス", "science"),
    ("漢方 東洋医学", "science"), ("再生医療 幹細胞", "science"),
    # Energy
    ("太陽光発電", "tech"), ("風力発電 洋上", "tech"),
    ("原発 再稼働 廃炉", "general"), ("水素エネルギー", "tech"),
    ("蓄電池 リチウムイオン", "tech"), ("電力自由化", "business"),
    # Construction & Infrastructure
    ("建設業 人手不足", "business"), ("マンション 分譲", "business"),
    ("道路 橋 インフラ", "general"), ("スマートシティ", "tech"),
    # Agriculture
    ("農業 スマート農業", "tech"), ("畜産 酪農", "general"),
    ("水産業 養殖", "general"), ("食品ロス フードロス", "general"),
    # Transport
    ("電車 ダイヤ改正", "general"), ("新幹線 リニア 工事", "general"),
    ("航空 LCC 格安航空", "business"), ("自転車 サイクリング", "sports"),
    ("バス 路線バス 高速バス", "general"), ("タクシー ライドシェア", "business"),
    # Education
    ("大学入試 共通テスト", "general"), ("英語教育 英会話", "general"),
    ("プログラミング教育 小学校", "tech"), ("不登校 いじめ", "general"),
    ("留学 海外大学", "general"), ("奨学金 給付型", "general"),
    # Legal
    ("裁判 判決 最高裁", "general"), ("弁護士 法律相談", "general"),
    ("特許 知的財産", "business"), ("個人情報保護", "tech"),
    # Fashion
    ("ファッション トレンド", "entertainment"), ("化粧品 コスメ", "entertainment"),
    ("ジュエリー アクセサリー", "entertainment"),
    # Food
    ("ラーメン 新店", "entertainment"), ("カフェ コーヒー", "entertainment"),
    ("スイーツ お菓子", "entertainment"), ("居酒屋 焼肉", "entertainment"),
    ("コンビニ 新商品", "business"), ("回転寿司 チェーン", "business"),
    # Events & Culture
    ("花火大会 祭り", "entertainment"), ("紅葉 桜 花見", "entertainment"),
    ("美術館 展覧会", "entertainment"), ("コンサート ライブ", "entertainment"),
    ("テーマパーク USJ ディズニー", "entertainment"),
    # 47 prefectures additional topics
    ("札幌 観光 グルメ", "entertainment"), ("仙台 観光 グルメ", "entertainment"),
    ("東京 イベント 新スポット", "entertainment"), ("横浜 観光", "entertainment"),
    ("名古屋 観光 グルメ", "entertainment"), ("京都 観光 寺", "entertainment"),
    ("大阪 観光 グルメ", "entertainment"), ("神戸 観光", "entertainment"),
    ("広島 観光", "entertainment"), ("福岡 観光 グルメ", "entertainment"),
    ("沖縄 観光 リゾート", "entertainment"), ("北海道 観光 温泉", "entertainment"),
    # Misc society
    ("ふるさと納税 ランキング", "business"), ("転職 就職活動", "business"),
    ("副業 フリーランス", "business"), ("年金 老後資金", "business"),
    ("相続 遺産", "business"), ("防犯 セキュリティ", "general"),
    ("災害 避難", "general"), ("ボランティア 社会貢献", "general"),
    ("動物 ペット", "entertainment"), ("園芸 ガーデニング", "entertainment"),
    ("DIY リフォーム", "entertainment"), ("アウトドア 登山", "sports"),
    ("釣り フィッシング", "sports"), ("将棋 囲碁", "entertainment"),
    ("競馬 競輪 競艇", "sports"), ("パチンコ パチスロ", "entertainment"),
]

for topic, cat in jp_industry:
    q = topic.replace(" ", "+")
    label = topic.split()[0]
    add(
        f"https://news.google.com/rss/search?q={q}&hl=ja&gl=JP&ceid=JP:ja",
        f"GN: {label}",
        cat
    )

# ============================================================
# GOOGLE NEWS — World cities (~100)
# ============================================================

world_cities = [
    ("New York", "en", "US", "US:en"), ("Los Angeles", "en", "US", "US:en"),
    ("Chicago", "en", "US", "US:en"), ("San Francisco", "en", "US", "US:en"),
    ("Washington DC", "en", "US", "US:en"), ("Miami", "en", "US", "US:en"),
    ("Seattle", "en", "US", "US:en"), ("Boston", "en", "US", "US:en"),
    ("Houston", "en", "US", "US:en"), ("Atlanta", "en", "US", "US:en"),
    ("London news", "en", "GB", "GB:en"), ("Manchester news", "en", "GB", "GB:en"),
    ("Paris actualité", "fr", "FR", "FR:fr"), ("Lyon actualité", "fr", "FR", "FR:fr"),
    ("Berlin Nachrichten", "de", "DE", "DE:de"), ("München Nachrichten", "de", "DE", "DE:de"),
    ("Madrid noticias", "es", "ES", "ES:es"), ("Barcelona noticias", "es", "ES", "ES:es"),
    ("Roma notizie", "it", "IT", "IT:it"), ("Milano notizie", "it", "IT", "IT:it"),
    ("Amsterdam nieuws", "nl", "NL", "NL:nl"),
    ("Stockholm nyheter", "sv", "SE", "SE:sv"),
    ("Moscow news", "en", "US", "US:en"), ("Kyiv news", "en", "US", "US:en"),
    ("Beijing news", "en", "US", "US:en"), ("Shanghai news", "en", "US", "US:en"),
    ("Hong Kong news", "en", "US", "US:en"), ("Taipei news", "en", "US", "US:en"),
    ("Seoul news", "en", "US", "US:en"), ("Singapore news", "en", "US", "US:en"),
    ("Bangkok news", "en", "US", "US:en"), ("Jakarta news", "en", "US", "US:en"),
    ("Mumbai news", "en", "US", "US:en"), ("Delhi news", "en", "US", "US:en"),
    ("Dubai news", "en", "US", "US:en"), ("Riyadh news", "en", "US", "US:en"),
    ("Istanbul news", "en", "US", "US:en"), ("Cairo news", "en", "US", "US:en"),
    ("Lagos news", "en", "US", "US:en"), ("Nairobi news", "en", "US", "US:en"),
    ("Cape Town news", "en", "US", "US:en"), ("Johannesburg news", "en", "US", "US:en"),
    ("São Paulo notícias", "pt-BR", "BR", "BR:pt-419"),
    ("Rio Janeiro notícias", "pt-BR", "BR", "BR:pt-419"),
    ("Buenos Aires noticias", "es", "AR", "AR:es-419"),
    ("Mexico City noticias", "es", "MX", "MX:es-419"),
    ("Lima noticias", "es", "PE", "PE:es-419"),
    ("Sydney news", "en", "AU", "AU:en"),
    ("Melbourne news", "en", "AU", "AU:en"),
    ("Toronto news", "en", "CA", "CA:en"),
    ("Vancouver news", "en", "CA", "CA:en"),
]

for city, hl, gl, ceid in world_cities:
    safe_q = city.replace(" ", "+")
    add(
        f"https://news.google.com/rss/search?q={safe_q}&hl={hl}&gl={gl}&ceid={ceid}",
        f"GN: {city.split()[0]}",
        "general"
    )

# ============================================================
# GOOGLE NEWS — Tech-specific deep dives EN (~100)
# ============================================================

tech_deep = [
    "React framework update", "Vue.js release", "Angular update",
    "Python library", "Rust programming", "Go golang release",
    "TypeScript update", "Swift programming", "Kotlin Android",
    "Linux kernel", "Ubuntu release", "Fedora Linux",
    "Windows 12", "macOS update", "ChromeOS",
    "Chrome browser", "Firefox update", "Safari browser",
    "VS Code extension", "JetBrains IDE", "Neovim editor",
    "PostgreSQL database", "MySQL update", "MongoDB release",
    "Redis cache", "Elasticsearch update", "SQLite database",
    "Docker container update", "Kubernetes release", "Terraform module",
    "AWS Lambda", "Google Cloud Run", "Azure Functions",
    "Vercel deployment", "Netlify hosting", "Cloudflare Workers",
    "GraphQL API", "REST API design", "gRPC microservice",
    "WebAssembly WASM", "Web Components", "PWA progressive",
    "CSS framework", "Tailwind CSS update", "Bootstrap update",
    "npm package", "Deno runtime", "Bun runtime",
    "machine learning model", "neural network architecture",
    "transformer model NLP", "diffusion model image",
    "reinforcement learning", "federated learning privacy",
    "RAG retrieval augmented", "vector database embedding",
    "LLM fine tuning", "prompt engineering",
    "MLOps deployment", "model serving inference",
    "computer vision object", "natural language processing",
    "speech recognition ASR", "text to speech TTS",
    "recommendation system", "anomaly detection",
    "robotics ROS", "drone software", "SLAM navigation",
    "AR augmented reality", "VR virtual reality headset",
    "3D printing material", "CNC manufacturing",
    "PCB design electronic", "FPGA ASIC design",
    "RISC-V processor", "ARM chip design",
    "WiFi 7 standard", "Bluetooth LE mesh",
    "USB4 Thunderbolt", "HDMI DisplayPort",
    "NVMe SSD storage", "DDR5 memory RAM",
    "quantum error correction", "photonic computing",
    "neuromorphic computing chip", "DNA data storage",
    "edge computing IoT", "5G private network",
    "satellite communication LEO", "mesh networking",
    "zero trust security", "ransomware attack",
    "supply chain attack", "bug bounty vulnerability",
    "penetration testing", "DevSecOps",
    "CI CD pipeline", "GitHub Actions workflow",
    "observability monitoring", "logging tracing",
    "site reliability engineering", "chaos engineering",
    "API gateway management", "service mesh Istio",
    "serverless architecture", "event driven design",
    "microservices pattern", "monolith to microservices",
    "open source license", "software supply chain",
]

for q in tech_deep:
    safe_q = q.replace(" ", "+")
    words = q.split()
    add(
        f"https://news.google.com/rss/search?q={safe_q}&hl=en&gl=US&ceid=US:en",
        f"GN: {words[0].title()} {words[1].title() if len(words) > 1 else ''}".strip(),
        "tech"
    )

# ============================================================
# GOOGLE NEWS — Entertainment deep dive (~50)
# ============================================================

ent_deep = [
    "Marvel Phase 6 movie", "DC Universe movie", "Pixar Disney animation",
    "horror movie 2025", "comedy movie release", "action movie sequel",
    "anime movie Japanese", "Korean drama Netflix", "HBO Max series",
    "Apple TV Plus show", "Amazon Prime Video", "Hulu series",
    "Peacock streaming show", "Paramount Plus series",
    "Broadway musical show", "West End theater London",
    "Grammy album year", "Billboard Hot 100", "vinyl record sales",
    "hip hop rap album", "rock music album", "electronic music festival",
    "jazz music concert", "classical music orchestra", "country music",
    "K-pop comeback album", "J-pop music Japan", "Latin music reggaeton",
    "manga best seller", "light novel anime", "webtoon popular",
    "cosplay convention event", "comic con event",
    "board game tabletop", "card game TCG", "puzzle game casual",
    "indie game Steam", "AAA game release", "game award nomination",
    "esports tournament prize", "Twitch streaming",
    "YouTube creator news", "TikTok viral trend",
    "celebrity interview", "book adaptation movie",
    "art exhibition gallery", "photography contest",
    "food competition cooking", "reality TV show",
    "true crime documentary", "nature documentary",
    "stand up comedy special", "podcast chart top",
]

for q in ent_deep:
    safe_q = q.replace(" ", "+")
    words = q.split()
    add(
        f"https://news.google.com/rss/search?q={safe_q}&hl=en&gl=US&ceid=US:en",
        f"GN: {words[0].title()} {words[1].title()}",
        "entertainment"
    )

# ============================================================
# GOOGLE NEWS — Science deep dive (~50)
# ============================================================

sci_deep = [
    "gravitational wave detection", "dark energy measurement",
    "exoplanet atmosphere", "black hole event horizon",
    "neutron star collision", "pulsar timing array",
    "Hubble telescope image", "James Webb discovery",
    "CERN hadron collider", "neutrino oscillation",
    "quantum entanglement", "topological quantum",
    "CRISPR Cas9 therapy", "gene drive mosquito",
    "mRNA therapy cancer", "immunotherapy checkpoint",
    "gut microbiome health", "epigenetics aging",
    "deep sea exploration", "hydrothermal vent life",
    "earthquake prediction", "volcanic eruption warning",
    "glacier retreat melting", "ocean current change",
    "coral restoration reef", "rewilding conservation",
    "fusion tokamak ITER", "room temperature superconductor",
    "graphene application", "metamaterial acoustic",
    "biomimicry nature design", "synthetic biology cell",
    "organoid brain model", "lab grown organ transplant",
    "ancient DNA analysis", "homo sapiens migration",
    "dinosaur fossil discovery", "amber preservation",
    "radiocarbon dating", "ice core climate record",
    "citizen science project", "open access publishing",
    "reproducibility crisis", "peer review reform",
    "science communication", "science policy funding",
    "Nobel Prize chemistry", "Nobel Prize physics",
    "Fields Medal mathematics", "Turing Award computer",
    "Breakthrough Prize science", "Kavli Prize",
]

for q in sci_deep:
    safe_q = q.replace(" ", "+")
    words = q.split()
    add(
        f"https://news.google.com/rss/search?q={safe_q}&hl=en&gl=US&ceid=US:en",
        f"GN: {words[0].title()} {words[1].title()}",
        "science"
    )

# ============================================================
# GOOGLE NEWS — Sports deep dive (~50)
# ============================================================

sports_deep = [
    "Premier League standings", "Champions League draw",
    "Europa League results", "La Liga transfer",
    "Bundesliga results", "Serie A standings",
    "Ligue 1 results", "MLS expansion",
    "Copa Libertadores", "AFC Champions League",
    "NFL draft prospect", "NFL free agent",
    "NBA trade rumor", "NBA draft lottery",
    "MLB free agent signing", "MLB trade deadline",
    "NHL Stanley Cup", "NHL trade rumor",
    "ATP tennis ranking", "WTA tennis ranking",
    "PGA Tour golf", "LPGA Tour golf",
    "Formula 1 race result", "IndyCar race",
    "NASCAR race result", "MotoGP race",
    "WRC rally championship", "Le Mans 24 hours",
    "UFC fight card", "boxing fight result",
    "WWE event result", "AEW wrestling",
    "Olympics medal count", "Winter Olympics",
    "Cricket World Cup", "IPL cricket",
    "Rugby World Cup", "Six Nations rugby",
    "Tour de France cycling", "Giro Italia cycling",
    "marathon world record", "track field worlds",
    "swimming world record", "gymnastics championship",
    "figure skating competition", "skiing World Cup",
    "surfing championship", "skateboarding competition",
    "climbing bouldering", "triathlon Ironman",
    "volleyball nations league", "handball championship",
    "table tennis tournament", "badminton championship",
    "archery competition", "fencing championship",
]

for q in sports_deep:
    safe_q = q.replace(" ", "+")
    words = q.split()
    add(
        f"https://news.google.com/rss/search?q={safe_q}&hl=en&gl=US&ceid=US:en",
        f"GN: {words[0].title()} {words[1].title()}",
        "sports"
    )

# ============================================================
# GOOGLE NEWS — Business deep dive (~50)
# ============================================================

biz_deep = [
    "private equity buyout", "hedge fund strategy",
    "IPO roadshow valuation", "SPAC merger",
    "venture capital Series A", "seed funding startup",
    "angel investor pitch", "accelerator YC",
    "commercial real estate REIT", "residential real estate market",
    "commodity gold price", "commodity copper price",
    "wheat corn commodity", "coffee cocoa price",
    "insurance insurtech", "neobank digital banking",
    "payment processing fintech", "buy now pay later",
    "wealth management robo", "retirement planning 401k",
    "ESG investing sustainable", "impact investing",
    "supply chain disruption", "semiconductor shortage",
    "labor market hiring", "unemployment claims",
    "inflation consumer prices", "GDP growth forecast",
    "central bank policy", "bond yield treasury",
    "foreign exchange dollar", "emerging market",
    "trade war tariff", "sanctions compliance",
    "audit accounting fraud", "corporate governance",
    "diversity inclusion workplace", "remote work policy",
    "gig economy freelance", "creator economy monetize",
    "SaaS metrics revenue", "cloud spending enterprise",
    "cybersecurity spending", "AI enterprise adoption",
    "franchise business model", "direct to consumer brand",
    "subscription economy model", "marketplace platform",
    "logistics last mile", "warehouse automation",
    "retail technology checkout", "grocery delivery",
    "food service industry", "hospitality hotel recovery",
    "airline revenue passenger", "tourism recovery travel",
]

for q in biz_deep:
    safe_q = q.replace(" ", "+")
    words = q.split()
    add(
        f"https://news.google.com/rss/search?q={safe_q}&hl=en&gl=US&ceid=US:en",
        f"GN: {words[0].title()} {words[1].title()}",
        "business"
    )

# ============================================================
# MORE REDDIT COMMUNITIES (~100)
# ============================================================

reddit_final = {
    "tech": [
        "Rlanguage", "Julia", "Clojure", "lisp", "ocaml",
        "erlang", "nix", "NixOS", "Gentoo", "ArchLinux",
        "PopOS", "ManjaroLinux", "debian", "openSUSE",
        "networking", "WireGuard", "pihole",
        "webhosting", "Wordpress", "Directus",
        "GraphQL", "grpc", "APIDesign",
        "MachineLearningMastery", "PromptEngineering",
        "ClaudeAI", "ChatGPTCoding", "Bard",
        "StableDiffusionUI", "comfyui",
        "unRAID", "TrueNAS", "Proxmox",
        "plex", "jellyfin", "kodi",
        "Bitwarden", "Tailscale",
    ],
    "science": [
        "Futurology", "transhumanism", "longevity",
        "nootropics", "psychopharmacology",
        "PlantBasedDiet", "nutrition",
        "geography", "MapPorn", "GIS",
        "weather", "tornado", "TropicalWeather",
        "Astronomy", "telescopes", "astrophotography",
    ],
    "business": [
        "SecurityAnalysis", "dividends", "ETFs",
        "thetagang", "bogleheads",
        "CommercialRealEstate", "REBubble",
        "DigitalNomad", "overemployed",
        "Shopify", "AmazonSeller", "FulfillmentByAmazon",
    ],
    "entertainment": [
        "animepiracy", "AnimeFigures", "Gunpla",
        "MangaCollectors", "OtakuVisualArts",
        "PatientGamers", "ShouldIbuythisgame",
        "speedrun", "blindsidedgames",
        "HiFi", "BudgetAudiophile",
        "WeAreTheMusicMakers", "songwriting",
        "cinematography", "Filmmakers",
    ],
    "sports": [
        "fantasybaseball", "fantasyfootball", "fantasypl",
        "sportsbook", "sportsbetting",
        "bjj", "MuayThai", "karate", "judo",
        "tabletennis", "badminton",
        "volleyball", "waterpolo",
        "CrossFit", "weightlifting", "powerlifting",
    ],
    "general": [
        "AskReddit", "NoStupidQuestions",
        "changemyview", "unpopularopinion",
        "Aww", "rarepuppers",
        "memes", "dankmemes",
        "pics", "OldSchoolCool",
        "interestingasfuck", "nextfuckinglevel",
        "lifehacks", "YouShouldKnow",
    ],
}

for cat, subs in reddit_final.items():
    for sub in subs:
        add(f"https://www.reddit.com/r/{sub}/.rss", f"r/{sub}", cat)

# ============================================================
# GOOGLE NEWS — More Japanese niche (~100)
# ============================================================

jp_niche = [
    ("声優 アニメ", "entertainment"), ("コスプレ イベント", "entertainment"),
    ("同人誌 コミケ", "entertainment"), ("プラモデル ガンプラ", "entertainment"),
    ("鉄道模型 Nゲージ", "entertainment"), ("フィギュア 予約", "entertainment"),
    ("ボードゲーム カードゲーム", "entertainment"), ("TRPG ダンジョン", "entertainment"),
    ("eスポーツ 大会 賞金", "sports"), ("Apex Legends 大会", "sports"),
    ("Valorant 大会", "sports"), ("LoL 大会", "sports"),
    ("Splatoon 大会", "entertainment"), ("ポケモン 大会", "entertainment"),
    ("マインクラフト アップデート", "entertainment"), ("原神 アップデート", "entertainment"),
    ("ウマ娘 アップデート", "entertainment"), ("ブルアカ アップデート", "entertainment"),
    ("FGO アップデート", "entertainment"), ("モンスト イベント", "entertainment"),
    # Food brands
    ("マクドナルド 新商品", "business"), ("スターバックス 新作", "business"),
    ("セブンイレブン 新商品", "business"), ("ローソン 新商品", "business"),
    ("ファミマ 新商品", "business"), ("無印良品 新商品", "business"),
    ("ユニクロ 新作", "business"), ("ダイソー 新商品", "business"),
    ("ニトリ 新商品", "business"), ("IKEA 新商品", "business"),
    # Music
    ("YOASOBI 新曲", "entertainment"), ("Ado 新曲", "entertainment"),
    ("米津玄師 新曲", "entertainment"), ("King Gnu 新曲", "entertainment"),
    ("Official髭男dism", "entertainment"), ("Mrs.GREEN APPLE", "entertainment"),
    ("乃木坂46", "entertainment"), ("日向坂46", "entertainment"),
    ("Snow Man", "entertainment"), ("SixTONES", "entertainment"),
    ("BTSジミン", "entertainment"), ("BLACKPINK", "entertainment"),
    # Anime specific
    ("ワンピース 最新話", "entertainment"), ("呪術廻戦", "entertainment"),
    ("進撃の巨人", "entertainment"), ("SPY×FAMILY", "entertainment"),
    ("鬼滅の刃", "entertainment"), ("推しの子", "entertainment"),
    ("葬送のフリーレン", "entertainment"), ("薬屋のひとりごと", "entertainment"),
    # TV & Movies
    ("朝ドラ NHK", "entertainment"), ("大河ドラマ", "entertainment"),
    ("日曜劇場 TBS", "entertainment"), ("月9 フジテレビ", "entertainment"),
    ("邦画 興行収入", "entertainment"), ("洋画 公開", "entertainment"),
    ("ジブリ 新作", "entertainment"), ("新海誠", "entertainment"),
    # Games
    ("PS5 新作", "entertainment"), ("Switch2 新作", "entertainment"),
    ("Steam セール", "entertainment"), ("Xbox 新作", "entertainment"),
    ("インディーゲーム", "entertainment"), ("レトロゲーム", "entertainment"),
    # Society & Lifestyle
    ("100均 便利グッズ", "entertainment"), ("コストコ おすすめ", "entertainment"),
    ("業務スーパー 人気", "entertainment"), ("ドンキ 話題", "entertainment"),
    ("温泉 秘湯", "entertainment"), ("サウナ 人気", "entertainment"),
    ("キャンプ ギア", "sports"), ("登山 トレイル", "sports"),
    ("マラソン 大会", "sports"), ("ヨガ ピラティス", "sports"),
    ("筋トレ ジム", "sports"), ("ダイエット 食事制限", "science"),
]

for topic, cat in jp_niche:
    q = topic.replace(" ", "+")
    label = topic.split()[0]
    add(
        f"https://news.google.com/rss/search?q={q}&hl=ja&gl=JP&ceid=JP:ja",
        f"GN: {label}",
        cat
    )

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
