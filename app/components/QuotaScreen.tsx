import { CalendarCheckIcon } from "./icons";
import styles from "./screens.module.css";

// Daily quota reached, for the device (10) or the whole site (300) — same screen (DESIGN 1.5).
// No "use client": rendered by page.tsx on entry and by JokeApp after a 429.
export default function QuotaScreen() {
  return (
    <section className={`${styles.screen} ${styles.centered}`}>
      <CalendarCheckIcon className={styles.icon} />
      <h1 className={styles.title} tabIndex={-1} data-screen-title>
        הגעתם למכסה היומית
      </h1>
      <p className={styles.text}>אפשר לחזור מחר.</p>
    </section>
  );
}
