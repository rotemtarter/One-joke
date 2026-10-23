# תוכנית Milestone 3 — Database Schema & Atomic Quota

> מבוסס על `MILESTONES.md` (M3), `ARCHITECTURE.md` (5.1–5.4, 7.2, 9.1, 9.3, 11, ADR-4, ADR-5, ADR-8, ADR-9, ADR-10), `DESIGN.md` (1.9, 1.3, 1.5), `PRD.md` (4.א.4) והקוד הקיים (M2).
> מטרה: מסד הנתונים של Development סופר ואוכף באופן אטומי 10 בדיחות ביום למכשיר ו-300 ביום לאתר, לפי שעון ישראל; ומסך היצירה מציג „נשארו X מתוך 10 היום”.

---

## 1. מה נכנס ומה לא נכנס ל-M3

**בתוך M3**
- קובץ Migration אחד ב-`supabase/migrations/`: שלוש טבלאות, RLS, הרשאות, וארבע הפונקציות הציבוריות (ARCHITECTURE 5.2).
- התקנת Supabase CLI (כחבילת npm של הפרויקט) והרצת ה-Migration על פרויקט **Development** בענן.
- בדיקות אוטומטיות (Vitest) מול Development: מכסה, תקרה, מקביליות, חצות ושעון קיץ/חורף, שחרור, וניסיונות עקיפה.
- workflow ב-GitHub Actions להרצת Migrations ב-Production, בהפעלה ידנית בלבד. נכתב בלבד, לא מופעל.
- „נשארו X מתוך 10 היום” במסך היצירה (1.9), לפי `get_quota_status()`.
- עדכון `docs/setup-guide.md`, `.env.example`, ADRs ופקודות ההרצה ב-`CLAUDE.md`.

**לא בתוך M3**
- `POST /api/jokes`, קריאה ל-OpenAI, ושימוש ב-`reserve`/`complete`/`release` מתוך האפליקציה — M4.
- מסך המכסה (1.5) במקום מסך היצירה כשנכנסים אחרי מיצוי — M4. ב-M3 מוצג במקרה כזה „נשארו 0 מתוך 10 היום”.
- כל פעולה מול Production (פרויקט, סודות, הפעלת ה-workflow) — M5.

---

## 2. החלטות ותיאומים בין המקורות

