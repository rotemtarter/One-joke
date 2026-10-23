# תוכנית Milestone 4 — AI Joke Generation Engine & Main User Flow

> מבוסס על `MILESTONES.md` (M4), `PRD.md` (3, 4.א.2–4.א.6, 4.ב), `ARCHITECTURE.md` (3.2, 4, 5.2, 5.4, 6.1–6.3, 7.1, 7.3, 7.4, 8, 10, 11, ADR-3, ADR-4, ADR-10), `DESIGN.md` (1.3–1.6, 1.9, 2.1–2.6), התמונות (wireframes/mockups, מסכים 3, 4, 5, 8, 9) והקוד הקיים (M1–M3).
> מטרה: זרימה מלאה מקצה לקצה — נושא (או שדה ריק) ← מסך טעינה ← בדיחה בעברית מ-GPT-5 ← בדיחה נוספת / נושא אחר, עם מסכי מכסה ושגיאה, ובלי שניסיון שנכשל יורד מהמכסה.

---

## 1. מה נכנס ומה לא נכנס ל-M4

**בתוך M4**
- `POST /api/jokes` (Route Handler): אימות session, אימות קלט, שריון מכסה, קריאה ל-OpenAI, אימות התשובה, `complete`/`release`, קודי תשובה לפי ARCHITECTURE 6.1.
- מודול AI בצד השרת: הוראות למודל, קריאה ל-GPT-5 עם מגבלת זמן ~20 שניות ורמת חשיבה מינימלית, ובדיקת תקינות הבדיחה.
- `maxDuration = 30` לנתיב.
- הלקוח: חיבור „צרו בדיחה”, מסך טעינה (1.4), מסך בדיחה (1.3), מסך מכסה (1.5), מסך שגיאה (1.6), המתנה של 25 שניות.
- מסך המכסה במקום מסך היצירה כשנכנסים אחרי מיצוי (מכשיר או אתר).
- בדיקות יחידה (Vitest) עם session ותשובות OpenAI מדומים.
- ADRs חדשים, ועדכון `CLAUDE.md` אם פקודות ההרצה משתנות.

**לא בתוך M4 (נשאר ל-M5)**
- מניעת לחיצות כפולות מעבר למה שקורה ממילא (הכפתור נעלם כשמסך הטעינה מוצג).
- טיפול מיוחד בניתוק אינטרנט מעבר להצגת מסך השגיאה.
- session שנמחק באמצע שימוש — יצירה מחדש ברקע וניסיון חוזר אוטומטי. ב-M4, תשובת `401` מציגה את מסך השגיאה; „נסו שוב” שולח בקשה חדשה, וה-Proxy כבר יוצר session חדש בדרך.
- סניטציה נוספת של הנושא מעבר ל-`trim` ול-100 תווים.
- Playwright, Production, Vercel.

---

## 2. החלטות ותיאומים בין המקורות

