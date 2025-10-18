// ===============================================================================
// ANALYSIS PAYLOAD TYPES
// File: src/shared/types/payload.types.ts
// Purpose: Structures stored in payloads.analysis_data JSONB column
// ===============================================================================

/**
 * Light Analysis Payload
 * Minimal structure for quick scoring (1 credit)
 */
export interface LightPayload {
  score: number;
  summary: string;
  confidence: number;
}

/**
 * Deep Analysis Payload
 * Comprehensive engagement and fit analysis (2 credits)
 */
export interface DeepPayload {
  deep_summary: string;
  selling_points: string[];
  reasons: string[];
  outreach_message: string | null;
  engagement_breakdown: {
    avg_likes: number;
    avg_comments: number;
    engagement_rate: number;
    posts_analyzed?: number;
    data_source?: string;
  };
  latest_posts: any[] | null;
  audience_insights: any | null;
  pre_processed_metrics: any | null;
  personality_profile?: any | null;
}

/**
 * X-Ray Analysis Payload
 * Advanced psychological and commercial intelligence (3 credits)
 */
export interface XRayPayload {
  deep_summary: string;
  copywriter_profile: {
    demographics: string;
    psychographics: string;
    pain_points: string[];
    dreams_desires: string[];
  };
  commercial_intelligence: {
    budget_tier: string;
    decision_role: string;
    buying_stage: string;
    primary_angle: string;
    hook_style: string;
    communication_style: string;
  };
  persuasion_strategy: any;
  outreach_message: string | null;
  pre_processed_metrics: any | null;
  personality_profile?: any | null;
}
