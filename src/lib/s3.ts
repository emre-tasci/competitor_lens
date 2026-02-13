import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3 = new S3Client({
  region: process.env.AWS_REGION || "eu-west-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export function getScreenshotUrl(s3Key: string): string {
  const domain = process.env.AWS_CLOUDFRONT_DOMAIN;
  if (domain) {
    return `${domain}/${s3Key}`;
  }
  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
}

export async function getPresignedScreenshotUrl(s3Key: string): Promise<string> {
  const domain = process.env.AWS_CLOUDFRONT_DOMAIN;
  if (domain) {
    return `${domain}/${s3Key}`;
  }
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: s3Key,
  });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}

export async function listS3Objects(prefix: string = "screenshots/") {
  const objects: { key: string; size: number; lastModified: Date }[] = [];
  let continuationToken: string | undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_S3_BUCKET,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });

    const response = await s3.send(command);

    for (const object of response.Contents || []) {
      if (object.Key && object.Key.match(/\.(png|jpg|jpeg|webp)$/i)) {
        objects.push({
          key: object.Key,
          size: object.Size || 0,
          lastModified: object.LastModified || new Date(),
        });
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return objects;
}

export async function getScreenshotBase64(s3Key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: s3Key,
  });
  const response = await s3.send(command);
  const bytes = await response.Body?.transformToByteArray();
  if (!bytes) throw new Error("Empty response from S3");
  return Buffer.from(bytes).toString("base64");
}

export function parseS3Key(key: string): { exchangeFolder: string; fileName: string } | null {
  const parts = key.split("/");
  // Expected: screenshots/{ExchangeName}/{filename}.png
  if (parts.length < 3) return null;
  return {
    exchangeFolder: parts[1],
    fileName: parts.slice(2).join("/"),
  };
}
