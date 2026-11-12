import {
	useListContext,
	useFilterContext,
	useSortContext,
	usePaginateContext,
} from '@omariyassine/react-list-hooks';
import type { ProductItem } from '../types';

interface PipelineVisualizerProps {
	totalItems: number;
}

export function PipelineVisualizer({ totalItems }: PipelineVisualizerProps) {
	const list = useListContext<ProductItem>();
	const filter = useFilterContext<ProductItem>();
	const sort = useSortContext<ProductItem>();
	const paginate = usePaginateContext<ProductItem>();

	const filteredCount = filter.filteredItems.length;
	const sortKey = sort.state.sortKey;
	const sortDirection = sort.state.sortDirection;

	return (
		<div
			className="glass-panel"
			style={{
				padding: '16px 20px',
				marginBottom: '24px',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-around',
				flexWrap: 'wrap',
				gap: '12px',
				background: 'rgba(15, 23, 42, 0.65)',
			}}
		>
			<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
				<span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>1. Raw Items:</span>
				<span style={{ fontWeight: 700, color: '#f3f4f6' }}>{totalItems}</span>
			</div>
			<span style={{ color: 'var(--text-muted)' }}>→</span>
			<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
				<span style={{ fontSize: '0.8rem', color: '#38bdf8' }}>2. useFilter:</span>
				<span style={{ fontWeight: 700, color: '#38bdf8' }}>{filteredCount} items</span>
			</div>
			<span style={{ color: 'var(--text-muted)' }}>→</span>
			<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
				<span style={{ fontSize: '0.8rem', color: '#f59e0b' }}>3. useSort:</span>
				<span style={{ fontWeight: 700, color: '#f59e0b' }}>
					{sortKey ? `${String(sortKey)} (${sortDirection})` : 'Unsorted'}
				</span>
			</div>
			<span style={{ color: 'var(--text-muted)' }}>→</span>
			<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
				<span style={{ fontSize: '0.8rem', color: '#a5b4fc' }}>4. usePaginate:</span>
				<span style={{ fontWeight: 700, color: '#a5b4fc' }}>
					Page {paginate.state.currentPage}/{paginate.state.totalPages} ({paginate.paginatedItems.length}{' '}
					visible)
				</span>
			</div>
			<span style={{ color: 'var(--text-muted)' }}>→</span>
			<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
				<span style={{ fontSize: '0.8rem', color: '#34d399' }}>5. useList (pipeline):</span>
				<span style={{ fontWeight: 700, color: '#34d399' }}>
					{list.filteredCount} filtered · {list.isProcessing ? 'processing…' : 'idle'}
				</span>
			</div>
		</div>
	);
}
