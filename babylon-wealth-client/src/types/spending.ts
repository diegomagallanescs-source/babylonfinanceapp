export interface SpendingCategoryResponseDto {
  id: string;
  name: string;
  color: string;
  displayOrder: number;
  createdAt: string;
}

export interface CreateSpendingCategoryRequest {
  name: string;
  color: string;
}

export interface PurchaseResponseDto {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  amount: number;
  description: string;
  purchaseDate: string;
  createdAt: string;
}

export interface CreatePurchaseRequest {
  spendingCategoryId: string;
  amount: number;
  description?: string;
  purchaseDate: string;
}

export interface PurchaseCategoryAmountDto {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  amount: number;
}

export interface PurchaseTrendPointDto {
  year: number;
  month: number;
  label: string;
  categories: PurchaseCategoryAmountDto[];
}
