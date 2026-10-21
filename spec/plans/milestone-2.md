# תוכנית Milestone 2 — Anonymous Session, App Shell & Privacy Page

> מבוסס על `MILESTONES.md` (M2), `ARCHITECTURE.md` (3.2, 7.1, 7.3, 9.4, ADR-7, ADR-9), `DESIGN.md` (מבנה משותף, 1.9, 1.10, 2.1–2.6), `PRD.md` (4.א.1, 4.א.2, 4.א.8) והתמונות ב-`spec/`.
> מטרה: כל מי שנכנס לאתר מקבל ברקע מזהה אנונימי של Supabase שנשמר בין כניסות, והאתר נפתח ישירות במסך היצירה (פריסה בלבד), עם סרגל עליון וקישור לדף הפרטיות.

---

## 1. מה נכנס ומה לא נכנס ל-M2

**בתוך M2**
- הדרכה צעד-אחר-צעד להפעלת **Allow anonymous sign-ins** בפרויקט Supabase **Development** (תוספת ל-`docs/setup-guide.md`).
- התקנת `@supabase/supabase-js` ו-`@supabase/ssr`.
- `proxy.ts` (שם הקובץ של Middleware ב-Next.js 16): יצירת משתמש אנונימי כשאין session, ורענון session שפג.
- סרגל עליון עם הלוגו בלבד, משותף לכל הדפים.
- מסך יצירת בדיחה (1.9) — פריסה בלבד, עם שדה נושא, מונה תווים והגבלת 100 תווים. מחליף את מסך הבית הזמני של M1.
- דף פרטיות (1.10) עם הנוסח שבסעיף 7, לאישורך.

**לא בתוך M2**
- „נשארו X מתוך 10 היום” — דורש את `get_quota_status()` מ-M3. השורה לא מוצגת ב-M2 (לא מציגים מספר מומצא).
- יצירת בדיחה בפועל, מסכי טעינה/בדיחה/שגיאה/מכסה, `POST /api/jokes` — M4.
- טבלאות, Migrations, Supabase CLI — M3.
- יצירה מחדש של session שנמחק **באמצע שימוש** וניסיון חוזר — M5. (ב-M2 ה-Proxy כבר יוצר session חדש בכל טעינת דף שאין בה session.)
- כל דבר שקשור ל-Production, ל-Vercel או ל-push — לא נדרש ב-M2 (ADR-6 בוטל).

---

## 2. החלטות ותיאומים בין המקורות

