export interface ApiResponse<T = unknown> {
  success: boolean;
  error: boolean;
  status: number;
  code: number;
  message: string;
  data?: T;
}

export interface WhitelistEntry {
  id?: number;
  phone: string;
  prompt?: string;
  enabled: boolean;
  is_blacklist: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SystemConfig {
  id?: number;
  key: string;
  value: string;
}

export interface WhatsAppStatus {
  connected: boolean;
  qr?: string;
  phone?: string;
  lastSync?: string;
}