import type { Context } from 'hono';
import type { Env, AnalysisRequest, ProfileData, AnalysisResponse } from '@/shared/types/index.js';
import { generateRequestId, logger } from '@/shared/utils/logger.util.js';
import { createStandardResponse } from '@/shared/utils/response.util.js';
import { normalizeRequest } from '@/shared/utils/validation.util.js';
import { saveCompleteAnalysis, updateCreditsAndTransaction, fetchUserAndCredits, fetchBusinessProfile, getLeadIdFromRun } from '@/infrastructure/database/supabase.repository.js';
import { scrapeInstagramProfile } from '@/domain/scraping/instagram-scraper.service.js';
import { preScreenProfile } from '@/domain/ai/prompts.js';
import { DirectAnalysisExecutor } from '@/domain/analysis/direct-analysis.service.js';

export async function handleAnalyze(c: Context<{ Bindings: Env }>): Promise<Response> {
  const requestId = generateRequestId();
  
  try {
    logger('info', 'Analysis request received', { requestId });

    // Parse and validate request
    const body = await c.req.json() as AnalysisRequest;
    const { profile_url, username, analysis_type, business_id, user_id } = normalizeRequest(body);

    // Start all non-dependent operations in parallel
    const [userResult, business] = await Promise.all([
      fetchUserAndCredits(user_id, c.env),
      fetchBusinessProfile(business_id, user_id, c.env)
    ]);

    if (!userResult.isValid) {
      return c.json(createStandardResponse(false, undefined, userResult.error, requestId), 400);
    }

    // Validate analysis type
    if (analysis_type !== 'light') {
      return c.json(createStandardResponse(
        false,
        undefined,
        'Only "light" analysis is supported. Deep and XRay analysis have been removed.',
        requestId
      ), 400);
    }

    // Check credit requirements (always 1 for light)
    const creditCost = 1;
    if (userResult.credits < creditCost) {
      return c.json(createStandardResponse(
        false,
        undefined,
        `Insufficient credits. Required: ${creditCost}, Available: ${userResult.credits}`,
        requestId
      ), 400);
    }

    // Scrape profile with error handling
    let profileData: ProfileData;
try {
  profileData = await scrapeInstagramProfile(username, analysis_type, c.env);
      
      if (!profileData.username) {
        throw new Error('Profile scraping failed - no username returned');
      }
      
      logger('info', 'Profile scraping completed', { 
        username: profileData.username,
        followers: profileData.followersCount,
        dataQuality: profileData.dataQuality,
        requestId
      });
      
} catch (scrapeError: any) {
  logger('error', 'Profile scraping failed', { error: scrapeError.message, requestId });
  
  // If profile not found, charge 1 token before returning error
  if (scrapeError.message.includes('not found') || scrapeError.message.includes('does not exist')) {
    try {
      
      // Charge 1 token for failed lookup
      const failedRunId = 'failed-' + requestId;
      await updateCreditsAndTransaction(
        user_id,
        1, // Cost 1 token
        analysis_type,
        failedRunId,
        {
          actual_cost: 0,
          tokens_in: 0,
          tokens_out: 0,
          model_used: 'none',
          block_type: 'profile_not_found',
          processing_duration_ms: 0
        },
        c.env
      );
      
      logger('info', 'Charged 1 token for profile not found', { username, user_id, requestId });
      
      return c.json(createStandardResponse(
        false, 
        undefined, 
        'User does not exist. 1 token has been charged.', 
        requestId
      ), 404);
    } catch (chargeError: any) {
      logger('error', 'Failed to charge token for not found error', { error: chargeError.message, requestId });
    }
  }
  
  return c.json(createStandardResponse(
    false, 
    undefined, 
    `Profile scraping failed: ${scrapeError.message}`, 
    requestId
  ), 400);
}

    // Pre-screen for light analysis (early exit optimization)
    if (analysis_type === 'light') {
      const preScreen = preScreenProfile(profileData, business);
      
      if (!preScreen.shouldProcess) {
        const earlyResult = {
          run_id: 'pre-screen-' + requestId,
          profile: {
            username: profileData.username,
            displayName: profileData.displayName,
            followersCount: profileData.followersCount,
            isVerified: profileData.isVerified,
            profilePicUrl: profileData.profilePicUrl,
            dataQuality: 'low',
            scraperUsed: profileData.scraperUsed || 'unknown'
          },
          analysis: {
            overall_score: preScreen.earlyScore || 0,
            summary_text: preScreen.reason || 'Pre-screened as low quality',
            type: analysis_type
          },
          credits: { used: 0, remaining: userResult.credits },
          metadata: {
            request_id: requestId,
            analysis_completed_at: new Date().toISOString(),
            schema_version: '3.1',
            system_used: 'pre_screen'
          }
        };
        
        logger('info', 'Profile pre-screened - early exit', { 
          username: profileData.username,
          reason: preScreen.reason,
          score: preScreen.earlyScore
        });
        
        return c.json(createStandardResponse(true, earlyResult, undefined, requestId));
      }
    }
    
// LIGHT ANALYSIS ONLY
let analysisResult;
let costDetails;
let processingTime;

try {
  logger('info', 'Executing light analysis', { requestId });

  const directExecutor = new DirectAnalysisExecutor(c.env, requestId);
  const directResult = await directExecutor.executeLight(profileData, business);

  analysisResult = directResult.analysisData;
  costDetails = directResult.costDetails;
  processingTime = directResult.costDetails.processing_duration_ms;

} catch (analysisError: any) {
  logger('error', 'Light analysis failed', {
    error: analysisError.message,
    requestId
  });
  return c.json(createStandardResponse(
    false,
    undefined,
    `Analysis failed: ${analysisError.message}`,
    requestId
  ), 500);
}

const leadData = {
  user_id,
  business_id,
  username: profileData.username,
  full_name: profileData.displayName,
  profile_pic_url: profileData.profilePicUrl,
  bio: profileData.bio,
  external_url: profileData.externalUrl,
  followersCount: profileData.followersCount,
  followsCount: profileData.followingCount,
  postsCount: profileData.postsCount,
  is_verified: profileData.isVerified,
  is_private: profileData.isPrivate,
  is_business_account: profileData.isBusinessAccount || false,
  profile_url
  // REMOVED: All computed_* fields
};

// ✅ DEFINE enhancedCostDetails BEFORE the try block
const enhancedCostDetails = {
  actual_cost: costDetails.actual_cost,
  tokens_in: costDetails.tokens_in,
  tokens_out: costDetails.tokens_out,
  model_used: costDetails.model_used,
  block_type: costDetails.block_type,
  processing_duration_ms: processingTime,
  blocks_used: [costDetails.block_type]
};

// SAVE TO DATABASE AND UPDATE CREDITS
let run_id: string;
let lead_id: string;
try {
const saveResult = await saveCompleteAnalysis(leadData, analysisResult, analysis_type, c.env);
run_id = saveResult.run_id;
lead_id = saveResult.lead_id;

logger('info', 'Database save successful', { 
  run_id,
  lead_id,
  username: profileData.username 
});

  // Step 2: Update user credits
  await updateCreditsAndTransaction(
    user_id, 
    creditCost, 
    analysis_type, 
    run_id,
    enhancedCostDetails,  // ✅ NOW DEFINED AND ACCESSIBLE
    c.env
  );

  logger('info', 'Credits updated successfully', { 
    user_id, 
    creditCost, 
    run_id,
    lead_id
  });

} catch (saveError: any) {
  logger('error', 'Database save or credit update failed', { 
    error: saveError.message,
    errorStack: saveError.stack,
    username: profileData.username,
    requestId
  });
  return c.json(createStandardResponse(
    false, 
    undefined, 
    `Database operation failed: ${saveError.message}`,
    requestId
  ), 500);
}
    // BUILD RESPONSE
    const responseData: AnalysisResponse = {
      run_id: run_id,
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
        overall_score: analysisResult.overall_score,
        summary_text: analysisResult.summary_text,
        type: analysis_type
      },
      credits: {
        used: creditCost,
        remaining: userResult.credits - creditCost,
        actual_cost: costDetails.actual_cost,
        margin: creditCost - costDetails.actual_cost
      },
      metadata: {
        request_id: requestId,
        analysis_completed_at: new Date().toISOString(),
        schema_version: '3.1',
        system_used: 'direct_analysis',
        performance: {
          processing_duration_ms: processingTime,
          model_used: costDetails.model_used,
          block_type: costDetails.block_type,
          tokens_processed: costDetails.tokens_in + costDetails.tokens_out
        }
      }
    };

    logger('info', 'Analysis completed successfully', { 
      run_id, 
      lead_id,
      username: profileData.username, 
      overall_score: analysisResult.score,
      confidence: analysisResult.confidence_level,
      dataQuality: profileData.dataQuality,
      system: 'direct_analysis',
      processing_time: processingTime,
      actual_cost: costDetails.actual_cost
    });

    return c.json(createStandardResponse(true, responseData, undefined, requestId));

  } catch (error: any) {
    logger('error', 'Analysis request failed', { error: error.message, requestId });
    return c.json(createStandardResponse(false, undefined, error.message, requestId), 500);
  }
}
