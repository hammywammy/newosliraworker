// ===============================================================================
// CLOUDFLARE WORKER ENVIRONMENT TYPES
// File: src/shared/types/env.types.ts
// ===============================================================================

/**
 * Cloudflare Worker Environment Interface
 * 
 * IMPORTANT: Properties marked optional (?) are NOT in the actual Worker env
 * at startup. They're fetched from AWS Secrets Manager at runtime via getApiKey().
 * They're typed here so TypeScript allows: `env.SUPABASE_URL` even though
 * the actual pattern is: `await getApiKey('SUPABASE_URL', env, env.APP_ENV)`
 */
export interface Env {
  // ============================================================================
  // CLOUDFLARE SECRETS (Set via wrangler or dashboard)
  // ============================================================================
  
  /** AWS Access Key - Required for Secrets Manager access */
  AWS_ACCESS_KEY_ID: string;
  
  /** AWS Secret Key - Required for Secrets Manager access */
  AWS_SECRET_ACCESS_KEY: string;
  
  /** AWS Region where secrets are stored */
  AWS_REGION: string;
  
  /** Environment identifier: 'development' | 'staging' | 'production' */
  APP_ENV: string;
  
  // ============================================================================
  // CLOUDFLARE BINDINGS
  // ============================================================================
  
  /** KV namespace for rate limiting, caching, config */
  OSLIRA_KV: KVNamespace;
  
  /** R2 bucket for profile data caching */
  R2_CACHE_BUCKET: R2Bucket;
  
  // ============================================================================
  // AWS SECRETS (Fetched at runtime via getApiKey())
  // Marked optional because they're NOT in env at Worker startup
  // ============================================================================
  
  /** Supabase project URL - Fetched from AWS */
  SUPABASE_URL?: string;
  
  /** Supabase service role key - Fetched from AWS */
  SUPABASE_SERVICE_ROLE?: string;
  
  /** Supabase anon public key - Fetched from AWS */
  SUPABASE_ANON_KEY?: string;
  
  /** OpenAI API key - Fetched from AWS */
  OPENAI_API_KEY?: string;
  
  /** Claude API key - Fetched from AWS */
  CLAUDE_API_KEY?: string;
  
  /** Apify scraping token - Fetched from AWS */
  APIFY_API_TOKEN?: string;
  
  /** Stripe secret key - Fetched from AWS */
  STRIPE_SECRET_KEY?: string;
  
  /** Stripe publishable key - Fetched from AWS */
  STRIPE_PUBLISHABLE_KEY?: string;
  
  /** Stripe webhook secret - Fetched from AWS */
  STRIPE_WEBHOOK_SECRET?: string;
  
  /** Frontend application URL - Fetched from AWS */
  FRONTEND_URL?: string;
  
  /** Admin authentication token - Fetched from AWS */
  ADMIN_TOKEN?: string;
  
  /** Netlify build hook URL for config sync - Fetched from AWS */
  NETLIFY_BUILD_HOOK_URL?: string;
}
