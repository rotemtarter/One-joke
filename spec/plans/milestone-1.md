# תוכנית Milestone 1 — Project Setup, Environments & Base Design System

> מבוסס על `MILESTONES.md` (M1), `ARCHITECTURE.md`, `DESIGN.md`, `PRD.md` והתמונות ב-`spec/`.
> מטרה: שלד Next.js שרץ מקומית, מעוצב ב-RTL לפי ה-Style Guide, מחובר ל-Supabase Development, עם Manifest של PWA ובדיקת תקינות של מודל OpenAI בעליית השרת.

---

## 1. מה נכנס ומה לא נכנס ל-M1

**בתוך M1**
- הקמת פרויקט Next.js (App Router) + TypeScript.
- `lang="he"`, `dir="rtl"`, גופנים Heebo + Inter, משתני CSS לפי ה-Style Guide.
- מסך בית בסיסי זמני (יוחלף במסך ההתחברות ב-M2).
- Web App Manifest + אייקונים ל-PWA.
- `.env.example` + העתקה חד-פעמית ל-`.env`.
- בדיקת הגדרות בעליית השרת: משתני סביבה חובה, זמינות מודל `OPENAI_MODEL` (GPT-5), והגעה ל-Supabase Development.
- מדריך צעד-אחר-צעד בעברית להקמת שני פרויקטי Supabase (Dev + Prod), מפתח OpenAI, והכנה ל-Vercel.

**לא בתוך M1** (שייך ל-Milestones הבאים)
- התחברות Google / Supabase Auth / ספריות `@supabase/ssr` — M2.
- טבלאות, Migrations, Supabase CLI — M3.
- יצירת בדיחות בפועל, `POST /api/jokes`, סרגל ניווט — M4.
- Service Worker, פריסה ל-Vercel Production, בדיקות Playwright — M5.

---

## 2. החלטות ותיאומים בין המקורות

| נושא | מה כתוב | מה נעשה | למה |
|---|---|---|---|
| קובץ סביבה מקומי | ARCHITECTURE/MILESTONES: `.env.local` | `.env` (מועתק פעם אחת מ-`.env.example`) | זו ההנחיה ב-CLAUDE.md. Next.js טוען `.env` באופן זהה. `.gitignore` הקיים כבר חוסם `.env` ו-`.env.*` (כולל `.env.local`), כך שתנאי DoD 5 מתקיים. |
| שם קובץ ה-Manifest | MILESTONES: `manifest.json` | `app/manifest.ts` של Next.js (מוגש בכתובת `/manifest.webmanifest`) | ARCHITECTURE (מנצח בטכנולוגיה) מורה להשתמש במנגנון ה-manifest של Next.js. התוכן והתפקוד זהים. |
| Service Worker | — | לא נוסף ב-M1 | ARCHITECTURE: רק אם נדרש בפועל. Chrome מזהה Manifest והתקנה גם בלעדיו. |
| בדיקת Supabase | "מחובר ל-Supabase Development" | בקשת בדיקה קלה ל-`<SUPABASE_URL>/auth/v1/health` בעליית השרת, בלי ספריית Supabase | הפתרון הפשוט ביותר להוכחת חיבור; הספרייה תותקן ב-M2 כשבאמת צריך אותה. |
| בדיקת מודל | "בדיקת תקינות המודל בעת הפעלת השרת" | קריאה חינמית `models.retrieve(OPENAI_MODEL)` דרך ה-SDK הרשמי של OpenAI + בדיקה שהמזהה מתחיל ב-`gpt-5` | לא צורכת tokens. לא מחליפים מודל אוטומטית (ARCHITECTURE 2.3). |
| Vercel | "הגדרת משתני סביבה ב-Vercel" | מדריך בלבד; הביצוע בפועל אחרי ה-push הראשון (אישור M1) | אין עדיין קוד ב-GitHub לחבר אליו, ו-push מותר רק באישורך. זה אינו חלק מה-DoD של M1. |

