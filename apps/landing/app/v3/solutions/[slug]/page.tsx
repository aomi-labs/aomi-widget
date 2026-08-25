import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { solutionPages } from "../../../v2/solutions/solution-data";
import { solutions } from "../../site";
import { V3DefiPage } from "./defi-page";
import { V3FintechPage } from "./fintech-page";
import { V3NftPage } from "./nft-page";
import { V3TradingPage } from "./trading-page";
import { V3WalletsPage } from "./wallets-page";

export function generateStaticParams() {
  return solutions.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const solution = solutionPages[slug as keyof typeof solutionPages];
  if (slug === "trading") {
    return {
      title: "Trading | Aomi V3",
      description:
        "World Markets and Aomi bring account-aware trading to Telegram while keeping authority and portfolio-risk enforcement onchain.",
      robots: { index: false, follow: false },
    };
  }
  if (slug === "defi") {
    return {
      title: "DeFi | Aomi V3",
      description:
        "The universal DeFi executor. 40+ protocols on EVM and Solana, every action they expose, compiled into one simulated, signable transaction.",
      robots: { index: false, follow: false },
    };
  }
  if (slug === "wallets") {
    return {
      title: "Wallets | Aomi V3",
      description:
        "Keep your own agent. Aomi exposes the Agent and Pipeline APIs underneath: fork-simulated, policy-checked Actions for the signer your wallet already runs.",
      robots: { index: false, follow: false },
    };
  }
  return solution
    ? {
        title: `${solutions.find((item) => item.slug === slug)?.title ?? "Solution"} | Aomi V3`,
        description: solution.lede,
        robots: { index: false, follow: false },
      }
    : { title: "Solution not found" };
}

export default async function SolutionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const solution = solutionPages[slug as keyof typeof solutionPages];
  if (!solution) notFound();
  if (slug === "defi") return <V3DefiPage />;
  if (slug === "fintech") return <V3FintechPage solution={solution} />;
  if (slug === "trading") return <V3TradingPage />;
  if (slug === "nft") return <V3NftPage solution={solution} />;
  if (slug === "wallets") return <V3WalletsPage />;
  notFound();
}
