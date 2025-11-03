export interface RefreshTokenData {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
}

export interface IRefreshTokenRepository {
  create(data: Omit<RefreshTokenData, 'id' | 'createdAt' | 'revokedAt'>): Promise<RefreshTokenData>;
  findByToken(token: string): Promise<RefreshTokenData | null>;
  revoke(token: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
  deleteExpired(): Promise<void>;
}
