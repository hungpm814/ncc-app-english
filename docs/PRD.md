# Mezon English Exam App — Product Requirements Document

## 1. Product Vision & Goals

**Vision**: A lightweight English proficiency assessment tool embedded inside Mezon, designed to evaluate users' English level and drive clan membership growth through a "result-gating" mechanic.

**Growth Loop**:
```
User opens Channel App → Takes exam → Sees partial results (teaser) 
    → Joins clan to unlock full results → Stays in clan community
```

**Goals**:
- Provide a quick, credible English level assessment (5-10 minutes)
- Drive organic clan growth via the result-unlock mechanic
- Collect user English proficiency data for community insights
- Zero-friction entry: no signup beyond existing Mezon login

---

## 2. User Personas

| Persona | Description | Motivation |
|---------|-------------|------------|
| **Curious Learner** | Mezon user who wants to know their English level | Self-assessment, bragging rights |
| **Community Member** | Already in some clans, open to joining new ones | Content value, community |
| **Clan Admin** | Wants to grow their clan membership | Uses the app as a member acquisition tool |

---

## 3. User Journey

### Entry Points & Authentication
The app supports **two initial entry flows**, both leading to a Mezon-authenticated session:

- **Entry Point A (Direct Web Access)**:
  1. User visits the web app URL directly (e.g. `https://english-exam.vercel.app`).
  2. App detects no active session or hash data.
  3. Displays Landing Page with overview and prominent **"Login with Mezon"** button.
  4. User clicks "Login with Mezon" → Redirects to Mezon OAuth2 (`oauth2.mezon.ai/oauth2/auth`).
  5. User approves → Redirects back to `/api/auth/callback` → Session cookie set → Redirected to `/exam`.

- **Entry Point B (Embedded Mezon Channel App)**:
  1. User opens the app from inside a Mezon channel iframe.
  2. App receives signed `?data=...` parameter in URL.
  3. App auto-authenticates silently via `/api/auth/mezon-hash` → Session cookie set.
  4. User arrives directly at the welcome screen ready to start.

### Core Exam & Growth Flow (Post-Login Happy Path)
1. **Welcome Screen**: User sees exam overview (30 questions, ~12 mins, CEFR level assessment).
2. **Start Exam**: User clicks "Start Exam" → Attempt created in DB → Timer starts.
3. **Take Exam**: Completes 30 questions across Grammar, Vocabulary, and Reading. Answers are autosaved per question.
4. **Submit Exam**: Server scores attempt, maps score to CEFR level (A1–C2), and sets `result_status = 'partial'`.
5. **Partial Result Screen (Teaser)**:
   - Displays CEFR level badge (e.g. "B1 - Intermediate") and overall score percentage.
   - Displays blurred/locked cards for: Detailed Skill Breakdown, Weakness Analysis, Improvement Tips, and Certificate.
6. **Clan Join Call-to-Action**:
   - User sees banner: *"Join [Clan Name] on Mezon to unlock your full detailed report!"*
   - Clicks "Join Clan" → Opens Mezon clan invite deep link / URL.
7. **Verify & Unlock**:
   - User returns to app and clicks "I've Joined — Unlock Report".
   - App calls `/api/membership/verify` → Server checks Mezon Bot API for user membership.
   - Upon confirmation, `result_status` updates to `'full'` → Full breakdown unlocked!

---

## 4. Functional Requirements

### Must Have (MVP)
- [x] Mezon Channel App hash authentication (WebAppData)
- [x] OAuth2 fallback for standalone web access
- [x] 30-question English exam (multiple choice)
- [x] Adaptive-lite: 3 difficulty tiers (easy/medium/hard)
- [x] Partial result display (level + score only)
- [x] Clan membership verification to unlock full results
- [x] "Re-check membership" button with polling
- [x] Answer persistence (resume on refresh)
- [x] Mobile-responsive UI
- [x] Basic anti-cheat (server-side timing, no answers in client)

### Should Have (v1.1)
- [ ] Listening comprehension questions (audio)
- [ ] Leaderboard within clan
- [ ] Share result card to Mezon channel
- [ ] Multiple exam types (General, Business, IELTS-prep)
- [ ] Admin dashboard for question management