| נושא | מה כתוב | מה נעשה | למה |
|---|---|---|---|
| איך עוברים בין המסכים | DESIGN: 6 מסכים, בלי ניווט | כל המסכים (יצירה, טעינה, בדיחה, שגיאה, מכסה) מוצגים **באותה כתובת `/`**, ורכיב לקוח אחד (`JokeApp`) מחליף ביניהם לפי מצב: `create` / `loading` / `joke` / `error` / `quota`. אין כתובות נפרדות למסכים | הבדיחה נשמרת רק בזיכרון של הדף (ARCHITECTURE 8: אין שמירת בדיחות), ואין צורך להעביר אותה בין דפים. → **ADR-13** |
| מסך המכסה בכניסה | PRD 4.א.4, DESIGN 1.5 | `app/page.tsx` (בשרת) קורא `getQuotaStatus()`. אם נשארו 0, או שתקרת האתר מוצתה — מוצג ישר מסך המכסה. אחרת — `JokeApp` עם מספר הבדיחות שנותרו | אותה קריאה שכבר קיימת מ-M3. |
| כשלא ניתן לקרוא את המכסה בכניסה | M3: השורה „נשארו X” לא מוצגת | נשאר כך: מוצג מסך היצירה בלי השורה. ההחלטה האמיתית נעשית בשרת בזמן היצירה | לא מציגים מספר מומצא; האכיפה ממילא בשרת. |
| „נשארו X” אחרי בדיחה | ARCHITECTURE 6.1: `remainingToday` בתשובה | הלקוח מעדכן את המספר מתשובת השרת, ומציג אותו במסך הבדיחה ובמסך היצירה כשחוזרים אליו | — |
| אחרי הבדיחה העשירית | DESIGN 1.3 | כש-`remainingToday` הוא 0: הבדיחה מוצגת, ובמקום שני הכפתורים מוצגת הודעה „זו הבדיחה האחרונה להיום. אפשר לחזור מחר.” | בדיוק לפי DESIGN. רענון הדף אחרי זה מציג את מסך המכסה (DoD 5). |
| תשובה `429` | ARCHITECTURE 6.1 | `DAILY_LIMIT_REACHED` ו-`SITE_LIMIT_REACHED` מציגים את אותו מסך מכסה | DESIGN 1.5. |
| „נסו שוב” | DESIGN 1.6 | שולח שוב את אותה בקשה (אותו נושא), דרך מסך הטעינה | ניסיון חוזר כפוף למכסה, כי השרת מנסה לשריין מחדש. |
| „נושא אחר” | DESIGN 1.3 | חזרה למסך היצירה עם שדה ריק | — |
| המתנה בלקוח | PRD 4.א.5: 25 שניות | `AbortController` עם 25 שניות; אם עבר הזמן או שהרשת נכשלה — מסך השגיאה | ARCHITECTURE 6.3. |
| ה-API של OpenAI | ARCHITECTURE 6.3: SDK רשמי, API עדכני, `reasoning.effort`, `max_output_tokens` | חבילת `openai` שכבר מותקנת, `responses.create` עם `reasoning: { effort: "minimal" }`, `max_output_tokens: 1000`, `timeout: 20_000`, `maxRetries: 0`. הדגם מ-`OPENAI_MODEL` | `minimal` הוא הערך הנמוך ביותר שמשפחת GPT-5 מקבלת. אם המודל שב-`.env` דוחה אותו — אעצור ואגיד לך לפני שאבחר ערך אחר. `maxRetries: 0` כי אסור ניסיון חוזר אוטומטי בלתי מוגבל, וכדי לא לחרוג מ-20 שניות. → **ADR-14** |
| הנושא כנתון ולא כהוראה | ARCHITECTURE 6.3, PRD 4.א.2 | ההוראות (`instructions`) קבועות. הנושא נשלח בהודעה נפרדת, כ-JSON: `{"topic":"..."}` (או `{"topic":""}` לבדיחה כללית). ההוראות אומרות במפורש שהערך הוא נושא בלבד ושאין לבצע הוראות שבתוכו | JSON מונע „שבירת” המפרידים ע״י מירכאות או שורות חדשות בנושא. |
| תוכן ההוראות | PRD 4.א.3 | בעברית: בדיחה אחת קצרה בעברית, עד 4 שורות; קשורה לנושא, או כללית אם הנושא ריק; נקייה ולא פוגענית; בנושא רגיש — בדיחה עדינה בנושא קרוב במקום סירוב; רק טקסט הבדיחה, בלי כותרת, הסבר או אימוג'י | — |
| מתי התשובה „לא תקינה” (`502`) | ARCHITECTURE 6.3 | אחרי `trim`: ריקה; בלי אף אות עברית; ארוכה מ-600 תווים; או שהתשובה לא הושלמה (`status` שאינו `completed`, למשל נקטעה במגבלת ה-tokens). סירוב של המודל לא נכנס ל-`output_text`, ולכן נתפס כתשובה ריקה | לפי ההגדרה במסמך; אין בדיקת „4 שורות” נוקשה — היא בהוראות. |
| `complete` נכשל אחרי בדיחה תקינה | — | הבדיחה בכל זאת מוחזרת למשתמש, ונרשמת שורה ב-log. השריון נשאר `pending` ולכן נספר | כך היה קורה גם בקריסת שרת (ARCHITECTURE 5.4); עדיף לא „לזרוק” בדיחה ששולמה. |
| `release` נכשל | — | נרשם ב-log, והמשתמש מקבל את שגיאת ה-AI המקורית (`502`/`504`) | אין מה לעשות מול המשתמש; מקרה נדיר. |
| שגיאת מסד נתונים ב-`reserve` | ARCHITECTURE 6.1: `503` | `503`, בלי קריאה ל-OpenAI | — |
| אין session (`401`) | ARCHITECTURE 6.1, 11 | `supabase.auth.getClaims()` בתחילת הבקשה; אין session → `401`, בלי שריון ובלי OpenAI | ה-Proxy רץ גם על `/api/jokes`, כך שבפועל זה קורה רק בתקלה. |
| בדיקת קלט | ARCHITECTURE 6.1 | גוף שאינו JSON, `topic` שאינו מחרוזת, או נושא שאחרי `trim` ארוך מ-100 תווים → `400` (`INVALID_INPUT` / `TOPIC_TOO_LONG`). `topic` חסר = ריק | האורך נמדד כמו בשדה (`string.length`), כפי שכבר נכתב ב-`TopicForm`. |
| CSRF / Origin | ARCHITECTURE 7.4: „בהתאם לדפוס ה-session” | בלי קוד נוסף: ה-cookie הוא `SameSite=Lax` (לא נשלח בבקשת POST מאתר אחר), והשרת מקבל רק `Content-Type: application/json` | זה מספיק לדפוס ה-session הקיים (ADR-10), בלי לסבך. נכנס ל-ADR-14. |
| Logs | ARCHITECTURE 10 | שורה אחת לבקשה: מזהה בקשה, תוצאה (קוד), משך במילישניות. בלי נושא, בלי בדיחה, בלי מפתחות | — |
| צבע כרטיס הבדיחה | DESIGN 2.3: „משטח בהיר עם מסגרת עדינה”; ב-Mockup הכרטיס צהוב-בהיר | מחלקת `.card` הקיימת (לבן-שבור, מסגרת אפורה) — הוכרע (סעיף 9) | DESIGN מנצח על מראה, אבל ה-Mockup מציג מראה סופי אחר. |
| כפתור „נסו שוב” | Mockup: כפתור כהה; DESIGN 2.3: כפתור כהה הוא אחת הדוגמאות | `btn-dark` הקיים | אין סתירה. |
| אייקונים (לוח שנה, אזהרה) | DESIGN 2.3; אין קובצי אייקון כאלה ב-`public/assets` | אייקוני SVG פשוטים בתוך הקוד: לוח שנה עם סימון ✓ (שחור, ראש כחול) ומשולש אזהרה (אדום עם סימן קריאה שחור), בסגנון קווי של ה-Mockup. בלי קווי ה-doodle הדקורטיביים שמסביב | DESIGN 1.5 מתאר „לוח שנה עם סימון”; הקווים הדקורטיביים אינם חלק מהתוכן. |
| Spinner | DESIGN 2.3, Mockup 8 | Spinner ב-CSS בצבע `--color-primary`, עם `prefers-reduced-motion` שמאט אותו | — |
| נגישות מצבים | DESIGN 2.3: „אין להסתמך על צבע בלבד” | כותרת וטקסט בכל מסך; אזור המסכים עם `aria-live="polite"`, והפוקוס עובר לכותרת של כל מסך חדש | — |

