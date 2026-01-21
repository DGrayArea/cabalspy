export interface User {
  id: string;
  email?: string;
  telegramId?: string;
  googleId?: string;
  name: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Wallet {
  id: string;
  userId: string;
  turnkeyWalletId: string;
  turnkeyAccountId: string;
  address: string;
  network: 'solana' | 'ethereum';
  createdAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

class Database {
  private users: Map<string, User> = new Map();
  private wallets: Map<string, Wallet> = new Map();
  private sessions: Map<string, Session> = new Map();
  private userWallets: Map<string, string[]> = new Map();

  async createUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const user: User = {
      ...data,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async getUserByTelegramId(telegramId: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.telegramId === telegramId) return user;
    }
    return null;
  }

  async getUserByGoogleId(googleId: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.googleId === googleId) return user;
    }
    return null;
  }

  async createWallet(data: Omit<Wallet, 'id' | 'createdAt'>): Promise<Wallet> {
    const id = `wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const wallet: Wallet = {
      ...data,
      id,
      createdAt: new Date(),
    };
    this.wallets.set(id, wallet);
    
    const userWallets = this.userWallets.get(data.userId) || [];
    userWallets.push(id);
    this.userWallets.set(data.userId, userWallets);
    
    return wallet;
  }

  async getWalletByUserId(userId: string, network?: 'solana' | 'ethereum'): Promise<Wallet | null> {
    const walletIds = this.userWallets.get(userId) || [];
    for (const walletId of walletIds) {
      const wallet = this.wallets.get(walletId);
      if (wallet && (!network || wallet.network === network)) {
        return wallet;
      }
    }
    return null;
  }

  async createSession(userId: string, token: string, expiresInSeconds: number = 86400 * 7): Promise<Session> {
    const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session: Session = {
      id,
      userId,
      token,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
      createdAt: new Date(),
    };
    this.sessions.set(token, session);
    return session;
  }

  async getSessionByToken(token: string): Promise<Session | null> {
    const session = this.sessions.get(token);
    if (!session) return null;
    
    if (session.expiresAt < new Date()) {
      this.sessions.delete(token);
      return null;
    }
    
    return session;
  }

  async deleteSession(token: string): Promise<void> {
    this.sessions.delete(token);
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | null> {
    const user = this.users.get(id);
    if (!user) return null;
    
    const updated = { ...user, ...data, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }
}

export const db = new Database();