---

## 3. מבנה קבצים

```text
/
├── app/
│   ├── layout.tsx          # <html lang="he" dir="rtl">, fonts, metadata, viewport/themeColor
│   ├── globals.css         # design tokens (CSS variables) + base reset
│   ├── page.tsx            # temporary home screen (replaced in M2)
│   ├── page.module.css
│   └── manifest.ts         # PWA Web App Manifest
├── lib/
│   └── config/
│       ├── env.ts          # reads + validates required env vars (server-only)
│       └── startup-checks.ts # OpenAI model + Supabase reachability checks
├── instrumentation.ts      # runs startup checks once when the server starts
├── public/
│   └── icons/
│       ├── icon.svg            # source smile icon
│       ├── icon-192.png
│       ├── icon-512.png
│       ├── icon-maskable-512.png
│       └── apple-touch-icon.png  # 180x180
├── scripts/
│   └── generate-icons.mjs  # one-off: rasterize icon.svg → PNGs with sharp
├── docs/
│   └── setup-guide.md      # step-by-step (Hebrew) for Supabase / OpenAI / Vercel
├── .env.example
├── package.json, tsconfig.json, next.config.ts, eslint.config.mjs
```

---

## 4. שלבי הבנייה

### שלב 1 — הקמת הפרויקט
- הרצת `create-next-app@latest` בתיקייה זמנית (התיקייה הנוכחית אינה ריקה) עם: TypeScript, App Router, ESLint, **בלי** Tailwind, בלי `src/`, alias `@/*`.
- העתקת הקבצים לשורש הפרויקט **בלי** לדרוס את `.gitignore`, `CLAUDE.md` ו-`spec/`. אם התבנית מוסיפה שורות ל-`.gitignore` שחסרות אצלנו (למשל `next-env.d.ts`) — להוסיף אותן לקובץ הקיים בלבד.
- מחיקת קובצי הדוגמה של התבנית (תמונות SVG ב-`public/`, תוכן דוגמה ב-`page.tsx`).
- התקנת `openai` ו-`server-only`.

### שלב 2 — RTL, גופנים ושפה עיצובית
- `layout.tsx`:
  - `<html lang="he" dir="rtl">`.
  - `next/font/google`: `Heebo` (subsets: `hebrew`, `latin`) ו-`Inter` (subset: `latin`), כמשתני CSS `--font-heebo` ו-`--font-inter`.
  - `font-family: var(--font-inter), var(--font-heebo), sans-serif` — לאותיות לטיניות ייבחר Inter, ולעברית (שאין ב-Inter) ייבחר Heebo אוטומטית.
  - `metadata`: `title: "One Joke"`, קישור ל-manifest (אוטומטי), `appleWebApp` (capable, title), אייקון Apple.
  - `viewport`: `width=device-width`, `initialScale: 1`, `themeColor`.
