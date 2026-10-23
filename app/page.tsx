import Image from "next/image";
import Link from "next/link";
import { DAILY_LIMIT, getQuotaStatus } from "@/lib/quota";
import TopicForm from "./components/TopicForm";
import styles from "./page.module.css";

// Create-joke screen (DESIGN 1.9) — the screen the site opens on.
export default async function Home() {
  const quota = await getQuotaStatus();

  return (
    <main className={styles.main}>
      <Image
        className={styles.illustration}
        src="/assets/illustrations/illustration-laugh.svg"
        alt=""
        width={200}
        height={140}
        priority
      />
      <h1 className={styles.title}>מוכנים לבדיחה?</h1>
      <p className={styles.text}>כתבו נושא, או השאירו את השדה ריק לבדיחה כללית.</p>
      <TopicForm />
      {/* Hidden when the quota cannot be read: never show an invented number. */}
      {quota && (
        <p className={styles.remaining}>
          נשארו {quota.remainingToday} מתוך {DAILY_LIMIT} היום
        </p>
      )}
      <Link href="/privacy" className={styles.privacyLink}>
        פרטיות
      </Link>
    </main>
  );
}
