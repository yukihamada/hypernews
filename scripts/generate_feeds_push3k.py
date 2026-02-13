#!/usr/bin/env python3
"""Push past 3000 with more Google News queries in multiple languages."""

import sys

feeds = []

def add(url, source, category):
    feeds.append((url, source, category))

# ============================================================
# GOOGLE NEWS — More granular Japanese queries (~150)
# ============================================================

# More specific company/brand news
jp_brands = [
    ("ダイキン エアコン", "business"), ("コマツ 建機", "business"),
    ("ファナック ロボット", "business"), ("キーエンス 株価", "business"),
    ("信越化学 半導体", "business"), ("東京エレクトロン", "business"),
    ("レーザーテック", "business"), ("村田製作所", "business"),
    ("TDK 電子部品", "business"), ("ルネサス 半導体", "business"),
    ("日本電産 モーター", "business"), ("SMC 空圧機器", "business"),
    ("HOYA 光学", "business"), ("テルモ 医療機器", "business"),
    ("オリンパス 内視鏡", "business"), ("島津製作所", "business"),
    ("浜松ホトニクス", "business"), ("ディスコ 半導体", "business"),
    ("SUMCO ウェハー", "business"), ("JSR 半導体材料", "business"),
    ("ユニチャーム", "business"), ("花王", "business"),
    ("資生堂", "business"), ("ライオン", "business"),
    ("カゴメ", "business"), ("明治", "business"),
    ("ヤクルト", "business"), ("日本ハム", "business"),
    ("マルハニチロ", "business"), ("JT たばこ", "business"),
    ("ZOZO ファッション", "business"), ("楽天トラベル", "business"),
    ("じゃらん 旅行", "entertainment"), ("食べログ グルメ", "entertainment"),
    ("ぐるなび レストラン", "entertainment"), ("ホットペッパー", "entertainment"),
    ("SUUMO 不動産", "business"), ("マイナビ 就職", "business"),
    ("リクナビ 転職", "business"), ("doda 求人", "business"),
    # Media companies
    ("日本テレビ 番組", "entertainment"), ("テレビ朝日 番組", "entertainment"),
    ("TBS 番組", "entertainment"), ("フジテレビ 番組", "entertainment"),
    ("テレビ東京 番組", "entertainment"), ("NHK 番組", "entertainment"),
    ("Netflix 日本", "entertainment"), ("Amazon Prime 日本", "entertainment"),
    ("Disney+ 日本", "entertainment"), ("ABEMAプレミアム", "entertainment"),
    ("U-NEXT 配信", "entertainment"), ("Hulu 日本", "entertainment"),
]

for topic, cat in jp_brands:
    q = topic.replace(" ", "+")
    label = topic.split()[0]
    add(f"https://news.google.com/rss/search?q={q}&hl=ja&gl=JP&ceid=JP:ja", f"GN: {label}", cat)

# More Japanese sports
jp_sports = [
    ("プロ野球 巨人", "sports"), ("プロ野球 阪神", "sports"),
    ("プロ野球 中日", "sports"), ("プロ野球 広島", "sports"),
    ("プロ野球 DeNA", "sports"), ("プロ野球 ヤクルト", "sports"),
    ("プロ野球 ソフトバンク", "sports"), ("プロ野球 西武", "sports"),
    ("プロ野球 楽天", "sports"), ("プロ野球 ロッテ", "sports"),
    ("プロ野球 日本ハム", "sports"), ("プロ野球 オリックス", "sports"),
    ("Jリーグ 横浜Fマリノス", "sports"), ("Jリーグ 鹿島アントラーズ", "sports"),
    ("Jリーグ 浦和レッズ", "sports"), ("Jリーグ ヴィッセル神戸", "sports"),
    ("Jリーグ FC東京", "sports"), ("Jリーグ 川崎フロンターレ", "sports"),
    ("Jリーグ 名古屋グランパス", "sports"), ("Jリーグ セレッソ大阪", "sports"),
    ("バスケ Bリーグ", "sports"), ("バレーボール Vリーグ", "sports"),
    ("卓球 Tリーグ", "sports"), ("ラグビー リーグワン", "sports"),
    ("競泳 水泳", "sports"), ("体操 新体操", "sports"),
    ("柔道 世界選手権", "sports"), ("空手 テコンドー", "sports"),
    ("スケートボード", "sports"), ("サーフィン 波乗り", "sports"),
    ("スノーボード スキー", "sports"), ("カーリング", "sports"),
]

for topic, cat in jp_sports:
    q = topic.replace(" ", "+")
    label = topic.split()[0] + topic.split()[1] if len(topic.split()) > 1 else topic.split()[0]
    add(f"https://news.google.com/rss/search?q={q}&hl=ja&gl=JP&ceid=JP:ja", f"GN: {label[:10]}", cat)

# ============================================================
# GOOGLE NEWS — EN remaining topics (~100)
# ============================================================