| נושא | מה כתוב | מה נעשה | למה |
|---|---|---|---|
| חיבור ה-CLI ל-Development | MILESTONES: „התקנת Supabase CLI וחיבורו לפרויקט Development” | ה-CLI מותקן כחבילת npm (`supabase` ב-devDependencies, מריצים דרך `npx`). החיבור הוא **כתובת חיבור (connection string) של מסד הנתונים של Development**, שאתה מדביק ב-`.env` במשתנה חדש `SUPABASE_DB_URL`. ה-Migration רץ ב-`npm run db:push` (`supabase db push --db-url`). אין `supabase login` ואין `supabase link` במחשב | צעד ידני אחד בלבד בשבילך (העתקה והדבקה), בלי התקנה גלובלית ובלי התחברות של ה-CLI. אותה כתובת משמשת גם לבדיקות. → **ADR-11** |
| משתנה סביבה חדש | ARCHITECTURE 9.1: ארבעה משתנים | נוסף `SUPABASE_DB_URL` — **Development בלבד**, לכלי פיתוח ובדיקות בלבד. האפליקציה עצמה לא משתמשת בו, הוא לא נבדק בעליית השרת ולא יוגדר ב-Vercel | ARCHITECTURE 7.2 אוסר מפתח שרת **לצורך המכסה באפליקציה**; כאן מדובר רק בהרצת Migrations ובבדיקות מול Development. נכנס ל-ADR-11. |
| בדיקת חצות ו-300 בלי לחכות לחצות ובלי 300 מכשירים אמיתיים | MILESTONES: בדיקות לחצות, שעון קיץ/חורף ו-300 | הלוגיקה עצמה נמצאת בפונקציות בסכימה נפרדת `private`, שמקבלות משתמש ותאריך: `private.israel_date(ts)` ו-`private.reserve_for(user_id, usage_date)`. הפונקציה הציבורית `reserve_joke_generation()` רק קוראת להן עם `auth.uid()` ועם `private.israel_date(now())`. לסכימה `private` אין גישה ללקוחות (לא חשופה ב-API, ו-`EXECUTE` נשלל מ-`anon`/`authenticated`) | כך הבדיקות יכולות „לקפוץ” לתאריך אחר ולספור 300 בלי לחכות ובלי ליצור 300 מכשירים, והמשתמש עדיין לא יכול לבחור תאריך או מכשיר (DoD 7). → **ADR-12** |
| איך הבדיקות מתחזות למכשיר | — | בתוך טרנזקציה: `SET LOCAL ROLE authenticated` + `set_config('request.jwt.claims', '{"sub": "<uuid>", "role": "authenticated"}', true)`. כך `auth.uid()` מחזיר את המכשיר המדומה, וההרשאות הן בדיוק של משתמש אנונימי אמיתי | זה הדרך שבה Supabase עצמו מזהה משתמש בתוך מסד הנתונים. |
| „מכשירים” בבדיקות | הטבלאות מפנות ל-`auth.users` | הבדיקות יוצרות משתמשים מדומים ב-`auth.users` (רק `id`) ומוחקות אותם בסוף | חוסך את מגבלת הקצב של יצירת משתמשים אנונימיים. אם יתברר שאי אפשר להוסיף שורות ל-`auth.users` מהחיבור הזה — אעצור ואציע חלופה, בלי לשנות את מבנה הטבלאות. |
| ניקיון מסד הנתונים של Development | — | כל בדיקה רצה בטרנזקציה שמבוטלת בסוף (`ROLLBACK`), ולכן לא נשאר ממנה כלום. בדיקת המקביליות חייבת לשמור נתונים באמת, ולכן היא משתמשת בתאריך עתידי רחוק (שנת 2099) ומוחקת את כל מה שיצרה בסוף | כדי שהבדיקות לא „ישרפו” את המכסה של היום ב-Development ולא יפריעו לבדיקות שלך. |
| צורת התשובה של `reserve_joke_generation()` | ARCHITECTURE 5.2: מזהה שריון + נותרו, או `DEVICE_LIMIT`/`SITE_LIMIT` | מחזירה שורה אחת: `status` (`OK` / `DEVICE_LIMIT` / `SITE_LIMIT`), `reservation_id` (או ריק), `remaining_today` | צורה אחידה ופשוטה לקריאה מהשרת ב-M4. |
| כששני הגבולות מוצו | — | `DEVICE_LIMIT` קודם | שניהם מציגים את אותו מסך (DESIGN 1.5), כך שאין לזה השפעה על המשתמש. |
| `get_quota_status()` | ARCHITECTURE 5.2 | מחזירה `remaining_today` (0–10) ו-`site_limit_reached` (כן/לא). מכשיר שעוד לא יצר היום → 10 | בדיוק מה שנדרש ל„נשארו X” ולהחלטה על מסך המכסה ב-M4. |
| כשל בקריאת המכסה במסך היצירה | — | השורה „נשארו X מתוך 10 היום” לא מוצגת, ונרשמת שורה קצרה ב-log של השרת (קוד שגיאה בלבד) | לא מציגים מספר מומצא (כמו ב-M2). שאר המסך עובד כרגיל. |
| ה-workflow ל-Production | ARCHITECTURE 9.3, ADR-5 | `.github/workflows/migrate-production.yml`: רק `workflow_dispatch`, עם שדה אישור שחייבים להקליד בו `production`; `supabase link` + `supabase db push` עם הסודות `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, `SUPABASE_DB_PASSWORD` מ-GitHub Secrets; גרסת CLI זהה לזו שבפרויקט | שדה האישור מונע הרצה בלחיצה בטעות. לא רץ על push. |
| `supabase init` | — | מריצים פעם אחת, ליצירת `supabase/config.toml` ותיקיית `supabase/` | ה-CLI (ובעיקר `supabase link` ב-workflow) מצפה לתיקייה הזו. |

---

## 3. מבנה קבצים

```text
/
├── supabase/
│   ├── config.toml                          # NEW — created by `supabase init`
│   └── migrations/
│       └── <timestamp>_quota.sql            # NEW — tables, RLS, grants, private + public functions
├── .github/workflows/
│   └── migrate-production.yml               # NEW — manual-only production migrations (not run in M3)
├── lib/
│   ├── supabase/
│   │   ├── session.ts                       # unchanged (SUPABASE_COOKIE_OPTIONS reused)
│   │   └── server.ts                        # NEW — Supabase client for Server Components / Route Handlers
│   └── quota.ts                             # NEW — server-only: getQuotaStatus(), DAILY_LIMIT = 10
├── app/
│   ├── page.tsx                             # CHANGED — shows "נשארו X מתוך 10 היום"
│   └── page.module.css                      # CHANGED — style for the remaining line
├── scripts/
│   └── db-push.mjs                          # NEW — loads .env, runs `supabase db push --db-url` (never prints the URL)
├── tests/
│   ├── db.ts                                # NEW — pg connection + helpers (as-device, fake users, rollback)
│   ├── quota.test.ts                        # NEW — device limit, site limit, release, status, midnight/DST
│   ├── quota-concurrency.test.ts            # NEW — parallel requests on a far-future date, then cleanup
│   └── quota-security.test.ts               # NEW — direct calls / table access as a device
├── vitest.config.ts                         # NEW
├── .env.example                             # CHANGED — SUPABASE_DB_URL
├── docs/setup-guide.md                      # CHANGED — new step: copy the Development DB connection string
├── spec/ARCHITECTURE.md                     # CHANGED — ADR-11, ADR-12 only
├── CLAUDE.md                                # CHANGED — run commands: tests, db:push
└── package.json                             # CHANGED — supabase, vitest, pg, @types/pg; scripts test, db:push
```

---

## 4. ה-Migration (`supabase/migrations/<timestamp>_quota.sql`)

### טבלאות
- `public.daily_usage`: `user_id uuid references auth.users(id) on delete cascade`, `usage_date date`, `count integer not null default 0 check (count between 0 and 10)`, `updated_at timestamptz not null default now()`, `primary key (user_id, usage_date)`.
- `public.site_daily_usage`: `usage_date date primary key`, `count integer not null default 0 check (count between 0 and 300)`, `updated_at`.
- `public.generation_reservations`: `id uuid primary key default gen_random_uuid()`, `user_id uuid not null references auth.users(id) on delete cascade`, `usage_date date not null`, `status text not null default 'pending' check (status in ('pending','succeeded','released'))`, `created_at timestamptz not null default now()`. אינדקס על `user_id`.

### RLS והרשאות
- RLS מופעל על שלוש הטבלאות.
- `daily_usage`: policy יחיד — `SELECT` ל-`authenticated` כאשר `user_id = auth.uid()`.
- `site_daily_usage`, `generation_reservations`: בלי policies.
- `REVOKE ALL` על שלוש הטבלאות מ-`anon` ו-`authenticated`, ואז `GRANT SELECT` על `daily_usage` בלבד ל-`authenticated` (RLS מצמצם לשורות של המכשיר).

### סכימה `private`
- `create schema private;` — `REVOKE ALL ... FROM public, anon, authenticated`.
- `private.israel_date(ts timestamptz) returns date` — `(ts at time zone 'Asia/Jerusalem')::date`. `immutable`.
- `private.reserve_for(p_user uuid, p_date date)` — הלב של המנגנון, בטרנזקציה אחת:
  1. יוצרת שורות `daily_usage` ו-`site_daily_usage` עם `count = 0` אם אינן קיימות (`on conflict do nothing`).
  2. `UPDATE daily_usage SET count = count + 1, updated_at = now() WHERE ... AND count < 10 RETURNING count`. לא עודכן → `DEVICE_LIMIT`.
  3. `UPDATE site_daily_usage SET count = count + 1 ... WHERE ... AND count < 300`. לא עודכן → מחזירה את ההגדלה של שלב 2 (`count - 1`) ומחזירה `SITE_LIMIT`.
  4. יוצרת `generation_reservations` (`pending`) ומחזירה `OK`, מזהה השריון ו-`10 - count`.
  - **למה זה אטומי:** `UPDATE ... WHERE count < N` נועל את השורה; בקשה מקבילה מחכה, ואז בודקת שוב את התנאי מול הערך המעודכן. אין „בדיקה ואז עדכון” בשתי פעולות נפרדות (ARCHITECTURE 5.2).
  - `security definer`, `set search_path = ''` (כל השמות מלאים), `EXECUTE` רק ל-`postgres`.

### ארבע הפונקציות הציבוריות (ללא פרמטר של משתמש או תאריך)
כולן `security definer`, `set search_path = ''`, ונכשלות עם שגיאה ברורה אם `auth.uid()` ריק. `REVOKE EXECUTE ... FROM public, anon`; `GRANT EXECUTE ... TO authenticated`.
- `reserve_joke_generation()` → `private.reserve_for(auth.uid(), private.israel_date(now()))`.
- `complete_joke_generation(reservation_id uuid) returns boolean` — `pending` של המכשיר הזה → `succeeded`. לא משנה מונים.
- `release_joke_generation(reservation_id uuid) returns boolean` — רק `pending` של המכשיר הזה → `released`, ומקטינה ב-1 את `daily_usage` ואת `site_daily_usage` של ה-`usage_date` **של השריון**. שריון `succeeded`/`released`/של מכשיר אחר → `false`, בלי שינוי.
- `get_quota_status()` → `remaining_today`, `site_limit_reached` ליום הנוכחי בישראל. קריאה בלבד (`stable`).

---

## 5. מסך היצירה — „נשארו X מתוך 10 היום”

- `lib/supabase/server.ts`: `createClient()` עם `cookies()` של `next/headers` ו-`SUPABASE_COOKIE_OPTIONS` (ADR-10). `setAll` עטוף ב-`try/catch` (Server Component אינו יכול לכתוב cookies; ה-Proxy כבר מרענן).
- `lib/quota.ts` (`server-only`): `DAILY_LIMIT = 10`; `getQuotaStatus()` קוראת ל-`rpc("get_quota_status")` ומחזירה `{ remainingToday, siteLimitReached }` או `null` בכשל (עם `console.error` של קוד השגיאה בלבד).
- `app/page.tsx` הופך ל-`async`, קורא ל-`getQuotaStatus()`, ומציג מתחת לכפתור „צרו בדיחה” ומעל קישור „פרטיות” שורה קטנה ואפורה: „נשארו {X} מתוך 10 היום” (DESIGN 1.9). בכשל — השורה לא מוצגת.
- בכניסה הראשונה של מכשיר: ה-Proxy כבר יוצר את ה-session ומעביר אותו לאותה בקשה (M2), ולכן מוצג „נשארו 10 מתוך 10 היום” כבר בטעינה הראשונה.
- `TopicForm` לא משתנה.

---

## 6. הבדיקות (Vitest מול Development)

- `npm test` → `vitest run`. ההגדרות טוענות את `.env` (`process.loadEnvFile`), ונכשלות בהודעה ברורה אם `SUPABASE_DB_URL` חסר. חיבור בעזרת `pg`.
- כל בדיקה ב-`quota.test.ts` וב-`quota-security.test.ts` רצה בתוך `BEGIN … ROLLBACK`.

| DoD | בדיקה |
|---|---|
| 2 | מכשיר מדומה קורא 11 פעמים ל-`reserve_joke_generation()`: 10 × `OK` (נשארו 9…0), ה-11 → `DEVICE_LIMIT`, ולא נוצר שריון נוסף. |
| 3 | 30 מכשירים × 10 שריונים ביום קבוע (`private.reserve_for`) = 300; מכשיר 31 (0 שימושים) → `SITE_LIMIT`, ומונה המכשיר שלו נשאר 0. `get_quota_status` מחזיר `site_limit_reached = true`. |
| 4 | מקביליות (נתונים אמיתיים, תאריך 2099, ניקוי בסוף): 25 קריאות במקביל ממכשיר אחד → בדיוק 10 `OK`; 35 מכשירים × 10 קריאות במקביל → בדיוק 300 `OK`, והמונים ב-DB = 10 / 300. |
| 5 | `private.israel_date` בגבולות: חצות בחורף (`2026-12-31T21:59:59Z` → 31.12, `22:00:00Z` → 1.1), חצות בקיץ (`2026-07-01T20:59:59Z` / `21:00:00Z`), יום המעבר לשעון קיץ (27.3.2026) ויום המעבר לשעון חורף (25.10.2026). ובנוסף: מכשיר שמיצה 10 ביום D מקבל `OK` ביום D+1, ותקרת אתר מלאה ביום D אינה חוסמת את D+1. |
| 6 | `release` ראשון → `true`, ושני המונים יורדים ב-1; `release` שני → `false` בלי שינוי; `release` של שריון `succeeded` → `false` בלי שינוי; `release` של שריון מיום קודם מוריד את המונים של **אותו יום** ולא של היום; `release`/`complete` של שריון של מכשיר אחר → `false`. |
| 7 | בתור מכשיר: הפונקציות הציבוריות מוגדרות בלי פרמטרים של משתמש/תאריך (בדיקה ב-`pg_proc`); קריאה ל-`private.reserve_for` / `private.israel_date` → שגיאת הרשאה; `INSERT`/`UPDATE`/`DELETE` ישירים בטבלאות → שגיאת הרשאה; `SELECT` מ-`daily_usage` מחזיר רק את השורות של המכשיר עצמו; `site_daily_usage` ו-`generation_reservations` לא קריאות; בלי `auth.uid()` (תפקיד `anon`) — כל ארבע הפונקציות נכשלות. |

- בנוסף: `get_quota_status` למכשיר חדש → 10 ו-`false`; אחרי 3 שריונים → 7.

---

## 7. ה-workflow ל-Production (`.github/workflows/migrate-production.yml`)

- `on: workflow_dispatch` עם input חובה `confirm`; ה-job רץ רק אם הוקלד `production`.
- `permissions: contents: read`; `concurrency` שמונע שתי הרצות במקביל.
- צעדים: `actions/checkout` ← `supabase/setup-cli` (אותה גרסה כמו ב-`package.json`) ← `supabase link --project-ref "$SUPABASE_PROJECT_ID"` ← `supabase db push`. הסודות מגיעים רק מ-GitHub Secrets.
- ב-M3 הקובץ רק נשמר. הוא לא מופעל, ואין צורך בסודות. ההדרכה להפעלתו — ב-M5.

---

## 8. צעד ידני שלך (יתווסף ל-`docs/setup-guide.md`)

**העתקת כתובת החיבור של מסד הנתונים של Development ל-`.env`:**
1. בלוח הבקרה של Supabase, בפרויקט **`one-joke-dev`** בלבד ← כפתור **Connect** בראש העמוד.
2. בוחרים **Session pooler** (מתאים לכל רשת ביתית) ומעתיקים את הכתובת (`postgresql://...`).
3. מדביקים ב-`.env` אחרי `SUPABASE_DB_URL=`, ומחליפים את `[YOUR-PASSWORD]` בסיסמת מסד הנתונים ששמרת בהקמה (אם שכחת — אפשר לאפס אותה ב-**Database Settings**).
4. מוודאים שהמזהה בכתובת זהה למזהה של `one-joke-dev` (כמו בסעיף 1 במדריך).

