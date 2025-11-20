import type { ProfileData, BusinessProfile } from '@/shared/types/index.js';

// ===============================================================================
// LIGHT ANALYSIS SCHEMA (ONLY)
// ===============================================================================

export function getLightAnalysisJsonSchema() {
  return {
    name: 'LightAnalysisResult',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        overall_score: { type: 'integer', minimum: 0, maximum: 100 },
        summary_text: { type: 'string', maxLength: 300 }
      },
      required: ['overall_score', 'summary_text']
    }
  };
}

// ===============================================================================
// LIGHT ANALYSIS PROMPT (ONLY)
// ===============================================================================

export function buildSpeedLightAnalysisPrompt(
  profile: ProfileData,
  business: BusinessProfile
): string {
  const posts = profile.latestPosts?.slice(0, 6).map((p, i) =>
    `${i+1}. "${p.caption?.slice(0, 40) || 'No caption'}..." (${p.likesCount} likes, ${p.commentsCount} comments)`
  ).join('\n') || 'No recent posts';

  const prompt = `You are analyzing @${profile.username} for ${business.business_name}.

Profile: ${profile.followersCount.toLocaleString()} followers, ${profile.engagement?.engagementRate || 'Unknown'}% ER
Bio: "${profile.bio || 'No bio'}"

Recent posts (6):
${posts}

Score this profile 0-100 for partnership potential.
Provide 2-3 sentence summary explaining the score.

Return JSON:
{
  "overall_score": 0-100,
  "summary_text": "2-3 sentences"
}`;

  return prompt;
}

// ===============================================================================
// PRE-SCREEN UTILITY
// ===============================================================================

export interface PreScreenResult {
  shouldProcess: boolean;
  earlyScore?: number;
  reason?: string;
}

export function preScreenProfile(
  profile: ProfileData,
  business: BusinessProfile
): PreScreenResult {
  // Instant rejection criteria
  if (profile.isPrivate && profile.followersCount < 1000) {
    return {
      shouldProcess: false,
      earlyScore: 15,
      reason: 'Private account with low followers - no analysis possible'
    };
  }

  if (profile.followersCount === 0) {
    return {
      shouldProcess: false,
      earlyScore: 0,
      reason: 'Account has no followers'
    };
  }

  // Suspicious ratio check
  const followRatio = profile.followingCount > 0 ?
    profile.followersCount / profile.followingCount : 999;

  if (followRatio < 0.1 && profile.followersCount > 1000) {
    return {
      shouldProcess: false,
      earlyScore: 20,
      reason: 'Suspicious follow ratio indicates bot/spam account'
    };
  }

  // All checks passed
  return { shouldProcess: true };
}

// ===============================================================================
// DEPRECATED: Deep and XRay analysis schemas and prompts have been removed
// The system now ONLY supports Light analysis
// ===============================================================================
