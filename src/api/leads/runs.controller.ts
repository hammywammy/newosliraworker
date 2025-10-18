import type { Context } from 'hono';
import type { Env } from '@/shared/types/index.js';
import { generateRequestId, logger } from '@/shared/utils/logger.util.js';
import { createStandardResponse } from '@/shared/utils/response.util.js';
import { extractUserFromJWT } from '@/shared/utils/auth.util.js';
import { getApiKey } from '@/infrastructure/config/config-manager.js';

/**
 * GET /leads/:lead_id/runs
 * Returns all analysis runs for a specific lead (analysis history)
 */
export async function handleGetLeadRuns(c: Context<{ Bindings: Env }>): Promise<Response> {
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
    
    // Get pagination params
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');
    
    // Get Supabase credentials
    const supabaseUrl = await getApiKey('SUPABASE_URL', c.env, c.env.APP_ENV);
    const serviceRole = await getApiKey('SUPABASE_SERVICE_ROLE', c.env, c.env.APP_ENV);
    
    const headers = {
      'apikey': serviceRole,
      'Authorization': `Bearer ${serviceRole}`,
      'Content-Type': 'application/json',
      'Prefer': 'count=exact'
    };
    
    // First verify the lead belongs to the user
    const leadCheck = await fetch(
      `${supabaseUrl}/rest/v1/leads?select=lead_id&lead_id=eq.${leadId}&user_id=eq.${userId}`,
      { headers }
    );
    
    if (!leadCheck.ok) {
      throw new Error(`Lead verification failed: ${leadCheck.status}`);
    }
    
    const leadExists = await leadCheck.json() as any[];
    
    if (!Array.isArray(leadExists) || leadExists.length === 0) {
      return c.json(createStandardResponse(false, undefined, 'Lead not found or access denied', requestId), 404);
    }
    
    // Fetch all runs for this lead
    const query = `${supabaseUrl}/rest/v1/runs?select=run_id,analysis_type,analysis_version,overall_score,niche_fit_score,engagement_score,summary_text,confidence_level,run_status,ai_model_used,created_at,analysis_completed_at&lead_id=eq.${leadId}&user_id=eq.${userId}&order=created_at.desc&limit=${limit}&offset=${offset}`;
    
    const response = await fetch(query, { headers });
    
    if (!response.ok) {
      throw new Error(`Database query failed: ${response.status}`);
    }
    
    const runs = await response.json() as any[];
    const totalCount = response.headers.get('Content-Range')?.split('/')[1] || '0';
    
    // Format runs for frontend
    const formattedRuns = runs.map(run => ({
      run_id: run.run_id,
      analysis_type: run.analysis_type,
      analysis_version: run.analysis_version,
      
      // Scores
      overall_score: run.overall_score,
      niche_fit_score: run.niche_fit_score,
      engagement_score: run.engagement_score,
      
      // Analysis details
      summary: run.summary_text,
      confidence_level: run.confidence_level,
      status: run.run_status,
      
      // Metadata
      ai_model_used: run.ai_model_used,
      created_at: run.created_at,
      completed_at: run.analysis_completed_at,
      
      // Processing time
      processing_time_ms: run.analysis_completed_at && run.created_at
        ? new Date(run.analysis_completed_at).getTime() - new Date(run.created_at).getTime()
        : null
    }));
    
    // Calculate stats across all runs
    const completedRuns = formattedRuns.filter(r => r.status === 'completed');
    const avgScore = completedRuns.length > 0
      ? Math.round(completedRuns.reduce((sum, r) => sum + (r.overall_score || 0), 0) / completedRuns.length)
      : 0;
    
    const scoreHistory = completedRuns.map(r => ({
      date: r.created_at,
      score: r.overall_score,
      type: r.analysis_type
    }));
    
    logger('info', 'Lead runs retrieved', { 
      userId, 
      leadId,
      count: formattedRuns.length,
      requestId 
    });
    
    return c.json(createStandardResponse(true, {
      runs: formattedRuns,
      stats: {
        total_runs: parseInt(totalCount),
        completed_runs: completedRuns.length,
        avg_score: avgScore,
        score_history: scoreHistory
      },
      pagination: {
        limit,
        offset,
        total: parseInt(totalCount),
        hasMore: (offset + limit) < parseInt(totalCount)
      }
    }, undefined, requestId));
    
  } catch (error: any) {
    logger('error', 'Failed to get lead runs', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, 'Failed to retrieve analysis history', requestId), 500);
  }
}