- `globals.css` — משתני עיצוב לפי DESIGN.md / Style Guide:
  - **צבעים:** `--color-primary: #3B82F6`, `--color-yellow: #FACC15`, `--color-red: #EF4444`, `--color-black: #111827`, `--color-gray-light: #E5E7EB`, `--color-gray-mid: #9CA3AF`, `--color-gray-xlight: #F3F4F6`, `--color-green: #22C55E`, `--color-white: #FFFFFF`, `--color-offwhite: #F8FAFC`, `--color-text-secondary: #6B7280`, `--color-text: #0F172A`.
  - **טיפוגרפיה:** `--fs-h1: 48px`, `--fs-h2: 32px`, `--fs-h3: 20px`, `--fs-body: 16px`, `--fs-caption: 14px` + משקלים (700 / 600 / 400). במובייל ניתן להקטין את H1/H2 בלי לשבור את ההיררכיה (DESIGN 2.2).
  - **פינות:** `--radius-sm: 4px`, `--radius-md: 8px`, `--radius-lg: 12px`, `--radius-xl: 16px`.
  - **מרווחים:** `--space-12: 12px`, `--space-16: 16px`, `--space-19: 19px`, `--space-24: 24px` (כפי שמופיע ב-DESIGN 2.4).
  - **צל:** `--shadow-soft: 0 4px 12px rgba(0,0,0,0.08)`.
  - reset בסיסי, `body` ברקע לבן וטקסט `--color-text`, `text-align: start`.
  - מחלקות בסיס לשימוש חוזר בהמשך: `.btn-primary` (כחול מלא, פינות מעוגלות), `.btn-secondary` (לבן עם מסגרת כהה), `.btn-dark`, `.input` (רקע בהיר, מסגרת אפורה דקה, יישור לימין), `.card` (משטח בהיר, מסגרת עדינה, ריווח נדיב). לא נבנים עכשיו רכיבי React — רק הסגנונות, כדי שיהיו מוכנים ל-M2/M4.
- אין מצב כהה (Dark Mode) — אינו מופיע ב-spec.

### שלב 3 — מסך בית זמני
- `page.tsx`: פריסה אנכית ממורכזת למובייל — אייקון חיוך (SVG קווי, כמו ב-Wireframes), כותרת „ברוכים הבאים!”, ושורת הסבר קצרה שמציינת שהאפליקציה בהקמה וההתחברות תתווסף בשלב הבא.
- מטרתו רק להדגים RTL, גופנים, צבעים ופינות — הוא יוחלף במסך ההתחברות (Screen 1.1) ב-M2. אין עליו כפתורים פעילים.
- מוצג תקין ברוחב מובייל (375px) ללא גלילה אופקית.

### שלב 4 — PWA
- `app/manifest.ts`:
  - `name: "One Joke"`, `short_name: "One Joke"`, `lang: "he"`, `dir: "rtl"`, `start_url: "/"`, `scope: "/"`, `display: "standalone"`, `orientation: "portrait"`.
  - `background_color: "#FFFFFF"`, `theme_color: "#FFFFFF"` (הסרגל העליון ב-Mockups לבן).
  - `icons`: 192, 512, ו-512 maskable.
- אייקון: חיוך צהוב (`#FACC15`) עם קו שחור (`#111827`) על רקע לבן — בהשראת אייקון החיוך ב-Style Guide וב-Mockups. נכתב כ-SVG ומומר ל-PNG בסקריפט חד-פעמי עם `sharp` (מגיע כבר עם Next.js). לגרסת ה-maskable — שוליים בטוחים גדולים יותר.
- אם יש לך קובץ לוגו „JOKE” מקורי (כמו בתמונות) — אפשר להחליף בו את האייקון בהמשך; ב-M1 משתמשים בחיוך.

### שלב 5 — משתני סביבה
- `.env.example` (שמות בלבד, בלי ערכים), עם הערה קצרה ליד כל משתנה:
  - `NEXT_PUBLIC_SUPABASE_URL` — כתובת פרויקט Supabase **Development**.
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — המפתח הציבורי (anon / publishable) של פרויקט ה-Development.
  - `OPENAI_API_KEY` — סוד OpenAI (צד שרת בלבד).
  - `OPENAI_MODEL` — מזהה מודל GPT-5 שאושר בחשבון.
  - `APP_TIME_ZONE` — `Asia/Jerusalem` (מוסבר בהערה; הערך עצמו ימולא על ידך).
- `SUPABASE_SERVICE_ROLE_KEY` ו-`NEXT_PUBLIC_APP_URL` **לא** נוספים עכשיו — רק אם וכאשר יידרשו (M2/M3). אז יעודכן `.env.example` ותקבל הודעה להוסיף אותם ל-`.env`.
- העתקה חד-פעמית: `cp .env.example .env`. Claude לא קורא את `.env` ולא ממלא בו ערכים.
- `.gitignore` — כבר מכסה `.env` ו-`.env.*`; לא משנים מעבר להוספת שורות חסרות מהתבנית.

