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
        protocol: "https" as const,
        hostname: "placehold.co",
      },
      {
        protocol: "https" as const,
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https" as const,
        hostname: "img.youtube.com",
      },
      ...(supabaseHostname
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHostname,
            },
          ]
        : []),
      ...(sftpPublicHostname
        ? [
            {
              protocol: "https" as const,
              hostname: sftpPublicHostname,
            },
          ]
        : []),
    ],
    dangerouslyAllowSVG: true,
  },
};

export default nextConfig;