### Could Have (v2)
- [ ] AI-generated personalized study plan
- [ ] Writing assessment (AI-graded)
- [ ] Multi-language support for instructions
- [ ] Exam analytics for clan admins

---

## 5. Exam Design (MVP)

### Structure
| Section | Questions | Time | Difficulty Mix |
|---------|-----------|------|----------------|
| Grammar | 10 | ~3 min | 4 easy, 3 med, 3 hard |
| Vocabulary | 10 | ~3 min | 4 easy, 3 med, 3 hard |
| Reading Comprehension | 10 | ~6 min | 3 easy, 4 med, 3 hard |
| **Total** | **30** | **~12 min** | |

### Question Format
- All multiple choice (4 options, 1 correct)
- Questions stored in Supabase `questions` table
- Randomized order within each section
- Random subset from larger pool (e.g., 30 from 100+)

### Scoring
- Each correct answer = 1 point (raw score: 0-30)
- Weighted by difficulty: easy=1pt, medium=2pt, hard=3pt
- Max weighted score: 4×1 + 3×2 + 3×3 = 19 per section = 57 total
- Map weighted score to CEFR-aligned levels:

| Weighted Score | Level | Label |
|---------------|-------|-------|
| 0-10 | A1 | Beginner |
| 11-20 | A2 | Elementary |
| 21-30 | B1 | Intermediate |
| 31-40 | B2 | Upper Intermediate |
| 41-50 | C1 | Advanced |
| 51-57 | C2 | Proficient |

---

## 6. Result Display Strategy

### Shown Immediately (FREE — the "teaser")
- **Level badge** with CEFR label (e.g., "B1 - Intermediate")
- **Overall score percentage**
- **Ranking**: "Better than X% of all test takers"
- **Time taken** to complete
- A motivational message based on level

### Locked Until Clan Join (the "unlock")
- **Skill breakdown chart** (Grammar: 70%, Vocabulary: 85%, Reading: 60%)
- **Weakness analysis**: "Your weakest area is Grammar — specifically conditionals and passive voice"
- **Improvement tips**: 3-5 actionable suggestions per weak area
- **Percentile comparison**: Detailed radar chart vs. average scores
- **Downloadable PDF certificate** with name, level, date
- **Historical progress** (if retaken)

**Why this split works**: The teaser satisfies curiosity ("what's my level?") but creates desire for the detailed breakdown. The locked section has genuine educational value — users feel the clan join is "worth it" rather than just a paywall.

---

## 7. Clan-Join Unlock Flow

### Architecture
```
User clicks "Unlock" → Opens clan invite link in new tab
    → User joins clan in Mezon
    → Returns to exam app
    → Clicks "I've joined! Check now"
    → App calls server → Server checks membership via bot API
    → If member: unlock results, save to DB
    → If not: "Not found yet. Try again in a moment."
```

### Membership Verification
**Primary method**: Server-side bot using `mezon-sdk`
- Bot is pre-installed in the target clan
- On verification request: `clan.users.fetch(userId)` 
- If found → mark `unlocked_at` in Supabase
- If not found → return "not yet a member"

**Fallback method**: Listen for `AddClanUser` event via bot WebSocket
- When user joins, bot receives event with `user_id`
- Bot calls webhook to app server → Auto-unlock if pending

### Client UX
- "Check membership" button with 5-second cooldown between clicks
- Auto-poll every 10 seconds for 2 minutes after user clicks unlock
- Visual state: "Checking..." → "Not found, try again" / "Unlocked!"
- Deep link format: `mezon://clan/invite/{INVITE_CODE}` (fallback: web URL)

---

## 8. Data Model

### Core Tables (Supabase)

