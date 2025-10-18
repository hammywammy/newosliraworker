import type { Context } from 'hono';
import type { Env } from '@/shared/types/index.js';
import { generateRequestId, logger } from '@/shared/utils/logger.util.js';
import { createStandardResponse } from '@/shared/utils/response.util.js';
import { extractUserFromJWT } from '@/shared/utils/auth.util.js';
import { getApiKey } from '@/infrastructure/config/config-manager.js';

/**
 * GET /runs/:run_id
 * Returns detailed information about a specific analysis run (without full payload)
 */
export async function handleGetRunDetail(c: Context<{ Bindings: Env }>): Promise<Response> {
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
    const runId = c.req.param('run_id');
    
    if (!runId) {
      return c.json(createStandardResponse(false, undefined, 'run_id required', requestId), 400);
    }
    
    // Get Supabase credentials
    const supabaseUrl = await getApiKey('SUPABASE_URL', c.env, c.env.APP_ENV);
    const serviceRole = await getApiKey('SUPABASE_SERVICE_ROLE', c.env, c.env.APP_ENV);
    
    const headers = {
      'apikey': serviceRole,
      'Authorization': `Bearer ${serviceRole}`,
      'Content-Type': 'application/json'
    };
    
    // Fetch run details with lead info (but NOT the full payload)
    const query = `${supabaseUrl}/rest/v1/runs?select=*,leads(lead_id,username,display_name,profile_picture_url,follower_count,is_verified_account)&run_id=eq.${runId}&user_id=eq.${userId}`;
    
    const response = await fetch(query, { headers });
    
    if (!response.ok) {
      throw new Error(`Database query failed: ${response.status}`);
    }
    
    const runs = await response.json() as any[];
    
    if (!Array.isArray(runs) || runs.length === 0) {
      return c.json(createStandardResponse(false, undefined, 'Run not found or access denied', requestId), 404);
    }
    
    const run = runs[0];
    
    // Calculate processing time
    const processingTimeMs = run.analysis_completed_at && run.analysis_started_at
      ? new Date(run.analysis_completed_at).getTime() - new Date(run.analysis_started_at).getTime()
      : null;
    
    const runDetail = {
      run_id: run.run_id,
      
      // Analysis info
      analysis_type: run.analysis_type,
      analysis_version: run.analysis_version,
      status: run.run_status,
      
      // Scores
      overall_score: run.overall_score,
      niche_fit_score: run.niche_fit_score,
      engagement_score: run.engagement_score,
      confidence_level: run.confidence_level,
      
      // Summary
      summary: run.summary_text,
      
      // Metadata
      ai_model_used: run.ai_model_used,
      created_at: run.created_at,
      started_at: run.analysis_started_at,
      completed_at: run.analysis_completed_at,
      processing_time_ms: processingTimeMs,
      
      // Lead info
      lead: run.leads ? {
        lead_id: run.leads.lead_id,
        username: run.leads.username,
        display_name: run.leads.display_name,
        profile_picture_url: run.leads.profile_picture_url,
        follower_count: run.leads.follower_count,
        is_verified: run.leads.is_verified_account
      } : null,
      
      // Payload availability
      has_full_payload: true // Payload is always available in separate endpoint
    };
    
    logger('info', 'Run detail retrieved', { 
      userId, 
      runId,
      analysisType: run.analysis_type,
      requestId 
    });
    
    return c.json(createStandardResponse(true, runDetail, undefined, requestId));
    
  } catch (error: any) {
    logger('error', 'Failed to get run detail', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, 'Failed to retrieve run details', requestId), 500);
  }
}
