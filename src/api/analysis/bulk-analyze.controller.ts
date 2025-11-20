import { Context } from 'hono';
import type { Env, BulkAnalysisRequest, BulkAnalysisResult, AnalysisResponse, AnalysisType } from '@/shared/types/index.js';
import { generateRequestId, logger } from '@/shared/utils/logger.util.js';
import { createStandardResponse } from '@/shared/utils/response.util.js';
import { updateCreditsAndTransaction, fetchUserAndCredits, fetchBusinessProfile } from '@/infrastructure/database/supabase.repository.js';
import { extractUsername, normalizeRequest } from '@/shared/utils/validation.util.js';
import { getApiKey } from '@/infrastructure/config/config-manager.js';
import { scrapeInstagramProfile } from '@/domain/scraping/instagram-scraper.service.js';
import { DirectAnalysisExecutor } from '@/domain/analysis/direct-analysis.service.js';
import { UniversalAIAdapter } from '@/domain/ai/universal-adapter.service.js';

// SIMPLIFIED: Only light analysis is supported
const batchSizes: Record<AnalysisType, number> = {
  light: 5
};

// FIX: Add missing helper functions
function buildBatchLightAnalysisPrompt(profiles: string[], business: any): string {
  const profilesList = profiles.map((username, i) => `${i + 1}. @${username}`).join('\n');
  
  return `Analyze these ${profiles.length} Instagram profiles for partnership with ${business.name || business.business_name}:

${profilesList}

Business Context:
- Industry: ${business.industry || business.business_niche || 'Not specified'}
- Target Audience: ${business.target_audience || 'General'}
- Value Proposition: ${business.value_proposition || business.business_one_liner || 'Not specified'}

For each profile, return a JSON object with:
- username: string
- score: number (0-100)
- summary: string (brief reason for score)
- confidence: number (0.0-1.0)

Return as array: [{ username, score, summary, confidence }, ...]`;
}

function parseBatchResults(batchResult: any): any[] {
  try {
    // Parse the AI response which should be JSON array
    const content = batchResult.content || batchResult;
    const parsed = typeof content === 'string' ? JSON.parse(content) : content;
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    logger('error', 'Failed to parse batch results', { error });
    return [];
  }
}

async function processIndividually(
  profiles: string[], 
  analysisType: AnalysisType, 
  context: any
): Promise<any[]> {
  const results = [];
  
  for (const username of profiles) {
    try {
      const result = await analyzeProfile(username, analysisType, context);
      results.push({ success: true, username, result });
    } catch (error: any) {
      logger('error', 'Individual analysis failed', { username, error: error.message });
      results.push({ success: false, username, error: error.message });
    }
  }
  
  return results;
}

// Main analysis function (called by both batch and individual processing)
async function analyzeProfile(
  username: string,
  analysisType: AnalysisType,
  context: any
): Promise<AnalysisResponse> {
  logger('info', 'Analyzing profile', { username, analysisType });
  
  // STEP 1: Scrape profile
  const profileData = await scrapeInstagramProfile(username, analysisType, context.env);
  
  // STEP 2: Direct analysis
  const directExecutor = new DirectAnalysisExecutor(context.env, context.requestId);
  
  // Only light analysis is supported
  if (analysisType !== 'light') {
    throw new Error('Only "light" analysis is supported');
  }

  const directResult = await directExecutor.executeLight(profileData, context.business);

  // STEP 3: Build response
  const analysisResult: AnalysisResponse = {
    run_id: `bulk-${Date.now()}-${username}`,
    profile: {
      username: profileData.username,
      displayName: profileData.displayName,
      followersCount: profileData.followersCount,
      isVerified: profileData.isVerified,
      profilePicUrl: profileData.profilePicUrl,
      dataQuality: profileData.dataQuality || 'medium',
      scraperUsed: profileData.scraperUsed || 'unknown'
    },
    analysis: {
      overall_score: directResult.analysisData.overall_score,
      summary_text: directResult.analysisData.summary_text,
      type: analysisType
    },
    credits: {
      used: 1, // Always 1 for light
      remaining: context.userCredits - 1,
      actual_cost: directResult.costDetails.actual_cost
    },
    metadata: {
      request_id: context.requestId,
      analysis_completed_at: new Date().toISOString(),
      schema_version: '3.1',
      system_used: 'bulk_direct'
    }
  };
  
  return analysisResult;
}

