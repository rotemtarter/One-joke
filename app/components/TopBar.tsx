import Image from "next/image";
import Link from "next/link";
import styles from "./TopBar.module.css";

// Logo only: no menu, profile or bottom navigation (DESIGN, shared structure).
export default function TopBar() {
  return (
    <header className={styles.bar}>
      <Link href="/" className={styles.logoLink}>
        <Image
          className={styles.logo}
          src="/assets/logo.png"
          alt="JOKE"
          width={158}
          height={68}
          priority
        />
      </Link>
    </header>
  );
}