---

## 3. מבנה קבצים

```text
/
├── app/
│   ├── api/jokes/
│   │   └── route.ts                    # NEW — POST handler, maxDuration = 30
│   ├── page.tsx                        # CHANGED — quota screen on entry, else <JokeApp>
│   ├── page.module.css                 # CHANGED — shared screen layout styles
│   └── components/
│       ├── JokeApp.tsx                 # NEW — client state machine: create/loading/joke/error/quota
│       ├── TopicForm.tsx               # CHANGED — real submit (onSubmit prop), button type="submit"
│       ├── JokeScreen.tsx              # NEW — 1.3: card, "בדיחה נוספת", "נושא אחר", remaining / last-joke alert
│       ├── LoadingScreen.tsx           # NEW — 1.4: spinner + texts
│       ├── QuotaScreen.tsx             # NEW — 1.5 (no "use client": rendered by page.tsx and by JokeApp)
│       ├── ErrorScreen.tsx             # NEW — 1.6: warning icon, texts, "נסו שוב"
│       ├── icons.tsx                   # NEW — CalendarCheckIcon, WarningIcon (inline SVG)
│       └── screens.module.css          # NEW — styles for the four screens above
├── lib/
│   ├── quota.ts                        # CHANGED — reserveJoke(), completeJoke(), releaseJoke()
│   └── jokes/
│       ├── input.ts                    # NEW — parseTopic(): trim, type check, 100-char limit (MAX_TOPIC_LENGTH shared)
│       ├── openai.ts                   # NEW — server-only: instructions, generateJokeText(topic), JokeGenerationError
│       ├── validate.ts                 # NEW — isValidJoke(): non-empty, Hebrew letter, ≤ 600 chars
│       └── api-types.ts                # NEW — response body/error-code types shared by route and client
├── tests/
│   ├── jokes-route.test.ts             # NEW — POST /api/jokes with mocked Supabase client + OpenAI
│   └── jokes-input.test.ts             # NEW — parseTopic, isValidJoke, prompt keeps topic as data
├── vitest.config.mts                   # CHANGED — "@/" alias; "server-only" mapped to an empty module
└── spec/ARCHITECTURE.md                # CHANGED — ADR-13, ADR-14 only
```

