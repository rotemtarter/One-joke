import { getQuotaStatus } from "@/lib/quota";
import JokeApp from "./components/JokeApp";
import QuotaScreen from "./components/QuotaScreen";
import styles from "./page.module.css";

// The site opens on the create-joke screen (DESIGN 1.9), or straight on the quota
// screen when the device's quota or the site cap is used up for today (DESIGN 1.5).
export default async function Home() {
  const quota = await getQuotaStatus();
  const quotaReached = quota !== null && (quota.remainingToday === 0 || quota.siteLimitReached);

  return (
    <main className={styles.page}>
      {quotaReached ? (
        <div className={styles.main}>
          <QuotaScreen />
        </div>
      ) : (
        <JokeApp initialRemaining={quota?.remainingToday ?? null} />
      )}
    </main>
  );
}
