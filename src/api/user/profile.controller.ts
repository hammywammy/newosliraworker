import type { Context } from 'hono';
import type { Env } from '@/shared/types/index.js';
import { generateRequestId, logger } from '@/shared/utils/logger.util.js';
import { createStandardResponse } from '@/shared/utils/response.util.js';
import { extractUserFromJWT } from '@/shared/utils/auth.util.js';
import { getApiKey } from '@/infrastructure/config/config-manager.js';

/**
 * GET /user/profile
 * Returns current authenticated user's profile information
 */
export async function handleGetUserProfile(c: Context<{ Bindings: Env }>): Promise<Response> {
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
    
    // Fetch user profile from public.users
    const response = await fetch(
      `${supabaseUrl}/rest/v1/users?select=id,email,full_name,created_at,onboarding_completed,signature_name&id=eq.${userId}`,
      { headers }
    );
    
    if (!response.ok) {
      throw new Error(`Database query failed: ${response.status}`);
    }
    
    const users = await response.json() as any[];
    
    if (!Array.isArray(users) || users.length === 0) {
      return c.json(createStandardResponse(false, undefined, 'User not found', requestId), 404);
    }
    
    const user = users[0];
    
    const profileData = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      signature_name: user.signature_name,
      created_at: user.created_at,
      onboarding_completed: user.onboarding_completed
    };
    
    logger('info', 'User profile retrieved', { userId, requestId });
    
    return c.json(createStandardResponse(true, profileData, undefined, requestId));
    
  } catch (error: any) {
    logger('error', 'Failed to get user profile', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, 'Failed to retrieve profile', requestId), 500);
  }
}

/**
 * PATCH /user/profile
 * Updates current user's profile information
 */
export async function handleUpdateUserProfile(c: Context<{ Bindings: Env }>): Promise<Response> {
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
    
    // Parse request body
    const body = await c.req.json() as {
      full_name?: string;
      signature_name?: string;
    };
    
    // Validate at least one field is being updated
    if (!body.full_name && !body.signature_name) {
      return c.json(createStandardResponse(false, undefined, 'No fields to update', requestId), 400);
    }
    
    // Build update object
    const updateData: any = {};
    if (body.full_name) updateData.full_name = body.full_name.trim();
    if (body.signature_name) updateData.signature_name = body.signature_name.trim();
    
    // Get Supabase credentials
    const supabaseUrl = await getApiKey('SUPABASE_URL', c.env, c.env.APP_ENV);
    const serviceRole = await getApiKey('SUPABASE_SERVICE_ROLE', c.env, c.env.APP_ENV);
    
    const headers = {
      'apikey': serviceRole,
      'Authorization': `Bearer ${serviceRole}`,
      'Content-Type': 'application/json'
    };
    
    // Update user profile
    const response = await fetch(
      `${supabaseUrl}/rest/v1/users?id=eq.${userId}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updateData)
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to update profile: ${response.status}`);
    }
    
    logger('info', 'User profile updated', { userId, fields: Object.keys(updateData), requestId });
    
    return c.json(createStandardResponse(true, { updated: true }, 'Profile updated successfully', requestId));
    
  } catch (error: any) {
    logger('error', 'Failed to update user profile', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, 'Failed to update profile', requestId), 500);
  }
}
