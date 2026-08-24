"use client";

import { AomiFrame } from "@aomi-labs/widget-lib";
import {
  widgetFixtureCatalog,
  type WidgetFixtureKey,
  type WidgetFixtureScenario,
} from "./fixture-data";
import styles from "./integration-showcases.module.css";

interface FixtureWidgetProps {
  scenario: WidgetFixtureScenario;
  fixture: WidgetFixtureKey;
  label: string;
}

const themeClass: Record<WidgetFixtureScenario, string> = {
  somm: styles.fixtureSomm,
  trading: styles.fixtureTrading,
  prediction: styles.fixturePrediction,
};

export function FixtureWidget({
  scenario,
  fixture,
  label,
}: FixtureWidgetProps) {
  const data = widgetFixtureCatalog[fixture];

  return (
    <div className={`${styles.fixtureMount} ${themeClass[scenario]}`}>
      <AomiFrame.Root
        key={fixture}
        backendUrl={`/api/widget-fixture/${fixture}`}
        applicationId={`widget-${scenario}-fixture`}
        accountSessionAvailable
        initialThreadId={`widget-fixture-${fixture}`}
        persistThread={false}
        showSidebar={false}
        walletPosition={null}
        width="100%"
        height="100%"
        className={styles.fixtureRoot}
      >
        <AomiFrame.Header
          showSidebarTrigger={false}
          className={styles.fixtureHeader}
        >
          <span className={styles.fixtureTitle}>{data.title}</span>
          <span className={styles.fixtureLabel}>
            <i aria-hidden />
            {label}
          </span>
        </AomiFrame.Header>
        <AomiFrame.Composer className={styles.fixtureComposer} />
        <span className={styles.fixtureNote}>
          Deterministic fixture · no live chat
        </span>
      </AomiFrame.Root>
    </div>
  );
}