`MAX_TOPIC_LENGTH` עובר מ-`TopicForm.tsx` ל-`lib/jokes/input.ts` (קובץ בלי `server-only`), כך שהשדה והשרת משתמשים באותו מספר.

---

## 4. השרת — `POST /api/jokes`

### 4.1 סדר הפעולות (`app/api/jokes/route.ts`)
1. `export const maxDuration = 30;` (Route Segment Config — נבדק ב-`node_modules/next/dist/docs/.../maxDuration.md`).
2. יצירת מזהה בקשה ומדידת זמן.
3. `Content-Type` שאינו `application/json` או JSON לא תקין → `400 INVALID_INPUT`.
4. `parseTopic(body.topic)` → נושא מנורמל, או `400 INVALID_INPUT` / `TOPIC_TOO_LONG`.
5. `createClient()` (הקיים, `lib/supabase/server.ts`) ו-`supabase.auth.getClaims()`. אין claims → `401 UNAUTHORIZED`.
6. `reserveJoke()` → `rpc("reserve_joke_generation")`:
   - שגיאת מסד נתונים → `503 SERVICE_UNAVAILABLE`.
   - `DEVICE_LIMIT` → `429 DAILY_LIMIT_REACHED`; `SITE_LIMIT` → `429 SITE_LIMIT_REACHED`. אין קריאה ל-OpenAI.
   - `OK` → `reservation_id`, `remaining_today`.
7. `generateJokeText(topic)`:
   - הצלחה ובדיחה תקינה → `completeJoke(reservationId)` → `200 { joke, remainingToday }`.
   - חריגת זמן → `releaseJoke` → `504 AI_TIMEOUT`.
   - כל כשל אחר של OpenAI או תשובה לא תקינה → `releaseJoke` → `502 AI_FAILED`.
8. כל שגיאה בלתי צפויה: אם יש שריון פתוח — `releaseJoke`; `500 INTERNAL_ERROR`. (`try/finally` שמבטיח שחרור כשלא הגענו ל-`complete`.)
9. שורת log אחת: `[jokes] <requestId> <code> <ms>ms`.

גוף כל תשובת שגיאה: `{ "error": "<CODE>" }` בלבד — בלי הודעות טכניות. הטקסטים בעברית נמצאים רק בלקוח.

### 4.2 `lib/quota.ts`
מוסיפים שלוש פונקציות שמקבלות את לקוח ה-Supabase של הבקשה (כדי לא ליצור לקוח חדש בכל קריאה) וקוראות ל-`reserve_joke_generation`, `complete_joke_generation`, `release_joke_generation`. `getQuotaStatus()` נשאר כמו שהוא.

