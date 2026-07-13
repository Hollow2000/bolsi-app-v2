export interface AppSettings {
  id?: number;
  userName: string;
  setupComplete: boolean;
  customExpenseCategories?: string[];
  customIncomeCategories?: string[];
  showHiddenMovements?: boolean;
}
