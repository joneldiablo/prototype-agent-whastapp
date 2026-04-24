export interface ApiResponse<T = unknown> {
  success: boolean;
  error: boolean;
  status: number;
  code: number;
  message: string;
  data?: T;
}

export interface UserPermissions {
  can_read: boolean;
  can_create: boolean;
  can_modify: boolean;
  can_delete: boolean;
  can_request_permissions: boolean;
}

export interface WhitelistEntry {
  id?: number;
  phone: string;
  prompt?: string;
  enabled: boolean;
  is_blacklist: boolean;
  can_read?: boolean;
  can_create?: boolean;
  can_modify?: boolean;
  can_delete?: boolean;
  can_request_permissions?: boolean;
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
  qrGenerated?: number;
}