### 4.3 `lib/jokes/openai.ts`
- `import "server-only"`; המפתח והמודל מ-`getServerEnv()`.
- לקוח OpenAI אחד לכל תהליך, עם `timeout: 20_000`, `maxRetries: 0`.
- `responses.create({ model, instructions, input: [{ role: "user", content: JSON.stringify({ topic }) }], reasoning: { effort: "minimal" }, max_output_tokens: 1000 })`.
- חריגת זמן (`APIConnectionTimeoutError`) → `JokeGenerationError("timeout")`; כל שגיאה אחרת → `JokeGenerationError("failed")`; `status !== "completed"` או `isValidJoke` נכשל → `"failed"`.
- מחזיר את `output_text` אחרי `trim`.
- לא רושם ב-log את הנושא או את הבדיחה; רק סוג השגיאה וקוד ה-HTTP של הספק.

### 4.4 `lib/jokes/validate.ts`
`isValidJoke(text)`: אחרי `trim` — לא ריק, מכיל לפחות אות עברית אחת (`[א-ת]`), ועד 600 תווים.

---

## 5. הלקוח

### 5.1 `app/page.tsx` (שרת)
- `getQuotaStatus()`.
- אם `quota` קיים ו-(`remainingToday === 0` או `siteLimitReached`) → `<QuotaScreen />`.
- אחרת → `<JokeApp initialRemaining={quota?.remainingToday ?? null} />`.

### 5.2 `JokeApp.tsx` (לקוח)
מצב: `screen`, `topic` (האחרון שנשלח), `joke`, `remaining` (מספר או `null`).

- **create**: איור, כותרת, הסבר, `TopicForm`, „נשארו X מתוך 10 היום” (אם ידוע), קישור „פרטיות”. (התוכן שעובר מ-`page.tsx` לכאן.)
- שליחה (`requestJoke(topic)`): `screen = loading` → `fetch("/api/jokes", { method: "POST", headers: JSON, body: { topic }, signal })` עם `AbortSignal.timeout(25_000)`:
  - `200` → `joke`, `remaining`, `screen = joke`.
  - `429` → `screen = quota`.
  - כל דבר אחר, חריגת זמן או שגיאת רשת → `screen = error`.
- **joke**: `JokeScreen` — „בדיחה נוספת” → `requestJoke(topic)`; „נושא אחר” → `screen = create`, שדה ריק. כש-`remaining === 0` — ההודעה במקום הכפתורים.
- **error**: `ErrorScreen` — „נסו שוב” → `requestJoke(topic)`.
- **quota**: `QuotaScreen`.
- הבדיחה הקודמת נמחקת מהמצב ברגע שמתחילה בקשה חדשה, כך שאף פעם לא מוצגת בדיחה ישנה (DoD 3).

### 5.3 נוסחים (DESIGN 2.6 בלבד)
| מסך | טקסטים |
|---|---|
| 1.4 | „מכינים לכם בדיחה...”, „זה לא ייקח הרבה זמן” |
| 1.3 | „בדיחה נוספת”, „נושא אחר”, „נשארו X מתוך 10 היום”, „זו הבדיחה האחרונה להיום. אפשר לחזור מחר.” |
| 1.5 | „הגעתם למכסה היומית”, „אפשר לחזור מחר.” |
| 1.6 | „אירעה שגיאה”, „נראה שמשהו השתבש. אנא נסו שוב מאוחר יותר.”, „נסו שוב” |

### 5.4 עיצוב
- אותה פריסה אנכית וממורכזת של `page.module.css` (רוחב מרבי 480px).
- כרטיס הבדיחה: `.card`, טקסט 18px, `white-space: pre-line` כדי לשמור על שבירות השורות של הבדיחה, יישור לימין.
- הודעת „הבדיחה האחרונה”: תיבת Alert עם רקע `--color-gray-xlight`, מסגרת `--color-gray-light`, פינות `--radius-lg`.
- כפתורים: `btn-primary` (בדיחה נוספת, צרו בדיחה), `btn-secondary` (נושא אחר), `btn-dark` (נסו שוב).
- אייקונים בגודל ~96px.

