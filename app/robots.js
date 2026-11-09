export default function robots() {
  const base = process.env.APP_URL || "http://localhost:3000";
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/n/", "/api/", "/dashboard"] }], sitemap: `${base}/sitemap.xml` };
}
