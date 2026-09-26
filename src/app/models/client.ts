import { Payment } from './payment';
import { Otp } from './otp';

export interface Client {
  id: string;
  phone_number: string;
  credit: string;
  created_at: string;
  payments: Payment[];
  otps: Otp[];
}
