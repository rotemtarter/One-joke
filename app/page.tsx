import Image from "next/image";
import styles from "./page.module.css";

// Temporary home screen for Milestone 1; replaced by the login screen in Milestone 2.
export default function Home() {
  return (
    <main className={styles.main}>
      <Image
        className={styles.logo}
        src="/assets/logo.png"
        alt="JOKE"
        width={158}
        height={68}
        priority
      />
      <h2>ברוכים הבאים!</h2>
      <p className={styles.text}>
        One Joke בהקמה. יצירת הבדיחות תתווסף בשלבים הבאים.
      </p>
      <Image
        className={styles.illustration}
        src="/assets/illustrations/illustration-laugh.svg"
        alt=""
        width={200}
        height={140}
      />
    </main>
  );
}
