import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #0d0c0b 0%, #1c1917 50%, #1f1d1a 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient glow - top right */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(115,62,131,0.4) 0%, rgba(115,62,131,0) 70%)",
          }}
        />

        {/* Ambient glow - bottom left */}
        <div
          style={{
            position: "absolute",
            bottom: -150,
            left: -100,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(236,107,131,0.25) 0%, rgba(236,107,131,0) 70%)",
          }}
        />

        {/* Subtle grid pattern overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: "linear-gradient(rgba(157,119,168,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(157,119,168,0.03) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Logo with glow */}
        <div
          style={{
            display: "flex",
            position: "relative",
          }}
        >
          <svg
            width="100"
            height="100"
            viewBox="0 0 362 362"
            fill="none"
            style={{ marginBottom: 32 }}
          >
            <path
              d="M321.778 94.2349C321.778 64.4045 297.595 40.2222 267.765 40.2222C237.935 40.2222 213.752 64.4045 213.752 94.2349C213.752 124.065 237.935 148.248 267.765 148.248C297.595 148.248 321.778 124.065 321.778 94.2349ZM362 94.2349C362 146.279 319.81 188.47 267.765 188.47C215.721 188.47 173.53 146.279 173.53 94.2349C173.53 42.1904 215.721 0 267.765 0C319.81 0 362 42.1904 362 94.2349Z"
              fill="url(#logoGradient)"
            />
            <path
              d="M181 0C184.792 0 188.556 0.116399 192.289 0.346221C189.506 2.74481 186.833 5.26892 184.28 7.90977C170.997 20.759 160.669 36.6452 154.42 54.4509C95.7682 66.7078 51.7143 118.709 51.7143 181C51.7143 252.403 109.597 310.286 181 310.286C243.292 310.286 295.291 266.231 307.547 207.58C325.364 201.327 341.259 190.99 354.113 177.695C356.745 175.149 359.261 172.486 361.653 169.71C361.883 173.444 362 177.208 362 181C362 280.964 280.964 362 181 362C81.0365 362 0 280.964 0 181C0 81.0365 81.0365 0 181 0Z"
              fill="url(#logoGradient)"
            />
            <defs>
              <linearGradient id="logoGradient" x1="0" y1="0" x2="362" y2="362" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#e0d5e3" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            fontSize: 80,
            fontWeight: 700,
            color: "white",
            marginBottom: 20,
            letterSpacing: "-0.03em",
          }}
        >
          Aomi Labs
        </div>

        {/* Tagline with gradient */}
        <div
          style={{
            display: "flex",
            fontSize: 32,
            fontWeight: 500,
            background: "linear-gradient(90deg, #9D77A8 0%, #ec6b83 100%)",
            backgroundClip: "text",
            color: "transparent",
            marginBottom: 24,
          }}
        >
          AI Agents for Blockchain
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              display: "flex",
              padding: "10px 20px",
              borderRadius: 24,
              background: "rgba(115,62,131,0.2)",
              border: "1px solid rgba(157,119,168,0.3)",
              color: "#c9b8cf",
              fontSize: 18,
            }}
          >
            Simulation-First
          </div>
          <div
            style={{
              display: "flex",
              padding: "10px 20px",
              borderRadius: 24,
              background: "rgba(236,107,131,0.15)",
              border: "1px solid rgba(236,107,131,0.3)",
              color: "#e8a5b4",
              fontSize: 18,
            }}
          >
            Multi-Chain
          </div>
          <div
            style={{
              display: "flex",
              padding: "10px 20px",
              borderRadius: 24,
              background: "rgba(157,119,168,0.15)",
              border: "1px solid rgba(157,119,168,0.3)",
              color: "#c9b8cf",
              fontSize: 18,
            }}
          >
            Non-Custodial
          </div>
        </div>

        {/* URL */}
        <div
          style={{
            display: "flex",
            fontSize: 24,
            color: "#9D77A8",
            fontWeight: 500,
          }}
        >
          aomi.dev
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
