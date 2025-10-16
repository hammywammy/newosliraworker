import { Hono } from 'hono';
import { cors } from 'hono/cors'; 
import type { Env } from '@/shared/types/index.js';
import { generateRequestId, logger } from '@/shared/utils/logger.util.js';
import { createStandardResponse } from '@/shared/utils/response.util.js';
import { handlePublicConfig } from '@/api/config/public-config.controller.js';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'apikey'],
  credentials: false
}));

// ===============================================================================
// BASIC ENDPOINTS
// ===============================================================================
app.get('/config/public', handlePublicConfig);

app.get('/', (c) => {
  return c.json({
    status: 'healthy',
    service: 'OSLIRA Enterprise Analysis API - RESTRUCTURED',
    version: 'v4.0.0-enterprise',
    timestamp: new Date().toISOString(),
    architecture: 'modular_monolith',
    features: [
      'domain_driven_design',
      'lazy_loading',
      'path_aliases',
      'enterprise_grade'
    ]
  });
});

app.get('/health', (c) => c.json({ 
  status: 'healthy', 
  timestamp: new Date().toISOString(),
  environment: c.env.APP_ENV || 'NOT_SET',
  hasAWSKey: !!c.env.AWS_ACCESS_KEY_ID,
  hasAWSSecret: !!c.env.AWS_SECRET_ACCESS_KEY,
  region: c.env.AWS_REGION || 'NOT_SET'
}));

// ===============================================================================
// CONFIG ENDPOINTS
// ===============================================================================

app.get('/config', async (c) => {
  const { handlePublicConfig } = await import('@/api/config/public-config.controller.js');
  return handlePublicConfig(c);
});

app.get('/api/public-config', async (c) => {
  const { handlePublicConfig } = await import('@/api/config/public-config.controller.js');
  return handlePublicConfig(c);
});

// ===============================================================================
// ANALYSIS ENDPOINTS
// ===============================================================================

app.post('/v1/analyze', async (c) => {
  const { handleAnalyze } = await import('@/api/analysis/analyze.controller.js');
  return handleAnalyze(c);
});

app.post('/v1/analyze-anonymous', async (c) => {
  const { handleAnonymousAnalyze } = await import('@/api/analysis/anonymous-analyze.controller.js');
  return handleAnonymousAnalyze(c);
});

app.post('/v1/bulk-analyze', async (c) => {
  const { handleBulkAnalyze } = await import('@/api/analysis/bulk-analyze.controller.js');
  return handleBulkAnalyze(c);
});

app.post('/v1/generate-business-context', async (c) => {
  const { handleGenerateBusinessContext } = await import('@/api/analysis/generate-business-context.controller.js');
  return handleGenerateBusinessContext(c);
});

// ===============================================================================
// BUSINESS PROFILE ENDPOINTS
// ===============================================================================

app.post('/business-profiles', async (c) => {
  const { handleBusinessProfiles } = await import('@/api/business/profiles.controller.js');
  return handleBusinessProfiles(c);
});

app.get('/business-profiles', async (c) => {
  const { handleBusinessProfiles } = await import('@/api/business/profiles.controller.js');
  return handleBusinessProfiles(c);
});

app.get('/business-profiles/:id', async (c) => {
  const { handleBusinessProfiles } = await import('@/api/business/profiles.controller.js');
  return handleBusinessProfiles(c);
});

app.put('/business-profiles/:id', async (c) => {
  const { handleBusinessProfiles } = await import('@/api/business/profiles.controller.js');
  return handleBusinessProfiles(c);
});

app.delete('/business-profiles/:id', async (c) => {
  const { handleBusinessProfiles } = await import('@/api/business/profiles.controller.js');
  return handleBusinessProfiles(c);
});

// ===============================================================================
// BILLING ENDPOINTS
// ===============================================================================

app.post('/stripe-webhook', async (c) => {
  const { handleStripeWebhook } = await import('@/api/billing/stripe.controller.js');
  return handleStripeWebhook(c);
});

app.post('/billing/create-checkout-session', async (c) => {
  const { handleCreateCheckoutSession } = await import('@/api/billing/stripe.controller.js');
  return handleCreateCheckoutSession(c);
});

app.post('/billing/create-portal-session', async (c) => {
  const { handleCreatePortalSession } = await import('@/api/billing/stripe.controller.js');
  return handleCreatePortalSession(c);
});

// ===============================================================================
// ANALYTICS ENDPOINTS
// ===============================================================================

app.get('/analytics/summary', async (c) => {
  const { handleAnalyticsSummary } = await import('@/api/analytics/analytics.controller.js');
  return handleAnalyticsSummary(c);
});

app.post('/ai/generate-insights', async (c) => {
  const { handleGenerateInsights } = await import('@/api/analytics/analytics.controller.js');
  return handleGenerateInsights(c);
});

// ===============================================================================
// ADMIN ENDPOINTS
// ===============================================================================

// Admin password verification (no JWT required)
app.post('/admin/verify-password', async (c) => {
  const { handleAdminRequest } = await import('@/api/admin/admin.controller.js');
  return handleAdminRequest(c);
});

// Admin session validation
app.get('/admin/validate-session', async (c) => {
  const { handleAdminRequest } = await import('@/api/admin/admin.controller.js');
  return handleAdminRequest(c);
});

// Admin overview
app.get('/admin/overview', async (c) => {
  const { handleAdminRequest } = await import('@/api/admin/admin.controller.js');
  return handleAdminRequest(c);
});

// Admin users management
app.get('/admin/users', async (c) => {
  const { handleAdminRequest } = await import('@/api/admin/admin.controller.js');
  return handleAdminRequest(c);
});

