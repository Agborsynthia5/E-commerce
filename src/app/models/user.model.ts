export type UserRole = 'customer' | 'admin' | 'owner';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  createdAt: Date;
}
