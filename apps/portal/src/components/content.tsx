import { BlogEntry } from "@/lib/utils";

export const blogs: BlogEntry[] = [
    {
        slug: "stateless-execution-agentic-software",
        eyebrow: "Opinions",
        title: "Stateless Execution and Agentic Software",
        description: "Review crypto's failure modes in the context of agents, and how shifting focus to stateless execution puts us on a better track in the technology growth cycle.",
        body: "Stateless execution reframes how agentic software can remain deterministic while still benefiting from probabilistic language models. We explore the trade-offs across client engineering, transaction safety, and context compilation—highlighting why the stateless model offers better upgradability and sharper risk envelopes for autonomous systems.",
        imageSrc: "/assets/images/3.jpg",
        imageAlt: "Abstract rendering of blockchain nodes connected by light trails",
        publishedAt: "2024-08-11",
        cta: {
            label: "Read manifesto",
            href: "https://aomi-blogs.notion.site/stateless-execution-and-agentic-software"
        }
    },
    {
        slug: "from-brittle-chatbots-to-llm-infrastructure",
        eyebrow: "Build Notes",
        title: "From Brittle Chatbots to LLM Infrastructure",
        description: "How we evolve from MCP-based design to native execution support in blockchain light clients, optimized with context compilation and type safety in LLM processing.",
        body: "LLM infrastructure demands stronger guarantees than MCP can provide. In this post we break down our compiler-inspired approach to intent capture, the routing mesh that sits between wallet agents and chain simulators, and the instrumentation that keeps the whole pipeline observable.",
        imageSrc: "/assets/images/4.jpg",
        imageAlt: "Minimal chart illustration",
        publishedAt: "2024-09-04",
        cta: {
            label: "Read build notes",
            href: "https://aomi-blogs.notion.site/from-brittle-chatbots-to-llm-infrastructure"
        }
    }
];
