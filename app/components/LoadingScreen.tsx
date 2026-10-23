import styles from "./screens.module.css";

// Shown while the joke is generated (DESIGN 1.4).
export default function LoadingScreen() {
  return (
    <section className={`${styles.screen} ${styles.centered}`} aria-busy="true">
      <div className={styles.spinner} aria-hidden="true" />
      <h1 className={styles.title} tabIndex={-1} data-screen-title>
        מכינים לכם בדיחה...
      </h1>
      <p className={styles.text}>זה לא ייקח הרבה זמן</p>
    </section>
  );
}