אני לא קורא את `.env`; הסקריפטים טוענים אותו בעצמם ולא מדפיסים את הכתובת.

---

## 9. סדר הבנייה

1. התקנת `supabase`, `vitest`, `pg`, `@types/pg`; `npx supabase init`; סקריפטים `test` ו-`db:push`; `scripts/db-push.mjs`.
2. עדכון `.env.example` ו-`docs/setup-guide.md` (סעיף 8). **כאן אעצור ואבקש ממך להוסיף את `SUPABASE_DB_URL` ל-`.env`**, אם הוא עדיין לא שם.
3. כתיבת ה-Migration.
4. `npm run db:push` — הרצה מול Development בלבד.
5. כתיבת הבדיקות והרצתן; תיקונים עד שהכול עובר. (תיקון של Migration שכבר רץ ב-Development ייעשה ב-Migration נוסף, לא בעריכת הקיים.)
6. `lib/supabase/server.ts`, `lib/quota.ts`, ושורת „נשארו X” ב-`app/page.tsx`.
7. ה-workflow ל-Production.
8. ADR-11 ו-ADR-12 ב-`ARCHITECTURE.md`; פקודות ההרצה ב-`CLAUDE.md`.

---

## 10. בדיקה לפני סימון 🟡

- `npm run lint && npx tsc --noEmit && npm run build` — בלי שגיאות.
- `npm test` — כל הבדיקות עוברות.
- `npm run dev` ובדפדפן: מסך היצירה מציג „נשארו 10 מתוך 10 היום” למכשיר חדש; אחרי שריונים מדומים למכשיר הזה (בבדיקה ידנית מבוקרת שמנוקה בסוף) המספר יורד; בפריסה צרה (מובייל) השורה ממוקמת לפי DESIGN.
- ב-Supabase Development: שלוש הטבלאות קיימות עם RLS מופעל, וה-Migration מופיע ברשימת ה-Migrations שהורצו.
- מעבר על 9 תנאי ה-Definition of Done, סימון 🟡 ליד כותרת M3 ב-`MILESTONES.md`, וסגירת השרת. בלי commit.
