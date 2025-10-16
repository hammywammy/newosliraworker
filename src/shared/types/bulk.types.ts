export interface BulkAnalysisRequest {
  profiles: string[]; // Array of usernames or URLs
  analysis_type: AnalysisType;
  business_id: string;
  user_id: string;
}

export interface BulkAnalysisResult {
  total_requested: number;
  successful: number;
  failed: number;
  results: AnalysisResponse[];
  errors: Array<{
    profile: string;
    error: string;
  }>;
  credits_used: number;
  credits_remaining: number;
}