---

## 6. בדיקות אוטומטיות (Vitest)

`vitest.config.mts`: alias של `@/` לשורש הפרויקט, ו-`server-only` לקובץ ריק (בבדיקות אין Next.js). הבדיקות החדשות **לא** מתחברות למסד הנתונים ולא ל-OpenAI.

**`tests/jokes-route.test.ts`** — `vi.mock` ל-`@/lib/supabase/server` (לקוח מדומה: `auth.getClaims` ו-`rpc`) ול-`@/lib/jokes/openai`:
1. הצלחה עם נושא → `200`, בדיחה ו-`remainingToday`; `complete` נקרא פעם אחת, `release` לא.
2. נושא ריק / חסר → `generateJokeText("")`, `200`.
3. נושא של 101 תווים → `400 TOPIC_TOO_LONG`; `topic` מספר → `400`; JSON שבור → `400`. אין שריון ואין OpenAI.
4. בלי session → `401`; אין שריון ואין OpenAI.
5. `DEVICE_LIMIT` → `429 DAILY_LIMIT_REACHED`; `SITE_LIMIT` → `429 SITE_LIMIT_REACHED`; OpenAI לא נקרא.
6. כשל OpenAI → `502`, `release` נקרא עם מזהה השריון, `complete` לא.
7. חריגת זמן → `504`, `release` נקרא.
8. שגיאת מסד נתונים ב-`reserve` → `503`, OpenAI לא נקרא.
9. `complete` נכשל → עדיין `200` עם הבדיחה.
10. אף תשובה אינה מכילה את מפתח ה-OpenAI או את מזהה השריון.

**`tests/jokes-input.test.ts`**:
- `parseTopic`: `trim`, 100 תווים עוברים, 101 נדחים, לא-מחרוזת נדחית, `undefined` → ריק.
- `isValidJoke`: ריק, אנגלית בלבד, 601 תווים — נכשלים; בדיחה רגילה בעברית — עוברת.
- `generateJokeText` עם לקוח OpenAI מדומה (`vi.mock("openai")`): הנושא מגיע בהודעת המשתמש כ-JSON ולא בתוך ההוראות; `status: "incomplete"` → כשל; `APIConnectionTimeoutError` → `timeout`; `reasoning.effort` ו-`max_output_tokens` נשלחים.

בדיקות M3 (מול Development) ממשיכות לרוץ כרגיל ב-`npm test`.

---

## 7. בדיקה ידנית בזמן הבנייה (מול Development, עם OpenAI אמיתי)

מספר קטן של קריאות אמיתיות (בערך 5–8 בדיחות):
1. `npm run dev`, פתיחת `/` בדפדפן המובנה בגודל מובייל.
2. נושא „חתולים” → מסך טעינה → בדיחה בעברית על חתולים. „בדיחה נוספת” → בדיחה אחרת על חתולים, שמחליפה את הקודמת. „נושא אחר” → מסך יצירה ריק, המספר ירד.
3. שדה ריק → בדיחה כללית.
4. **הבדיחה העשירית:** במקום ליצור 10 בדיחות, מעדכנים ב-Development (דרך `SUPABASE_DB_URL`) את `daily_usage.count` של מכשיר הבדיקה ל-9, יוצרים בדיחה אחת → ההודעה מופיעה במקום הכפתורים. רענון → מסך המכסה. קריאה ישירה ל-API → `429`.
5. **תקרת האתר:** מעדכנים זמנית את `site_daily_usage.count` של היום ל-300 → כניסה ממכשיר חדש (חלון פרטי) מציגה את מסך המכסה, ו-`POST` מחזיר `429` בלי קריאה ל-OpenAI (נבדק ב-log). **בסוף מחזירים את הערך הקודם בדיוק**, ומאפסים גם את מכשיר הבדיקה, כדי שלא תמצא את Development חסום כשתבדוק.
6. **שגיאה:** הרצה זמנית של השרת עם `OPENAI_MODEL` שגוי דרך משתנה סביבה בשורת הפקודה (לא עורכים את `.env`), ובדיקה שמוצג מסך השגיאה ושהמספר לא ירד. חריגת 25 שניות נבדקת בבדיקת היחידה ובהאטה מלאכותית של הרשת בדפדפן.
7. נושא של 100 תווים — השדה לא מאפשר יותר; `POST` ישיר עם 101 → `400`.
8. בדיקה שהמחרוזת של `OPENAI_API_KEY` לא מופיעה בקבצי ה-JavaScript שהדפדפן מקבל (חיפוש ב-`.next/static` אחרי `npm run build`).
9. `npm run lint && npx tsc --noEmit && npm run build && npm test`.
10. סגירת השרת בסיום.

