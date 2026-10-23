"use client";

import { useState } from "react";
import { MAX_TOPIC_LENGTH } from "@/lib/jokes/input";
import styles from "./TopicForm.module.css";

// An empty topic asks for a general joke (PRD 4.a.2).
export default function TopicForm({ onSubmit }: { onSubmit: (topic: string) => void }) {
  const [topic, setTopic] = useState("");

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(topic.trim());
      }}
    >
      <label htmlFor="topic" className="sr-only">
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
      <button type="submit" className="btn-primary">
        צרו בדיחה
      </button>
    </form>
  );
}
