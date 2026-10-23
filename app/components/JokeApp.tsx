"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { JokeSuccess } from "@/lib/jokes/api-types";
import { DAILY_LIMIT } from "@/lib/quota-limits";
import ErrorScreen from "./ErrorScreen";
import JokeScreen from "./JokeScreen";
import LoadingScreen from "./LoadingScreen";
import QuotaScreen from "./QuotaScreen";
import TopicForm from "./TopicForm";
import styles from "../page.module.css";

// PRD 4.a.5: after 25 s without a joke, show the error screen.
const CLIENT_TIMEOUT_MS = 25_000;

type Screen = "create" | "loading" | "joke" | "error" | "quota";

// All screens live on "/" and swap in place (ADR-13). Only the current joke is kept, in memory.
export default function JokeApp({ initialRemaining }: { initialRemaining: number | null }) {
  const [screen, setScreen] = useState<Screen>("create");
  const [topic, setTopic] = useState("");
  const [joke, setJoke] = useState("");
  const [remaining, setRemaining] = useState(initialRemaining);
  const containerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  // Move focus to the new screen's title so screen readers announce the change.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    containerRef.current?.querySelector<HTMLElement>("[data-screen-title]")?.focus();
  }, [screen]);

  async function requestJoke(requestedTopic: string) {
    setTopic(requestedTopic);
    setJoke("");
    setScreen("loading");

    try {
      const response = await fetch("/api/jokes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: requestedTopic }),
        signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
      });
      if (response.status === 429) {
        setRemaining(0);
        setScreen("quota");
        return;
      }
      if (!response.ok) {
        setScreen("error");
        return;
      }
      const data = (await response.json()) as JokeSuccess;
      setJoke(data.joke);
      setRemaining(data.remainingToday);
      setScreen("joke");
    } catch {
      // Network failure or timeout. A failed attempt is not counted (the server releases it).
      setScreen("error");
    }
  }

  return (
    <div ref={containerRef} className={styles.main}>
      {screen === "create" && (
        <>
          <Image
            className={styles.illustration}
            src="/assets/illustrations/illustration-laugh.svg"
            alt=""
            width={200}
            height={140}
            priority
          />
          <h1 className={styles.title} tabIndex={-1} data-screen-title>
            מוכנים לבדיחה?
          </h1>
          <p className={styles.text}>כתבו נושא, או השאירו את השדה ריק לבדיחה כללית.</p>
          <TopicForm onSubmit={requestJoke} />
          {/* Hidden when the quota is unknown: never show an invented number. */}
          {remaining !== null && (
            <p className={styles.remaining}>
              נשארו {remaining} מתוך {DAILY_LIMIT} היום
            </p>
          )}
          <Link href="/privacy" className={styles.privacyLink}>
            פרטיות
          </Link>
        </>
      )}
      {screen === "loading" && <LoadingScreen />}
      {screen === "joke" && remaining !== null && (
        <JokeScreen
          joke={joke}
          remaining={remaining}
          onAnother={() => requestJoke(topic)}
          onNewTopic={() => setScreen("create")}
        />
      )}
      {screen === "error" && <ErrorScreen onRetry={() => requestJoke(topic)} />}
      {screen === "quota" && <QuotaScreen />}
    </div>
  );
}
