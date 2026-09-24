import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Silences Turbopack's "ignored package-lock.json outside the current
  // Git repository" warning — C:\Users\bogdan has its own package-lock.json
  // from something unrelated, which Turbopack was picking up as a possible
  // second workspace root purely by directory-walk heuristics. Pinning the
  // root here removes the ambiguity; it does not change any build behavior.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
