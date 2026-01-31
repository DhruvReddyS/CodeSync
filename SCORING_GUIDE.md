# Scoring Guide (All 6 Platforms)

This document explains how scraped data is normalized and converted into scores for each platform, and how the overall CodeSync score is derived.

Sources in code:
- Scoring formulas: `backend/src/lib/scoringEngine.ts`
- Scrape + save pipeline: `backend/src/services/userCpRefreshService.ts`
- Score caching: `backend/src/services/studentScoresService.ts`

---

## 0) Scoring outputs (what we compute)

For every student, we compute these fields:
- `platformSkills`: per-platform score (raw, not normalized to 100)
- `codeSyncScore`: sum of all platformSkills (raw total)
- `displayScore`: rounded `codeSyncScore` (used for leaderboard rank)
- `totalProblemsSolved`: sum of solved problems across platforms (GitHub excluded)
- `breakdown`: per platform `{ problemsSolved, rating, contests }`

Note: scores are stored in `studentScores/{studentId}` (not inside student doc).

---

## 1) Scraped data ? normalized inputs

Each scraper returns a raw stats object for its platform, stored at:
`students/{studentId}/cpProfiles/{platform}`.

During scoring, we normalize using these fallbacks:

- **Solved count** (platform-specific priority):
  - `totalSolved` ? `problemsSolvedTotal` ? `problemsSolved`
  - CodeChef uses `fullySolved + partiallySolved`

- **Rating**:
  - `contestRating` ? `rating` ? `currentRating`

- **Contests**:
  - `attendedContests` ? `contestsParticipated` ? `contestsAttended`
  - AtCoder uses `totalContests` ? `ratedMatches`

- **GitHub (no solved count)**:
  - Uses `contributionsLastYear`, `totalStars` or `starsReceived`, `publicRepos`, `followers`

---

## 2) Per-platform scoring formulas

Below are the exact formulas used in `scoringEngine.ts`.

### A) LeetCode
**Inputs used:**
- `totalSolved || problemsSolvedTotal` ? `solved`
- `contestRating || rating` ? `rating`
- `attendedContests || contestsParticipated` ? `contests`

**Formula:**
```
score = solved*10 + rating*1.0 + contests*25
```
**Breakdown stored:** `{ problemsSolved: solved, rating, contests }`

---

### B) Codeforces
**Inputs used:**
- `problemsSolvedTotal || problemsSolved` ? `solved`
- `rating` ? `rating`
- `contestsAttended || contestsParticipated` ? `contests`

**Formula:**
```
score = solved*12 + rating*1.2 + contests*40
```
**Breakdown stored:** `{ problemsSolved: solved, rating, contests }`

---

### C) CodeChef
**Inputs used:**
- `fullySolved.total` or `fullySolved` ? `fully`
- `partiallySolved.total` or `partiallySolved` ? `partial`
- `currentRating || rating` ? `rating`
- contests are estimated:
  - `contestsEst = clamp(round(rating/40), 0..200)`

**Formula:**
```
score = fully*12 + partial*4 + rating*1.0 + contestsEst*30
```
**Breakdown stored:** `{ problemsSolved: fully+partial, rating, contests: contestsEst }`

---

### D) HackerRank
**Inputs used:**
- `problemsSolved || problemsSolvedTotal` ? `solved`
- `contestsParticipated` ? `contests`
- `badgesCount` or `badges.length` ? `badges`
- `certificatesCount` or `certificates.length` ? `certs`

**Formula:**
```
score = solved*8 + contests*20 + badges*40 + certs*60
```
**Breakdown stored:** `{ problemsSolved: solved, rating: 0, contests }`

---

### E) GitHub
**Inputs used:**
- `contributionsLastYear` ? `contributions`
- `totalStars || starsReceived` ? `stars`
- `publicRepos` ? `repos`
- `followers` ? `followers`

**Formula:**
```
score = contributions*2 + stars*30 + repos*10 + followers*20
```
**Breakdown stored:** `{ problemsSolved: 0, rating: 0, contests: 0 }`

---

### F) AtCoder
**Inputs used:**
- `problemsSolvedTotal` ? `solved`
- `rating` ? `rating`
- `totalContests || ratedMatches` ? `contests`

**Formula:**
```
score = solved*8 + rating*1.2 + contests*35
```
**Breakdown stored:** `{ problemsSolved: solved, rating, contests }`

---

## 3) Total score aggregation

After per-platform scores are computed:

```
codeSyncScore = sum(platformSkills[platform])

displayScore = round(codeSyncScore)
```

`displayScore` is what the leaderboard uses for ranking.
`codeSyncScore` is the raw total shown in instructor dashboards.

---

## 4) totalProblemsSolved

This is computed as:
```
LeetCode solved + Codeforces solved + CodeChef solved + HackerRank solved + AtCoder solved
```
GitHub does not contribute to problems solved.

---

## 5) Storage locations

- Raw stats: `students/{studentId}/cpProfiles/{platform}`
- Computed scores: `studentScores/{studentId}`

---

If you want me to include sample payloads for each platform or map the full scraper outputs, tell me which fields to show and I’ll add them.