en_remaining = [
    # Specific tech companies
    ("Palantir stock earnings", "business"), ("CrowdStrike cybersecurity", "tech"),
    ("Palo Alto Networks", "tech"), ("ServiceNow cloud", "tech"),
    ("Workday enterprise", "tech"), ("Datadog monitoring", "tech"),
    ("Elastic search", "tech"), ("Confluent Kafka", "tech"),
    ("HashiCorp Terraform", "tech"), ("GitLab DevOps", "tech"),
    ("Atlassian Jira", "tech"), ("Zoom video conference", "tech"),
    ("Twilio communication", "tech"), ("Okta identity", "tech"),
    ("Snowflake data cloud", "tech"), ("Databricks analytics", "tech"),
    ("MongoDB database cloud", "tech"), ("Cockroach database", "tech"),
    ("Airtable productivity", "tech"), ("Monday.com work", "tech"),
    ("Notion workspace", "tech"), ("Linear project", "tech"),
    ("Figma design tool", "tech"), ("Miro whiteboard", "tech"),
    ("Canva design platform", "tech"), ("Webflow website builder", "tech"),
    ("Retool internal tools", "tech"), ("Supabase backend", "tech"),
    # Sports teams
    ("Manchester United", "sports"), ("Manchester City", "sports"),
    ("Liverpool FC", "sports"), ("Arsenal FC", "sports"),
    ("Chelsea FC", "sports"), ("Tottenham Hotspur", "sports"),
    ("Real Madrid", "sports"), ("Barcelona FC", "sports"),
    ("Bayern Munich", "sports"), ("Paris Saint-Germain", "sports"),
    ("Juventus FC", "sports"), ("Inter Milan", "sports"),
    ("Los Angeles Lakers", "sports"), ("Golden State Warriors", "sports"),
    ("Boston Celtics", "sports"), ("New York Yankees", "sports"),
    ("Los Angeles Dodgers", "sports"), ("Dallas Cowboys", "sports"),
    ("Kansas City Chiefs", "sports"), ("New England Patriots", "sports"),
    # Specific science topics
    ("exoplanet discovery 2025", "science"), ("deep sea creature", "science"),
    ("volcanic activity monitoring", "science"), ("earthquake early warning", "science"),
    ("aurora borealis solar", "science"), ("meteorite asteroid", "science"),
    ("telescope observation", "science"), ("particle accelerator", "science"),
    ("genome sequencing", "science"), ("protein folding AlphaFold", "science"),
    # Lifestyle & trends
    ("electric scooter city", "tech"), ("smart home device", "tech"),
    ("wearable technology fitness", "tech"), ("robot vacuum cleaner", "tech"),
    ("mechanical keyboard review", "tech"), ("gaming mouse keyboard", "tech"),
    ("monitor display review", "tech"), ("laptop review 2025", "tech"),
    ("smartphone review 2025", "tech"), ("tablet iPad review", "tech"),
    ("headphone earbuds review", "tech"), ("smart watch review", "tech"),
    ("camera mirrorless review", "tech"), ("drone photography", "tech"),
    ("action camera GoPro", "tech"), ("projector home theater", "tech"),
    ("e-reader Kindle", "tech"), ("NAS storage Synology", "tech"),
    ("mesh WiFi router", "tech"), ("portable charger power bank", "tech"),
]

for q, cat in en_remaining:
    safe_q = q.replace(" ", "+")
    words = q.split()
    add(
        f"https://news.google.com/rss/search?q={safe_q}&hl=en&gl=US&ceid=US:en",
        f"GN: {words[0]} {words[1] if len(words) > 1 else ''}".strip(),
        cat
    )

# ============================================================
# MORE MULTI-LANGUAGE GOOGLE NEWS (~100)
# ============================================================

# Malay
my_topics = [
    ("politik Malaysia", "general"), ("ekonomi perniagaan", "general"),
    ("sukan bola sepak", "general"), ("teknologi AI", "general"),
    ("sains angkasa", "general"), ("hiburan filem", "general"),
]
for q, cat in my_topics:
    safe_q = q.replace(" ", "+")
    add(f"https://news.google.com/rss/search?q={safe_q}&hl=ms&gl=MY&ceid=MY:ms", f"GN MY: {q.split()[0]}", cat)

# Swahili
sw_topics = [
    ("siasa Afrika", "general"), ("uchumi biashara", "general"),
    ("michezo mpira", "general"), ("teknolojia", "general"),
]
for q, cat in sw_topics:
    safe_q = q.replace(" ", "+")
    add(f"https://news.google.com/rss/search?q={safe_q}&hl=sw&gl=KE&ceid=KE:sw", f"GN SW: {q.split()[0]}", cat)

