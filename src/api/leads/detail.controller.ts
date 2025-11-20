import type { Context } from 'hono';
import type { Env } from '@/shared/types/index.js';
import { generateRequestId, logger } from '@/shared/utils/logger.util.js';
import { createStandardResponse } from '@/shared/utils/response.util.js';
import { extractUserFromJWT } from '@/shared/utils/auth.util.js';
import { getApiKey } from '@/infrastructure/config/config-manager.js';

/**
 * GET /leads/:lead_id
 * Returns detailed information about a single lead
 */
export async function handleGetLeadDetail(c: Context<{ Bindings: Env }>): Promise<Response> {
  const requestId = generateRequestId();
  
  try {
    // Authenticate
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json(createStandardResponse(false, undefined, 'Unauthorized', requestId), 401);
    }
    
    const token = authHeader.substring(7);
    const authResult = await extractUserFromJWT(token, c.env, requestId);
    
    if (!authResult.isValid || !authResult.userId) {
      return c.json(createStandardResponse(false, undefined, 'Invalid token', requestId), 401);
    }
    
    const userId = authResult.userId;
    const leadId = c.req.param('lead_id');
    
    if (!leadId) {
      return c.json(createStandardResponse(false, undefined, 'lead_id required', requestId), 400);
    }
    
    // Get Supabase credentials
    const supabaseUrl = await getApiKey('SUPABASE_URL', c.env, c.env.APP_ENV);
    const serviceRole = await getApiKey('SUPABASE_SERVICE_ROLE', c.env, c.env.APP_ENV);
    
    const headers = {
      'apikey': serviceRole,
      'Authorization': `Bearer ${serviceRole}`,
      'Content-Type': 'application/json'
    };
    
    // Fetch lead details with latest run
    const query = `${supabaseUrl}/rest/v1/leads?select=*,runs(run_id,analysis_type,overall_score,niche_fit_score,engagement_score,summary_text,confidence_level,created_at,analysis_completed_at)&lead_id=eq.${leadId}&user_id=eq.${userId}`;
    
    const response = await fetch(query, { headers });
    
    if (!response.ok) {
      throw new Error(`Database query failed: ${response.status}`);
    }
    
    const leads = await response.json() as any[];
    
    if (!Array.isArray(leads) || leads.length === 0) {
      return c.json(createStandardResponse(false, undefined, 'Lead not found or access denied', requestId), 404);
    }
    
    const lead = leads[0];
    
    // Get the most recent run
    const latestRun = lead.runs && lead.runs.length > 0
      ? lead.runs.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0]
      : null;
    
    // Count total analyses (only light is supported now)
    const totalAnalyses = lead.runs ? lead.runs.length : 0;
    const analysisCounts = {
      light: lead.runs?.filter((r: any) => r.analysis_type === 'light').length || 0,
      deep: 0, // Deprecated
      xray: 0  // Deprecated
    };
    
    const leadDetail = {
      lead_id: lead.lead_id,
      username: lead.username,
      display_name: lead.display_name,
      profile_picture_url: lead.profile_picture_url,
      bio_text: lead.bio_text,
      external_website_url: lead.external_website_url,
      profile_url: lead.profile_url,
      
      // Follower metrics
      follower_count: lead.follower_count,
      following_count: lead.following_count,
      post_count: lead.post_count,
      
      // Account status
      is_verified_account: lead.is_verified_account,
      is_private_account: lead.is_private_account,
      is_business_account: lead.is_business_account,
      
      // Timestamps
      first_discovered_at: lead.first_discovered_at,
      last_updated_at: lead.last_updated_at,
      
      // Latest analysis
      latest_analysis: latestRun ? {
        run_id: latestRun.run_id,
        analysis_type: latestRun.analysis_type,
        overall_score: latestRun.overall_score,
        niche_fit_score: latestRun.niche_fit_score,
        engagement_score: latestRun.engagement_score,
        summary: latestRun.summary_text,
        confidence_level: latestRun.confidence_level,
        analyzed_at: latestRun.created_at,
        completed_at: latestRun.analysis_completed_at
      } : null,
      
      // Analysis history stats
      analysis_stats: {
        total_analyses: totalAnalyses,
        by_type: analysisCounts
      }
    };
    
    logger('info', 'Lead detail retrieved', { 
      userId, 
      leadId,
      username: lead.username,
      requestId 
    });
    
    return c.json(createStandardResponse(true, leadDetail, undefined, requestId));
    
  } catch (error: any) {
    logger('error', 'Failed to get lead detail', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, 'Failed to retrieve lead details', requestId), 500);
  }
}
