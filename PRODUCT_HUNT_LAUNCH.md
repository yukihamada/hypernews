# Product Hunt Launch - news.xyz (HyperNews) Complete Guide

## Launch Overview

**Product Name**: news.xyz (HyperNews)
**Tagline**: "I spent $8.45M on domains. Then built 7 AI news sites with one binary."
**Launch Date**: TBD (Recommend Tuesday-Thursday, 12:01 AM PST)
**Category**: Artificial Intelligence, News, Developer Tools

---

## The $8.45M Story (Primary Hook)

### Japanese Version (Original)
> いいサービスを思いついて勢いでドメインを取得したら、news.online が 453万円、news.xyz が 181万円、その他合わせて総額 **845万円** の請求が来た。まさかそんな値段だとは思わなかったが、後悔はしていない。

### English Version (For Product Hunt)
> I had this brilliant idea for a news platform. Got excited and registered some domains.
>
> Then the invoice arrived:
> - news.online: $40,000 USD
> - news.xyz: $16,000 USD
> - 5 other domains: $8,500 USD
>
> **Total: $64,500 USD** (¥8.45M)
>
> I had no idea premium domains cost this much. But you know what? No regrets.
>
> So I did what any developer would do: built the most efficient AI news platform possible to justify the expense.

---

## Product Hunt Post (Final Version)

### Title
**news.xyz - I spent $64.5K on domains, then built 7 AI news sites**

### Tagline (60 chars max)
One Rust binary. Seven premium domains. Zero regrets.

### Description (260 chars max)
Accidental $64.5K domain purchase led to 7 AI-powered news sites running from a single Rust binary. TikTok-style feeds, podcast generation, API platform - all on news.xyz, news.online, news.cloud & more. Premium domains, indie execution.

### Full Description

I made an expensive mistake that turned into something beautiful.

**The Story**

I got excited about building an AI news platform. Registered a few domains without checking the price. Then the invoice came: $64,500 USD for 7 premium domains (news.online, news.xyz, news.cloud, and 4 others).

My heart stopped. But after the shock wore off, I thought: "Well, I can't return them. Might as well build something extraordinary."

**What I Built**

One single Rust binary that powers 7 completely different news experiences:

🎯 **news.xyz** - Card-based news with 3 themes, AI chat, TTS
📱 **news.online** - TikTok-style vertical swipe with AI voice podcasts
🔧 **news.cloud** - News API platform for developers
💬 **chatnews.link** - Chat with AI about the news
✨ **yournews.link** - Personalized news curation
⚡ **velo.tech** - Web performance measurement tool

All running from the same Docker image on Fly.io (Tokyo). Domain detection happens client-side, UI switches based on hostname. Backend is shared.

**The Tech**

- Built with Rust (axum 0.7) + Vanilla JS
- Single SQLite database (WAL mode)
- AI features: Claude Sonnet for dialogue, OpenAI TTS for voices
- RSS aggregation every 30 minutes
- MCP Server integration for Claude Code
- No framework bloat, just performance

**Why This Matters**

Most platforms require separate deployments, databases, and infrastructure per site. I wanted to prove you can build multiple premium experiences from one codebase without sacrificing user experience.

The $64.5K mistake forced me to think differently. Instead of building one mediocre site to "justify" the cost, I built seven excellent ones.

**Try It**

- news.xyz - Main experience (best on desktop)
- news.online - TikTok-style feed (perfect on mobile)
- news.cloud - API docs for developers

No signup required. No paywall. Just news, AI, and over-engineered efficiency.

---

**Why I'm Sharing This**

Because sometimes our mistakes push us to build better things. And because $64.5K is a good reminder to always check the price before clicking "Purchase."

---

## Launch Timeline (D-Day Strategy)

### 1 Week Before
- [ ] Finalize all screenshots (10 images)
- [ ] Record 60-second demo video
- [ ] Contact Hunter candidates (send cold DMs)
- [ ] Prepare social media posts
- [ ] Set up analytics tracking (PostHog, Plausible, etc.)
- [ ] Test all 7 domains (mobile + desktop)
- [ ] Prepare FAQ responses

### 3 Days Before
- [ ] Confirm Hunter commitment
- [ ] Schedule Product Hunt post (12:01 AM PST)
- [ ] Prepare Reddit posts (r/SideProject, r/InternetIsBeautiful)
- [ ] Write Hacker News post (Show HN)
- [ ] Prepare Twitter/X thread (10+ tweets)
- [ ] Alert friends/community for upvotes

### Launch Day (12:01 AM PST)
- [ ] Product Hunt goes live
- [ ] Post to Twitter/X immediately
- [ ] Post to Hacker News (after 2 hours)
- [ ] Post to Reddit (stagger by 1 hour each)
- [ ] Monitor comments every 30 minutes
- [ ] Respond to ALL comments within 1 hour
- [ ] Share updates in maker communities

### First 6 Hours (Critical Period)
- [ ] Engage with every comment
- [ ] Thank upvoters publicly
- [ ] Share behind-the-scenes stories
- [ ] Post progress updates ("50 upvotes!", "Top 10!")
- [ ] Ask for feedback, incorporate suggestions
- [ ] Cross-post to LinkedIn, IndieHackers

### First 24 Hours
- [ ] Maintain response rate <1 hour
- [ ] Share user testimonials
- [ ] Post analytics/metrics if impressive
- [ ] Publish blog post about the story
- [ ] Prepare "thank you" post for next day

---

## Engagement Strategy

### Comment Response Templates

