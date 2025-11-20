import { UniversalAIAdapter } from '@/domain/ai/universal-adapter.service.js';
import { buildSpeedLightAnalysisPrompt, getLightAnalysisJsonSchema } from '@/domain/ai/prompts.js';
import { logger } from '@/shared/utils/logger.util.js';
import type { ProfileData } from '@/shared/types/index.js';

export interface DirectAnalysisResult {
  analysisData: {
    overall_score: number;
    summary_text: string;
  };
  costDetails: {
    actual_cost: number;
    tokens_in: number;
    tokens_out: number;
    model_used: string;
    block_type: string;
    processing_duration_ms: number;
  };
}

export class DirectAnalysisExecutor {
  private aiAdapter: UniversalAIAdapter;
  private env: any;
  private requestId: string;

  constructor(env: any, requestId: string) {
    this.env = env;
    this.requestId = requestId;
    this.aiAdapter = new UniversalAIAdapter(env, requestId);
  }

  // ============================================================================
  // LIGHT ANALYSIS (ONLY)
  // ============================================================================

  async executeLight(profile: ProfileData, business: any): Promise<DirectAnalysisResult> {
    const startTime = Date.now();

    logger('info', '⚡ Light analysis starting', {
      username: profile.username,
      requestId: this.requestId
    });

    try {
      const response = await this.aiAdapter.executeRequest({
        model_name: 'gpt-5-nano',
        system_prompt: `Score influencer 0-100 for partnership potential. Provide 2-3 sentence summary. Return JSON only.`,
        user_prompt: buildSpeedLightAnalysisPrompt(profile, business),
        max_tokens: 400,
        json_schema: getLightAnalysisJsonSchema(),
        response_format: 'json',
        temperature: 0.0,
        analysis_type: 'light'
      });

      const processingTime = Date.now() - startTime;
      const analysisData = this.parseJsonResponse(response.content, 'light analysis');

      logger('info', '✅ Light analysis complete', {
        overall_score: analysisData.overall_score,
        processingTime,
        requestId: this.requestId
      });

      return {
        analysisData: {
          overall_score: analysisData.overall_score,
          summary_text: analysisData.summary_text
        },
        costDetails: {
          actual_cost: response.usage.total_cost,
          tokens_in: response.usage.input_tokens,
          tokens_out: response.usage.output_tokens,
          model_used: response.model_used,
          block_type: 'direct_light',
          processing_duration_ms: processingTime
        }
      };
    } catch (error: any) {
      logger('error', '❌ Light analysis failed', {
        error: error.message,
        stack: error.stack,
        requestId: this.requestId
      });
      throw error;
    }
  }

  // ============================================================================
  // JSON PARSING UTILITY
  // ============================================================================

  private parseJsonResponse(content: string, analysisType: string): any {
    try {
      const parsed = JSON.parse(content.trim());

      logger('info', '✅ JSON parsed successfully', {
        analysisType,
        hasOverallScore: 'overall_score' in parsed,
        hasSummary: 'summary_text' in parsed,
        requestId: this.requestId
      });

      return parsed;

    } catch (parseError: any) {
      logger('error', '❌ JSON parse failed', {
        error: parseError.message,
        analysisType,
        contentPreview: content.substring(0, 300),
        requestId: this.requestId
      });

      // Fallback recovery
      const scoreMatch = content.match(/"overall_score":\s*(\d+)/);
      const summaryMatch = content.match(/"summary_text":\s*"([^"]+)"/);

      return {
        overall_score: scoreMatch ? parseInt(scoreMatch[1]) : 0,
        summary_text: summaryMatch ? summaryMatch[1] : 'Analysis completed'
      };
    }
  }
}

// ===============================================================================
// DEPRECATED: Deep and XRay analysis methods have been removed
// The system now ONLY supports Light analysis with:
// - overall_score (0-100)
// - summary_text (2-3 sentences)
// ===============================================================================
