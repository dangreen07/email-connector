import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      new URL("https://img.clerk.com/**"),
      new URL("https://img.icons8.com/**"),
    ],
  },
};

import withMDX from "@next/mdx";

export default withMDX({
  extension: /\.mdx?$/,
})({
  ...nextConfig,
  pageExtensions: ["ts", "tsx", "md", "mdx"],
});
