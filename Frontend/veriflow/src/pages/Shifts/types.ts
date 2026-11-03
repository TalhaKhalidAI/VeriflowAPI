export interface ShiftRecord {
  id: string;
  user_id: number;
  key_id: string;
  device_id?: string | null;
  status: 'active' | 'ended' | 'revoked' | 'expired' | string;
  started_at?: string | null;
  expires_at?: string | null;
  ended_at?: string | null;
  revoked_reason?: string | null;
  created_by?: number | null;
  user_name?: string | null;
  user_email?: string | null;
}

export interface ShiftListResponse {
  items: ShiftRecord[];
  limit: number;
  offset: number;
  total: number;
}

export interface StartShiftPayload {
  target_user_id?: number | null;
  key_id?: string | null;
  duration_hours: number;
  device_id?: string | null;
  include_rules?: boolean;
}

export interface StartShiftResponse {
  shift?: ShiftRecord | null;
  shift_token?: string;
  expires_at?: string;
  qr_code_base64?: string | null;
  qrBlobUrl?: string;
  isQrBlob?: boolean;
}

export interface ReissueShiftResponse {
  shift?: ShiftRecord | null;
  shift_token?: string;
  expires_at?: string;
  qr_code_base64?: string | null;
  qrBlobUrl?: string;
  isQrBlob?: boolean;
}

export interface DeleteShiftResponse {
  status: string;
  message: string;
  shift: ShiftRecord;
  removed_scans: number;
}
