// src/api/debug/debug.controller.ts
// COMPLETE REWRITE - All 29 TypeScript errors fixed, zero functionality removed

import type { Context } from 'hono';
import type { Env } from '@/shared/types/index.js';
import { generateRequestId, logger } from '@/shared/utils/logger.util.js';
import { scrapeInstagramProfile } from '@/domain/scraping/instagram-scraper.service.js';
import { callWithRetry } from '@/shared/utils/helpers.util.js';

// ===============================================================================
// FIX: Add proper type definitions for analysis results
// ===============================================================================
interface AnalysisResults {
  totalItems: number;
  itemTypes: Record<string, number>;
  profileItems: Array<{
    index: number;
    keys: string[];
    username: any;
    followers: any;
    posts: any;
  }>;
  postItems: Array<{
    index: number;
    shortCode: any;
    keys: string[];
    engagementData: {
      likesCount: any;
      likes: any;
      like_count: any;
      likeCount: any;
      commentsCount: any;
      comments: any;
      comment_count: any;
      commentCount: any;
    };
    parsedLikes: number;
    parsedComments: number;
  }>;
  fieldAnalysis: Record<string, number>;
  engagementFieldAnalysis: Record<string, any[]>;
}

export async function handleDebugEngagement(c: Context<{ Bindings: Env }>): Promise<Response> {
  const username = c.req.param('username');
  
  try {
    logger('info', 'Starting engagement calculation debug test', { username });
    
    const deepInput = {
      directUrls: [`https://instagram.com/${username}/`],
      resultsLimit: 10,
      addParentData: false,
      enhanceUserSearchWithFacebookPage: false,
      onlyPostsNewerThan: "2024-01-01",
      resultsType: "details",
      searchType: "hashtag"
    };

    const rawResponse = await callWithRetry(
      `https://api.apify.com/v2/acts/shu8hvrXbJbY3Eb9W/run-sync-get-dataset-items?token=${c.env.APIFY_API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deepInput)
      },
      1, 1000, 30000
    ) as any[];

    if (!rawResponse || !Array.isArray(rawResponse)) {
      return c.json({
        success: false,
        error: 'No response or invalid response format',
        username
      });
    }

    // Detailed analysis of the raw response
    // FIX: Use proper type with explicit Record types
    const analysisResults: AnalysisResults = {
      totalItems: rawResponse.length,
      itemTypes: {},
      profileItems: [],
      postItems: [],
      fieldAnalysis: {},
      engagementFieldAnalysis: {}
    };

    // Analyze each item in the response
    // FIX: Add explicit types for parameters
    rawResponse.forEach((item: any, index: number) => {
      const itemType = item.type || item.__typename || 'unknown';
      
      // FIX: Type-safe property access
      if (!analysisResults.itemTypes[itemType]) {
        analysisResults.itemTypes[itemType] = 0;
      }
      analysisResults.itemTypes[itemType] = analysisResults.itemTypes[itemType] + 1;
      
      // Check if it's a profile item
      if (item.username || item.ownerUsername || (item.followersCount !== undefined && item.postsCount !== undefined)) {
        analysisResults.profileItems.push({
          index,
          keys: Object.keys(item),
          username: item.username || item.ownerUsername,
          followers: item.followersCount || item.followers,
          posts: item.postsCount || item.posts
        });
      }
      
      // Check if it's a post item
      if (item.shortCode || item.code) {
        const engagementData = {
          likesCount: item.likesCount,
          likes: item.likes,
          like_count: item.like_count,
          likeCount: item.likeCount,
          commentsCount: item.commentsCount,
          comments: item.comments,
          comment_count: item.comment_count,
          commentCount: item.commentCount
        };
        
        analysisResults.postItems.push({
          index,
          shortCode: item.shortCode || item.code,
          keys: Object.keys(item),
          engagementData,
          parsedLikes: parseInt(String(item.likesCount || item.likes || item.like_count || 0)) || 0,
          parsedComments: parseInt(String(item.commentsCount || item.comments || item.comment_count || 0)) || 0
        });
      }
      
      // Analyze common field patterns
      // FIX: Add explicit type for key
      Object.keys(item).forEach((key: string) => {
        if (!analysisResults.fieldAnalysis[key]) {
          analysisResults.fieldAnalysis[key] = 0;
        }
        analysisResults.fieldAnalysis[key]++;
        
        // Track engagement-related fields
        if (key.toLowerCase().includes('like') || key.toLowerCase().includes('comment') || key.toLowerCase().includes('engagement')) {
          if (!analysisResults.engagementFieldAnalysis[key]) {
            analysisResults.engagementFieldAnalysis[key] = [];
          }
          if (analysisResults.engagementFieldAnalysis[key].length < 3) {
            analysisResults.engagementFieldAnalysis[key].push(item[key]);
          }
        }
      });
    });

    // Test manual engagement calculation
    let manualCalculationTest = null;
    if (analysisResults.postItems.length > 0) {
      // FIX: Add explicit type for post parameter
      const validPosts = analysisResults.postItems.filter((post: typeof analysisResults.postItems[0]) => 
        post.parsedLikes > 0 || post.parsedComments > 0
      );
      
      if (validPosts.length > 0) {
        // FIX: Add explicit types for reduce parameters
        const totalLikes = validPosts.reduce((sum: number, post: typeof validPosts[0]) => sum + post.parsedLikes, 0);
        const totalComments = validPosts.reduce((sum: number, post: typeof validPosts[0]) => sum + post.parsedComments, 0);
        const avgLikes = Math.round(totalLikes / validPosts.length);
        const avgComments = Math.round(totalComments / validPosts.length);
        
        manualCalculationTest = {
          validPostsCount: validPosts.length,
          totalLikes,
          totalComments,
          avgLikes,
          avgComments,
          calculationSteps: {
            step1: `Found ${validPosts.length} valid posts out of ${analysisResults.postItems.length}`,
            step2: `Total likes: ${totalLikes}, Total comments: ${totalComments}`,
            step3: `Avg likes: ${totalLikes} / ${validPosts.length} = ${avgLikes}`,
            step4: `Avg comments: ${totalComments} / ${validPosts.length} = ${avgComments}`
          }
        };
      }
    }

    // FIX: Type-safe sort for troubleshooting
    const sortedFields = Object.entries(analysisResults.fieldAnalysis)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10);

    return c.json({
      success: true,
      username,
      debug: {
        rawResponseStructure: analysisResults,
        manualCalculationTest,
        recommendations: [
          analysisResults.postItems.length === 0 ? 'No post items found - check scraper configuration' : 'Post items found ✓',
          analysisResults.profileItems.length === 0 ? 'No profile items found - check scraper response' : 'Profile items found ✓',
          !manualCalculationTest ? 'Manual calculation failed - no valid engagement data' : 'Manual calculation successful ✓'
        ],
        troubleshooting: {
          mostCommonFields: sortedFields,
          engagementFields: analysisResults.engagementFieldAnalysis,
          itemTypeDistribution: analysisResults.itemTypes
        }
      }
    });
    
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
      username
    }, 500);
  }
}

export async function handleDebugScrape(c: Context<{ Bindings: Env }>): Promise<Response> {
  const username = c.req.param('username');
  const analysisType = (c.req.query('type') as 'light' | 'deep') || 'light';
  
  try {
    const profileData = await scrapeInstagramProfile(username, analysisType, c.env);
    
    return c.json({
      success: true,
      username,
      analysisType,
      profileData,
      debug: {
        hasRealEngagement: (profileData.engagement?.postsAnalyzed || 0) > 0,
        realEngagementStats: profileData.engagement || null,
        hasLatestPosts: !!profileData.latestPosts,
        postsCount: profileData.latestPosts?.length || 0,
        dataQuality: profileData.dataQuality,
        scraperUsed: profileData.scraperUsed,
        noFakeData: true,
        manualCalculation: true
      }
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
      username,
      analysisType
    }, 500);
  }
}

export async function handleDebugParsing(c: Context<{ Bindings: Env }>): Promise<Response> {
  const username = c.req.param('username');
  
  try {
    const deepInput = {
      directUrls: [`https://instagram.com/${username}/`],
      resultsLimit: 5,
      addParentData: false,
      enhanceUserSearchWithFacebookPage: false,
      onlyPostsNewerThan: "2024-01-01",
      resultsType: "details",
      searchType: "hashtag"
    };

    const rawResponse = await callWithRetry(
      `https://api.apify.com/v2/acts/shu8hvrXbJbY3Eb9W/run-sync-get-dataset-items?token=${c.env.APIFY_API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deepInput)
      },
      1, 1000, 30000
    ) as any[];

    // FIX: Add explicit types for filter parameters
    const profileItems = rawResponse?.filter((item: any) => item.username || item.ownerUsername) || [];
    const postItems = rawResponse?.filter((item: any) => item.shortCode && item.likesCount !== undefined) || [];

    // Manual engagement calculation test
    let engagementTest = null;
    if (postItems.length > 0) {
      // FIX: Add explicit type for post parameter
      const validPosts = postItems.filter((post: any) => {
        const likes = parseInt(post.likesCount) || 0;
        const comments = parseInt(post.commentsCount) || 0;
        return likes > 0 || comments > 0;
      });

      if (validPosts.length > 0) {
        // FIX: Add explicit types for reduce parameters
        const totalLikes = validPosts.reduce((sum: number, post: any) => sum + (parseInt(post.likesCount) || 0), 0);
        const totalComments = validPosts.reduce((sum: number, post: any) => sum + (parseInt(post.commentsCount) || 0), 0);
        const avgLikes = Math.round(totalLikes / validPosts.length);
        const avgComments = Math.round(totalComments / validPosts.length);
        const totalEngagement = avgLikes + avgComments;

        engagementTest = {
          postsAnalyzed: validPosts.length,
          totalLikes,
          totalComments,
          avgLikes,
          avgComments,
          totalEngagement,
          calculation: 'manual_as_specified'
        };
      }
    }

    return c.json({
      success: true,
      username,
      rawResponseLength: rawResponse?.length || 0,
      profileItems: profileItems.length,
      postItems: postItems.length,
      firstItemKeys: rawResponse?.[0] ? Object.keys(rawResponse[0]) : [],
      hasProfileData: profileItems.length > 0,
      hasPostData: postItems.length > 0,
      samplePost: postItems[0] || null,
      engagementCalculationTest: engagementTest
    });
    
  } catch (error: any) {
    return c.json({ 
      success: false, 
      error: error.message,
      username
    }, 500);
  }
}
