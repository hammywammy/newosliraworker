import type { Context } from 'hono';
import type { Env } from '@/shared/types/index.js';
import { generateRequestId, logger } from '@/shared/utils/logger.util.js';
import { createStandardResponse } from '@/shared/utils/response.util.js';
import { extractUserFromJWT } from '@/shared/utils/auth.util.js';
import { getApiKey } from '@/infrastructure/config/config-manager.js';

/**
 * GET /runs/:run_id/payload
 * Returns the full AI-generated analysis payload (large data, lazy-loaded)
 * This endpoint should be called ONLY when user explicitly requests full details
 */
export async function handleGetRunPayload(c: Context<{ Bindings: Env }>): Promise<Response> {
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
    
    // First verify the run belongs to the user (security check)
    const runCheck = await fetch(
      `${supabaseUrl}/rest/v1/runs?select=run_id,analysis_type&run_id=eq.${runId}&user_id=eq.${userId}`,
      { headers }
    );
    
    if (!runCheck.ok) {
      throw new Error(`Run verification failed: ${runCheck.status}`);
    }
    
    const runExists = await runCheck.json() as any[];
    
    if (!Array.isArray(runExists) || runExists.length === 0) {
      return c.json(createStandardResponse(false, undefined, 'Run not found or access denied', requestId), 404);
    }
    
    const analysisType = runExists[0].analysis_type;
    
    // Fetch the full payload from public.payloads
    const payloadQuery = `${supabaseUrl}/rest/v1/payloads?select=payload_id,analysis_type,analysis_data,data_size_bytes,created_at&run_id=eq.${runId}&user_id=eq.${userId}`;
    
    const response = await fetch(payloadQuery, { headers });
    
    if (!response.ok) {
      throw new Error(`Payload query failed: ${response.status}`);
    }
    
    const payloads = await response.json() as any[];
    
    if (!Array.isArray(payloads) || payloads.length === 0) {
      return c.json(createStandardResponse(false, undefined, 'Payload not found', requestId), 404);
    }
    
    const payload = payloads[0];
    
    // Return full payload based on analysis type
    const payloadData = {
      run_id: runId,
      analysis_type: payload.analysis_type,
      data_size_bytes: payload.data_size_bytes,
      created_at: payload.created_at,
      
      // Full AI-generated data (can be 50KB+)
      payload: payload.analysis_data
    };
    
    logger('info', 'Run payload retrieved', { 
      userId, 
      runId,
      analysisType,
      sizeBytes: payload.data_size_bytes,
      requestId 
    });
    
    return c.json(createStandardResponse(true, payloadData, undefined, requestId));
    
  } catch (error: any) {
    logger('error', 'Failed to get run payload', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, 'Failed to retrieve payload', requestId), 500);
  }
}
