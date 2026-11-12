export interface ProductItem {
	id: number;
	name: string;
	category: 'Gadgets' | 'Audio' | 'Workstation' | 'Wearables';
	price: number;
	status: 'In Stock' | 'Low Stock' | 'Pre-order' | null | undefined;
	rating: number; // can be NaN or float
	createdAt: Date;
	tags: string[];
}

export type CustomFilterKeys =
	| 'category'
	| 'status'
	| 'priceRange'
	| 'minRating'
	| 'selectedTag'
	| 'createdWithinDays';

export interface LargeDatasetItem {
	id: number;
	name: string;
	department: 'Engineering' | 'Marketing' | 'Sales' | 'Product' | 'Legal' | 'Support';
	salary: number;
	rating: number;
	isActive: boolean;
	createdAt: Date;
}
