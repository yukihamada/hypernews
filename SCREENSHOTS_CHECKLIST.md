# Screenshots Checklist - Product Hunt Launch

**Total Required**: 10 high-quality screenshots
**Resolution**: 1280x1024 (or 2560x2048 for Retina)
**Format**: PNG with transparency where applicable
**File Size**: <500KB each (optimize with TinyPNG)

---

## Screenshot List

### 1. Hero Shot - news.xyz Homepage (Desktop)
**Priority**: CRITICAL
**Purpose**: First impression, main visual

**Requirements**:
- Desktop browser (Chrome or Safari, clean UI)
- news.xyz homepage with card layout
- Show 6-8 article cards (2 columns)
- "Card" theme (default, most polished)
- Categories visible in sidebar
- AI Assistant button visible
- Clean data (no Lorem Ipsum, real news headlines)
- No personal info in browser

**Composition**:
- Full browser window (1280x1024)
- Center the viewport to show header + cards
- Make sure logo is visible
- Include a bit of the gradient background

**Annotations**:
- Arrow pointing to theme switcher: "3 Visual Themes"
- Circle around AI button: "AI Assistant"
- Label on categories: "7 Categories"

---

### 2. news.online - TikTok-Style Feed (Mobile)
**Priority**: CRITICAL
**Purpose**: Show unique vertical swipe UI

**Requirements**:
- Mobile simulator (iPhone 14 Pro frame)
- Vertical orientation (9:16 aspect)
- news.online feed showing single article card
- Apple Liquid Glass design visible
- Podcast player controls at bottom
- Swipe indicator (up/down arrows)
- Vibrant article image
- Category badge visible

**Composition**:
- Full phone frame with rounded corners
- Article fills most of screen
- Show glass morphism effect

**Annotations**:
- Arrow indicating swipe direction: "Swipe to browse"
- Label on podcast button: "AI Podcast"
- Tag on glass effect: "Apple Liquid Glass Design"

---

### 3. AI Podcast Generation - In Progress
**Priority**: HIGH
**Purpose**: Show AI feature in action

**Requirements**:
- news.online on mobile
- Podcast generation loading state
- Progress indicator / animation
- Article partially visible in background
- "Generating AI dialogue..." text
- Waveform or audio visualization preview

**Composition**:
- Modal/overlay showing generation
- Blurred article in background
- Center the loading animation

**Annotations**:
- "Claude Sonnet generates dialogue"
- "OpenAI TTS creates voices"
- "~10 seconds"

---

### 4. news.cloud - API Documentation (Desktop)
**Priority**: HIGH
**Purpose**: Appeal to developer audience

**Requirements**:
- news.cloud homepage
- API documentation visible
- Code examples with syntax highlighting
- Endpoints list (GET /api/articles, etc.)
- JSON response preview
- Clean, technical aesthetic
- Dark mode or professional light theme

**Composition**:
- Full browser window
- Code on one side, docs on the other
- Terminal/console aesthetic

**Annotations**:
- Highlight REST API endpoints
- "Free tier available"
- "CORS enabled"

---

### 5. chatnews.link - Chat Interface (Desktop)
**Priority**: MEDIUM
**Purpose**: Show conversational AI feature

**Requirements**:
- chatnews.link chat UI
- Conversation thread with 4-6 messages
- User messages on right, AI on left (or vice versa)
- AI response includes context about news article
- Input field visible at bottom
- Article reference shown (link or preview)

**Composition**:
- Chat interface centered
- Messages clearly readable
- Modern messaging app aesthetic

**Annotations**:
- "Context-aware AI"
- "Real-time responses"
- "Powered by Claude"

---

### 6. Theme Switcher - All 3 Themes (Desktop)
**Priority**: HIGH
**Purpose**: Show customization options

**Requirements**:
- Three-panel comparison
- Same content, different themes:
  - Left: Card theme (gradient cards)
  - Center: Hacker theme (green/black matrix)
  - Right: Lite theme (minimal white)
- news.xyz on all three
- Same article visible in each for comparison

**Composition**:
- Triptych layout (3 equal panels)
- Aligned at the top
- Same article headline visible in all

**Annotations**:
- Label each theme: "Card" / "Hacker" / "Lite"
- "Switch themes instantly"

---

### 7. AI Assistant - 4 Conversation Modes (Desktop)
**Priority**: MEDIUM
**Purpose**: Show personality customization

**Requirements**:
- news.xyz with AI assistant panel open
- 4 mode buttons visible:
  - Caster (📺)
  - Friend (💬)
  - Scholar (🎓)
  - Entertainer (🎭)
