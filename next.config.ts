import type { NextConfig } from "next";

const supabaseHostname = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
})();

const sftpPublicHostname = (() => {
  const url = process.env.SFTP_PUBLIC_BASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      ...(supabaseHostname
        ? [
            {
              protocol: "https",
              hostname: supabaseHostname,
            },
          ]
        : []),
      ...(sftpPublicHostname
        ? [
            {
              protocol: "https",
              hostname: sftpPublicHostname,
            },
          ]
        : []),
    ],
    dangerouslyAllowSVG: true,
  },
};

export default nextConfig;
