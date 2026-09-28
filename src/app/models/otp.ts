export type OtpStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface Otp {
  id: string;
  otp: string;
  type: 'OTP1' | 'OTP2';
  status: OtpStatus;
  created_at: string;
  client_id: string;
}
