// ===============================================================================
// DATABASE RECORD TYPES
// File: src/shared/types/database.types.ts
// Purpose: Supabase table row structures (matches PostgreSQL schema)
// ===============================================================================

import type { LightPayload, DeepPayload, XRayPayload } from './payload.types.js';

/**
 * Leads table record structure
 */
export interface LeadRecord {
  lead_id: string;
  user_id: string;
  business_id: string;
  username: string;
  display_name: string | null;
  bio_text: string | null;
  profile_picture_url: string | null;
  external_website_url: string | null;
  follower_count: number;
  following_count: number;
  post_count: number;
  is_verified_account: boolean;
  is_private_account: boolean;
  is_business_account: boolean;
  platform_type: string;
  profile_url: string;
  first_discovered_at: string;
  last_updated_at: string;
  is_active: boolean;
}

/**
 * Runs table record structure
 */
export interface RunRecord {
  run_id: string;
  lead_id: string;
  user_id: string;
  business_id: string;
  analysis_type: 'light' | 'deep' | 'xray';
  analysis_version: string;
  overall_score: number;
  niche_fit_score: number;
  engagement_score: number;
  summary_text: string | null;
  confidence_level: number;
  run_status: string;
  ai_model_used: string | null;
  created_at: string;
  analysis_completed_at: string | null;
}

/**
 * Payloads table record structure
 */
export interface PayloadRecord {
  payload_id: string;
  run_id: string;
  lead_id: string;
  user_id: string;
  business_id: string;
  analysis_type: 'light' | 'deep' | 'xray';
  analysis_data: LightPayload | DeepPayload | XRayPayload;
  data_size_bytes: number;
  created_at: string;
}
