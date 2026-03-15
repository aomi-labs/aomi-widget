import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  // Load fonts - must be .ttf format
  const [ptSerifBold, interMedium] = await Promise.all([
    fetch(
      "https://fonts.gstatic.com/s/ptserif/v19/EJRSQgYoZZY2vCFuvAnt65qV.ttf"
    ).then((res) => res.arrayBuffer()),
    fetch(
      "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fMZg.ttf"
    ).then((res) => res.arrayBuffer()),
  ]);

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
          background: "linear-gradient(135deg, #ffffff 0%, #fdf5f7 20%, #f5eef8 50%, #fef7f8 80%, #ffffff 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Gradient blobs - coral prioritized, stronger blend */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -50,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(236,108,131,0.7) 0%, rgba(236,108,131,0) 65%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -50,
            left: -100,
            width: 550,
            height: 550,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(252,240,255,0.9) 0%, rgba(252,240,255,0) 65%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -150,
            right: 100,
            width: 550,
            height: 550,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(131,167,222,0.6) 0%, rgba(131,167,222,0) 65%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -100,
            left: -50,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(236,108,131,0.55) 0%, rgba(236,108,131,0) 65%)",
          }}
        />

        {/* Logo */}
        <svg
          width="100"
          height="100"
          viewBox="0 0 362 362"
          fill="none"
          style={{ marginBottom: 28 }}
        >
          <path
            d="M321.778 94.2349C321.778 64.4045 297.595 40.2222 267.765 40.2222C237.935 40.2222 213.752 64.4045 213.752 94.2349C213.752 124.065 237.935 148.248 267.765 148.248C297.595 148.248 321.778 124.065 321.778 94.2349ZM362 94.2349C362 146.279 319.81 188.47 267.765 188.47C215.721 188.47 173.53 146.279 173.53 94.2349C173.53 42.1904 215.721 0 267.765 0C319.81 0 362 42.1904 362 94.2349Z"
            fill="#1c1917"
          />
          <path
            d="M181 0C184.792 0 188.556 0.116399 192.289 0.346221C189.506 2.74481 186.833 5.26892 184.28 7.90977C170.997 20.759 160.669 36.6452 154.42 54.4509C95.7682 66.7078 51.7143 118.709 51.7143 181C51.7143 252.403 109.597 310.286 181 310.286C243.292 310.286 295.291 266.231 307.547 207.58C325.364 201.327 341.259 190.99 354.113 177.695C356.745 175.149 359.261 172.486 361.653 169.71C361.883 173.444 362 177.208 362 181C362 280.964 280.964 362 181 362C81.0365 362 0 280.964 0 181C0 81.0365 81.0365 0 181 0Z"
            fill="#1c1917"
          />
        </svg>

        {/* Title - PT Serif */}
        <div
          style={{
            display: "flex",
            fontSize: 76,
            fontFamily: "PT Serif",
            fontWeight: 700,
            color: "#1c1917",
            marginBottom: 24,
            letterSpacing: "-0.02em",
          }}
        >
          Aomi Labs
        </div>

        {/* Tagline - Inter (similar to Geist) */}
        <div
          style={{
            display: "flex",
            fontSize: 26,
            fontFamily: "Inter",
            fontWeight: 500,
            color: "#1c1917",
            marginBottom: 36,
          }}
        >
          AI-powered blockchain automation
        </div>

        {/* Feature pills - 5 glassmorphic pills */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 28,
            flexWrap: "wrap",
            justifyContent: "center",
            maxWidth: 1000,
          }}
        >
          <div
            style={{
              display: "flex",
              padding: "10px 20px",
              borderRadius: 24,
              background: "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.4) 100%)",
              border: "1px solid rgba(255,255,255,0.8)",
              boxShadow: "0 4px 16px rgba(115,62,131,0.1)",
              color: "#6b7280",
              fontSize: 15,
              fontFamily: "Inter",
              fontWeight: 400,
            }}
          >
            Chain-Native Harness
          </div>
          <div
            style={{
              display: "flex",
              padding: "10px 20px",
              borderRadius: 24,
              background: "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.4) 100%)",
              border: "1px solid rgba(255,255,255,0.8)",
              boxShadow: "0 4px 16px rgba(115,62,131,0.1)",
              color: "#6b7280",
              fontSize: 15,
              fontFamily: "Inter",
              fontWeight: 400,
            }}
          >
            Simulations
          </div>
          <div
            style={{
              display: "flex",
              padding: "10px 20px",
              borderRadius: 24,
              background: "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.4) 100%)",
              border: "1px solid rgba(255,255,255,0.8)",
              boxShadow: "0 4px 16px rgba(115,62,131,0.1)",
              color: "#6b7280",
              fontSize: 15,
              fontFamily: "Inter",
              fontWeight: 400,
            }}
          >
            Non-Custodial
          </div>
          <div
            style={{
              display: "flex",
              padding: "10px 20px",
              borderRadius: 24,
              background: "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.4) 100%)",
              border: "1px solid rgba(255,255,255,0.8)",
              boxShadow: "0 4px 16px rgba(115,62,131,0.1)",
              color: "#6b7280",
              fontSize: 15,
              fontFamily: "Inter",
              fontWeight: 400,
            }}
          >
            Multi-Chain
          </div>
          <div
            style={{
              display: "flex",
              padding: "10px 20px",
              borderRadius: 24,
              background: "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.4) 100%)",
              border: "1px solid rgba(255,255,255,0.8)",
              boxShadow: "0 4px 16px rgba(115,62,131,0.1)",
              color: "#6b7280",
              fontSize: 15,
              fontFamily: "Inter",
              fontWeight: 400,
            }}
          >
            Skills for Agents
          </div>
        </div>

        {/* URL */}
        <div
          style={{
            display: "flex",
            fontSize: 22,
            fontFamily: "Inter",
            color: "#1c1917",
            fontWeight: 400,
          }}
        >
          aomi.dev
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "PT Serif",
          data: ptSerifBold,
          style: "normal",
          weight: 700,
        },
        {
          name: "Inter",
          data: interMedium,
          style: "normal",
          weight: 500,
        },
      ],
    }
  );
}
