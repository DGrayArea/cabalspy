import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://cabalspy-pi.vercel.app";

  // Core static routes
  const routes = ["", "/auth", "/portfolio", "/profile", "/pulse"].map(
    (route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: route === "" ? 1 : 0.8,
    }),
  );

  // Note: For dynamic token pages (/[chain]/[tokenAddress]),
  // you would ideally fetch the top 100-500 trending tokens from your database/Mobula
  // and map them here. For now, the core platform pages are indexed.

  return [...routes];
}