### שלב 6 — בדיקות הגדרות בעליית השרת
- `lib/config/env.ts` (`import "server-only"`): פונקציה שמחזירה את ההגדרות ובודקת שכל משתני החובה קיימים ולא ריקים. ההודעה מציינת **רק שמות** משתנים חסרים, לעולם לא ערכים.
- `lib/config/startup-checks.ts`:
  1. **מודל OpenAI:** בודק ש-`OPENAI_MODEL` מתחיל ב-`gpt-5`, ואז `openai.models.retrieve(OPENAI_MODEL)` עם timeout קצר. אם המודל לא קיים/לא זמין בחשבון — שגיאה ברורה ("Model X is not available for this API key"). לא מוחלף מודל אוטומטית.
  2. **Supabase Development:** `GET <NEXT_PUBLIC_SUPABASE_URL>/auth/v1/health` עם כותרת `apikey`. הצלחה ⇒ הודעת "Supabase reachable"; כשל ⇒ שגיאה ברורה.
  - שגיאת רשת זמנית (אין אינטרנט) ⇒ אזהרה בלבד, כדי לא לחסום עבודה.
- `instrumentation.ts` — `register()` מריץ את הבדיקות פעם אחת בעליית השרת (רק ב-runtime של Node). משתנה חסר או מודל לא זמין ⇒ השרת נכשל עם הודעה ברורה (ARCHITECTURE §10). הבדיקות **לא** רצות בזמן `next build`, כך שה-build לא תלוי בסודות.
- כל הודעות הלוג באנגלית, בלי ערכי מפתחות.

### שלב 7 — מדריך הקמה (`docs/setup-guide.md`, בעברית פשוטה)
1. **Supabase:** פתיחת חשבון; יצירת שני פרויקטים — `one-joke-dev` ו-`one-joke-prod` (אזור קרוב לישראל, למשל Frankfurt); שמירת סיסמת ה-Database במנהל סיסמאות; העתקת URL ומפתח ציבורי של **Dev בלבד** ל-`.env`. פרטי Prod נשמרים אצלך ולא נכנסים למחשב המקומי. הערה על השהיית פרויקטים חינמיים אחרי כשבוע ללא פעילות (ARCHITECTURE 9.5).
2. **OpenAI:** יצירת API Key; בדיקה בעמוד Models/Limits בחשבון איזה מזהה GPT-5 זמין לך; מילוי `OPENAI_API_KEY` ו-`OPENAI_MODEL`; הגדרת תקציב והתראות שימוש.
3. **`APP_TIME_ZONE`:** למלא `Asia/Jerusalem`.
4. **Vercel (הכנה, לא חובה ב-M1):** אחרי ה-push הראשון — ייבוא ה-repo `rotemtarter/One-joke` ל-Vercel, והגדרת משתנים לפי סביבה: Production → פרטי `one-joke-prod`; Preview/Development → פרטי `one-joke-dev`. הערה על תוכנית Hobby (שימוש אישי בלבד).
5. **איך לוודא שהמקומי מחובר ל-Dev:** להשוות את מזהה הפרויקט שבכתובת `NEXT_PUBLIC_SUPABASE_URL` (`https://<מזהה>.supabase.co`) למזהה של `one-joke-dev` בלוח הבקרה של Supabase.

### שלב 8 — תיעוד
- `CLAUDE.md` → מילוי **פקודות הרצה**: `npm run dev`; בדיקות: `npm run lint` + `npx tsc --noEmit` (אין עדיין בדיקות יחידה — Vitest יתווסף ב-M3 עם לוגיקת המכסה).
- `ARCHITECTURE.md` → הוספת סעיף `## החלטות מרכזיות (ADRs)` עם:
  - ADR-1: קובץ סביבה מקומי `.env` במקום `.env.local`.
  - ADR-2: Manifest דרך `app/manifest.ts`, בלי Service Worker בשלב זה.
  - ADR-3: בדיקות הגדרות בעליית השרת (`instrumentation.ts`) — מה חוסם עלייה ומה רק מזהיר.