---

## 8. Definition of Done — איך כל תנאי נבדק

| # | תנאי | איך נבדק |
|---|---|---|
| 1 | נושא → בדיחה בעברית קשורה; ריק → כללית | ידני (7.2, 7.3); בדיקות 1–2 |
| 2 | המפתח בשרת בלבד | `server-only` ב-`openai.ts`; חיפוש ב-`.next/static` (7.8); בדיקה 10 |
| 3 | בדיחה אחת בכל רגע, החדשה מחליפה | ידני (7.2); המצב ב-`JokeApp` מחזיק בדיחה אחת בלבד |
| 4 | מסך טעינה בזמן היצירה | ידני (7.2) |
| 5 | אחרי העשירית: הודעה; כניסה חוזרת: מסך מכסה; OpenAI חסום | ידני (7.4); בדיקה 5 |
| 6 | תקרת אתר → מסך מכסה לכולם, בלי OpenAI | ידני (7.5); בדיקה 5 |
| 7 | כשל רשת/API → מסך שגיאה עם „נסו שוב” | ידני (7.6); בדיקה 6 |
| 8 | ניסיון שנכשל לא יורד מהמכסה | ידני (7.6, המספר לא ירד); בדיקות 6–7 (`release`) |
| 9 | 25 שניות → מסך שגיאה | `AbortSignal.timeout(25_000)`; ידני בהאטת רשת (7.6) |
| 10 | „בדיחה נוספת” = אותו נושא; „נושא אחר” = מסך יצירה | ידני (7.2) |
| 11 | נושא מעל 100 תווים נחסם בשדה ונדחה בשרת | ידני (7.7); בדיקה 3 |

---

## 9. שאלה שהוכרעה לפני הבנייה

**צבע כרטיס הבדיחה.** ב-DESIGN.md הכרטיס הוא „משטח בהיר עם מסגרת עדינה” (לבן-שבור עם קו אפור). ב-Mockup (מסך 3) הכרטיס צהוב-בהיר, כמו פתק. צהוב-בהיר כזה אינו מופיע בפלטה; הוא יהיה גוון בהיר של הצהוב `#FACC15`.
- **אפשרות א' (ברירת המחדל בתוכנית):** כרטיס בהיר לפי DESIGN.md.
- **אפשרות ב':** כרטיס צהוב-בהיר כמו ב-Mockup.

**הוחלט:** אפשרות א' — כרטיס בהיר לפי DESIGN.md.

---

## 10. ADRs שיתווספו ל-ARCHITECTURE.md

- **ADR-13: כל המסכים בכתובת אחת, עם מצב בצד הלקוח** — יצירה, טעינה, בדיחה, שגיאה ומכסה מוחלפים ברכיב לקוח אחד; מסך המכסה בכניסה נקבע בשרת. השלכה: אין היסטוריה או כתובת לבדיחה, ורענון מחזיר למסך היצירה (או למסך המכסה).
- **ADR-14: פרמטרי הקריאה ל-OpenAI והגנת הבקשה** — Responses API, `reasoning.effort: "minimal"`, `max_output_tokens: 1000`, `timeout` של 20 שניות, `maxRetries: 0`, נושא כ-JSON בהודעה נפרדת; הגנת CSRF דרך `SameSite=Lax` ודרישת `application/json`.
