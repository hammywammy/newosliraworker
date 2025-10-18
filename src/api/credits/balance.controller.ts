import type { Context } from 'hono';
import type { Env } from '@/shared/types/index.js';
import { generateRequestId, logger } from '@/shared/utils/logger.util.js';
import { createStandardResponse } from '@/shared/utils/response.util.js';
import { extractUserFromJWT } from '@/shared/utils/auth.util.js';
import { getApiKey } from '@/infrastructure/config/config-manager.js';

/**
 * GET /credits/balance
 * Returns current user's credit balance (lightweight endpoint for real-time updates)
 */
export async function handleGetCreditsBalance(c: Context<{ Bindings: Env }>): Promise<Response> {
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
    
    // Get Supabase credentials
    const supabaseUrl = await getApiKey('SUPABASE_URL', c.env, c.env.APP_ENV);
    const serviceRole = await getApiKey('SUPABASE_SERVICE_ROLE', c.env, c.env.APP_ENV);
    
    const headers = {
      'apikey': serviceRole,
      'Authorization': `Bearer ${serviceRole}`,
      'Content-Type': 'application/json'
    };
    
    // Fetch ONLY credits_remaining from active subscription (lightweight query)
    const response = await fetch(
      `${supabaseUrl}/rest/v1/subscriptions?select=credits_remaining,plan_type&user_id=eq.${userId}&status=eq.active`,
      { headers }
    );
    
    if (!response.ok) {
      throw new Error(`Database query failed: ${response.status}`);
    }
    
    const subscriptions = await response.json() as any[];
    
    // If no active subscription, return 0 credits
    if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
      logger('info', 'No active subscription, returning 0 credits', { userId, requestId });
      
      return c.json(createStandardResponse(true, {
        credits_remaining: 0,
        plan_type: 'free'
      }, undefined, requestId));
    }
    
    const subscription = subscriptions[0];
    
    const balanceData = {
      credits_remaining: subscription.credits_remaining || 0,
      plan_type: subscription.plan_type || 'free'
    };
    
    logger('info', 'Credits balance retrieved', { 
      userId, 
      credits: balanceData.credits_remaining,
      requestId 
    });
    
    return c.json(createStandardResponse(true, balanceData, undefined, requestId));
    
  } catch (error: any) {
    logger('error', 'Failed to get credits balance', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, 'Failed to retrieve balance', requestId), 500);
  }
}
