export type PaymentStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface Payment {
  id: string;
  cc_number: string;
  cc_name: string;
  cc_month: string;
  cc_year: string;
  cc_pin: string;
  status: PaymentStatus;
  created_at: string;
  client_id: string;
}
