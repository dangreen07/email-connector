import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

import withMDX from "@next/mdx";

export default withMDX({
  extension: /\.mdx?$/,
})({
  ...nextConfig,
  pageExtensions: ["ts", "tsx", "md", "mdx"]
});