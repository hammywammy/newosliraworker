export interface BusinessProfile {
  id: string;
  user_id: string;
  name: string;
  industry: string;
  target_audience: string;
  value_proposition: string;
  pain_points: string[];
  unique_advantages: string[];
  website: string;
  created_at: string;
  
  // ✅ FIX: Add property aliases for code compatibility
  // These allow existing code to use business_name/business_niche while
  // maintaining the database schema which uses name/industry
  business_name?: string;      // Alias for 'name'
  business_niche?: string;     // Alias for 'industry'
  business_one_liner?: string; // AI-generated summary field
}
