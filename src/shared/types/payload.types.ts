// ===============================================================================
// ANALYSIS PAYLOAD TYPES
// File: src/shared/types/payload.types.ts
// Purpose: Structures stored in payloads.analysis_data JSONB column
// ===============================================================================

/**
 * Light Analysis Payload (ONLY SUPPORTED TYPE)
 * Minimal structure for quick scoring (1 credit)
 */
export interface LightPayload {
  overall_score: number;
  summary_text: string;
}

// ===============================================================================
// DEPRECATED: Deep and XRay analysis payloads have been removed
// Only Light analysis is supported
// ===============================================================================
