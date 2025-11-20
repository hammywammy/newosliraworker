// src/shared/types/analysis.types.ts

// SIMPLIFIED: Only Light analysis is supported
export type AnalysisType = 'light';

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
    summary_text: string;
    type: AnalysisType;
  };
  credits: {
    used: number;
    remaining: number;
    actual_cost?: number;
    margin?: number;
  };
  metadata: {
    request_id: string;
    analysis_completed_at: string;
    schema_version: string;
    system_used?: string;
    performance?: {
      processing_duration_ms: number;
      model_used: string;
      block_type: string;
      tokens_processed: number;
    };
  };
}

export interface AnalysisResult {
  overall_score: number;
  summary_text: string;
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
  summary_text?: string;
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
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  normalizedData?: any;
}

// ===============================================================================
// DEPRECATED: Deep and XRay analysis types have been removed
// Only Light analysis is supported with overall_score and summary_text
// ===============================================================================
