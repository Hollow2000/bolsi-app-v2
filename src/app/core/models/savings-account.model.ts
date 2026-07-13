export interface SavingsAccount {
  id?: number;
  name: string;
  icon: string;
  balance: number;
  goal?: number;
  createdAt: Date;
}