```
users
  - id (uuid, PK)
  - mezon_id (text, unique) — Mezon user ID
  - mezon_username (text)
  - display_name (text)
  - avatar_url (text)
  - clan_member (boolean, default false)
  - clan_joined_at (timestamptz)
  - created_at (timestamptz)
  - updated_at (timestamptz)

questions
  - id (uuid, PK)
  - section (enum: grammar, vocabulary, reading)
  - difficulty (enum: easy, medium, hard)
  - question_text (text)
  - reading_passage (text, nullable) — for reading comp
  - options (jsonb) — [{id: "a", text: "..."}, ...]
  - correct_option_id (text) — "a", "b", "c", or "d"
  - explanation (text) — shown in full results
  - active (boolean, default true)
  - created_at (timestamptz)

attempts
  - id (uuid, PK)
  - user_id (uuid, FK → users)
  - started_at (timestamptz)
  - submitted_at (timestamptz, nullable)
  - time_limit_seconds (int, default 900)
  - raw_score (int, nullable)
  - weighted_score (int, nullable)
  - level (text, nullable) — A1-C2
  - percentile (float, nullable)
  - unlocked (boolean, default false)
  - unlocked_at (timestamptz, nullable)
  - question_ids (uuid[], ordered) — the 30 questions for this attempt

answers
  - id (uuid, PK)
  - attempt_id (uuid, FK → attempts)
  - question_id (uuid, FK → questions)
  - selected_option_id (text, nullable)
  - is_correct (boolean, nullable) — computed on submit
  - answered_at (timestamptz)

exam_stats (materialized view or computed)
  - total_attempts (int)
  - avg_score (float)
  - score_distribution (jsonb)
  - updated_at (timestamptz)
```

---

## 9. Non-Functional Requirements

### Security & Anti-Cheat
- Questions and correct answers NEVER sent to client
- Client only receives: question_text, options (without correct flag)
- Scoring happens server-side only
- Timing validated server-side (reject if too fast: <30s for 30 questions)
- Rate limit: max 1 attempt per 24 hours per user
- Hash validation on every API request (Mezon auth)

### Performance
- Page load < 2 seconds
- Question transition < 200ms
- Result computation < 1 second
- Support 100 concurrent users (Supabase free tier)

### Privacy
- No email collection (Mezon profile only)
- Exam data retained 1 year, then anonymized
- GDPR: user can request data deletion
- No third-party analytics in MVP

### Mobile UX
- Touch-friendly option buttons (min 44px tap target)
- Horizontal swipe between questions
- Progress bar always visible
- Works in Mezon mobile app iframe

---

## 10. Open Questions for Founder

1. **Which clan?** Is this for one specific clan, or configurable per deployment?
2. **Clan invite link**: Do you have a permanent invite link? Or should the bot auto-generate one?
3. **Retake policy**: 24h cooldown acceptable? Or different?
4. **Question content**: Who writes the questions? Do you have a bank, or should we seed with AI-generated ones?
5. **Branding**: Clan name/logo to display? Custom theme colors?
6. **Standalone access**: Should users be able to access via web URL (not just Mezon channel), using OAuth2?
7. **Multiple clans**: Could this be deployed for different clans (multi-tenant)?
8. **Certificate**: Is a downloadable PDF certificate wanted for MVP?
9. **Bot setup**: Do you already have a Mezon bot with a token, or do we need to create one?
10. **Target language**: UI in English only, or Vietnamese + English?

---

## 11. MVP Scope vs. Later Phases

### MVP (Week 1-2)
- Channel App auth + OAuth2 fallback
- 30 MCQ exam (seeded question bank)
- Score + level calculation
- Partial result display
- Clan join gate with manual re-check
- Supabase backend
- Deploy to Vercel

### Phase 2 (Week 3-4)
- Auto-detect clan join via bot events
- Leaderboard
- Result sharing to Mezon channel
- Admin question management
- Analytics dashboard

### Phase 3 (Month 2+)
- Multiple exam types
- AI-powered study recommendations
- Audio/listening section
- Writing assessment
- Multi-tenant (different clans)

---

## 12. Success Metrics

| Metric | Target (Month 1) |
|--------|-------------------|
| Exam completions | 500+ |
| Completion rate | >70% (started → submitted) |
| Clan join conversion | >40% of exam completers |
| Clan retention (30d) | >60% of those who joined |
| Avg. time to complete | 8-12 minutes |
| Return rate (retake) | >20% within 30 days |
