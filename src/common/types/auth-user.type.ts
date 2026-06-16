export interface AuthenticatedUser {
  id: string;
  name: string;
  username: string;
  role: 'ADMIN' | 'STAFF';
}
