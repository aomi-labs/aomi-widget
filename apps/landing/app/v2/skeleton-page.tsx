import Link from "next/link";
import type { ReactNode } from "react";
import type { NavItem } from "./site";
import { V2 } from "./site";
import styles from "./v2.module.css";

export function SkeletonPage({
  eyebrow,
  item,
  children,
}: {
  eyebrow: string;
  item: NavItem;
  children?: ReactNode;
}) {
  return (
    <main className={`${styles.section} min-h-[70vh]`}>
      <div className={styles.shell}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={`${styles.display} mt-4 max-w-[18ch]`}>{item.title}</h1>
        <p className={`${styles.lede} mt-5`}>{item.job}</p>
        {item.placeholder ? (
          <p className={`${styles.bodySm} mt-6 text-[color:var(--v2-fg-subtle)]`}>
            Placeholder — copy comes later.
          </p>
        ) : null}
        <p className={`${styles.lede} mt-8 max-w-[40rem] text-[15px]`}>
          {item.body}
        </p>
        {children}
        <p className={`${styles.bodySm} mt-12 text-[color:var(--v2-fg-subtle)]`}>
          Skeleton page.{" "}
          <Link href={V2} className="underline underline-offset-4">
            Back to /v2
          </Link>
        </p>
      </div>
    </main>
  );
}
