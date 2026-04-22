export interface ForgotPasswordStartRequest {
  email: string;
}

export interface ForgotPasswordStartResponse {
  message: string;
  canProceed?: boolean;
  emailExists?: boolean;
  exists?: boolean;
  success?: boolean;
  username?: string;
  userName?: string;
  Username?: string;
  UserName?: string;
}

export interface ResetPasswordRequest {
  email: string;
  newPassword: string;
  confirmPassword: string;
}

export interface MessageResponse {
  message: string;
}
