# MILESTONES.md — אבני דרך לפיתוח הפרויקט One Joke

מסמך זה מגדיר את אבני הדרך (Milestones) המרכזיות לפיתוח אפליקציית ה-Web וה-PWA של **One Joke**, בהתבסס על מסמכי **PRD.md**, **ARCHITECTURE.md** ו-**DESIGN.md**.

הפיתוח מחולק ל-Vertical Slices ברורים, משמעותיים וניתנים לבדיקה עצמאית, כך שכל אבן דרך מוסיפה יכולת משתמש עובדת מקצה לקצה או תשתית קריטית הנחוצה להמשך.

---

## כללי ביצוע הפיתוח – Development Execution Rules

> **הנחיה מחייבת ל-AI / גורם הפיתוח:**
> 1. יש לפתח את ה-Milestones לפי הסדר המוגדר במסמך זה בלבד.
> 2. לאחר השלמת כל Milestone, יש לעצור את הפיתוח, להציג למשתמש את התוצר שהושלם ואת תוצאות הבדיקות מול ה-Definition of Done.
> 3. **אין להתחיל בפיתוח ה-Milestone הבא ללא אישור מפורש של המשתמש.**

---

## סקירת אבני הדרך (Milestones Summary)

| # | שם אבן הדרך | סוג Milestone | תיאור תמציתי |
|---|---|---|---|
| **M1** | Project Setup, Environments & Base Design System | Infrastructure & UI Shell | הקמת פרויקט Next.js, הגדרת סביבות Supabase (Dev/Prod), עיצוב בסיסי (RTL, פלטת צבעים, גופנים) והגדרת Manifest PWA. |
| **M2** | Authentication & User Session Flow | Vertical Slice | מימוש תהליך התחברות Google OAuth מקצה לקצה, ניהול Sessions במובייל, ומסכי התחברות, פרופיל ושגיאה. |
| **M3** | Database Schema, Atomic Quota Management & Profile | Vertical Slice & DB | הקמת טבלת `daily_usage`, הרצת Migrations בסביבת Development, מימוש פונקציה אטומית לאכיפת מכסה לפי שעון ישראל, והצגת נתוני מכסה בפרופיל. |
| **M4** | AI Joke Generation Engine & Main User Flow | Vertical Slice | חיבור מאובטח ל-OpenAI API (GPT-5) ב-Backend, מימוש יצירת בדיחה (עם/ללא נושא), מסך טעינה, הצגת בדיחה אחת בלבד ומסכי שגיאה/מיצוי מכסה. |
| **M5** | Edge Cases, PWA Finalization, E2E Testing & Production Deployment | Polish & Release | טיפול במקרי קצה (ניתוקי רשת, מניעת כפילויות), בדיקות E2E, הרצת Migrations מבוקרת ב-Production ופריסה מלאה ב-Vercel. |

---

## פירוט אבני הדרך (Milestone Details)

### Milestone 1: Project Setup, Environments & Base Design System

#### שם ומטרה
- **שם:** הקמת תשתית הפרויקט, הגדרת סביבות עבודה ושפה עיצובית בסיסית.
- **מטרה:** להקים את Repository הקוד, להגדיר את סביבות הענן (Development ו-Production) ב-Supabase וב-Vercel, להגדיר את השפה העיצובית (RTL, גופנים, צבעים) ולהכין את שלד ה-PWA הנדרש למובייל.

