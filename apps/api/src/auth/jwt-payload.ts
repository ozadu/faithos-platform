export interface JwtPayload {
  organizationId: string;
  roleId: string | null;
  sessionId: string;
  sub: string;
  type: 'access' | 'refresh';
}
