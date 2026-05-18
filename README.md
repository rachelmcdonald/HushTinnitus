# Hush Tinnitus

**Sound therapy & tinnitus support**

A consumer mobile app providing evidence-based self-management tools for people living with tinnitus. Built with Expo (React Native) and TypeScript. Launching on Android first.

---

## What it does

- **Sound therapy** — synthesised white/pink/brown noise, nature soundscapes, pitch matching, and notched therapy. Persistent background audio continues during calls and screen lock.
- **Relaxation** — 4-7-8 and box breathing with animated guides, PMR, body scan, mindfulness, and sleep preparation routines.
- **Education** — Tinnitus 101, habituation model, CBT thought journal, sleep hygiene, noise exposure guide, and evidence citations.
- **Progress tracking** — Daily symptom log, TFI assessments at baseline / week 4 / week 8, longitudinal charts, and a one-tap clinician PDF export.

## Positioning

Freemium. Core sound therapy, onboarding, and basic logging are permanently free — no account required. Premium (~AU$8.99/mo) unlocks the sound mixer, full relaxation library, CBT journal, trigger tagging, TFI trend charts, and clinician export.

Primary differentiator: **persistent background audio** — no major competitor maintains audio during phone calls and screen lock.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 54 (React Native) |
| Language | TypeScript |
| Navigation | Expo Router (file-based) |
| Audio | react-native-audio-api *(Phase 3)* |
| Animation | React Native Reanimated *(Phase 4)* |
| Storage | expo-sqlite |
| Charts | Victory Native XL *(Phase 6)* |
| PDF export | react-native-html-to-pdf *(Phase 6)* |
| State | Zustand *(Phase 2+)* |
| Build | EAS Build (cloud) |

---

## Project structure

```
app/
  _layout.tsx           Root layout (Stack)
  (tabs)/
    _layout.tsx         Tab navigator — 5 tabs
    index.tsx           Home
    sound.tsx           Sound
    relax.tsx           Relax
    learn.tsx           Learn
    progress.tsx        Progress
src/
  theme.ts              Design tokens (colours, typography, spacing, animation)
  types.ts              TypeScript interfaces (TFIAssessment, SymptomLog, SoundSession, UserPreferences)
  components/
    PlaceholderScreen.tsx
```

---

## Design tokens (src/theme.ts)

- **Primary** — Deep tide `#0D4F5C`
- **Accent** — Calm wave `#5DCAA5`
- **Background** — Warm sand `#F5F1EB`
- **Alert** — Warm coral `#B85450`
- **Premium** — Soft gold `#C49A6C`

Typography uses system fonts (SF Pro on iOS, Roboto on Android). Flat design — no shadows.

---

## Data models (src/types.ts)

All data is stored on-device via `expo-sqlite`. Nothing leaves the device without explicit user consent.

- `TFIAssessment` — TFI score, subscales, severity grade, responses
- `SymptomLog` — Daily loudness and distress ratings, trigger tags
- `SoundSession` — Session duration, sounds played, volume, notched frequency
- `UserPreferences` — Onboarding state, premium status, dark mode, notification settings

---

## Build phases

| Phase | Focus |
|---|---|
| 1 | Foundation — scaffold, navigation, theme, data models *(current)* |
| 2 | Onboarding — welcome, red flag check, TFI questionnaire and result |
| 3 | Sound therapy — noise generators, pitch matching, notched therapy, persistent audio |
| 4 | Relax — breathing exercises, PMR, mindfulness, sleep routine |
| 5 | Learn — Tinnitus 101, CBT journal, sleep hygiene, noise guide |
| 6 | Progress — symptom log, charts, TFI trend, clinician PDF |
| 7 | Settings & polish — dark mode, accessibility, premium screen |
| 8 | Android release — EAS Build, Play Store listing |

---

## Running the app

```bash
npx expo start          # Start dev server
npx expo start --android  # Open on Android
npx expo start --ios      # Open on iOS simulator
```

Scan the QR code with Expo Go on your Android device for a live preview.

---

## Medico-legal

This app is a wellness and self-management tool — not a medical device. It does not diagnose, treat, cure, or prevent tinnitus. All in-app copy must avoid the words *treat*, *cure*, *relief*, and *diagnose*. See the project specification (Section 8) for the full approved language guide and required disclaimer wording.

Evidence base: TFI (Meikle et al. 2012), habituation model (Jastreboff 1990), CBT (Henry & Wilson 2001), notched therapy (Okamoto et al. 2010), NICE NG155 (2020).

> **Note:** Confirm commercial use terms for the TFI instrument with Oregon Health & Science University before launch.
