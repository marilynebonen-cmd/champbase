declare module "next-pwa" {
  import { NextConfig } from "next";

  interface PWAConfig {
    dest?: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
    scope?: string;
    sw?: string;
    runtimeCaching?: Array<{
      urlPattern: RegExp | ((context: { url: URL; request: Request }) => boolean);
      handler: "CacheFirst" | "CacheOnly" | "NetworkFirst" | "NetworkOnly" | "StaleWhileRevalidate";
      options?: {
        cacheName?: string;
        expiration?: {
          maxEntries?: number;
          maxAgeSeconds?: number;
          purgeOnQuotaError?: boolean;
        };
        cacheableResponse?: {
          statuses?: number[];
          headers?: Record<string, string>;
        };
        backgroundSync?: {
          name: string;
          options?: {
            maxRetentionTime?: number;
          };
        };
        broadcastUpdate?: {
          channelName?: string;
          options?: {
            headersToCheck?: string[];
          };
        };
        matchOptions?: {
          ignoreSearch?: boolean;
          ignoreMethod?: boolean;
          ignoreVary?: boolean;
        };
        networkTimeoutSeconds?: number;
        plugins?: unknown[];
        fetchOptions?: RequestInit;
      };
    }>;
    publicExcludes?: string[];
    buildExcludes?: (string | RegExp)[];
    fallbacks?: Record<string, string>;
  }

  function withPWA(pwaConfig: PWAConfig): (nextConfig: NextConfig) => NextConfig;
  
  export default withPWA;
}
