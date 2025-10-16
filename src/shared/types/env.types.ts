// Copy ONLY the Env interface from interfaces.ts
export interface Env {
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
  APP_ENV: string;
  OSLIRA_KV: KVNamespace;
  R2_CACHE_BUCKET: R2Bucket;
}
