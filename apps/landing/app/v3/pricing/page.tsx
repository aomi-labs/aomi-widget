import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeDollarSign,
  Building2,
  FlaskConical,
  Gauge,
} from "lucide-react";
import Link from "next/link";
import { V3 } from "../site";
import styles from "../v3.module.css";

export const metadata: Metadata = {
  title: "Pricing | Aomi V3",
  description:
    "Commercial paths for evaluating, integrating, and operating Aomi.",
  robots: { index: false, follow: false },
};

const paths = [
  {
    icon: FlaskConical,
    label: "Evaluate",
    title: "Sandbox",
    price: "Start with the workflow",
    body: "Validate the product boundary, tools, wallet path, and deterministic fixtures before committing to a production integration.",
    items: [
      "Agent Skills and documentation",
      "Local SDK development",
      "Deterministic integration fixtures",
      "Architecture review",
    ],
    cta: "Plan an evaluation",
  },
  {
    icon: Gauge,
    label: "Integrate",
    title: "Usage",
    price: "Aligned to execution",
    body: "Move from test traffic to a hosted application, API, or embedded surface with pricing shaped by the runtime and transaction workload.",
    items: [
      "Hosted application runtime",
      "Human Interface, API, MCP, and CLI surfaces",
      "Simulation and execution pipeline",
      "Operational evidence",
    ],
    cta: "Discuss the workload",
  },
  {
    icon: Building2,
    label: "Operate",
    title: "Enterprise",
    price: "Designed around the mandate",
    body: "Create a commercial and operational model for white-label products, custom policy, platform onboarding, and sustained transaction flow.",
    items: [
      "Partner platform onboarding",
      "Custom authorization policy",
      "Integration and launch support",
      "Commercial terms for executed flow",
    ],
    cta: "Design the engagement",
  },
] as const;

export default function PricingPage() {
  return (
    <main className={styles.editorialPage}>
      <header className={styles.editorialHero}>
        <p className={styles.eyebrow}>Pricing</p>
        <h1>
          Start with the execution boundary. Price the workload that follows.
        </h1>
        <p>
          Aomi spans developer tooling, hosted runtime, transaction
          infrastructure, and partner delivery. We scope the commercial path
          around the surface, execution volume, and operational guarantees the
          product requires.
        </p>
      </header>

      <section className={styles.pricingGrid}>
        {paths.map((path, index) => (
          <article
            key={path.title}
            className={index === 1 ? styles.pricingFeatured : ""}
          >
            <div className={styles.pricingTop}>
              <path.icon aria-hidden />
              <span>{path.label}</span>
            </div>
            <h2>{path.title}</h2>
            <strong>{path.price}</strong>
            <p>{path.body}</p>
            <ul>
              {path.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Link href={`${V3}/contact`}>
              {path.cta} <ArrowRight aria-hidden />
            </Link>
          </article>
        ))}
      </section>

      <section className={styles.pricingPrinciples}>
        <div>
          <BadgeDollarSign aria-hidden />
          <p className={styles.eyebrow}>Pricing principles</p>
          <h2>Pay for an operated execution system—not custody.</h2>
        </div>
        <div>
          <article>
            <span>01</span>
            <h3>Surface</h3>
            <p>
              Human Interface, hosted agent, API, MCP, and CLI place different
              demands on delivery and support.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>Runtime</h3>
            <p>
              Session volume, tool workloads, simulation, automation, and data
              retention shape infrastructure use.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Flow</h3>
            <p>
              Executed transaction volume can support commercial alignment with
              the value the product settles.
            </p>
          </article>
          <article>
            <span>04</span>
            <h3>Assurance</h3>
            <p>
              Platform onboarding, custom policy, operational commitments, and
              integration support define enterprise scope.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
