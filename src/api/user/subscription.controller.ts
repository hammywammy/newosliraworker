import type { Context } from 'hono';
import type { Env } from '@/shared/types/index.js';
import { generateRequestId, logger } from '@/shared/utils/logger.util.js';
import { createStandardResponse } from '@/shared/utils/response.util.js';
import { extractUserFromJWT } from '@/shared/utils/auth.util.js';
import { getApiKey } from '@/infrastructure/config/config-manager.js';

/**
 * GET /user/subscription
 * Returns current user's subscription details (plan, credits, billing)
 */
export async function handleGetUserSubscription(c: Context<{ Bindings: Env }>): Promise<Response> {
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
    
    // Fetch active subscription from public.subscriptions
    const response = await fetch(
      `${supabaseUrl}/rest/v1/subscriptions?select=*&user_id=eq.${userId}&status=eq.active`,
      { headers }
    );
    
    if (!response.ok) {
      throw new Error(`Database query failed: ${response.status}`);
    }
    
    const subscriptions = await response.json() as any[];
    
    // If no active subscription, return free plan defaults
    if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
      const freeSubscription = {
        plan_type: 'free',
        credits_remaining: 0,
        status: 'inactive',
        current_period_start: null,
        current_period_end: null,
        stripe_customer_id: null
      };
      
      logger('info', 'No active subscription found, returning free plan', { userId, requestId });
      
      return c.json(createStandardResponse(true, freeSubscription, undefined, requestId));
    }
    
    const subscription = subscriptions[0];
    
    const subscriptionData = {
      plan_type: subscription.plan_type || 'free',
      credits_remaining: subscription.credits_remaining || 0,
      status: subscription.status,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      stripe_customer_id: subscription.stripe_customer_id,
      stripe_subscription_id: subscription.stripe_subscription_id
    };
    
    logger('info', 'User subscription retrieved', { 
      userId, 
      plan: subscriptionData.plan_type, 
      credits: subscriptionData.credits_remaining,
      requestId 
    });
    
    return c.json(createStandardResponse(true, subscriptionData, undefined, requestId));
    
  } catch (error: any) {
    logger('error', 'Failed to get user subscription', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, 'Failed to retrieve subscription', requestId), 500);
  }
}
