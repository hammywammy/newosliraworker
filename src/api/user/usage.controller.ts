import type { Context } from 'hono';
import type { Env } from '@/shared/types/index.js';
import { generateRequestId, logger } from '@/shared/utils/logger.util.js';
import { createStandardResponse } from '@/shared/utils/response.util.js';
import { extractUserFromJWT } from '@/shared/utils/auth.util.js';
import { getApiKey } from '@/infrastructure/config/config-manager.js';

/**
 * GET /user/usage
 * Returns current month's usage statistics from public.usage_tracking
 */
export async function handleGetUserUsage(c: Context<{ Bindings: Env }>): Promise<Response> {
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
    
    // Get current month (YYYY-MM-01 format)
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    
    // Fetch current month's usage from public.usage_tracking
    const response = await fetch(
      `${supabaseUrl}/rest/v1/usage_tracking?select=*&user_id=eq.${userId}&month=eq.${currentMonth}`,
      { headers }
    );
    
    if (!response.ok) {
      throw new Error(`Database query failed: ${response.status}`);
    }
    
    const usageRecords = await response.json() as any[];
    
    // If no usage record exists for current month, return defaults
    if (!Array.isArray(usageRecords) || usageRecords.length === 0) {
      const defaultUsage = {
        month: currentMonth,
        leads_researched: 0,
        credits_used: 0,
        analyses: {
          light: 0,
          deep: 0,
          xray: 0,
          single: 0,
          bulk: 0
        },
        avg_lead_score: 0,
        premium_leads_found: 0
      };
      
      logger('info', 'No usage data for current month, returning defaults', { userId, requestId });
      
      return c.json(createStandardResponse(true, defaultUsage, undefined, requestId));
    }
    
    const usage = usageRecords[0];
    
    const usageData = {
      month: usage.month,
      leads_researched: usage.leads_researched || 0,
      credits_used: usage.credits_used || 0,
      analyses: {
        light: usage.light_analyses || 0,
        deep: usage.deep_analyses || 0,
        xray: usage.xray_analyses || 0,
        single: usage.single_analyses || 0,
        bulk: usage.bulk_analyses || 0
      },
      avg_lead_score: usage.avg_lead_score ? parseFloat(usage.avg_lead_score) : 0,
      premium_leads_found: usage.premium_leads_found || 0
    };
    
    logger('info', 'User usage retrieved', { userId, month: currentMonth, requestId });
    
    return c.json(createStandardResponse(true, usageData, undefined, requestId));
    
  } catch (error: any) {
    logger('error', 'Failed to get user usage', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, 'Failed to retrieve usage', requestId), 500);
  }
}

/**
 * GET /user/usage/history
 * Returns historical usage statistics (paginated by month)
 */
export async function handleGetUserUsageHistory(c: Context<{ Bindings: Env }>): Promise<Response> {
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
    
    // Get pagination params
    const limit = parseInt(c.req.query('limit') || '12'); // Default 12 months
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
    
    // Fetch historical usage from public.usage_tracking
    const response = await fetch(
      `${supabaseUrl}/rest/v1/usage_tracking?select=*&user_id=eq.${userId}&order=month.desc&limit=${limit}&offset=${offset}`,
      { headers }
    );
    
    if (!response.ok) {
      throw new Error(`Database query failed: ${response.status}`);
    }
    
    const usageRecords = await response.json() as any[];
    const totalCount = response.headers.get('Content-Range')?.split('/')[1] || '0';
    
    const historyData = usageRecords.map(usage => ({
      month: usage.month,
      leads_researched: usage.leads_researched || 0,
      credits_used: usage.credits_used || 0,
      analyses: {
        light: usage.light_analyses || 0,
        deep: usage.deep_analyses || 0,
        xray: usage.xray_analyses || 0,
        single: usage.single_analyses || 0,
        bulk: usage.bulk_analyses || 0
      },
      avg_lead_score: usage.avg_lead_score ? parseFloat(usage.avg_lead_score) : 0,
      premium_leads_found: usage.premium_leads_found || 0
    }));
    
    logger('info', 'User usage history retrieved', { 
      userId, 
      months: historyData.length, 
      requestId 
    });
    
    return c.json(createStandardResponse(true, {
      history: historyData,
      pagination: {
        limit,
        offset,
        total: parseInt(totalCount),
        hasMore: (offset + limit) < parseInt(totalCount)
      }
    }, undefined, requestId));
    
  } catch (error: any) {
    logger('error', 'Failed to get user usage history', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, 'Failed to retrieve usage history', requestId), 500);
  }
}