- `MILESTONES.md` → סימון 🟡 ליד כותרת M1 בסיום הבנייה.

---

## 5. נקודות עצירה מולך במהלך הבנייה

הקוד (שלבים 1–5, 7–8) נבנה בלי צורך בחשבונות. לפני הבדיקה המלאה של שלב 6 ו-DoD 2 — **אעצור ואבקש** ממך, לפי המדריך:
1. ליצור את שני פרויקטי Supabase.
2. ליצור מפתח OpenAI ולבחור מזהה GPT-5.
3. למלא את הערכים ב-`.env`.

---

## 6. בדיקה עצמית מול ה-Definition of Done

| # | תנאי | איך ייבדק |
|---|---|---|
| 1 | `npm run dev` עולה ללא שגיאות compilation/TypeScript | הרצת `npx tsc --noEmit`, `npm run lint`, `npm run build`, ואז `npm run dev` ופתיחת `http://localhost:3000` בדפדפן המובנה — בלי שגיאות בטרמינל ובקונסול. |
| 2 | שני פרויקטי Supabase; המקומי מופנה ל-Dev בלבד | אישור שלך שנוצרו שני הפרויקטים; בלוג עליית השרת מופיע "Supabase reachable"; השוואת מזהה הפרויקט (לפי שלב 7.5) — את זה אתה מוודא, כי אני לא קורא את `.env`. |
| 3 | Heebo ו-Inter נטענים, RTL תקין | בדפדפן: `document.documentElement.dir === "rtl"`, `lang === "he"`, `document.fonts.check(...)` ל-Heebo ול-Inter, צילום מסך ברוחב 375px שהטקסט מיושר לימין. |
| 4 | Manifest נטען ומזוהה ב-Chrome DevTools | בקשה ל-`/manifest.webmanifest` מחזירה 200 עם השדות הנכונים; קישור `<link rel="manifest">` קיים ב-HTML; כל קובצי האייקונים מחזירים 200. בבדיקה שלך: DevTools → Application → Manifest. |
| 5 | `.env.example` עם כל השמות בלי ערכים; `.env.local` ב-`.gitignore` | בדיקת תוכן `.env.example`; `git check-ignore .env .env.local` מאשר ששניהם מוחרגים; `git status` לא מציג את `.env`. |
| + | בדיקת מודל GPT-5 בעלייה | בלוג עליית השרת מופיע "OpenAI model OK"; בדיקה נוספת עם שם מודל שגוי (משתנה זמני בפקודת ההרצה, בלי לגעת ב-`.env`) מציגה שגיאה ברורה. |

בסיום — סגירת השרת שהורץ לבדיקה, וסימון 🟡. ללא commit.

---

## 7. הערות להמשך (לא חוסמות את M1)
- **מזהה המודל המדויק:** ה-PRD דורש GPT-5. אם בחשבון שלך זמינות כמה גרסאות (למשל `gpt-5`, `gpt-5-mini`), הבחירה ביניהן היא החלטה מוצרית שלך — הבדיקה ב-M1 רק מוודאת שהמזהה מתחיל ב-`gpt-5` וזמין.
- **התקנה על טלפון אמיתי** דורשת HTTPS, ולכן תיבדק ב-M5 אחרי הפריסה. ב-M1 ההתקנה נבדקת ב-Chrome במחשב מול `localhost`.
- **לוגו „JOKE”** שמופיע ב-Mockups אינו קיים כקובץ. יידרש לסרגל העליון ב-M4; אם יש לך קובץ מקורי — כדאי לשים אותו ב-`spec/` או ב-`public/`.