| נושא | מה כתוב | מה נעשה | למה |
|---|---|---|---|
| Proxy או Middleware | MILESTONES/ARCHITECTURE: „Proxy/Middleware” | קובץ `proxy.ts` בשורש הפרויקט, פונקציה `proxy` | ב-Next.js 16 הקובץ `middleware` הוצא משימוש ושמו `proxy` (תיעוד ב-`node_modules/next/dist/docs/.../proxy.md`). רץ ב-Node.js כברירת מחדל. |
| דגלי ה-cookie | ARCHITECTURE 7.1: `HttpOnly`, `Secure`, `SameSite=Lax` | `cookieOptions` ב-`createServerClient`: `httpOnly: true`, `sameSite: "lax"`, `secure` רק כש-`NODE_ENV=production`, `path: "/"`. משך החיים נשאר ברירת המחדל של `@supabase/ssr` (כ-400 יום) | ברירת המחדל של `@supabase/ssr` היא cookie **שאינו** HttpOnly, כדי שקוד בדפדפן יוכל לקרוא אותו. אצלנו אין שום קריאה ל-Supabase מהדפדפן (הכול בשרת), ולכן אפשר לחסום גישת JavaScript ל-cookie. `Secure` כבוי ב-`localhost` כי Safari לא שומר cookie מאובטח על `http`. → **ADR-10** |
| לקוח Supabase בדפדפן | — | **לא נוצר** | אין בו צורך: המכסה (M3) והיצירה (M4) נקראות מהשרת. גם מתיישב עם `httpOnly`. |
| לקוח Supabase לשרת (Server Components / Route Handlers) | „Supabase SSR Helpers” | ב-M2 רק ה-helper של ה-Proxy (`lib/supabase/session.ts`). ה-helper לשרת (`lib/supabase/server.ts`) נוסף ב-M3, כשיש לו שימוש ראשון (`get_quota_status`) | הפתרון הפשוט ביותר; לא כותבים קוד שאף אחד לא קורא לו. אפשרויות ה-cookie מוגדרות כקבוע אחד שמיוצא, כדי שגם `server.ts` ישתמש בהן. |
| משתני סביבה ב-Proxy | `lib/config/env.ts` (מסומן `server-only`) | ה-Proxy קורא את `NEXT_PUBLIC_SUPABASE_URL` ו-`NEXT_PUBLIC_SUPABASE_ANON_KEY` ישירות מ-`process.env` | החבילה `server-only` עלולה לזרוק שגיאה בקוד של ה-Proxy (שנבנה בנפרד מקוד ה-React של השרת). קיום המשתנים כבר נבדק בעליית השרת (ADR-3). אין משתני סביבה חדשים. |
| אימות ה-session | — | `supabase.auth.getClaims()` (אימות ה-JWT ורענונו לפי הצורך), כפי שתיעוד `@supabase/ssr` ממליץ. אם אין claims ← `supabase.auth.signInAnonymously()` | לא משתמשים ב-`getSession()` בשרת, כי הוא לא מאמת את ה-token. בזמן הבנייה אוודא את שם הפונקציה מול גרסת החבילה שתותקן. |
| אילו בקשות עוברות ב-Proxy | ARCHITECTURE 3.2: „בכל בקשה לדף או ל-API” | `matcher` שמחריג: `_next/static`, `_next/image`, `favicon.ico`, `manifest.webmanifest`, `robots.txt`, `sitemap.xml`, `icons/`, `assets/` וקבצי תמונה (`svg/png/jpg/jpeg/gif/webp/ico`). דפים ו-`/api` כן עוברים | קבצים סטטיים לא צריכים session, ואחרת כל תמונה הייתה פונה ל-Supabase. |
| כשל ביצירת משתמש אנונימי | — | מדפיסים ל-log בשרת שורה קצרה (`[session] anonymous sign-in failed: <status/code>`, בלי tokens), והדף ממשיך להיטען כרגיל | ב-M2 אין עדיין שום פעולה שתלויה ב-session, ולכן אין למה לחסום את המשתמש. הטיפול המלא בכשלים בא ב-M4/M5. |
| בדיקת Origin/CSRF | ARCHITECTURE 7.4 | לא ב-M2 | אין ב-M2 שום בקשה שמשנה נתונים. ייבנה עם `POST /api/jokes` ב-M4. |
| האיור במסך היצירה | Mockup 9: פרצוף מחייך בבועת דיבור | `public/assets/illustrations/illustration-laugh.svg` (הפרצוף הצוחק הצהוב) | אין בחבילת הנכסים איור של בועת דיבור. DESIGN 1.1 קובע שאיור הפרצוף הצוחק ממסך ההתחברות „יכול לשמש במסך היצירה”. |
| הלוגו בסרגל העליון | Mockups: „JOKE” צבעוני במרכז | `public/assets/logo.png` (אותו קובץ שבמסך הזמני של M1), בגובה כ-36px, ממורכז | DESIGN: הלוגו במרכז בלבד, בלי תפריט ופרופיל. |
| כפתור „צרו בדיחה” ב-M2 | MILESTONES: „הכפתור עדיין אינו יוצר בדיחה” | כפתור רגיל (לא מושבת, כדי שייראה לפי העיצוב), `type="button"`, בלי פעולה. שליחת הטופס ב-Enter מנוטרלת | החיבור ליצירה בפועל ב-M4. |
| ספירת תווים | PRD 4.א.2: עד 100 תווים, עם מונה | `maxLength={100}` בשדה, והמונה מציג `value.length` בפורמט `0/100` | זו אותה שיטת ספירה שבה ישתמש השרת ב-M4 (`topic.length`), כך שהשדה והשרת לא יחלקו. |

---

