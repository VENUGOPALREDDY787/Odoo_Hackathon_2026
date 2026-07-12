export interface JWTPayload {
  id: string;
  email: string;
  role: 'Admin' | 'Asset Manager' | 'Department Head' | 'Employee';
  organizationId: string;
  jti: string;
}

export interface AuthSession {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    organizationId: string;
  };
  accessToken: string;
  refreshToken: string;
}

export type TokenPayload = JWTPayload;
