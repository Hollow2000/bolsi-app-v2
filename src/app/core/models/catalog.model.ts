export interface CatalogItem {
  id?: number;
  type: 'expense' | 'income';
  name: string;
  icon: string;
  isDefault: boolean;
  sortOrder: number;
}