## 3. מבנה קבצים

```text
/
├── proxy.ts                          # NEW — runs updateSession() on page/API requests
├── lib/
│   └── supabase/
│       └── session.ts                # NEW — SUPABASE_COOKIE_OPTIONS + updateSession(request)
├── app/
│   ├── layout.tsx                    # CHANGED — renders <TopBar /> above {children}
│   ├── globals.css                   # unchanged (tokens and base components from M1 are reused)
│   ├── page.tsx                      # REPLACED — create-joke screen 1.9 (layout only)
│   ├── page.module.css               # REPLACED — styles for screen 1.9
│   ├── components/
│   │   ├── TopBar.tsx                # NEW — logo only, centered
│   │   ├── TopBar.module.css         # NEW
│   │   ├── TopicForm.tsx             # NEW — "use client": input + counter + button
│   │   └── TopicForm.module.css      # NEW
│   └── privacy/
│       ├── page.tsx                  # NEW — privacy page 1.10
│       └── page.module.css           # NEW
├── docs/setup-guide.md               # CHANGED — new step: enable anonymous sign-ins (Development)
├── spec/ARCHITECTURE.md              # CHANGED — add ADR-10 only
└── package.json                      # CHANGED — @supabase/supabase-js, @supabase/ssr
```

אין שינוי ב-`.env.example` (אין משתנים חדשים), ב-`.gitignore`, ב-`manifest.ts` או בבדיקות העלייה.

---

## 4. ה-session האנונימי

### `lib/supabase/session.ts`
- `export const SUPABASE_COOKIE_OPTIONS = { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" }`.
- `export async function updateSession(request: NextRequest): Promise<NextResponse>` — לפי הדפוס הרשמי של `@supabase/ssr` ל-Proxy:
  1. `let response = NextResponse.next({ request })`.
  2. `createServerClient(url, anonKey, { cookieOptions: SUPABASE_COOKIE_OPTIONS, cookies: { getAll, setAll } })`. ב-`setAll` כותבים את ה-cookies **גם** ל-`request.cookies` (כדי שהדף שנטען באותה בקשה יראה את ה-session החדש) **וגם** ל-`response` החדש שנוצר מ-`NextResponse.next({ request })`.
  3. `const { data } = await supabase.auth.getClaims()`.
  4. אם אין claims: `const { error } = await supabase.auth.signInAnonymously()`. אם יש `error` — שורת log קצרה (סטטוס/קוד בלבד) וממשיכים.
  5. מחזירים את `response` (אסור ליצור Response אחר אחרי זה, אחרת ה-cookies אובדים).
- אין קוד בין יצירת ה-client לבין `getClaims()` (המלצת Supabase, כדי שהרענון לא יתפספס).

### `proxy.ts`
```ts
export async function proxy(request: NextRequest) {
  return updateSession(request);
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|icons/|assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
```

### התנהגות צפויה
- **כניסה ראשונה:** אין cookie ← נוצר משתמש אנונימי ← התשובה מחזירה cookie בשם `sb-<project-ref>-auth-token` (ייתכן מפוצל ל-`.0`/`.1`), עם `HttpOnly; SameSite=Lax; Path=/; Max-Age≈400 ימים`.
- **רענון / סגירה ופתיחה של הדפדפן:** ה-cookie נשמר (יש לו `Max-Age`, ולכן הוא לא נמחק בסגירת הדפדפן) ← `getClaims()` מצליח ← לא נוצר משתמש חדש.
- **token שפג (אחרי כשעה):** `getClaims()` מרענן אותו עם ה-refresh token ← אותו משתמש, cookie מעודכן.
- **Prefetch של הקישור „פרטיות”:** מגיע עם ה-cookie שכבר נשמר ← לא נוצר משתמש נוסף.
- **מגבלה מודעת (PRD 4.א.1):** חלון גלישה בסתר / מחיקת נתונים / האפליקציה המותקנת ← משתמש אנונימי חדש. תקין.

---

## 5. המסכים

