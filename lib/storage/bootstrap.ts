import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3'
import type { S3Storage } from './s3-storage'

let bootstrapped = false

// Anonymous read on every object — public menu pages serve <img src> directly
// without signing. Writes always go through presigned PUT so they remain auth'd.
function publicReadPolicy(bucket: string): string {
  return JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucket}/*`],
      },
    ],
  })
}

// Idempotent. Safe to call from multiple actions concurrently — only the first
// caller pays the network cost; the rest see `bootstrapped === true` and skip.
export async function ensureBucket(storage: S3Storage, bucket: string): Promise<void> {
  if (bootstrapped) return
  const client = storage.rawClient()

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }))
  } catch (err) {
    if (!isNotFound(err)) throw err
    await client.send(new CreateBucketCommand({ Bucket: bucket }))
  }

  // Re-applying the policy is cheap and self-heals if it was wiped manually.
  await client.send(
    new PutBucketPolicyCommand({
      Bucket: bucket,
      Policy: publicReadPolicy(bucket),
    }),
  )

  bootstrapped = true
}

function isNotFound(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const name = 'name' in err ? err.name : undefined
  const status =
    '$metadata' in err && err.$metadata && typeof err.$metadata === 'object'
      ? (err.$metadata as { httpStatusCode?: number }).httpStatusCode
      : undefined
  return name === 'NotFound' || name === 'NoSuchBucket' || status === 404
}
