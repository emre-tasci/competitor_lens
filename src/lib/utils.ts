import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getScreenshotUrl(s3Key: string): string {
  const domain = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN;
  if (domain) {
    return `${domain}/${s3Key}`;
  }
  return `/api/screenshots/image?key=${encodeURIComponent(s3Key)}`;
}
