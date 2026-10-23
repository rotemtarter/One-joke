import { DAILY_LIMIT } from "@/lib/quota-limits";
import styles from "./screens.module.css";

type Props = {
  joke: string;
  remaining: number;
  onAnother: () => void;
  onNewTopic: () => void;
};

// One joke at a time (DESIGN 1.3). After the day's last joke, a message replaces the buttons.
export default function JokeScreen({ joke, remaining, onAnother, onNewTopic }: Props) {
  return (
    <section className={styles.screen}>
      <h1 className="sr-only" tabIndex={-1} data-screen-title>
        הבדיחה שלכם
      </h1>
      <p className={`card ${styles.jokeCard}`}>{joke}</p>
      {remaining > 0 ? (
        <div className={styles.actions}>
          <button type="button" className="btn-primary" onClick={onAnother}>
            בדיחה נוספת
          </button>
          <button type="button" className="btn-secondary" onClick={onNewTopic}>
            נושא אחר
          </button>
        </div>
      ) : (
        <p className={styles.alert} role="status">
          זו הבדיחה האחרונה להיום. אפשר לחזור מחר.
        </p>
      )}
      <p className={styles.remaining}>
        נשארו {remaining} מתוך {DAILY_LIMIT} היום
      </p>
    </section>
  );
}