**Someone asks about the $64.5K**
> "Yeah, it was a shock. I was building a prototype and thought domain registration was like $10-20/year. Turns out premium .online and .xyz domains are... not that. But honestly, it pushed me to build something I'm really proud of. Silver lining!"

**Developer asks about the tech stack**
> "Rust + axum for the backend (rock solid performance), SQLite with WAL mode for the DB (surprisingly fast even at scale), and vanilla JS on the frontend (no framework tax). The whole thing deploys to a single Fly.io machine in Tokyo. Open to answering any specific tech questions!"

**Question about monetization**
> "Right now it's free. I'm exploring API access tiers for news.cloud and maybe a pro tier for news.online's AI features. But honestly, I built this to justify the domain cost to myself first, monetization second 😅"

**Someone says it's too expensive**
> "100% agreed. I made a mistake by not checking the price. But I learned a valuable lesson and got to build something cool. Would I do it again? Probably not. Would I undo it? Also no."

**Technical question about architecture**
> "Happy to dive deep! The key insight is domain detection happens client-side (JavaScript checks window.location.hostname), so we serve the same HTML/CSS/JS bundle but switch the UI via CSS classes and data attributes. Backend has no idea which 'site' you're on - it's all the same API. Want me to share more details?"

---

## Hunter Outreach Template

Subject: **Quick question about hunting a $64.5K mistake**

Hi [Name],

I'm launching a project on Product Hunt soon and wondered if you'd be interested in hunting it.

**The Story**: I accidentally spent $64,500 on premium domains (news.online, news.xyz, etc.) without checking the price. Then built 7 different AI news sites from a single Rust binary to justify the cost.

**Why it might interest you**:
- Unusual story (expensive mistake → creative solution)
- Strong tech angle (Rust, efficiency, multi-tenant architecture)
- Multiple products in one (news aggregator, API, TikTok-style feed)
- Visual appeal (Apple-inspired design, smooth UX)

**What I have ready**:
- 60-second demo video
- 10 high-quality screenshots
- Polished copy with the story
- Live sites (all 7 domains working)

Would you be interested? Happy to send more details or answer questions.

Thanks for considering!
Yuki

---

## Success Metrics

### Primary Goals
- [ ] Top 5 Product of the Day
- [ ] 500+ upvotes
- [ ] 100+ comments
- [ ] Featured in Product Hunt newsletter

### Secondary Goals
- [ ] 10,000+ unique visitors on launch day
- [ ] 50+ signups for news.cloud API
- [ ] 20+ developer stars/follows
- [ ] Featured on Hacker News front page
- [ ] 5+ press mentions or blog writeups

### Engagement Goals
- [ ] 100% comment response rate (first 24h)
- [ ] 10+ detailed technical discussions
- [ ] 5+ user testimonials/screenshots
- [ ] 3+ content creators make videos

---

## Risk Mitigation

### Potential Negative Reactions

**"This is just a rich kid flexing"**
Response: "I'm an indie developer. $64.5K was a massive mistake that I'm still paying off. This project is my attempt to make something of it, not a flex."

**"Why build 7 mediocre sites instead of 1 good one?"**
Response: "Fair question! Each site serves a different use case and user preference. news.xyz is for readers who want cards, news.online is for TikTok-style consumption, news.cloud is for developers. Same content, different experiences. And they all share the same efficient backend."

**"This is just another news aggregator"**
Response: "True, the core is aggregation. But the AI features (podcast generation, chat, personalization) and the multi-site architecture from one binary are what make it different. Plus, I wanted to prove you could build premium UX without bloated frameworks."

**"You could have bought a used car instead"**
Response: "I wish! Believe me, I would have chosen the car. But here we are 😅"

---

## Post-Launch Actions

### Day 2
- [ ] Post "Thank You" update on Product Hunt
- [ ] Share analytics/metrics
- [ ] Write blog post about the launch experience
- [ ] Reach out to press (TechCrunch, The Verge, etc.)

### Week 1
- [ ] Compile all feedback into roadmap
- [ ] Fix any critical bugs
- [ ] Add most-requested features
- [ ] Publish "What I Learned" post

### Month 1
- [ ] Case study: "How a $64.5K mistake taught me efficient engineering"
- [ ] Open-source portions of the codebase
- [ ] Launch API pricing tiers
- [ ] Build community (Discord/Slack)

---

## Additional Resources

- **Video Script**: See VIDEO_SCRIPT.md
- **Screenshot Checklist**: See SCREENSHOTS_CHECKLIST.md
- **Hunter Candidates**: See HUNTER_CANDIDATES.md
- **Updated README**: See README.md (revised with story up front)

---

## Final Checklist

### Pre-Launch
- [ ] All 7 sites tested and working
- [ ] Demo video uploaded to YouTube (unlisted)
- [ ] All 10 screenshots uploaded
- [ ] Hunter confirmed
- [ ] Post scheduled for 12:01 AM PST
- [ ] Social media posts prepared
- [ ] Team/friends alerted for upvotes
- [ ] Analytics tracking ready

### Launch Day
- [ ] Post goes live
- [ ] Share to Twitter, Hacker News, Reddit
- [ ] Monitor and respond to comments
- [ ] Track metrics hourly
- [ ] Celebrate small wins publicly

### Post-Launch
- [ ] Thank you post (Day 2)
- [ ] Incorporate feedback
- [ ] Write retrospective
- [ ] Plan next steps

---

**Remember**: The story is the hook. The tech is the substance. The UX is the proof. All three need to shine.

Good luck! 🚀
