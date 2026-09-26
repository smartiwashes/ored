export type OtpStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface Otp {
  id: string;
  otp: string;
  status: OtpStatus;
  created_at: string;
  client_id: string;
}
