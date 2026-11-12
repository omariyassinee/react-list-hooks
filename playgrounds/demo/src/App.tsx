import { useState, useMemo } from 'react';
import { useList, ListProvider } from '@omariyassine/react-list-hooks';
import { Activity, FlaskConical, Sparkles } from 'lucide-react';

import type { ProductItem, CustomFilterKeys } from './types';
import { INITIAL_PRODUCTS, STATUS_PRIORITY_ORDER } from './mockData';

// Component Imports
import { PipelineVisualizer } from './components/PipelineVisualizer';
import { DatasetControls } from './components/DatasetControls';
import { FilterLab } from './components/FilterLab';
import { SortLab } from './components/SortLab';
import { PaginateLab } from './components/PaginateLab';
import { UrlSyncLab } from './components/UrlSyncLab';
import { ClampingLab } from './components/ClampingLab';
import { ProductGrid } from './components/ProductGrid';
import { StressTestLab } from './components/StressTestLab';

export default function App() {
	const [activeTab, setActiveTab] = useState<'features' | 'stress-test'>('features');

	// ─── Dataset State ────────────────────────────────────────────────────────
	const [itemsList, setItemsList] = useState<ProductItem[]>(INITIAL_PRODUCTS);

	// ─── useFilter Options ───────────────────────────────────────────────────
	const [useExplicitSearchFields, setUseExplicitSearchFields] = useState(true);
	const [debounceMs, setDebounceMs] = useState<number>(150);

	// ─── URL Sync Shared States ────────────────────────────────────────────────
	const [enableUrlSync, setEnableUrlSync] = useState(true);
	const [pageParamName, setPageParamName] = useState('page');
	const [pageSizeParamName, setPageSizeParamName] = useState('pageSize');
	const [historyMode, setHistoryMode] = useState<'replace' | 'push'>('replace');
	const [syncPageSizeFlag, setSyncPageSizeFlag] = useState(true);
	const [keepOtherParamsFlag, setKeepOtherParamsFlag] = useState(true);
	const [parentPageSizeProp, setParentPageSizeProp] = useState<number>(6);

	const filterOptions = useMemo(
		() => ({
			initialQuery: '',
			initialFilters: {
				category: undefined,
			},
			searchFields: useExplicitSearchFields ? (['name', 'category'] as Array<keyof ProductItem>) : undefined,
			debounceMs: debounceMs,
			customFilters: {
				priceRange: (item: ProductItem, maxPrice: number) => item.price <= maxPrice,
				minRating: (item: ProductItem, min: number) => {
					if (min === 0) return true;
					if (Number.isNaN(item.rating)) return false;
					return item.rating >= min;
				},
				selectedTag: (item: ProductItem, tag: string) => {
					if (!tag || tag === 'All') return true;
					return item.tags.includes(tag);
				},
				createdWithinDays: (item: ProductItem, days: number) => {
					if (!days || days === 0) return true;
					const cutoff = Date.now() - days * 86400000;
					return item.createdAt.getTime() >= cutoff;
				},
			},
		}),
		[useExplicitSearchFields, debounceMs],
	);

	// ─── useSort Options & State ──────────────────────────────────────────────
	const [useCustomStatusComparator, setUseCustomStatusComparator] = useState(true);

	const sortOptions = useMemo(
		() => ({
			initialKey: 'price' as keyof ProductItem,
			initialDirection: 'desc' as const,
			comparators: useCustomStatusComparator
				? {
						status: (a: ProductItem, b: ProductItem) => {
							const priorityA = a.status ? (STATUS_PRIORITY_ORDER[a.status] ?? 99) : 99;
							const priorityB = b.status ? (STATUS_PRIORITY_ORDER[b.status] ?? 99) : 99;
							return priorityA - priorityB;
						},
						tags: (a: ProductItem, b: ProductItem) => a.tags.length - b.tags.length,
					}
				: undefined,
		}),
		[useCustomStatusComparator],
	);

	// ─── Master Pipeline: useList + ListProvider (pass-through mode) ─────────
	// The provider bridges FilterContext / SortContext / PaginateContext so the
	// child labs consume their stage via context instead of prop-drilling.
	const list = useList<ProductItem, CustomFilterKeys>(itemsList, {
		filter: filterOptions,
		sort: sortOptions,
		paginate: { pageSize: parentPageSizeProp, initialPage: 1, siblingCount: 1, boundaryCount: 1 },
		urlSync: enableUrlSync
			? {
					enabled: true,
					queryParam: 'q',
					sortKeyParam: 'sortBy',
					directionParam: 'sortDir',
					pageParam: pageParamName,
					pageSizeParam: pageSizeParamName,
					historyMode: historyMode,
					syncPageSize: syncPageSizeFlag,
					keepOtherParams: keepOtherParamsFlag,
				}
			: false,
	});

	// Actions
	const handleAddItem = () => {
		const newId = itemsList.length > 0 ? Math.max(...itemsList.map((i) => i.id)) + 1 : 1;
		const categories: ProductItem['category'][] = ['Gadgets', 'Audio', 'Workstation', 'Wearables'];
		const cat = categories[Math.floor(Math.random() * categories.length)];
		const newItem: ProductItem = {
			id: newId,
			name: `HyperAsset Prototype #${newId}`,
			category: cat,
			price: 249,
			status: 'In Stock',
			rating: 4.8,
			createdAt: new Date(),
			tags: ['Pro', 'AI'],
		};
		setItemsList((prev) => [newItem, ...prev]);
	};

	const handleDeleteFirstItem = () => {
		setItemsList((prev) => prev.slice(1));
	};

	const handleResetData = () => {
		setItemsList(INITIAL_PRODUCTS);
		list.resetAll();
	};

	return (
		<div style={{ maxWidth: '1360px', margin: '0 auto', padding: '32px 20px 80px 20px' }}>
			{/* Top Header */}
			<header style={{ marginBottom: '28px', textAlign: 'center' }}>
				<div
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: '8px',
						padding: '6px 16px',
						borderRadius: '9999px',
						background: 'rgba(99, 102, 241, 0.12)',
						border: '1px solid rgba(99, 102, 241, 0.3)',
						color: '#818cf8',
						fontSize: '0.85rem',
						fontWeight: 600,
						marginBottom: '14px',
					}}
				>
					<Sparkles size={16} /> Complete Feature Showcase & 100k+ Stress Test Suite
				</div>
				<h1
					className="text-gradient"
					style={{ fontSize: '2.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '10px' }}
				>
					react-list-hooks
				</h1>
				<p
					style={{
						color: 'var(--text-secondary)',
						maxWidth: '740px',
						margin: '0 auto',
						fontSize: '1.05rem',
						lineHeight: 1.6,
					}}
				>
					Headless, ultra-fast, and type-safe hooks for <code style={{ color: '#38bdf8' }}>useFilter</code>,{' '}
					<code style={{ color: '#f59e0b' }}>useSort</code>, and{' '}
					<code style={{ color: '#a5b4fc' }}>usePaginate</code>.
				</p>

				{/* Navigation Tabs */}
				<div
					style={{
						display: 'inline-flex',
						gap: '8px',
						background: 'rgba(15, 23, 42, 0.75)',
						border: '1px solid var(--border-color)',
						padding: '6px',
						borderRadius: '12px',
						marginTop: '24px',
					}}
				>
					<button
						type="button"
						onClick={() => setActiveTab('features')}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '8px',
							padding: '8px 20px',
							borderRadius: '8px',
							border: 'none',
							fontSize: '0.9rem',
							fontWeight: 700,
							cursor: 'pointer',
							background: activeTab === 'features' ? 'var(--accent-purple)' : 'transparent',
							color: activeTab === 'features' ? '#ffffff' : 'var(--text-secondary)',
							transition: 'all 0.2s ease',
						}}
					>
						<FlaskConical size={16} /> 1. Feature Laboratory (45 items)
					</button>

					<button
						type="button"
						onClick={() => setActiveTab('stress-test')}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '8px',
							padding: '8px 20px',
							borderRadius: '8px',
							border: 'none',
							fontSize: '0.9rem',
							fontWeight: 700,
							cursor: 'pointer',
							background: activeTab === 'stress-test' ? '#ec4899' : 'transparent',
							color: activeTab === 'stress-test' ? '#ffffff' : 'var(--text-secondary)',
							transition: 'all 0.2s ease',
						}}
					>
						<Activity size={16} /> 2. 100,000+ Items Stress Test & Profiler
					</button>
				</div>
			</header>

			{/* Tab 1: Full Feature Laboratory — everything consumes the pipeline via context */}
			{activeTab === 'features' && (
				<ListProvider value={list}>
					{/* Pipeline Overview Visualizer */}
					<PipelineVisualizer totalItems={itemsList.length} />

					{/* SECTION 1: GLOBAL DATA CONTROLS & DATASET MUTATION */}
					<DatasetControls
						totalItems={itemsList.length}
						onAddItem={handleAddItem}
						onDeleteFirstItem={handleDeleteFirstItem}
						onResetData={handleResetData}
						onEmptyData={() => setItemsList([])}
					/>

					{/* SECTION 2: USEFILTER SUITE */}
					<FilterLab
						totalItems={itemsList.length}
						useExplicitSearchFields={useExplicitSearchFields}
						setUseExplicitSearchFields={setUseExplicitSearchFields}
						debounceMs={debounceMs}
						setDebounceMs={setDebounceMs}
					/>

					{/* SECTION 3: USESORT SUITE */}
					<SortLab
						useCustomStatusComparator={useCustomStatusComparator}
						setUseCustomStatusComparator={setUseCustomStatusComparator}
					/>

					{/* SECTION 4: USEPAGINATE SUITE & DATA GRID */}
					<PaginateLab setParentPageSizeProp={setParentPageSizeProp}>
						<ProductGrid />
					</PaginateLab>

					{/* SECTION 5: ADVANCED URL SYNC & SHAREABLE URL LABORATORY */}
					<UrlSyncLab
						enableUrlSync={enableUrlSync}
						setEnableUrlSync={setEnableUrlSync}
						pageParamName={pageParamName}
						setPageParamName={setPageParamName}
						pageSizeParamName={pageSizeParamName}
						setPageSizeParamName={setPageSizeParamName}
						historyMode={historyMode}
						setHistoryMode={setHistoryMode}
						syncPageSizeFlag={syncPageSizeFlag}
						setSyncPageSizeFlag={setSyncPageSizeFlag}
						keepOtherParamsFlag={keepOtherParamsFlag}
						setKeepOtherParamsFlag={setKeepOtherParamsFlag}
					/>

					{/* SECTION 6: EDGE-CASE CLAMPING & NON-ENUMERABLE ARRAY INSPECTOR */}
					<ClampingLab />
				</ListProvider>
			)}

			{/* Tab 2: 100k+ Stress Test & Performance Profiler */}
			{activeTab === 'stress-test' && <StressTestLab />}
		</div>
	);
}