export async function handleBulkAnalyze(c: Context<{ Bindings: Env }>): Promise<Response> {
  const requestId = generateRequestId();
  
  try {
    logger('info', 'Bulk analysis request received', { requestId });

    //NEEDS PROPER IMPLEMENTATION
    // Group profiles by analysis type and process in batches
const batchAnalyze = async (profiles: string[], analysisType: string, context: any) => {
  // ✅ FIX: Instantiate aiAdapter in scope
  const aiAdapter = new UniversalAIAdapter(context.env, context.requestId);
  
  // For light analysis, batch multiple profiles in single AI call
  if (analysisType === 'light' && profiles.length > 1) {
    const batchSize = 5;
    const batches = [];
    
    for (let i = 0; i < profiles.length; i += batchSize) {
      const batch = profiles.slice(i, i + batchSize);
      const batchPrompt = buildBatchLightAnalysisPrompt(batch, context.business);
      
      // Single AI call for multiple profiles
      const batchResult = await aiAdapter.executeRequest({
        model_name: 'gpt-5-mini',
        system_prompt: 'Analyze multiple profiles efficiently',
        user_prompt: batchPrompt,
        max_tokens: 2000 * batch.length,
        response_format: 'json'
      });
      
      batches.push(parseBatchResults(batchResult));
    }
    
    return batches.flat();
  }
  
  // Fall back to individual processing for deep/xray
  return processIndividually(profiles, analysisType as AnalysisType, context); // ✅ FIX: Type assertion
};


    function createSmartBatches(profiles: string[], analysisType: string): string[][] {
  // Conservative batching for light analysis
  const batchSizes: Record<string, number> = {
    light: 8   // Light analysis is fast, bigger batches
  };
  
  const batchSize = batchSizes[analysisType] || 5;
  const batches = [];
  
  for (let i = 0; i < profiles.length; i += batchSize) {
    batches.push(profiles.slice(i, i + batchSize));
  }
  
  logger('info', 'Smart batching created', {
    totalProfiles: profiles.length,
    batchSize,
    batchCount: batches.length,
    analysisType
  });
  
  return batches;
    }
    
    // Parse and validate request
    const body = await c.req.json() as BulkAnalysisRequest;
    const { profiles, analysis_type, business_id, user_id } = body;

    // Basic validation
    if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
      return c.json(createStandardResponse(false, undefined, 'profiles array is required and cannot be empty', requestId), 400);
    }

    if (!analysis_type || analysis_type !== 'light') {
      return c.json(createStandardResponse(false, undefined, 'analysis_type must be "light". Deep and XRay have been removed.', requestId), 400);
    }

    if (!business_id || !user_id) {
      return c.json(createStandardResponse(false, undefined, 'business_id and user_id are required', requestId), 400);
    }

    const profileCount = profiles.length;
    if (profileCount > 50) {
      return c.json(createStandardResponse(false, undefined, 'Maximum 50 profiles per bulk request', requestId), 400);
    }

    // Validate user and fetch business profile
    const [userResult, business] = await Promise.all([
      fetchUserAndCredits(user_id, c.env),
      fetchBusinessProfile(business_id, user_id, c.env)
    ]);
    
    if (!userResult.isValid) {
      return c.json(createStandardResponse(false, undefined, userResult.error, requestId), 400);
    }

    // Check credit requirements (always 1 for light)
    const creditCostPerAnalysis = 1;
    const totalCreditCost = profileCount * creditCostPerAnalysis;
    
    if (userResult.credits < totalCreditCost) {
      return c.json(createStandardResponse(false, undefined, `Insufficient credits. Need ${totalCreditCost}, have ${userResult.credits}`, requestId), 402);
    }

    logger('info', 'User validation passed for bulk analysis', { 
      userId: user_id, 
      credits: userResult.credits, 
      totalCreditCost,
      profileCount
    });

// Process profiles with smart batching
    const results: AnalysisResponse[] = [];
    const errors: Array<{ profile: string; error: string }> = [];
    
    const smartBatches = createSmartBatches(profiles, analysis_type);
    const processingContext = { user_id, business_id, business, env: c.env, requestId };

    for (let batchIndex = 0; batchIndex < smartBatches.length; batchIndex++) {
      const batch = smartBatches[batchIndex];
      
      logger('info', `Processing batch ${batchIndex + 1}/${smartBatches.length}`, {
        batchSize: batch.length,
        analysisType: analysis_type
      });

      const batchPromises = batch.map(async (profile) => {
        try {
          const result = await processProfileComplete(profile, analysis_type, processingContext);
          return { success: true, result };
          
        } catch (error: any) {
          logger('error', `Profile analysis failed`, { profile, error: error.message });
          return { success: false, profile, error: error.message };
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Collect results
      batchResults.forEach(batchResult => {
        if (batchResult.success && batchResult.result) {  // ✅ FIX: Add null check
          results.push(batchResult.result);
        } else if (batchResult.profile && batchResult.error) {  // ✅ FIX: Add null check
          errors.push({ profile: batchResult.profile, error: batchResult.error });
        }
      });

      // Brief pause between batches to avoid overwhelming APIs
      if (batchIndex < smartBatches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      logger('info', `Batch ${batchIndex + 1} completed`, {
        successful: results.length,
        errors: errors.length,
        remaining: profiles.length - (results.length + errors.length)
      });
    }

// Track bulk usage (add before credit deduction)
const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
const supabaseUrl = await getApiKey('SUPABASE_URL', c.env, c.env.APP_ENV);
const serviceRole = await getApiKey('SUPABASE_SERVICE_ROLE', c.env, c.env.APP_ENV);

for (const result of results) {
  const score = Math.round(result.analysis?.overall_score || 0);
  const creditCost = 1; // Always 1 for light
  
  const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/increment_usage_tracking`, {
    method: 'POST',
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      p_user_id: user_id,
      p_business_id: business_id,
      p_month: currentMonth,
      p_analysis_type: analysis_type,
      p_credit_cost: creditCost,
      p_lead_score: score,
      p_analysis_method: 'bulk'
    })
  });

  if (!rpcResponse.ok) {
    const errorText = await rpcResponse.text();
    logger('error', 'Bulk usage tracking RPC failed', { 
      status: rpcResponse.status,
      error: errorText,
      username: result.profile?.username,
      requestId
    });
  } else {
    logger('info', 'Bulk usage tracked', { 
      username: result.profile?.username,
      score,
      creditCost,
      requestId
    });
  }
}

logger('info', 'Bulk usage tracking completed', { 
  count: results.length,
  month: currentMonth,
  requestId
});
    // Calculate final costs
    const costDetails = calculateBulkCosts(results);
    const creditsUsed = costDetails.totalCredits;

    // Update credits for all successful analyses
    if (creditsUsed > 0) {
      try {
        await updateCreditsAndTransaction(
          user_id,
          creditsUsed,
          `Bulk ${analysis_type} analysis - ${results.length} profiles`,
          'bulk_analysis_run',
          {
            actual_cost: costDetails.totalActualCost,
            tokens_in: 0, // Bulk doesn't track individual tokens
            tokens_out: 0,
            model_used: 'bulk_pipeline',
            block_type: 'bulk_analysis'
          },
          c.env
        );
        logger('info', 'Bulk credits updated successfully', { 
          creditsUsed, 
          remainingCredits: userResult.credits - creditsUsed 
        });
      } catch (creditError: any) {
        logger('error', 'Bulk credit update failed', { error: creditError.message });
        // Don't fail the entire request for credit logging issues
      }
    }

    // Build final response
    const bulkResult: BulkAnalysisResult = {
      total_requested: profileCount,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
      credits_used: creditsUsed,
      credits_remaining: userResult.credits - creditsUsed
    };

    logger('info', 'Bulk analysis completed', { 
      requestId,
      totalRequested: profileCount,
      successful: results.length,
      failed: errors.length,
      creditsUsed
    });

    return c.json(createStandardResponse(true, bulkResult, undefined, requestId));

  } catch (error: any) {
    logger('error', 'Bulk analysis request failed', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, error.message, requestId), 500);
  }
}

// ===============================================================================
// HELPER FUNCTIONS - REPLACE PROFILE-PROCESSOR
// ===============================================================================

async function processProfileComplete(
  profileUrl: string, 
  analysisType: string, 
  context: { user_id: string, business_id: string, business: any, env: any, requestId: string }
): Promise<AnalysisResponse> {
  try {
    const username = extractUsername(profileUrl);
    logger('info', 'Bulk processing profile', { username, analysisType });

    // STEP 1: Scrape profile
    const profileData = await scrapeInstagramProfile(username, analysisType as any, context.env);

    // STEP 2: Direct analysis (no pipeline overhead)
    const directExecutor = new DirectAnalysisExecutor(context.env, context.requestId);
    
    // Only light analysis is supported
    if (analysisType !== 'light') {
      throw new Error('Only "light" analysis is supported');
    }

    const directResult = await directExecutor.executeLight(profileData, context.business);

    // STEP 3: Build response (simplified)
    const analysisResult: AnalysisResponse = {
      run_id: `bulk-${Date.now()}-${username}`,
      profile: {
        username: profileData.username,
        displayName: profileData.displayName,
        followersCount: profileData.followersCount,
        isVerified: profileData.isVerified,
        profilePicUrl: profileData.profilePicUrl,
        dataQuality: profileData.dataQuality || 'medium',
        scraperUsed: profileData.scraperUsed || 'unknown'
      },
      analysis: {
        overall_score: directResult.analysisData.overall_score,
        summary_text: directResult.analysisData.summary_text,
        type: analysisType as any
      },
      credits: {
        used: 1, // Always 1 for light
        remaining: 0, // Will be calculated in bulk handler
        actual_cost: directResult.costDetails.actual_cost
      },
      metadata: {
        request_id: context.requestId,
        analysis_completed_at: new Date().toISOString(),
        schema_version: '3.1',
        system_used: 'bulk_direct'
      }
    };

    return analysisResult;

  } catch (error: any) {
    logger('error', 'Bulk profile processing failed', { 
      profileUrl, 
      error: error.message,
      requestId: context.requestId 
    });
    throw error;
  }
}
function calculateBulkCosts(results: AnalysisResponse[]): {
  totalCredits: number;
  totalActualCost: number;
  avgCostPerAnalysis: number;
  creditEfficiency: number;
} {
  if (results.length === 0) {
    return {
      totalCredits: 0,
      totalActualCost: 0,
      avgCostPerAnalysis: 0,
      creditEfficiency: 0
    };
  }

  const totalCredits = results.reduce((sum, result) => sum + (result.credits?.used || 0), 0);
  const totalActualCost = results.reduce((sum, result) => sum + (result.credits?.actual_cost || 0), 0);
  const avgCostPerAnalysis = totalCredits / results.length;
  const creditEfficiency = totalActualCost > 0 ? (totalCredits / totalActualCost) : 0;

  return {
    totalCredits,
    totalActualCost,
    avgCostPerAnalysis: Math.round(avgCostPerAnalysis * 100) / 100,
    creditEfficiency: Math.round(creditEfficiency * 100) / 100
  };
}
