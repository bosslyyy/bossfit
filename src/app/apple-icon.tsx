import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "44px",
          background:
            "radial-gradient(circle at top right, rgba(255, 158, 77, 0.92), transparent 34%), linear-gradient(145deg, #0f7c59 0%, #11161d 78%)",
          color: "white",
          fontSize: 86,
          fontWeight: 800,
          letterSpacing: -6
        }}
      >
        B
      </div>
    ),
    size
  );
}
