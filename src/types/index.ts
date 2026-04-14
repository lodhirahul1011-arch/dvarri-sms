export interface PhoneNumber {
  id: string;
  number: string;
  label: string;
  is_active: boolean;
  created_at: string;
}

export interface SmsLog {
  id: string;
  phone_number: string;
  button_label: string;
  order_id: string;
  awb: string;
  otp: string;
  time_slot: string;
  message_text: string;
  status: "sent" | "failed" | "pending";
  api_response: unknown;
  created_at: string;
}

export interface SendResult {
  success: boolean;
  data: SmsLog & {
    generated: {
      orderId: string;
      awb: string;
      otp: string;
      timeSlot: string;
      message: string;
    };
  };
}
