export interface User {
  id: string;
  email: string;
  password: string; // hashed
  name: string;
  createdAt: Date;
}
