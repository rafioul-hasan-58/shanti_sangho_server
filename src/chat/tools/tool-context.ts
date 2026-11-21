export interface AuthUser {
  id: string;
  email?: string;
  role?: string;
  memberId?: string;
  [key: string]: unknown;
}

export interface ToolContext {
  user: AuthUser | null;
}
