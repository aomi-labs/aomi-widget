"use client";

import {
  Check,
  ChevronDown,
  CircleDollarSign,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { LandingWalletKitProvider } from "../../../components/landing-wallet-kit-provider";
import { FixtureWidget } from "./fixture-widget";
import styles from "./integration-showcases.module.css";

const sommVenues = [
  {
    id: "aave",
    name: "Aave v3",
    asset: "USDC · Base",
    apy: "3.37%",
    meta: "band A · open",
    fixture: "somm-aave",
  },
  {
    id: "sky",
    name: "Sky Lending",
    asset: "USDS · Ethereum",
    apy: "6.12%",
    meta: "band A · tracked",
    fixture: "somm-sky",
  },
  {
    id: "compound",
    name: "Compound v3",
    asset: "USDC · Ethereum",
    apy: "3.30%",
    meta: "band A · tracked",
    fixture: "somm-compound",
  },
] as const;

const tradeMarkets = {
  eth: {
    symbol: "ETH",
    pair: "ETH / USDC",
    price: "$3,214.72",
    change: "+2.4%",
    dailyChange: "+$74.12 today",
    fixture: "trading-eth",
    path: "M0 176 C38 168 54 139 88 148 S142 177 177 137 S230 104 259 120 S313 94 344 102 S390 61 419 82 S473 64 505 38 S542 44 560 20",
    orderBook: [
      ["3,218.44", "5.82"],
      ["3,216.18", "2.40"],
      ["3,214.72", "8.16"],
      ["3,211.09", "4.07"],
    ],
  },
  btc: {
    symbol: "BTC",
    pair: "BTC / USDC",
    price: "$91,840",
    change: "+1.1%",
    dailyChange: "+$1,004 today",
    fixture: "trading-btc",
    path: "M0 164 C35 151 58 165 88 139 S143 126 177 144 S226 119 259 105 S310 116 344 86 S389 91 419 67 S470 78 505 44 S543 52 560 31",
    orderBook: [
      ["91,912", "0.42"],
      ["91,876", "0.81"],
      ["91,840", "1.16"],
      ["91,794", "0.67"],
    ],
  },
} as const;

const integrationPoints = [
  "Your application data becomes agent tools",
  "Your limits become enforced execution policy",
  "Your signer approves the exact simulated payload",
] as const;

export function IntegrationShowcases() {
  return (
    <section className={styles.section}>
      <div className={styles.shell}>
        <div className={styles.intro}>
          <div>
            <p className={styles.eyebrow}>ONE SURFACE, DIFFERENT PRODUCTS</p>
            <h2>Built into the product. Not bolted onto it.</h2>
          </div>
          <p className={styles.introBody}>
            Use Aomi as a complete assistant, a trading sidecar, or an inline
            transaction composer. The host experience changes. The execution
            boundary does not.
          </p>
        </div>

        <LandingWalletKitProvider>
          <article
            id="somm"
            className={`${styles.caseStudy} ${styles.sommCase}`}
          >
            <CaseCopy
              number="01"
              label="Shipped · agentic.somm.finance"
              live
              eyebrow="Managed assets"
              title="Make the mandate visible."
              body="Sommelier turns its existing strategy endpoints and risk mandate into an operator- and depositor-facing execution product. The agent proposes each move; the manager retains approval and custody."
              points={[
                "Strategy endpoints wrapped as agent tools",
                "Risk bands and venue limits enforced every turn",
                "One branded surface for operators and depositors",
              ]}
            />
            <SommDemo />
          </article>

          <article
            id="trading"
            className={`${styles.caseStudy} ${styles.tradingCase}`}
          >
            <TradingDemo />
            <CaseCopy
              number="02"
              label="Integration concept"
              eyebrow="Trading"
              title="An execution sidecar for every market."
              body="Dock the Widget beside the chart and order book. Users describe the outcome; the application supplies market data and venue access; Aomi returns a routed, simulated order for the existing wallet to sign."
              points={[
                "Venue and liquidity discovery inside the conversation",
                "Slippage, notional, and route policy checked before signing",
                "A compact side panel instead of a separate destination",
              ]}
            />
          </article>

          <article
            id="prediction-markets"
            className={`${styles.caseStudy} ${styles.predictionCase}`}
          >
            <CaseCopy
              number="03"
              label="Integration concept"
              eyebrow="Prediction markets"
              title="Turn research into a bounded position."
              body="Place an inline assistant directly on a market page. The Widget can explain the resolution criteria, read liquidity, enforce a price and loss cap, and stage the exact position without taking the user out of context."
              points={[
                "Market context and portfolio state already in scope",
                "Price, exposure, and maximum-loss limits made explicit",
                "The selected outcome drives a deterministic position preview",
              ]}
            />
            <PredictionDemo />
          </article>

          <div className={styles.invariantStrip}>
            <div>
              <p className={styles.eyebrow}>THE INVARIANT</p>
              <h3>Different interface. Same contract.</h3>
            </div>
            <div className={styles.invariantPoints}>
              {integrationPoints.map((point, index) => (
                <div key={point}>
                  <span>0{index + 1}</span>
                  <p>{point}</p>
                </div>
              ))}
            </div>
          </div>
        </LandingWalletKitProvider>
      </div>
    </section>
  );
}

interface CaseCopyProps {
  number: string;
  label: string;
  live?: boolean;
  eyebrow: string;
  title: string;
  body: string;
  points: readonly string[];
}

function CaseCopy({
  number,
  label,
  live = false,
  eyebrow,
  title,
  body,
  points,
}: CaseCopyProps) {
  return (
    <div className={styles.caseCopy}>
      <div className={styles.caseMeta}>
        <span>{number}</span>
        <span className={live ? styles.liveLabel : styles.conceptLabel}>
          {live ? <i aria-hidden /> : null}
          {label}
        </span>
      </div>
      <p className={styles.caseEyebrow}>{eyebrow}</p>
      <h3>{title}</h3>
      <p className={styles.caseBody}>{body}</p>
      <ul className={styles.casePoints}>
        {points.map((point) => (
          <li key={point}>
            <Check aria-hidden className="size-3.5" strokeWidth={2.2} />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SommDemo() {
  const [selectedVenue, setSelectedVenue] = useState<
    (typeof sommVenues)[number]
  >(sommVenues[0]);

  return (
    <figure
      className={styles.sommDemo}
      aria-label="Sommelier Widget integration"
    >
      <div className={styles.sommTopline}>
        <span>SHIPPED</span>
        <span>AGENTIC.SOMM.FINANCE</span>
      </div>
      <div className={styles.sommFrame}>
        <div className={styles.sommHeader}>
          <div className={styles.sommBrand}>
            <span className={styles.sommLogo} aria-hidden />
            <div>
              <strong>Sommelier</strong>
              <span>Idle USDC, working on Base · powered by aomi</span>
            </div>
          </div>
          <span className={styles.walletPill}>
            <i aria-hidden /> 0xa73…F5
          </span>
        </div>

        <div className={styles.venuePanel}>
          <div className={styles.venueHeader}>
            <span>VENUES · NET YIELD</span>
            <span>1 OPEN · 5 TRACKED</span>
          </div>
          <div className={styles.venueGrid}>
            {sommVenues.map((venue) => (
              <button
                type="button"
                key={venue.name}
                className={`${styles.venueCard} ${venue.id === selectedVenue.id ? styles.venueSelected : ""}`}
                onClick={() => setSelectedVenue(venue)}
                aria-pressed={venue.id === selectedVenue.id}
              >
                <div>
                  <i aria-hidden />
                  <strong>{venue.name}</strong>
                </div>
                <span>{venue.asset}</span>
                <p>{venue.apy}</p>
                <small>{venue.meta}</small>
              </button>
            ))}
          </div>
          <p className={styles.venueNote}>
            Example cycle · only eligible venues can reach approval
          </p>
        </div>

        <div className={styles.sommFloat}>
          <FixtureWidget
            scenario="somm"
            fixture={selectedVenue.fixture}
            label={`${selectedVenue.name} mandate`}
          />
        </div>
      </div>
      <figcaption>
        Full-surface embed · application tools + mandate + existing signer
      </figcaption>
    </figure>
  );
}

function TradingDemo() {
  const [selectedMarket, setSelectedMarket] =
    useState<keyof typeof tradeMarkets>("eth");
  const market = tradeMarkets[selectedMarket];

  return (
    <figure
      className={styles.tradingDemo}
      aria-label="Trading Widget integration concept"
    >
      <div className={styles.tradeHeader}>
        <div className={styles.tradeBrand}>
          <TrendingUp aria-hidden className="size-4" />
          <strong>VERTEX DESK</strong>
        </div>
        <div className={styles.tickers}>
          {Object.entries(tradeMarkets).map(([id, item]) => (
            <button
              type="button"
              key={id}
              className={id === selectedMarket ? styles.tickerSelected : ""}
              onClick={() => setSelectedMarket(id as keyof typeof tradeMarkets)}
              aria-pressed={id === selectedMarket}
            >
              {item.symbol} <b>{item.price}</b> <i>{item.change}</i>
            </button>
          ))}
        </div>
        <span className={styles.tradeWallet}>
          <Wallet className="size-3.5" /> 0x91…0B
        </span>
      </div>

      <div className={styles.tradeWorkspace}>
        <div className={styles.marketPanel}>
          <div className={styles.marketTitle}>
            <div>
              <strong>{market.pair}</strong>
              <span>aggregated spot</span>
            </div>
            <span>
              1H <ChevronDown className="size-3" />
            </span>
          </div>
          <div className={styles.chart}>
            <div className={styles.chartPrice}>
              <strong>{market.price}</strong>
              <span>{market.dailyChange}</span>
            </div>
            <svg viewBox="0 0 560 210" preserveAspectRatio="none" aria-hidden>
              <defs>
                <linearGradient id="tradeArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#35e6a4" stopOpacity=".25" />
                  <stop offset="1" stopColor="#35e6a4" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={`${market.path} L560 210 L0 210 Z`}
                fill="url(#tradeArea)"
              />
              <path
                d={market.path}
                fill="none"
                stroke="#35e6a4"
                strokeWidth="3"
              />
            </svg>
          </div>
          <div className={styles.orderBook}>
            <div>
              <span>PRICE</span>
              <span>SIZE {market.symbol}</span>
            </div>
            {market.orderBook.map(([price, size], index) => (
              <div key={price}>
                <span className={index < 2 ? styles.ask : styles.bid}>
                  {price}
                </span>
                <span>{size}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.tradeFloat}>
          <FixtureWidget
            scenario="trading"
            fixture={market.fixture}
            label={`${market.symbol} route preview`}
          />
        </div>
      </div>
      <figcaption>
        Sidecar embed · live venue data + route policy + connected wallet
      </figcaption>
    </figure>
  );
}

function PredictionDemo() {
  const [selectedOutcome, setSelectedOutcome] = useState<"yes" | "no">("yes");
  const isYes = selectedOutcome === "yes";

  return (
    <figure
      className={styles.predictionDemo}
      aria-label="Prediction-market Widget integration concept"
    >
      <div className={styles.predictionHeader}>
        <div className={styles.forecastBrand}>
          <CircleDollarSign aria-hidden className="size-5" />
          <strong>FORECAST</strong>
        </div>
        <div className={styles.predictionNav}>
          <span>Markets</span>
          <span>Portfolio</span>
          <span>Activity</span>
        </div>
        <span className={styles.forecastWallet}>$2,840 · 0x2A…19</span>
      </div>

      <div className={styles.predictionBody}>
        <div className={styles.marketContext}>
          <span className={styles.marketCategory}>CRYPTO · DEC 31</span>
          <h4>Will ETH close above $5,000 by year end?</h4>
          <div className={styles.probabilityRow}>
            <div>
              <strong className={isYes ? "" : styles.probabilityNo}>
                {isYes ? "58%" : "42%"}
              </strong>
              <span>{selectedOutcome} probability</span>
            </div>
            <svg viewBox="0 0 340 92" preserveAspectRatio="none" aria-hidden>
              <path
                d="M0 70 C31 67 52 79 77 58 S126 61 149 46 S190 52 214 34 S263 43 287 22 S322 28 340 12"
                fill="none"
                stroke={isYes ? "#2857f0" : "#d74367"}
                strokeWidth="3"
              />
            </svg>
          </div>
          <div className={styles.outcomeButtons}>
            <button
              type="button"
              className={isYes ? styles.outcomeSelected : ""}
              onClick={() => setSelectedOutcome("yes")}
              aria-pressed={isYes}
            >
              YES <b>58¢</b>
            </button>
            <button
              type="button"
              className={!isYes ? styles.outcomeSelected : ""}
              onClick={() => setSelectedOutcome("no")}
              aria-pressed={!isYes}
            >
              NO <b>44¢</b>
            </button>
          </div>
          <div className={styles.marketStats}>
            <span>
              <small>VOLUME</small>
              <b>$8.4M</b>
            </span>
            <span>
              <small>LIQUIDITY</small>
              <b>$740K</b>
            </span>
            <span>
              <small>RESOLVES</small>
              <b>Dec 31</b>
            </span>
          </div>
        </div>

        <div className={styles.inlineComposer}>
          <FixtureWidget
            scenario="prediction"
            fixture={`prediction-${selectedOutcome}`}
            label={`${selectedOutcome.toUpperCase()} position preview`}
          />
        </div>
      </div>
      <figcaption>
        Inline embed · market context + exposure policy + position preview
      </figcaption>
    </figure>
  );
}
