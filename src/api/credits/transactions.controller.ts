import type { Context } from 'hono';
import type { Env } from '@/shared/types/index.js';
import { generateRequestId, logger } from '@/shared/utils/logger.util.js';
import { createStandardResponse } from '@/shared/utils/response.util.js';
import { extractUserFromJWT } from '@/shared/utils/auth.util.js';
import { getApiKey } from '@/infrastructure/config/config-manager.js';

/**
 * GET /credits/transactions
 * Returns paginated credit transaction history for current user
 */
export async function handleGetCreditsTransactions(c: Context<{ Bindings: Env }>): Promise<Response> {
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
    
    // Get pagination and filter params
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    const type = c.req.query('type'); // Optional: 'use', 'purchase', 'refund'
    
    // Get Supabase credentials
    const supabaseUrl = await getApiKey('SUPABASE_URL', c.env, c.env.APP_ENV);
    const serviceRole = await getApiKey('SUPABASE_SERVICE_ROLE', c.env, c.env.APP_ENV);
    
    const headers = {
      'apikey': serviceRole,
      'Authorization': `Bearer ${serviceRole}`,
      'Content-Type': 'application/json',
      'Prefer': 'count=exact'
    };
    
    // Build query with optional type filter
    let query = `${supabaseUrl}/rest/v1/credit_transactions?select=id,amount,type,description,created_at,actual_cost,tokens_in,tokens_out,model_used,run_id&user_id=eq.${userId}`;
    
    if (type && ['use', 'purchase', 'refund'].includes(type)) {
      query += `&type=eq.${type}`;
    }
    
    query += `&order=created_at.desc&limit=${limit}&offset=${offset}`;
    
    // Fetch transactions from public.credit_transactions
    const response = await fetch(query, { headers });
    
    if (!response.ok) {
      throw new Error(`Database query failed: ${response.status}`);
    }
    
    const transactions = await response.json() as any[];
    const totalCount = response.headers.get('Content-Range')?.split('/')[1] || '0';
    
    // Format transactions for frontend
    const formattedTransactions = transactions.map(tx => ({
      id: tx.id,
      amount: tx.amount,
      type: tx.type,
      description: tx.description,
      created_at: tx.created_at,
      run_id: tx.run_id || null,
      details: tx.type === 'use' ? {
        actual_cost: tx.actual_cost || null,
        tokens_in: tx.tokens_in || null,
        tokens_out: tx.tokens_out || null,
        model_used: tx.model_used || null
      } : null
    }));
    
    // Calculate summary stats
    const totalCreditsUsed = transactions
      .filter(tx => tx.type === 'use')
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    
    const totalCreditsPurchased = transactions
      .filter(tx => tx.type === 'purchase')
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    logger('info', 'Credit transactions retrieved', { 
      userId, 
      count: transactions.length,
      type: type || 'all',
      requestId 
    });
    
    return c.json(createStandardResponse(true, {
      transactions: formattedTransactions,
      summary: {
        total_used: totalCreditsUsed,
        total_purchased: totalCreditsPurchased
      },
      pagination: {
        limit,
        offset,
        total: parseInt(totalCount),
        hasMore: (offset + limit) < parseInt(totalCount)
      }
    }, undefined, requestId));
    
  } catch (error: any) {
    logger('error', 'Failed to get credit transactions', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, 'Failed to retrieve transactions', requestId), 500);
  }
}