app.get('/admin/users/search', async (c) => {
  const { handleAdminRequest } = await import('@/api/admin/admin.controller.js');
  return handleAdminRequest(c);
});

app.get('/admin/users/:id', async (c) => {
  const { handleAdminRequest } = await import('@/api/admin/admin.controller.js');
  return handleAdminRequest(c);
});

app.post('/admin/users/:id/update-credits', async (c) => {
  const { handleAdminRequest } = await import('@/api/admin/admin.controller.js');
  return handleAdminRequest(c);
});

app.post('/admin/users/:id/toggle-admin', async (c) => {
  const { handleAdminRequest } = await import('@/api/admin/admin.controller.js');
  return handleAdminRequest(c);
});

app.post('/admin/users/:id/suspend', async (c) => {
  const { handleAdminRequest } = await import('@/api/admin/admin.controller.js');
  return handleAdminRequest(c);
});

// Admin businesses management
app.get('/admin/businesses', async (c) => {
  const { handleAdminRequest } = await import('@/api/admin/admin.controller.js');
  return handleAdminRequest(c);
});

app.get('/admin/businesses/search', async (c) => {
  const { handleAdminRequest } = await import('@/api/admin/admin.controller.js');
  return handleAdminRequest(c);
});

app.get('/admin/businesses/:id/analytics', async (c) => {
  const { handleAdminRequest } = await import('@/api/admin/admin.controller.js');
  return handleAdminRequest(c);
});

// Admin analytics sections
app.get('/admin/revenue', async (c) => {
  const { handleAdminRequest } = await import('@/api/admin/admin.controller.js');
  return handleAdminRequest(c);
});

app.get('/admin/usage', async (c) => {
  const { handleAdminRequest } = await import('@/api/admin/admin.controller.js');
  return handleAdminRequest(c);
});

app.get('/admin/system', async (c) => {
  const { handleAdminRequest } = await import('@/api/admin/admin.controller.js');
  return handleAdminRequest(c);
});

app.get('/admin/leads', async (c) => {
  const { handleAdminRequest } = await import('@/api/admin/admin.controller.js');
  return handleAdminRequest(c);
});

// Enhanced admin endpoints
app.post('/admin/migrate-to-aws', async (c) => {
  const { handleMigrateToAWS } = await import('@/api/admin/enhanced-admin.controller.js');
  return handleMigrateToAWS(c);
});

app.post('/admin/update-key', async (c) => {
  const { handleUpdateApiKey } = await import('@/api/admin/enhanced-admin.controller.js');
  return handleUpdateApiKey(c);
});

app.get('/admin/config-status', async (c) => {
  const { handleGetConfigStatus } = await import('@/api/admin/enhanced-admin.controller.js');
  return handleGetConfigStatus(c);
});

app.get('/admin/audit-log', async (c) => {
  const { handleGetAuditLog } = await import('@/api/admin/enhanced-admin.controller.js');
  return handleGetAuditLog(c);
});

app.post('/admin/test-key', async (c) => {
  const { handleTestApiKey } = await import('@/api/admin/enhanced-admin.controller.js');
  return handleTestApiKey(c);
});

// ===============================================================================
// LEADS ENDPOINTS
// ===============================================================================

app.get('/v1/leads/dashboard', async (c) => {
  const { handleGetDashboardLeads } = await import('@/api/leads/dashboard.controller.js');
  return handleGetDashboardLeads(c);
});

// ===============================================================================
// DEBUG ENDPOINTS
// ===============================================================================

app.post('/debug/scraper-data-test', async (c) => {
  const { handleScraperDataTest } = await import('@/api/debug/scraper-test.controller.js');
  return handleScraperDataTest(c);
});

app.post('/debug/clear-rate-limit', async (c) => {
  const clientIP = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
  const key = `rate_limit:${clientIP}`;
  await c.env.OSLIRA_KV.delete(key);
  return c.json({ success: true, message: `Rate limit cleared for ${clientIP}` });
});

// ===============================================================================
// ERROR HANDLING
// ===============================================================================

app.onError((err, c) => {
  const requestId = generateRequestId();
  logger('error', 'Unhandled enterprise worker error', { 
    error: err.message, 
    stack: err.stack, 
    requestId 
  });
  
  return c.json(createStandardResponse(false, undefined, 'Internal server error', requestId), 500);
});

app.notFound(c => {
  const requestId = generateRequestId();
  
  return c.json({
    success: false,
    error: 'Endpoint not found',
    requestId,
    timestamp: new Date().toISOString(),
    version: 'v4.0.0-enterprise',
    architecture: 'modular_monolith',
    available_endpoints: [
      'GET / - Health check',
      'GET /health - Detailed health status',
      'GET /config - Public configuration',
      'POST /v1/analyze - Single analysis',
      'POST /v1/analyze-anonymous - Anonymous analysis',
      'POST /v1/bulk-analyze - Bulk analysis',
      'POST /v1/generate-business-context - Business context generation',
      'POST /business-profiles - Create business profile',
      'GET /business-profiles - List business profiles',
      'POST /stripe-webhook - Stripe webhook handler',
      'POST /billing/* - Billing endpoints',
      'GET /analytics/* - Analytics endpoints',
      'GET /admin/* - Admin endpoints',
      'GET /v1/leads/dashboard - Dashboard leads',
      'POST /debug/* - Debug endpoints'
    ]
  }, 404);
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      return await app.fetch(request, env, ctx);
    } catch (error: any) {
      console.error('❌ Worker crashed:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Worker initialization failed',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        version: 'v4.0.0-enterprise'
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};
