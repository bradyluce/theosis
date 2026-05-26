import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

// Centralised S3 client used by every /api/* route that reads normalized
// content out of object storage. Two configurations are supported:
//
//   1. AWS S3 (no endpoint override) — uses BIBLE_S3_REGION or AWS_REGION
//   2. Cloudflare R2 (BIBLE_S3_ENDPOINT set) — region is "auto", endpoint is
//      https://<account>.r2.cloudflarestorage.com, credentials are an R2
//      API token's access key id + secret. R2 speaks the S3 wire protocol so
//      the only thing that changes is endpoint and region.

export const STORAGE_REGION =
  process.env.BIBLE_S3_REGION ?? process.env.AWS_REGION ?? "us-east-1";

export const STORAGE_BUCKET = process.env.BIBLE_S3_BUCKET ?? "theosis-content";

const ENDPOINT = process.env.BIBLE_S3_ENDPOINT;

export const storageClient = new S3Client({
  region: STORAGE_REGION,
  ...(ENDPOINT
    ? {
        endpoint: ENDPOINT,
        // R2 accepts both virtual-host and path-style, but path-style is the
        // more conservative default when the bucket name contains characters
        // that aren't valid in a hostname.
        forcePathStyle: true,
      }
    : {}),
});
