"use client";

import { useState } from "react";
import styles from "./TopicForm.module.css";

// Same measure the server will use for topic length (string length, PRD 4.a.2).
const MAX_TOPIC_LENGTH = 100;

export default function TopicForm() {
  const [topic, setTopic] = useState("");

  return (
    // Generation is wired up in Milestone 4; until then Enter must not reload the page.
    <form className={styles.form} onSubmit={(event) => event.preventDefault()}>
      <label htmlFor="topic" className={styles.srOnly}>
        נושא לבדיחה
      </label>
      <input
        id="topic"
        name="topic"
        type="text"
        className="input"
        placeholder="למשל: חתולים, עבודה, ספורט..."
        maxLength={MAX_TOPIC_LENGTH}
        autoComplete="off"
        value={topic}
        onChange={(event) => setTopic(event.target.value)}
      />
      <p className={styles.counter} aria-live="polite">
        {topic.length}/{MAX_TOPIC_LENGTH}
      </p>
      <button type="button" className="btn-primary">
        צרו בדיחה
      </button>
    </form>
  );
}
