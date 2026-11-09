export default function sitemap() {
  const base = process.env.APP_URL || "http://localhost:3000";
  return [{ url: base, changeFrequency: "monthly", priority: 1 }, { url: `${base}/register` }, { url: `${base}/login` }];
}
