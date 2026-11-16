import type { NextConfig } from "next";

const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const posthogApiHost = posthogHost ? new URL(posthogHost).host : undefined;
const posthogAssetHost = posthogApiHost?.replace(
  ".i.posthog.com",
  "-assets.i.posthog.com",
);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      new URL("https://img.clerk.com/**"),
      new URL("https://img.icons8.com/**"),
    ],
  },
  async rewrites() {
    if (!posthogApiHost || !posthogAssetHost) {
      return [];
    }

    return [
      {
        source: "/relay-xDIs/static/:path*",
        destination: `https://${posthogAssetHost}/static/:path*`,
      },
      {
        source: "/relay-xDIs/array/:path*",
        destination: `https://${posthogAssetHost}/array/:path*`,
      },
      {
        source: "/relay-xDIs/:path*",
        destination: `https://${posthogApiHost}/:path*`,
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
