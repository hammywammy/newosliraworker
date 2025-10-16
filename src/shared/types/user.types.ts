export interface User {
  id: string;
  email: string;
  full_name: string;
  credits: number;
  subscription_status: string;
  created_at: string;
  last_login: string;
  subscription_id: string;
  stripe_customer_id: string;
}

export interface UserValidationResult {
  isValid: boolean;
  error?: string;
  credits?: number;
  userId?: string;
}
