// src/shared/types/analysis.types.ts
// FIX: Add missing properties that are actually used in the codebase

import type { LightPayload, DeepPayload, XRayPayload } from './payload.types.js';

export type AnalysisType = 'light' | 'deep' | 'xray';

export interface ProfileData {
  username: string;
  displayName: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isVerified: boolean;
  isPrivate: boolean;
  profilePicUrl: string;
  externalUrl: string;
  isBusinessAccount?: boolean;
  latestPosts: PostData[];
  engagement?: EngagementData;
  scraperUsed?: string;
  dataQuality?: 'high' | 'medium' | 'low';
}

export interface PostData {
  id: string;
  shortCode: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  timestamp: string;
  url: string;
  type: string;
  hashtags: string[];
  mentions: string[];
  viewCount?: number;
  isVideo?: boolean;
}

export interface EngagementData {
  avgLikes: number;
  avgComments: number;
  engagementRate: number;
  totalEngagement: number;
  postsAnalyzed: number;
  qualityScore?: number;
  videoPerformance?: {
    avgViews: number;
    avgEngagement: number;
    videoCount: number;
    viewToEngagementRatio: number;
  } | null;
  formatDistribution?: {
    imageCount: number;
    videoCount: number;
    sidecarCount: number;
    primaryFormat: 'images' | 'videos' | 'carousels' | 'mixed';
    usesVideo: boolean;
    usesCarousel: boolean;
    formatDiversity: number;
  };
}

export interface AnalysisResponse {
  run_id: string;
  profile: {
    username: string;
    displayName: string;
    followersCount: number;
    isVerified: boolean;
    profilePicUrl: string;
    dataQuality: string;
    scraperUsed: string;
  };
  analysis: {
    overall_score: number;
    niche_fit_score: number;
    engagement_score: number;
    type: AnalysisType;
    confidence_level?: number;
    summary_text?: string;
    
    // Deep analysis fields
    audience_quality?: string;
    selling_points?: string[];
    reasons?: string[];
    deep_summary?: string;
    outreach_message?: string;
    
    // FIX: Allow null for engagement_breakdown
    engagement_breakdown?: {
      avg_likes: number;
      avg_comments: number;
      engagement_rate: number;
      posts_analyzed: number;
      data_source: string;
    } | null; // ← ADDED | null
    
    // X-Ray analysis fields
    copywriter_profile?: any;
    commercial_intelligence?: any;
    persuasion_strategy?: any;
  };
credits: {
  used: number;
  remaining: number;
  actual_cost?: number;
  margin?: number; // ← FIX: analyze.controller.ts:314
};
metadata: {
  request_id: string;
  analysis_completed_at: string;
  schema_version: string;
  system_used?: string;
  performance?: { // ← FIX: analyze.controller.ts:321
    processing_duration_ms: number;
    model_used: string;
    block_type: string;
    tokens_processed: number;
  };
};
}

export interface AnalysisResult {
  score: number;
  engagement_score: number;
  niche_fit: number;
  audience_quality: string;
  engagement_insights: string;
  selling_points: string[];
  reasons: string[];
  quick_summary?: string;
  deep_summary?: string;
  confidence_level?: number;
  outreach_message?: string;
}

export interface AnalysisRequest {
  profile_url?: string;
  username?: string;
  analysis_type: AnalysisType;
  type?: AnalysisType;
  business_id: string;
  user_id: string;
}

export interface AnalysisDetails {
  run_id: string;
  analysis_type: AnalysisType;
  overall_score: number;
  niche_fit_score: number;
  engagement_score: number;
  summary_text?: string;
  confidence_level?: number;
  ai_model_used?: string;
  created_at: string;
  
  leads: {
    username: string;
    display_name?: string;
    profile_picture_url?: string;
    bio_text?: string;
    follower_count: number;
    following_count: number;
    is_verified_account: boolean;
  };
  
  payloads?: {
    analysis_data: LightPayload | DeepPayload | XRayPayload;
  }[];
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  normalizedData?: any;
}
