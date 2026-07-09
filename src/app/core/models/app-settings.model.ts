export interface AppSettings {
  id?: number;
  userName: string;
  setupComplete: boolean;
  customExpenseCategories?: string[];
  showHiddenMovements?: boolean;
}
