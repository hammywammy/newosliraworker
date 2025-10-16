export interface AnalyticsSummary {
  success: boolean;
  summary: {
    totalAnalyses: number;
    uniqueLeads: number;
    averageOverallScore: number;
    averageNicheFitScore: number;
    averageEngagementScore: number;
    conversionRate: string;
    avgEngagementRate: string;
    recentActivity: number;
    monthlyActivity: number;
    activeUsers: number;
    totalCreditsAvailable: number;
    analysisBreakdown: {
      light: number;
      deep: number;
      xray: number;
    };
  };
  trends: {
    analysesGrowth: string;
    scoreImprovement: string;
    engagementTrend: string;
    userGrowth: string;
  };
  insights: {
    topPerformingScore: number;
    mostActiveWeek: string;
    recommendedFocus: string;
    engagementBenchmark: string;
  };
}

export interface EnhancedAnalytics {
  success: boolean;
  performance: {
    overall_score: number;
    niche_fit: number;
    engagement: number;
    engagement_rate: number;
    success_rate: number;
    trend_direction: string;
  };
  segmentation: {
    high_performers: number;
    medium_performers: number;
    low_performers: number;
    micro_influencers: number;
    macro_influencers: number;
  };
  analysis_breakdown: {
    total_analyses: number;
    light: number;
    deep: number;
    xray: number;
    deep_analysis_ratio: number;
  };
  insights: string[];
  recommendations: string[];
  metrics: {
    avg_followers: number;
    recent_performance: number;
    total_leads: number;
    analyses_this_week: number;
  };
}