- Question suggestions displayed (4 bubbles)
- One suggestion highlighted/selected
- Article content partially visible

**Composition**:
- Split view: article on left, assistant on right
- Mode buttons prominent
- Question bubbles in a grid

**Annotations**:
- "4 Conversation Styles"
- "Auto-generated questions"
- "Voice responses"

---

### 8. Architecture Diagram - Single Binary, 7 Sites
**Priority**: HIGH
**Purpose**: Explain technical architecture visually

**Requirements**:
- Custom diagram (Figma/Sketch/Excalidraw)
- Center: Rust binary icon
- 7 branches to domain bubbles:
  - news.xyz
  - news.online
  - news.cloud
  - chatnews.link
  - yournews.link
  - velo.tech
  - chatnews.tech → chatnews.link (redirect)
- SQLite database below binary
- Fly.io logo/label above
- Clean, minimal design

**Composition**:
- Centered diagram on white or subtle gradient background
- Icons for each domain (favicon or emoji)
- Arrows clearly showing relationships

**Annotations**:
- "1 Deployment"
- "Shared Database"
- "Client-side routing"

---

### 9. Performance Metrics - velo.tech (Desktop)
**Priority**: LOW
**Purpose**: Show additional utility (web performance tool)

**Requirements**:
- velo.tech interface
- Performance report displayed
- Core Web Vitals metrics:
  - LCP (Largest Contentful Paint)
  - FID (First Input Delay)
  - CLS (Cumulative Layout Shift)
- Score visualization (gauge or chart)
- Tested URL visible
- Export button visible

**Composition**:
- Dashboard layout
- Metrics prominently displayed
- Professional/tool aesthetic

**Annotations**:
- "Core Web Vitals"
- "Free performance testing"

---

### 10. Mobile Responsiveness - Grid of All Sites (Composite)
**Priority**: MEDIUM
**Purpose**: Show all sites work on mobile

**Requirements**:
- 6-7 mobile screenshots arranged in grid
- Each showing a different site:
  1. news.xyz (card view on mobile)
  2. news.online (vertical feed)
  3. news.cloud (mobile-optimized docs)
  4. chatnews.link (mobile chat)
  5. yournews.link (mobile personalized)
  6. velo.tech (mobile performance tool)
- iPhone frames for consistency
- All screenshots in portrait orientation

**Composition**:
- 2x3 or 3x2 grid layout
- Equal spacing between phones
- White or gradient background
- Site name under each phone

**Annotations**:
- "Fully Responsive"
- "PWA Support"
- "Works Offline"

---

## Production Guidelines

### General Rules
1. **No personal data**: Clear browser history, bookmarks, extensions
2. **Real content**: Use actual news articles, not placeholders
3. **Timing**: Take screenshots when site is fully loaded (no spinners)
4. **Resolution**: 2x Retina where possible (downscale for web)
5. **Consistency**: Same browser, same zoom level (100%)
6. **Lighting**: Good contrast, readable text
7. **Cropping**: Leave some padding, don't cut off important elements

### Browser Setup
- **Browser**: Chrome or Safari (latest version)
- **Extensions**: Disable all (or use Incognito/Private mode)
- **Window size**: 1280x1024 for desktop, iPhone 14 Pro for mobile
- **Zoom**: 100% (Cmd+0 to reset)
- **DevTools**: Closed (unless showing inspector for technical shot)

