import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "120px",
          background:
            "radial-gradient(circle at top right, rgba(255, 158, 77, 0.92), transparent 34%), linear-gradient(145deg, #0f7c59 0%, #11161d 78%)",
          color: "white",
          fontSize: 220,
          fontWeight: 800,
          letterSpacing: -12
        }}
      >
        B
      </div>
    ),
    size
  );
}
