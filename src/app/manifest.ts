import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BossFit",
    short_name: "BossFit",
    description: "Fitness y hábitos diarios con una experiencia premium para móvil.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0f14",
    theme_color: "#0f7c59",
    lang: "es-CR",
    icons: [
      {
        src: "/icon",
        type: "image/png",
        sizes: "512x512",
        purpose: "any maskable"
      }
    ]
  };
}