### Mobile Simulator
- **Tool**: Chrome DevTools Device Mode or Xcode Simulator
- **Device**: iPhone 14 Pro (6.1", 2532x1170)
- **Frame**: Include device bezel for context
- **Orientation**: Portrait for vertical feeds, landscape for specific features

### Screenshot Tools
- **macOS**: Cmd+Shift+4 (selection) or Cmd+Shift+3 (full screen)
- **Windows**: Windows+Shift+S (Snipping Tool)
- **Chrome**: DevTools → Cmd+Shift+P → "Capture screenshot"
- **Third-party**: CleanShot X (macOS), Greenshot (Windows)

### Post-Processing
1. **Crop**: Remove unnecessary chrome, center important elements
2. **Optimize**: TinyPNG or ImageOptim (target <500KB per image)
3. **Annotations**: Use Figma, Sketch, or Photoshop
   - Arrow color: Bright blue (#007AFF) or brand color
   - Text: Sans-serif, bold, 18-24pt
   - Background: White with 80% opacity, 4px border radius
4. **Export**: PNG-24 with transparency (where applicable)

### Annotation Style Guide
- **Arrows**: Curved, 3px thick, bright color
- **Circles/Boxes**: 2px stroke, semi-transparent fill
- **Text boxes**: White bg, rounded corners, subtle shadow
- **Font**: SF Pro (macOS), Segoe UI (Windows), or Roboto (universal)
- **Size**: Large enough to read at thumbnail size (300x200px)

---

## Screenshot Order (Product Hunt Upload)

Upload in this sequence for best visual flow:

1. **Screenshot 1**: Hero (news.xyz desktop)
2. **Screenshot 8**: Architecture diagram
3. **Screenshot 2**: news.online mobile feed
4. **Screenshot 3**: AI podcast generation
5. **Screenshot 6**: Theme comparison (3 themes)
6. **Screenshot 7**: AI assistant modes
7. **Screenshot 4**: API documentation
8. **Screenshot 5**: Chat interface
9. **Screenshot 10**: Mobile grid (all sites)
10. **Screenshot 9**: Performance metrics (velo.tech)

**Rationale**: Start with the hook (pretty UI), explain the tech (architecture), show the features (AI, themes), prove the utility (API, tools), end with comprehensive view (all sites).

---

## Alternative Shot Ideas (Bonus)

### 11. Behind the Scenes - Code Editor
- Show `main.rs` with domain detection logic
- Syntax highlighted Rust code
- Terminal showing `cargo build --release`
- File structure (project tree)

### 12. Deployment Dashboard - Fly.io
- Fly.io dashboard showing all 7 apps
- Single deployment updating all
- Metrics (uptime, response time)
- Tokyo region highlighted

### 13. Invoice / Receipt (Story Hook)
- Recreated domain invoice (or real one, redacted)
- Line items with prices
- Total: $64,500
- Shocked emoji or reaction GIF

### 14. AI Conversation Example
- Long-form chat between user and AI
- Multiple turns showing context awareness
- Highlight where AI references previous messages
- Article preview on side

### 15. RSS Feed Configuration
- `feeds.toml` file open in editor
- Show diversity of sources (50+ feeds)
- Categories color-coded
- Backend fetcher logs

---

## Quality Checklist (Per Screenshot)

Before finalizing each image, verify:

- [ ] Resolution: 1280x1024 or higher (desktop), 1170x2532 (mobile)
- [ ] File size: <500KB after optimization
- [ ] Format: PNG (or JPG if no transparency needed)
- [ ] Content: Real data, no placeholders
- [ ] Annotations: Clear, readable, professional
- [ ] Consistency: Matches style of other screenshots
- [ ] Focus: Key feature is obvious and highlighted
- [ ] Cropping: No important elements cut off
- [ ] Privacy: No personal info visible
- [ ] Branding: Logo or site name visible

---

## Asset Organization

```
screenshots/
├── 01-hero-news-xyz-desktop.png
├── 02-news-online-mobile-feed.png
├── 03-ai-podcast-generation.png
├── 04-api-documentation.png
├── 05-chat-interface.png
├── 06-theme-comparison.png
├── 07-ai-assistant-modes.png
├── 08-architecture-diagram.png
├── 09-velo-performance.png
├── 10-mobile-grid.png
├── raw/                          # Unedited originals
│   └── ...
├── annotated/                    # Work-in-progress with annotations
│   └── ...
└── optimized/                    # Final, compressed versions
    └── ...
```

---

## Timeline

### Day 1-2: Capture
- [ ] Set up environments (desktop, mobile simulator)
- [ ] Take all raw screenshots
- [ ] Review for quality, retake if needed

### Day 3-4: Edit
- [ ] Crop and optimize
- [ ] Add annotations
- [ ] Create architecture diagram
- [ ] Proof all text for typos

### Day 5: Finalize
- [ ] Export all at correct resolution
- [ ] Compress with TinyPNG
- [ ] Name files systematically
- [ ] Create backup copies

### Day 6: Upload
- [ ] Arrange in optimal order
- [ ] Upload to Product Hunt draft
- [ ] Preview on mobile and desktop
- [ ] Final adjustments

---

## Product Hunt Specific Tips

1. **First screenshot is critical**: This appears in feed thumbnails
2. **Use text overlays sparingly**: Product Hunt crops aggressively on mobile
3. **Show, don't tell**: Visuals > text explanations
4. **Include humans when possible**: Screenshots of UI with cursor or interactions feel more real
5. **Dark mode options**: Many users prefer dark screenshots
6. **Captions**: Use Product Hunt's caption feature for each screenshot

---

**Remember**: Screenshots are the second thing people see (after the tagline). They need to tell the story visually and instantly prove the value.