### סרגל עליון — `app/components/TopBar.tsx`
- `<header>` ברוחב מלא, גובה כ-56px, רקע לבן, קו תחתון דק `--color-gray-light`.
- במרכז: `next/image` של `logo.png`, `alt="JOKE"`, עטוף ב-`Link` ל-`/` (מחזיר למסך היצירה גם מדף הפרטיות).
- בלי אייקון תפריט, בלי אייקון פרופיל, ובלי סרגל ניווט תחתון בשום מקום (DoD 3).
- נכנס ל-`layout.tsx` מעל `{children}`, כך שהוא מופיע בכל הדפים.

### מסך יצירת בדיחה (1.9) — `app/page.tsx` + `app/components/TopicForm.tsx`
פריסה אנכית, ממורכזת, ברוחב מרבי 480px (DESIGN 2.4), שוליים צדדיים `--space-24`, לפי Wireframe/Mockup 9 ונוסחי DESIGN 2.6:
1. איור `illustration-laugh.svg` (כ-140px רוחב), `alt=""` (דקורטיבי).
2. כותרת `<h1>` „מוכנים לבדיחה?” (ממורכזת; בגודל ה-H2 של מובייל, כדי שתתאים לפרופורציות שב-Mockup).
3. הסבר „כתבו נושא, או השאירו את השדה ריק לבדיחה כללית.” — Body, צבע `--color-text-secondary`, ממורכז.
4. `TopicForm` (רכיב לקוח, `"use client"`):
   - `<label>` מוסתר ויזואלית אך נגיש לקוראי מסך: „נושא לבדיחה”.
   - `<input type="text" className="input">` של שורה אחת, `maxLength={100}`, Placeholder „למשל: חתולים, עבודה, ספורט...”, `dir="auto"` (כדי שנושא באנגלית ייכתב משמאל לימין), יישור לימין.
   - מונה תווים מתחת לשדה, בצד שמאל (סוף השורה ב-RTL), Caption 14px בצבע `--color-text-secondary`: `{length}/100`, עם `aria-live="polite"`.
   - כפתור `btn-primary` ברוחב מלא: „צרו בדיחה” (`type="button"`, בלי פעולה ב-M2).
   - `onSubmit` של הטופס עושה `preventDefault`, כך ש-Enter לא מרענן את הדף.
5. קישור `next/link` „פרטיות” ל-`/privacy` — בתחתית התוכן, ממורכז, Caption 14px בצבע `--color-text-secondary` (לא `#9CA3AF`, שאינו קריא מספיק — DESIGN 2.1), עם קו תחתון ב-hover/focus.

`metadata` של הדף נשאר זה שב-`layout.tsx` („One Joke”). ההערה „Temporary home screen…” ותוכן המסך הזמני של M1 נמחקים.

### דף פרטיות (1.10) — `app/privacy/page.tsx`
- `metadata.title`: „פרטיות | One Joke”.
- אותה עמודה ממורכזת (480px), טקסט מיושר לימין.
- כותרת `<h1>` „פרטיות” (בגודל H2), אחריה הפסקאות שבסעיף 7 (Body 16px, רווח `--space-16` בין פסקאות).
- בסוף: קישור „חזרה ליצירת בדיחה” ל-`/`, בצבע `--color-primary-strong`, עם קו תחתון.

---

## 6. הדרכה: הפעלת Anonymous Sign-Ins (תוספת ל-`docs/setup-guide.md`)

