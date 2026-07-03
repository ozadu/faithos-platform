export interface AuthenticatedPrincipal {
  id: string;
}

export interface AuthContext {
  principal: AuthenticatedPrincipal | null;
}
