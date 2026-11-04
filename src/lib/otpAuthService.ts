/**
 * SokoPoS 4-Digit Login OTP Verification Service
 * Dispatches and verifies time-limited 4-digit authorization OTPs to the
 * registered business Gmail address prior to each login authorization.
 */

export interface SendLoginOtpParams {
  businessId: string;
  targetEmail?: string;
  loginType: 'owner' | 'staff';
  identifier?: string;
  name?: string;
  storeName?: string;
}

export interface SendLoginOtpResponse {
  success: boolean;
  sessionId: string;
  maskedEmail: string;
  targetEmail?: string;
  expiresInSeconds: number;
  devHintOtp?: string;
  error?: string;
}

export interface VerifyLoginOtpResponse {
  verified: boolean;
  businessId?: string;
  targetEmail?: string;
  loginType?: 'owner' | 'staff';
  identifier?: string;
  name?: string;
  error?: string;
  attemptsLeft?: number;
}

export async function sendLoginOtp(params: SendLoginOtpParams): Promise<SendLoginOtpResponse> {
  try {
    const res = await fetch('/api/auth/send-login-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        sessionId: '',
        maskedEmail: '',
        expiresInSeconds: 0,
        error: data.error || `Server responded with status ${res.status}`,
      };
    }

    return data;
  } catch (err: any) {
    console.error('Failed calling /api/auth/send-login-otp:', err);
    return {
      success: false,
      sessionId: '',
      maskedEmail: '',
      expiresInSeconds: 0,
      error: err?.message || 'Network error while contacting OTP server.',
    };
  }
}

export async function verifyLoginOtp(sessionId: string, otp: string): Promise<VerifyLoginOtpResponse> {
  try {
    const res = await fetch('/api/auth/verify-login-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId, otp }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        verified: false,
        error: data.error || 'Invalid or expired OTP',
        attemptsLeft: data.attemptsLeft,
      };
    }

    return data;
  } catch (err: any) {
    console.error('Failed calling /api/auth/verify-login-otp:', err);
    return {
      verified: false,
      error: err?.message || 'Network error during OTP verification.',
    };
  }
}
