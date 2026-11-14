import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "UMass Radar",
    short_name: "Radar",
    description: "Everything UMass needs from you, in one place.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f6f4",
    theme_color: "#881C1C",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