# Bengali
bn_topics = [
    ("রাজনীতি বাংলাদেশ", "general"), ("অর্থনীতি ব্যবসা", "general"),
    ("খেলাধুলা ক্রিকেট", "general"), ("প্রযুক্তি", "general"),
    ("বিনোদন চলচ্চিত্র", "general"),
]
for q, cat in bn_topics:
    safe_q = q.replace(" ", "+")
    add(f"https://news.google.com/rss/search?q={safe_q}&hl=bn&gl=BD&ceid=BD:bn", f"GN BN: {q.split()[0][:4]}", cat)

# Urdu
ur_topics = [
    ("سیاست پاکستان", "general"), ("معیشت کاروبار", "general"),
    ("کھیل کرکٹ", "general"), ("ٹیکنالوجی", "general"),
]
for q, cat in ur_topics:
    safe_q = q.replace(" ", "+")
    add(f"https://news.google.com/rss/search?q={safe_q}&hl=ur&gl=PK&ceid=PK:ur", f"GN UR: {q.split()[0][:4]}", cat)

# Filipino
fil_topics = [
    ("pulitika Pilipinas", "general"), ("ekonomiya negosyo", "general"),
    ("sports basketball PBA", "general"), ("teknolohiya", "general"),
    ("entertainment showbiz", "general"),
]
for q, cat in fil_topics:
    safe_q = q.replace(" ", "+")
    add(f"https://news.google.com/rss/search?q={safe_q}&hl=fil&gl=PH&ceid=PH:fil", f"GN PH: {q.split()[0]}", cat)

# Ukrainian
ua_topics = [
    ("політика Україна", "general"), ("економіка бізнес", "general"),
    ("спорт футбол", "general"), ("технології", "general"),
    ("наука космос", "general"), ("оборона безпека", "general"),
]
for q, cat in ua_topics:
    safe_q = q.replace(" ", "+")
    add(f"https://news.google.com/rss/search?q={safe_q}&hl=uk&gl=UA&ceid=UA:uk", f"GN UA: {q.split()[0][:6]}", cat)

# Romanian
ro_topics = [
    ("politică România", "general"), ("economie afaceri", "general"),
    ("sport fotbal Liga1", "general"), ("tehnologie", "general"),
    ("știință cercetare", "general"),
]
for q, cat in ro_topics:
    safe_q = q.replace(" ", "+")
    add(f"https://news.google.com/rss/search?q={safe_q}&hl=ro&gl=RO&ceid=RO:ro", f"GN RO: {q.split()[0]}", cat)

# Greek
el_topics = [
    ("πολιτική Ελλάδα", "general"), ("οικονομία επιχειρήσεις", "general"),
    ("αθλητισμός ποδόσφαιρο", "general"), ("τεχνολογία", "general"),
    ("επιστήμη", "general"),
]
for q, cat in el_topics:
    safe_q = q.replace(" ", "+")
    add(f"https://news.google.com/rss/search?q={safe_q}&hl=el&gl=GR&ceid=GR:el", f"GN GR: {q.split()[0][:6]}", cat)

# Czech
cs_topics = [
    ("politika Česko", "general"), ("ekonomika podnikání", "general"),
    ("sport fotbal", "general"), ("technologie", "general"),
    ("věda výzkum", "general"),
]
for q, cat in cs_topics:
    safe_q = q.replace(" ", "+")
    add(f"https://news.google.com/rss/search?q={safe_q}&hl=cs&gl=CZ&ceid=CZ:cs", f"GN CZ: {q.split()[0]}", cat)

# Hungarian
hu_topics = [
    ("politika Magyarország", "general"), ("gazdaság üzlet", "general"),
    ("sport labdarúgás", "general"), ("technológia", "general"),
    ("tudomány kutatás", "general"),
]
for q, cat in hu_topics:
    safe_q = q.replace(" ", "+")
    add(f"https://news.google.com/rss/search?q={safe_q}&hl=hu&gl=HU&ceid=HU:hu", f"GN HU: {q.split()[0]}", cat)

# Hebrew
he_topics = [
    ("פוליטיקה ישראל", "general"), ("כלכלה עסקים", "general"),
    ("ספורט כדורגל", "general"), ("טכנולוגיה", "general"),
    ("מדע חלל", "general"),
]
for q, cat in he_topics:
    safe_q = q.replace(" ", "+")
    add(f"https://news.google.com/rss/search?q={safe_q}&hl=iw&gl=IL&ceid=IL:he", f"GN IL: {q.split()[0][:4]}", cat)

# Persian
fa_topics = [
    ("سیاست ایران", "general"), ("اقتصاد تجارت", "general"),
    ("ورزش فوتبال", "general"), ("فناوری", "general"),
    ("علم فضا", "general"),
]
for q, cat in fa_topics:
    safe_q = q.replace(" ", "+")
    add(f"https://news.google.com/rss/search?q={safe_q}&hl=fa&gl=IR&ceid=IR:fa", f"GN FA: {q.split()[0][:4]}", cat)

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
