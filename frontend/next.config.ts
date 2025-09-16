import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      new URL("https://img.clerk.com/**"),
      new URL("https://img.icons8.com/**"),
    ],
  },
  async rewrites() {
    return [
      {
        source: "/relay-xDIs/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/relay-xDIs/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  skipTrailingSlashRedirect: true,
};

import withMDX from "@next/mdx";

export default withMDX({
  extension: /\.mdx?$/,
})({
  ...nextConfig,
  pageExtensions: ["ts", "tsx", "md", "mdx"],
});
