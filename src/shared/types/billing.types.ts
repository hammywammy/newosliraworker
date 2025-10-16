export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'use' | 'purchase' | 'refund' | 'bonus';
  description: string;
  run_id: string; // REQUIRED - no legacy lead_id support
  created_at: string;
}
