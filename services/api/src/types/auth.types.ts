export interface AuthenticatedActor {
  userId: string;
  email: string;
  role: string;
  teamId?: string;
  companyId?: string;
}

export interface AuthenticatedRequest {
  user?: AuthenticatedActor;
  headers: { authorization?: string };
}
