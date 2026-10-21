# מדריך הקמה — One Joke

המדריך הזה מסביר צעד אחר צעד איך לפתוח את החשבונות שהאפליקציה צריכה ואיך למלא את קובץ ההגדרות `.env`.
את כל הערכים ממלאים **רק** בקובץ `.env` שבתיקיית הפרויקט. הקובץ הזה לא עולה ל-GitHub, ו-Claude לא קורא אותו.

---

## 1. Supabase — פרויקט הפיתוח

ב-Supabase נמצאים מסד הנתונים והזיהוי האנונימי של המכשירים (בלי התחברות של משתמשים). בשלב הזה צריך רק פרויקט אחד, לפיתוח ולבדיקות (Development). את הפרויקט של האתר החי (Production) ניצור רק ב-Milestone 5: פרויקט חינמי שאין בו פעילות נכנס להשהיה אחרי כשבוע, ואין טעם לפתוח אותו מוקדם.

1. נכנסים ל-[supabase.com](https://supabase.com) ופותחים חשבון. אפשר להתחבר עם GitHub.
2. לוחצים **New project** ויוצרים פרויקט:
   - **Name:** `one-joke-dev`
   - **Database Password:** לוחצים על יצירת סיסמה ושומרים אותה במנהל הסיסמאות שלכם.
   - **Region:** אזור קרוב לישראל, למשל **Central EU (Frankfurt)**.
3. ממלאים ב-`.env` את הפרטים של הפרויקט:
   - נכנסים לפרויקט `one-joke-dev` ← **Project Settings** ← **API** (או **Data API** / **API Keys**).
   - את **Project URL** (נראה כמו `https://abcdxyz.supabase.co`) מעתיקים ל-`NEXT_PUBLIC_SUPABASE_URL=`.
   - את המפתח הציבורי (**anon public** או **Publishable key**) מעתיקים ל-`NEXT_PUBLIC_SUPABASE_ANON_KEY=`.
   - **לא** מעתיקים את המפתח הסודי (**service_role** / **Secret key**). האפליקציה לא צריכה אותו.

> **שימו לב:** אם פרויקט הפיתוח נכנס להשהיה כי לא השתמשתם בו כשבוע, נכנסים אליו בלוח הבקרה ולוחצים **Restore**.

> **אם כבר פתחתם גם `one-joke-prod`:** זה בסדר. רק אל תכניסו את הפרטים שלו למחשב. אם הוא נכנס להשהיה, נשחזר אותו ב-Milestone 5.

### איך מוודאים שהמחשב מחובר ל-Development
בכתובת שהעתקתם (`https://<מזהה>.supabase.co`), החלק `<מזהה>` צריך להיות זהה למזהה שמופיע בכתובת הדפדפן כשאתם בתוך הפרויקט `one-joke-dev` בלוח הבקרה של Supabase (`supabase.com/dashboard/project/<מזהה>`).

---

## 1א. הפעלת זיהוי אנונימי (Development)

האתר מזהה כל מכשיר באופן אנונימי, בלי התחברות. כדי ש-Supabase יאפשר זאת, צריך להפעיל הגדרה אחת:

1. נכנסים ל-[supabase.com/dashboard](https://supabase.com/dashboard) ובוחרים את הפרויקט **`one-joke-dev`**.
2. בתפריט הצד: **Authentication** ← **Sign In / Providers** (בגרסאות מסוימות: **Providers** או **Settings**).
3. באזור **User Signups**, מפעילים את **Allow anonymous sign-ins** ולוחצים **Save changes**.
4. לא משנים את **Rate Limits** (Authentication ← Rate Limits). המגבלה על יצירת משתמשים אנונימיים לפי כתובת IP נשארת כמו שהיא.
5. איך בודקים שזה עובד: אחרי שנכנסים לאתר, ב-**Authentication** ← **Users** מופיע משתמש חדש עם התווית **Anonymous**.

> במהלך הבדיקות ייתכן שייווצרו כמה משתמשים אנונימיים בפרויקט הפיתוח (למשל מחלון גלישה בסתר). זה תקין.

---

## 2. OpenAI — מפתח ומודל GPT-5

1. נכנסים ל-[platform.openai.com](https://platform.openai.com) ומתחברים.
2. ב-**Settings** ← **Billing** מוסיפים אמצעי תשלום, ומגדירים **Usage limits** (תקרת תקציב חודשית והתראה). בדיחה קצרה עולה מעט מאוד, אבל תקרה מגנה מהפתעות.
3. ב-**API keys** לוחצים **Create new secret key**, נותנים לו שם (למשל `one-joke-dev`), ומעתיקים אותו ל-`OPENAI_API_KEY=`. המפתח מוצג רק פעם אחת.
4. בודקים בעמוד **Limits** (או **Models**) אילו מודלים של GPT-5 זמינים לחשבון שלכם, ורושמים את המזהה המדויק ב-`OPENAI_MODEL=`, למשל `gpt-5`. המזהה חייב להתחיל ב-`gpt-5`, ומשתמשים במודל הראשי ולא בגרסאות `mini` או `nano`.

---

## 3. בדיקה שהכול מוגדר

מריצים את האפליקציה (Claude יעשה זאת כשתבקשו „הרץ כדי שאבדוק”). כשהשרת עולה, הוא בודק את ההגדרות ומדפיס בטרמינל:
- `[startup] OpenAI model OK: ...` — המפתח תקין והמודל זמין.
- `[startup] Supabase reachable: <מזהה>.supabase.co` — יש חיבור לפרויקט. ודאו שהמזהה הוא של `one-joke-dev`.

אם משהו חסר או שגוי, השרת לא עולה ומדפיס הודעה שמסבירה מה חסר. ההודעה מציינת רק שמות של הגדרות, לא את הערכים.

---

## 4. Vercel — יחובר ב-Milestone 5

את Vercel נחבר ב-Milestone 5, יחד עם הפריסה לאתר החי. לשם כך הקוד צריך להיות ב-GitHub, ודחיפה תיעשה רק באישורכם. השלבים:
1. נכנסים ל-[vercel.com](https://vercel.com) עם חשבון GitHub.
2. **Add New** ← **Project** ← בוחרים את ה-repo `rotemtarter/One-joke` ← **Import**.
3. ב-**Settings** ← **Environment Variables** מגדירים כל משתנה מ-`.env.example` לפי סביבה:
   - **Production** ← הפרטים של `one-joke-prod` ומפתח OpenAI (רק ב-Milestone 5).
   - **Preview** / **Development** ← הפרטים של `one-joke-dev` בלבד.
4. תוכנית **Hobby** החינמית מיועדת לשימוש אישי בלבד. אם האתר ישמש לעסק, צריך תוכנית **Pro**.