#### מה יש לממש
- הקמת פרויקט Next.js עם App Router ו-TypeScript.
- הגדרת תמיכה מלאה ב-RTL ובשפה העברית (`lang="he"`, `dir="rtl"`).
- טעינת הגופנים Heebo (עברית) ו-Inter (אנגלית), והגדרת משתני עיצוב (CSS Variables) לפי פלטת הצבעים והטיפוגרפיה המוגדרים ב-DESIGN.md (`#3B82F6`, `#FACC15`, `#EF4444`, `#111827`, וכו').
- יצירת הדרכה צעד-אחר-צעד והקמת שני פרויקטים נפרדים ב-Supabase: **Development** ו-**Production**.
- הגדרת משתני סביבה (`.env.local` לפיתוח מקומי מול Supabase Development בלבד, ומשתני סביבה ב-Vercel).
- יצירת קובץ `manifest.json` בסיסי עבור PWA עם תמיכה בתצוגת `standalone`, צבעי ערכת נושא ואייקונים ייעודיים למובייל.
- יצירת מנגנון בדיקת תקינות המודל המוגדר ב-`OPENAI_MODEL` (GPT-5) בעת הפעלת השרת.

#### תוצר מצופה
שלד אפליקציה עובד ב-Next.js המציג מסך בית בסיסי מעוצב ב-RTL לפי ה-Style Guide, המחובר לסביבת Supabase Development ומותקן כ-PWA במסכים תומכים.

#### Definition of Done
1. פרויקט Next.js עולה ריצה מקומית (`npm run dev`) ללא שגיאות compilation או TypeScript.
2. הוקמו שני פרויקטים נפרדים ב-Supabase (Dev ו-Prod), ומשתני הסביבה המקומיים מופנים אך ורק לסביבת ה-Dev.
3. הגופנים Heebo ו-Inter נטענים כראוי, והגדרות RTL פועלות באופן תקין בדפדפן.
4. קובץ ה-Manifest של ה-PWA נטען בהצלחה ומזוהה ע"י Chrome DevTools / Lighthouse.
5. הוגדר קובץ `.env.example` הכולל את כל שמות המשתנים הנדרשים ללא ערכים סודיים, וקובץ `.env.local` הוסף ל-`.gitignore`.

---

### Milestone 2: Authentication & User Session Flow

#### שם ומטרה
- **שם:** תהליך התחברות משתמשים וניהול Sessions (Google OAuth).
- **מטרה:** להבטיח שרק משתמשים מאומתים יוכלו ניגש למסכי האפליקציה הפנימיים, ולאפשר התחברות והתנתקות חלקות במובייל.

#### מה יש לממש
- הגדרת ספק Google OAuth ב-Supabase Auth עבור סביבת Development (הגדרת Client ID, Client Secret ו-Redirect URLs).
- מימוש Supabase SSR Helpers לניהול Session באמצעות Cookies מאובטחים ב-Next.js.
- **מסך התחברות (Screen 1.1):** ממשק RTL הכולל כותרת „ברוכים הבאים!”, הסבר קצר וכפתור „התחברות באמצעות Google” עם לוגו Google.
- **מסך שגיאה בהתחברות (Screen 1.7):** כותרת „לא הצלחנו להתחבר”, הסבר וכפתור ניסיון חוזר „התחברות באמצעות Google”.
- **מסך פרופיל (Screen 1.8):** הצגת אוואטר/תמונה, שם המשתמש „משתמש” וכפתור „התנתקות”.
- הגנת נתיבים (Middleware/Server Components): הפניית משתמש שאינו מחובר למסך ההתחברות, והפניית משתמש מחובר ישירות למסך היצירה.

#### תוצר מצופה
זרימת התחברות והתנתקות עובדת מקצה לקצה. משתמש יכול ללחוץ על „התחברות באמצעות Google”, לעבור את תהליך ה-OAuth, להגיע לאזור המוגן, ולבצע התנתקות.

#### Definition of Done
1. משתמש שאינו מחובר המנסה לפתור נתיב מוגן מועבר אוטומטית למסך ההתחברות.
2. לחיצה על „התחברות באמצעות Google” מפעילה את זרימת OAuth ומחזירה את המשתמש מחובר למערכת.
3. כשל בתהליך ההתחברות מציג את מסך השגיאה (Screen 1.7) עם אפשרות ניסיון חוזר.
4. לחיצה על „התנתקות” במסך הפרופיל מוחקת את ה-Session ומחזירה את המשתמש למסך ההתחברות.
5. הבדיקות נערכו ונבדקו מול סביבת Supabase Development בלבד.

---

### Milestone 3: Database Schema, Atomic Quota Management & Profile

#### שם ומטרה
- **שם:** מנגנון ניהול ואכיפת מכסה יומית אטומית ב-Database.
- **מטרה:** להבטיח אכיפה מדויקת ואטומית של מגבלת 10 היצירות ביום לפי שעון ישראל (`Asia/Jerusalem`), ומניעת עקיפת המכסה בבקשות מקבילות.

#### מה יש לממש
- יצירת קובץ Database Migration ב-`supabase/migrations/` הכולל:
  - טבלת `daily_usage` (`user_id`, `usage_date`, `count`, `updated_at`) עם אילוץ `UNIQUE (user_id, usage_date)`.
  - הגדרת Row Level Security (RLS) המונעת גישת כתיבה ישירה מהלקוח.
  - פונקציית PostgreSQL אטומית (`reserve_joke_generation`) המקבלת מזהה משתמש ותאריך מקומי בישראל, ומעדכנת/יוצרת את המונה רק אם `count < 10` בטרנזקציה אחת.
- הרצת ה-Migration על סביבת **Supabase Development בענן** באמצעות Supabase CLI.
- מימוש לוגיקת חישוב התאריך המקומי בישראל (`Asia/Jerusalem`) בצד השרת, תוך התחשבות במעבר בין שעון קיץ לשעון חורף.
- עדכון מסך הפרופיל (Screen 1.8) להצגת מצב המכסה היומית כפי שנשלפה ממסד הנתונים (למשל: „נשארו לך X יצירות היום” ו-„10/10”).

#### תוצר מצופה
בסיס נתונים מעודכן בסביבת Development עם מנגנון שריון מכסה אטומי עובד ונבדק, המציג נתוני מכסה עדכניים במסך הפרופיל.

#### Definition of Done
1. קובץ ה-Migration נשמר ב-Git והורץ בהצלחה מול סביבת Supabase Development בענן.
2. פונקציית `reserve_joke_generation` מחזירה תשובה חיובית עבור 10 הבקשות הראשונות ביום, ודוחה בערך שלילי את הבקשה ה-11.
3. בדיקת בקשות מקבילות (Simultaneous Requests) מוכיחה כי המודל האטומי מונע חריגה מ-10 יצירות.
4. איפוס המכסה פועל כראוי לפי בחן תאריך בחצות שעון ישראל (`Asia/Jerusalem`).
5. מסך הפרופיל מציג את המכסה המעודכנת של המשתמש.

---

### Milestone 4: AI Joke Generation Engine & Main User Flow

#### שם ומטרה
- **שם:** מנוע יצירת בדיחות ב-AI (GPT-5) וזרימת משתמש מרכזית מקצה לקצה.
- **מטרה:** לאפשר למשתמש מחובר להזין נושא (או להשאיר ריק), לקבל בדיחה בעברית מ-GPT-5, לראות מצבי טעינה, ולטפל במצבי שגיאה ומיצוי מכסה.

#### מה יש לממש
- **Next.js Route Handler (`POST /api/jokes`):**
  - אימות ה-Session של המשתמש.
  - נירמול ואימות הקלט (`topic`).
  - שריון מכסה אטומי מול ה-Database (באמצעות המנגנון מ-M3).
  - קריאה בצד השרת בלבד ל-OpenAI API עם מודל GPT-5 (`OPENAI_MODEL`), קבלת בדיחה קצרה בעברית.
- **מסך יצירת בדיחה (Screen 1.2 / 1.9):** שדה טקסט להזנת נושא עם Placeholder „למשל: חתולים, עבודה, ספורט...”, וכפתור „צור בדיחה”.
- **מסך טעינה (Screen 1.4):** חיווי מונפש עם הטקסט „מכינים לך בדיחה...”.
- **מסך הצגת בדיחה (Screen 1.3):** כרטיס תוכן המציג בדיחה אחת בלבד בעברית, וכפתור „בדיחה נוספת”.
- **מסך מכסה יומית שמוצתה (Screen 1.5):** אייקון לוח שנה, כותרת „הגעת למכסה היומית” וטקסט „אפשר לחזור מחר.”.
- **מסך שגיאה ביצירת בדיחה (Screen 1.6):** אייקון אזהרה, כותרת „אירעה שגיאה”, טקסט הסבר וכפתור „נסה שוב”.
- סרגל ניווט תחתון (Bottom Navigation) למעבר בין „יצירת בדיחה” ל„פרופיל”.

#### תוצר מצופה
אפליקציה עובדת מקצה לקצה שבה משתמש מחובר מזין נושא, רואה מסך טעינה, מקבל בדיחה בעברית מ-GPT-5, ויכול לבקש בדיחות נוספות עד למיצוי המכסה או לקבלת הודעת שגיאה מתאימה.

#### Definition of Done
1. הזנת נושא מחזירה בדיחה בעברית הקשורה לנושא; שדה ריק מחזיר בדיחה כללית בעברית.
2. ה-API Key של OpenAI מנוהל בשרת בלבד ואינו נחשף בשום שלב לדפדפן/לקוח.
3. בכל רגע מוצגת בדיחה אחת בלבד, ובדיחה חדשה מחליפה לחלוטין את הקודמת (אין שמירת היסטוריה).
4. בזמן יצירת הבדיחה מוצג מסך הטעינה (Screen 1.4).
5. מעבר של 10 יצירות מעביר את המשתמש למסך מיצוי המכסה (Screen 1.5) וחוסם קריאות נוספות ל-OpenAI.
6. כשל ברשת או ב-API מציג את מסך השגיאה (Screen 1.6) עם כפתור „נסה שוב”.

---

### Milestone 5: Edge Cases, PWA Finalization, E2E Testing & Production Deployment

#### שם ומטרה
- **שם:** טיפול במקרי קצה, השלמת PWA, בדיקות מקיפות ופריסה מלאה לסביבת Production.
- **מטרה:** להביא את המוצר לרמת מוכנות מלאה להשקה (Production Ready), לבצע בדיקות מקיפות, להריץ Migrations ב-Production ולפרוס ב-Vercel.

#### מה יש לממש
- **טיפול במקרי קצה:**
  - מניעת לחיצות כפולות (Debounce/Disable) על כפתור „צור בדיחה”.
  - טיפול בניתוק אינטרנט/אובדן תקשורת תוך כדי בקשה.
  - הגבלת אורך תווים בשדה הנושא וסניטציה של קלט.
- **השלמת PWA:** בדיקת התקנה על מכשירי iOS ו-Android אמיתיים, ווידוא תצוגת Standalone תקינה ללא סרגלי דפדפן.
- **בדיקות מקצה לקצה (E2E):** הרצת בדיקות אוטומטיות (Vitest / Playwright) המכסות התחברות, יצירה, אכיפת מכסה ושגיאות.
- **תהליך פריסה ל-Production (צעד-אחר-צעד):**
  1. קבלת אישור מפורש מהמשתמש לפריסת Production.
  2. הרצת קובצי ה-Database Migrations מול פרויקט **Supabase Production** בענן.
  3. הגדרת משתני הסביבה (Google OAuth, OpenAI Key, Supabase Prod Keys) ב-Vercel Production.
  4. הגדרת Google Cloud Console OAuth Authorized Domains & Redirect URIs עבור כתובת ה-Production.
  5. ביצוע Production Deployment מ-GitHub ל-Vercel.

#### תוצר מצופה
אפליקציה באוויר ב-Production, מותקנת כ-PWA, עובדת באופן מלא ומאובטח מול פרויקט Supabase Production ו-Vercel.

#### Definition of Done
1. כל בדיקות ה-Unit וה-E2E עוברות בהצלחה.
2. ה-Database Migrations הורצו בהצלחה בסביבת Supabase Production **לאחר קבלת אישור מפורש מהמשתמש**.
3. האפליקציה פרוסה ב-Vercel Production ומחוברת לסביבת ה-Production של Supabase בלבד.
4. בדיקת התקנת PWA עובדת בהצלחה במכשיר נייד.
5. בדיקת שרשרת מלאה ב-Production: התחברות Google, יצירת בדיחה, מיצוי מכסה והתנתקות פועלים ללא שגיאות.

---

## מפת תלויות בין אבני הדרך (Dependency Map)

```text
[M1: Project Setup & Base UI Shell]
       │
       ▼
[M2: Authentication & User Session Flow]
       │
       ▼
[M3: Database Schema & Atomic Quota (Dev DB)]
       │
       ▼
[M4: AI Joke Generation Engine & Main User Flow]
       │
       ▼
[M5: Polish, E2E Testing & Production Deployment (Prod DB)]