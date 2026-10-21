import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "פרטיות | One Joke",
};

// Privacy page (DESIGN 1.10, PRD 4.a.8). Wording pending owner approval before launch.
export default function PrivacyPage() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>פרטיות</h1>
      <p>
        ב-One Joke אין הרשמה ואין התחברות. אנחנו לא מבקשים ולא אוספים מידע אישי — לא שם,
        לא כתובת אימייל ולא מספר טלפון.
      </p>
      <p>
        כדי לספור כמה בדיחות נוצרו היום, האתר שומר בדפדפן שלכם מזהה אנונימי (cookie).
        המזהה לא קשור לשום פרט מזהה עליכם.
      </p>
      <p>
        אצלנו נשמרים רק המזהה האנונימי ומספר הבדיחות שנוצרו בכל יום, לצורך המכסה היומית.
      </p>
      <p>
        הנושא שאתם כותבים נשלח לשירות OpenAI רק כדי ליצור את הבדיחה. הנושאים והבדיחות לא
        נשמרים אצלנו.
      </p>
      <p>אם תמחקו את נתוני הגלישה בדפדפן, גם המזהה האנונימי יימחק.</p>
      <Link href="/" className={styles.backLink}>
        חזרה ליצירת בדיחה
      </Link>
    </main>
  );
}