סעיף חדש „1א. הפעלת זיהוי אנונימי (Development)”:
1. נכנסים ל-[supabase.com/dashboard](https://supabase.com/dashboard) ובוחרים את הפרויקט **`one-joke-dev`**.
2. בתפריט הצד: **Authentication** ← **Sign In / Providers** (בגרסאות מסוימות: **Providers** או **Settings**).
3. באזור **User Signups**, מפעילים את **Allow anonymous sign-ins** ולוחצים **Save changes**.
4. לא משנים את **Rate Limits** (Authentication ← Rate Limits): מגבלת ברירת המחדל על יצירת משתמשים אנונימיים לפי כתובת IP נשארת מופעלת (ARCHITECTURE 7.4).
5. איך בודקים שזה עובד: אחרי שנכנסים לאתר, ב-**Authentication** ← **Users** מופיע משתמש חדש עם התווית **Anonymous**.

הערה במדריך: במהלך הבדיקות ייתכן שייווצרו כמה משתמשים אנונימיים בפרויקט הפיתוח (למשל מחלון גלישה בסתר). זה תקין.

**בזמן הבנייה:** אם ההגדרה עדיין לא הופעלה, הכניסה לאתר תחזיר שגיאה `anonymous_provider_disabled` ב-log. במקרה כזה אעצור ואבקש ממך להפעיל אותה לפי ההדרכה.

---

## 7. נוסח דף הפרטיות — טיוטה לאישורך

> **פרטיות**
>
> ב-One Joke אין הרשמה ואין התחברות. אנחנו לא מבקשים ולא אוספים מידע אישי — לא שם, לא כתובת אימייל ולא מספר טלפון.
>
> כדי לספור כמה בדיחות נוצרו היום, האתר שומר בדפדפן שלכם מזהה אנונימי (cookie). המזהה לא קשור לשום פרט מזהה עליכם.
>
> אצלנו נשמרים רק המזהה האנונימי ומספר הבדיחות שנוצרו בכל יום, לצורך המכסה היומית.
>
> הנושא שאתם כותבים נשלח לשירות OpenAI רק כדי ליצור את הבדיחה. הנושאים והבדיחות לא נשמרים אצלנו.
>
> אם תמחקו את נתוני הגלישה בדפדפן, גם המזהה האנונימי יימחק.
>
> [חזרה ליצירת בדיחה]

הערות לנוסח:
- הפסקה על OpenAI אינה מופיעה במפורש ב-PRD 4.א.8; הוספתי אותה כי הנושא אכן נשלח ל-OpenAI, ודף פרטיות צריך לומר זאת. אפשר להסיר אותה אם תעדיף.
- האישור הסופי של הנוסח לפני העלייה לאוויר הוא חלק מ-M5 (PRD 4.א.8). ב-M2 מספיק שהנוסח יוצג לך (DoD 5).

---

## 8. ADR שיתווסף ל-ARCHITECTURE.md

### ADR-10: cookie של ה-session מסוג HttpOnly, בלי לקוח Supabase בדפדפן
- **הקשר:** ARCHITECTURE 7.1 דורש cookies מאובטחים (`HttpOnly`, `Secure`, `SameSite=Lax`). ברירת המחדל של `@supabase/ssr` היא cookie שאינו HttpOnly, כדי שקוד בדפדפן יוכל להשתמש ב-session.
- **החלטה:** כל הפניות ל-Supabase נעשות בשרת (ה-Proxy, ובהמשך Server Components ו-`POST /api/jokes`). ה-cookie מוגדר `httpOnly: true`, `sameSite: "lax"`, ו-`secure` רק ב-Production, דרך הקבוע `SUPABASE_COOKIE_OPTIONS` ב-`lib/supabase/session.ts`. אין לקוח Supabase בדפדפן.
- **השלכות:** קוד בדפדפן אינו יכול לקרוא את ה-token. כל לקוח Supabase שייווצר בשרת בהמשך חייב להשתמש באותו קבוע. ב-`localhost` ה-cookie אינו `Secure`, כי Safari אינו שומר cookie כזה בכתובת `http`.

---

## 9. סדר הבנייה

1. לוודא איתך שהפעלת **Allow anonymous sign-ins** ב-`one-joke-dev` (סעיף 6), ולהוסיף את ההדרכה ל-`docs/setup-guide.md`.
2. `npm install @supabase/supabase-js @supabase/ssr`; לקרוא את ה-README של `@supabase/ssr` שהותקן ולוודא את ה-API (`createServerClient`, `cookieOptions`, `getClaims`).
3. `lib/supabase/session.ts` + `proxy.ts`.
4. `TopBar` + עדכון `layout.tsx`.
5. מסך היצירה: `app/page.tsx`, `page.module.css`, `TopicForm`.
6. דף הפרטיות.
7. ADR-10 ב-`ARCHITECTURE.md`.
8. בדיקות (סעיף 10), תיקונים, סימון 🟡 ליד כותרת M2 ב-`MILESTONES.md`, וסגירת השרת.

---

## 10. בדיקות שאבצע בעצמי (מול Supabase Development בלבד)

**בדיקות קוד:** `npm run lint && npx tsc --noEmit && npm run build` — בלי שגיאות.

**Session (עם `curl` ו-cookie jar, מול `npm run dev`):**
- בקשה ראשונה ל-`/` בלי cookies ← בתשובה יש `Set-Cookie` של `sb-<ref>-auth-token` עם `HttpOnly`, `SameSite=Lax`, `Path=/` ו-`Max-Age`.
- פענוח החלק הציבורי של ה-JWT שב-cookie (בלי להדפיס את ה-token עצמו): `is_anonymous: true`, ו-`ref` של הפרויקט הוא של `one-joke-dev`. רושמים רק את ה-`sub` (המזהה).
- בקשה שנייה ושלישית (גם ל-`/privacy`) עם אותו jar ← אותו `sub`, לא נוצר משתמש חדש.
- בקשה בלי cookies ← `sub` אחר (מכשיר חדש) — מוכיח שהמזהה בא מה-cookie.
- בקשה ל-`/assets/logo.png` ול-`/manifest.webmanifest` ← בלי `Set-Cookie` (לא עוברות ב-Proxy).
- ב-log של השרת אין tokens ואין שגיאות.

**ממשק (בדפדפן המובנה, ברוחב מובייל 375px וגם ברוחב מחשב):**
- `/` נפתח ישר במסך היצירה: סרגל עליון עם הלוגו בלבד, איור, כותרת, הסבר, שדה, מונה, כפתור וקישור „פרטיות”, ב-RTL ובגופן Heebo. משווה ל-Mockup 9.
- הקלדה מעדכנת את המונה; הדבקה של 150 תווים נעצרת ב-100 והמונה מציג `100/100`.
- Enter בשדה ולחיצה על הכפתור לא מרעננים ולא שוברים כלום.
- „פרטיות” פותח את `/privacy` עם הנוסח; „חזרה ליצירת בדיחה” והלוגו מחזירים ל-`/`.
- ב-DevTools ← Application ← Cookies: ה-cookie מסומן HttpOnly; רענון הדף לא משנה את ה-`sub`.
- אין מסך התחברות, פרופיל, תפריט או סרגל תחתון; ב-Console אין שגיאות.

**לבדיקה שלך (אחרי „הרץ כדי שאבדוק”):** משתמש **Anonymous** מופיע ב-Supabase ← Authentication ← Users; סגירה ופתיחה מחדש של הדפדפן לא מוסיפה משתמש; קריאת נוסח הפרטיות.

---

## 11. מיפוי ל-Definition of Done

| # | תנאי | איך מתקיים |
|---|---|---|
| 1 | כניסה ראשונה יוצרת session אנונימי בלי מסך התחברות | `proxy.ts` ← `signInAnonymously()`; נבדק ב-curl (`is_anonymous: true`) וברשימת המשתמשים ב-Supabase |
| 2 | רענון וסגירה/פתיחה שומרים על אותו זיהוי | cookie עם `Max-Age` ארוך + `getClaims()` לפני כל יצירה; נבדק ב-curl (אותו `sub`) ובדפדפן |
| 3 | אין מסך התחברות, פרופיל, תפריט או סרגל תחתון | `TopBar` עם לוגו בלבד; אין דפים או רכיבים כאלה |
| 4 | מסך 1.9 לפי DESIGN, עם מונה והגבלת 100 תווים | `page.tsx` + `TopicForm` (`maxLength={100}`, מונה `x/100`), נוסחי DESIGN 2.6 |
| 5 | דף הפרטיות נפתח מהקישור, והנוסח הוצג למשתמש | `/privacy`; הנוסח בסעיף 7 כאן ובסיכום הבנייה |
| 6 | הבדיקות מול Supabase Development בלבד | `.env` המקומי מכיל רק Development; בדיקת `ref` ב-JWT ושורת `[startup] Supabase reachable` |
