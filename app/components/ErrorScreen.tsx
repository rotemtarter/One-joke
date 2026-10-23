import { WarningIcon } from "./icons";
import styles from "./screens.module.css";

// Generation failed, timed out or the network is down (DESIGN 1.6). No fallback joke.
export default function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <section className={`${styles.screen} ${styles.centered}`}>
      <WarningIcon className={styles.icon} />
      <h1 className={styles.title} tabIndex={-1} data-screen-title>
        אירעה שגיאה
      </h1>
      <p className={styles.text}>נראה שמשהו השתבש. אנא נסו שוב מאוחר יותר.</p>
      <div className={styles.actions}>
        <button type="button" className="btn-dark" onClick={onRetry}>
          נסו שוב
        </button>
      </div>
    </section>
  );
}
