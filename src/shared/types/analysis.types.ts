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
  
  // NEW: Video metrics
  videoPerformance?: {
    avgViews: number;
    avgEngagement: number;
    videoCount: number;
    viewToEngagementRatio: number;
  } | null;
  
  // NEW: Format distribution
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

export interface AnalysisResult {
  score: number;           // Maps to runs.overall_score
  engagement_score: number; // Maps to runs.engagement_score
  niche_fit: number;       // Maps to runs.niche_fit_score
  audience_quality: string;
  engagement_insights: string;
  selling_points: string[];
  reasons: string[];
  quick_summary?: string;   // Maps to runs.summary_text
  deep_summary?: string;    // Goes to payload
  confidence_level?: number; // Maps to runs.confidence_level
  outreach_message?: string; // Goes to payload
}

export interface AnalysisRequest {
  profile_url?: string;
  username?: string;
  analysis_type: AnalysisType;
  type?: AnalysisType; // Backward compatibility
  business_id: string;
  user_id: string;
}

export type AnalysisType = 'light' | 'deep' | 'xray';

export interface AnalysisDetails {
  // Run data
  run_id: string;
  analysis_type: AnalysisType;
  overall_score: number;
  niche_fit_score: number;
  engagement_score: number;
  summary_text?: string;
  confidence_level?: number;
  ai_model_used?: string;
  created_at: string;
  
  // Lead data
  leads: {
    username: string;
    display_name?: string;
    profile_picture_url?: string;
    bio_text?: string;
    follower_count: number;
    following_count: number;
    is_verified_account: boolean;
  };
  
  // Payload data (optional)
  payloads?: {
    analysis_data: LightPayload | DeepPayload | XRayPayload;
  }[];
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
    engagement_breakdown?: {
      avg_likes: number;
      avg_comments: number;
      engagement_rate: number;
      posts_analyzed: number;
      data_source: string;
    };
    // X-Ray analysis fields
    copywriter_profile?: any;
    commercial_intelligence?: any;
    persuasion_strategy?: any;
  };
  credits: {
    used: number;
    remaining: number;
  };
  metadata: {
    request_id: string;
    analysis_completed_at: string;
    schema_version: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  normalizedData?: any;
}
