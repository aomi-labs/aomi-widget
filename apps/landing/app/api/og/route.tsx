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
          background: "linear-gradient(135deg, #1c1917 0%, #2d2a28 100%)",
          position: "relative",
        }}
      >
        {/* Purple/pink gradient overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "linear-gradient(45deg, rgba(157,119,168,0.2) 0%, rgba(236,107,131,0.15) 100%)",
          }}
        />

        {/* Logo */}
        <svg
          width="80"
          height="80"
          viewBox="0 0 362 362"
          fill="none"
          style={{ marginBottom: 24 }}
        >
          <path
            d="M321.778 94.2349C321.778 64.4045 297.595 40.2222 267.765 40.2222C237.935 40.2222 213.752 64.4045 213.752 94.2349C213.752 124.065 237.935 148.248 267.765 148.248C297.595 148.248 321.778 124.065 321.778 94.2349ZM362 94.2349C362 146.279 319.81 188.47 267.765 188.47C215.721 188.47 173.53 146.279 173.53 94.2349C173.53 42.1904 215.721 0 267.765 0C319.81 0 362 42.1904 362 94.2349Z"
            fill="white"
          />
          <path
            d="M181 0C184.792 0 188.556 0.116399 192.289 0.346221C189.506 2.74481 186.833 5.26892 184.28 7.90977C170.997 20.759 160.669 36.6452 154.42 54.4509C95.7682 66.7078 51.7143 118.709 51.7143 181C51.7143 252.403 109.597 310.286 181 310.286C243.292 310.286 295.291 266.231 307.547 207.58C325.364 201.327 341.259 190.99 354.113 177.695C356.745 175.149 359.261 172.486 361.653 169.71C361.883 173.444 362 177.208 362 181C362 280.964 280.964 362 181 362C81.0365 362 0 280.964 0 181C0 81.0365 81.0365 0 181 0Z"
            fill="white"
          />
        </svg>

        {/* Title */}
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 700,
            color: "white",
            marginBottom: 16,
            letterSpacing: "-0.02em",
          }}
        >
          Aomi Labs
        </div>

        {/* Tagline */}
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "#e5e5e5",
            marginBottom: 12,
          }}
        >
          AI-powered blockchain automation
        </div>

        {/* URL */}
        <div
          style={{
            display: "flex",
            fontSize: 22,
            color: "#9D77A8",
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
