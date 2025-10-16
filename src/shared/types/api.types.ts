export interface StandardResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  requestId?: string;
  timestamp: string;
}

export interface DashboardLead {
  lead_id: string;
  username: string;
  display_name?: string;
  profile_picture_url?: string;
  follower_count: number;
  is_verified_account: boolean;
  runs: DashboardRun[];
}

export interface DashboardRun {
  run_id: string;
  analysis_type: AnalysisType;
  overall_score: number;
  niche_fit_score: number;
  engagement_score: number;
  summary_text?: string;
  confidence_level?: number;
  created_at: string;
}
