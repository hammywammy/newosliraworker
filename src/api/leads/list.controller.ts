import type { Context } from 'hono';
import type { Env } from '@/shared/types/index.js';
import { generateRequestId, logger } from '@/shared/utils/logger.util.js';
import { createStandardResponse } from '@/shared/utils/response.util.js';
import { extractUserFromJWT } from '@/shared/utils/auth.util.js';
import { getApiKey } from '@/infrastructure/config/config-manager.js';

/**
 * GET /leads
 * Returns paginated list of leads for current user
 * Similar to /leads/dashboard but with more flexibility (filtering, sorting)
 */
export async function handleGetLeadsList(c: Context<{ Bindings: Env }>): Promise<Response> {
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
    
    // Get query params
    const businessId = c.req.query('business_id');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    const sortBy = c.req.query('sort_by') || 'created_at'; // created_at, follower_count, username
    const sortOrder = c.req.query('sort_order') || 'desc'; // asc, desc
    const minScore = c.req.query('min_score'); // Filter by minimum score
    
    // Validate business_id
    if (!businessId) {
      return c.json(createStandardResponse(false, undefined, 'business_id required', requestId), 400);
    }
    
    // Get Supabase credentials
    const supabaseUrl = await getApiKey('SUPABASE_URL', c.env, c.env.APP_ENV);
    const serviceRole = await getApiKey('SUPABASE_SERVICE_ROLE', c.env, c.env.APP_ENV);
    
    const headers = {
      'apikey': serviceRole,
      'Authorization': `Bearer ${serviceRole}`,
      'Content-Type': 'application/json',
      'Prefer': 'count=exact'
    };
    
    // Build sort field (map frontend names to DB columns)
    const sortFieldMap: Record<string, string> = {
      'created_at': 'first_discovered_at',
      'follower_count': 'follower_count',
      'username': 'username'
    };
    const sortField = sortFieldMap[sortBy] || 'first_discovered_at';
    const order = sortOrder === 'asc' ? 'asc' : 'desc';
    
    // Fetch leads with their latest run data
    let query = `${supabaseUrl}/rest/v1/leads?select=lead_id,username,display_name,profile_picture_url,bio_text,follower_count,is_verified_account,first_discovered_at,runs(run_id,analysis_type,overall_score,niche_fit_score,engagement_score,summary_text,created_at)&user_id=eq.${userId}&business_id=eq.${businessId}`;
    
    query += `&order=${sortField}.${order}&limit=${limit}&offset=${offset}`;
    
    const response = await fetch(query, { headers });
    
    if (!response.ok) {
      throw new Error(`Database query failed: ${response.status}`);
    }
    
    const leads = await response.json() as any[];
    const totalCount = response.headers.get('Content-Range')?.split('/')[1] || '0';
    
    // Format leads with latest run data
    let formattedLeads = leads.map(lead => {
      // Get the most recent run
      const latestRun = lead.runs && lead.runs.length > 0
        ? lead.runs.sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0]
        : null;
      
      return {
        lead_id: lead.lead_id,
        username: lead.username,
        display_name: lead.display_name,
        profile_picture_url: lead.profile_picture_url,
        bio_text: lead.bio_text,
        follower_count: lead.follower_count,
        is_verified: lead.is_verified_account,
        first_discovered_at: lead.first_discovered_at,
        latest_analysis: latestRun ? {
          run_id: latestRun.run_id,
          analysis_type: latestRun.analysis_type,
          overall_score: latestRun.overall_score,
          niche_fit_score: latestRun.niche_fit_score,
          engagement_score: latestRun.engagement_score,
          summary: latestRun.summary_text,
          analyzed_at: latestRun.created_at
        } : null
      };
    });
    
    // Apply score filter if provided
    if (minScore) {
      const minScoreValue = parseInt(minScore);
      formattedLeads = formattedLeads.filter(lead => 
        lead.latest_analysis && lead.latest_analysis.overall_score >= minScoreValue
      );
    }
    
    logger('info', 'Leads list retrieved', { 
      userId, 
      businessId,
      count: formattedLeads.length,
      sortBy,
      requestId 
    });
    
    return c.json(createStandardResponse(true, {
      leads: formattedLeads,
      pagination: {
        limit,
        offset,
        total: parseInt(totalCount),
        hasMore: (offset + limit) < parseInt(totalCount)
      }
    }, undefined, requestId));
    
  } catch (error: any) {
    logger('error', 'Failed to get leads list', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, 'Failed to retrieve leads', requestId), 500);
  }
}
