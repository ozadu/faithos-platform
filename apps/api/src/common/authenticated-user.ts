export interface AuthenticatedUser {
  id: string;
  organizationId: string;
  roleId: string | null;
  sessionId: string;
}

export interface RequestContext {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  user?: AuthenticatedUser;
}
