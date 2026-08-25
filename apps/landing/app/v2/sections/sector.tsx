import { sector } from "../copy";
import styles from "../v2.module.css";
import { Reveal } from "./reveal";

const marks = [
  { src: "/assets/logos/morpho-mark.svg", name: "Morpho" },
  { src: "/assets/logos/solana.png", name: "Solana" },
  { src: "/assets/logos/metamask.png", name: "MetaMask" },
];

export function SectorSection() {
  return (
    <section className={`${styles.section} ${styles.sectionMuted}`}>
      <Reveal className={styles.shell}>
        <p className={styles.eyebrow}>{sector.eyebrow}</p>
        <h2 className={`mt-4 max-w-[720px] ${styles.heading}`}>
          {sector.headline}
        </h2>
        <p className={`mt-4 ${styles.lede}`}>{sector.support}</p>

        <div className="mt-10 grid gap-3 lg:grid-cols-3">
          {sector.cards.map((card, index) => (
            <div key={card.label} className={`${styles.card} p-6`}>
              <div className="flex items-center justify-between">
                <p className={`${styles.kicker} text-[color:var(--v2-fg-subtle)]`}>
                  {card.label}
                </p>
                {marks[index] ? (
                  <img
                    src={marks[index].src}
                    alt=""
                    className="h-5 w-5 object-contain"
                  />
                ) : null}
              </div>
              <h3 className={`mt-4 ${styles.cardTitle} text-[color:var(--v2-heading)]`}>
                {card.title}
              </h3>
              <p className="mt-3 text-[15px] leading-[1.6]">{card.body}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
