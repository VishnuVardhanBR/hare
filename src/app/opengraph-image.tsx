import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background:
            "radial-gradient(circle at top left, #dbeafe 0%, #eff6ff 45%, #f8fafc 100%)",
          display: "flex",
          height: "100%",
          justifyContent: "space-between",
          padding: "72px",
          width: "100%"
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: "rgba(255, 255, 255, 0.7)",
            border: "1px solid rgba(255, 255, 255, 0.9)",
            borderRadius: "42px",
            boxShadow: "0 20px 60px -20px rgba(15, 23, 42, 0.25)",
            display: "flex",
            gap: "36px",
            padding: "36px 44px"
          }}
        >
          <svg fill="none" height="120" viewBox="0 0 64 64" width="120">
            <rect fill="#EFF6FF" height="64" rx="16" width="64" />
            <g
              stroke="#2563EB"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              transform="translate(8 8) scale(2)"
            >
              <path d="M13 16a3 3 0 0 1 2.24 5" />
              <path d="M18 12h.01" />
              <path d="M18 21h-8a4 4 0 0 1-4-4 7 7 0 0 1 7-7h.2L9.6 6.4a1 1 0 1 1 2.8-2.8L15.8 7h.2c3.3 0 6 2.7 6 6v1a2 2 0 0 1-2 2h-1a3 3 0 0 0-3 3" />
              <path d="M20 8.54V4a2 2 0 1 0-4 0v3" />
              <path d="M7.612 12.524a3 3 0 1 0-1.6 4.3" />
            </g>
          </svg>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div
              style={{
                color: "#0f172a",
                fontSize: 80,
                fontWeight: 800,
                letterSpacing: "-0.04em",
                lineHeight: 1
              }}
            >
              Hare
            </div>
            <div
              style={{
                color: "#334155",
                fontSize: 34,
                lineHeight: 1.3,
                maxWidth: "640px"
              }}
            >
              Give recruiter contacts, get recruiter contacts.
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
