import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useSortContext } from '@omariyassine/react-list-hooks';
import type { ProductItem } from '../types';

interface SortLabProps {
	useCustomStatusComparator: boolean;
	setUseCustomStatusComparator: (val: boolean | ((prev: boolean) => boolean)) => void;
}

export function SortLab({ useCustomStatusComparator, setUseCustomStatusComparator }: SortLabProps) {
	// Consume the sort stage from context (bridged by <ListProvider>).
	const { state, methods } = useSortContext<ProductItem>();
	const { sortKey, sortDirection } = state;
	const { toggleSort, setSort, clearSort, getSortIndicator } = methods;

	return (
		<div
			className="glass-panel"
			style={{
				padding: '24px',
				marginBottom: '24px',
				borderColor: 'rgba(245, 158, 11, 0.3)',
				background: 'rgba(28, 22, 15, 0.75)',
			}}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					flexWrap: 'wrap',
					gap: '12px',
					marginBottom: '16px',
					borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
					paddingBottom: '14px',
				}}
			>
				<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
					<ArrowUpDown size={20} color="#f59e0b" />
					<div>
						<h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f59e0b' }}>
							`useSort` Lab (Natural Strings, Dates, NaNs, NULLS LAST, Custom Comparators)
						</h2>
						<span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
							Active Sort:{' '}
							<strong>{sortKey ? `${String(sortKey)} (${sortDirection})` : 'None (Original Order)'}</strong>
						</span>
					</div>
				</div>

				<div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
					<button
						type="button"
						className="btn btn-secondary"
						onClick={() => setUseCustomStatusComparator((prev) => !prev)}
						style={{ fontSize: '0.8rem', padding: '6px 12px' }}
					>
						Custom Status Comparator:{' '}
						{useCustomStatusComparator ? 'ON (In Stock > Low > Pre)' : 'OFF (Default)'}
					</button>
					{sortKey && (
						<button
							type="button"
							className="btn btn-danger"
							onClick={clearSort}
							style={{ fontSize: '0.8rem', padding: '6px 12px' }}
						>
							clearSort()
						</button>
					)}
				</div>
			</div>

			<div
				style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '14px' }}
			>
				<span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
					`toggleSort(key)` & `getSortIndicator(key)` Buttons:
				</span>
				{(['name', 'price', 'rating', 'status', 'createdAt', 'tags'] as const).map((key) => {
					const dir = getSortIndicator(key);
					return (
						<button
							type="button"
							key={key}
							onClick={() => toggleSort(key)}
							className="btn btn-secondary"
							style={{
								padding: '6px 12px',
								fontSize: '0.825rem',
								borderColor: dir ? 'var(--accent-amber)' : 'var(--border-color)',
								background: dir ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.03)',
								color: dir ? '#fcd34d' : 'var(--text-secondary)',
							}}
						>
							{key} {dir === 'asc' ? <ArrowUp size={14} /> : dir === 'desc' ? <ArrowDown size={14} /> : ''}
						</button>
					);
				})}
			</div>

			<div
				style={{
					display: 'flex',
					flexWrap: 'wrap',
					gap: '8px',
					alignItems: 'center',
					background: 'rgba(0,0,0,0.25)',
					padding: '10px 14px',
					borderRadius: '8px',
				}}
			>
				<span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
					`setSort(key, dir)` Direct Callers:
				</span>
				<button
					type="button"
					className="btn btn-secondary"
					style={{ padding: '4px 10px', fontSize: '0.75rem' }}
					onClick={() => setSort('price', 'asc')}
				>
					setSort('price', 'asc')
				</button>
				<button
					type="button"
					className="btn btn-secondary"
					style={{ padding: '4px 10px', fontSize: '0.75rem' }}
					onClick={() => setSort('price', 'desc')}
				>
					setSort('price', 'desc')
				</button>
				<button
					type="button"
					className="btn btn-secondary"
					style={{ padding: '4px 10px', fontSize: '0.75rem' }}
					onClick={() => setSort('createdAt', 'desc')}
				>
					setSort('createdAt', 'desc') (Newest)
				</button>
				<button
					type="button"
					className="btn btn-secondary"
					style={{ padding: '4px 10px', fontSize: '0.75rem' }}
					onClick={() => setSort('status', 'asc')}
				>
					setSort('status', 'asc') (Priority)
				</button>
				<button
					type="button"
					className="btn btn-secondary"
					style={{ padding: '4px 10px', fontSize: '0.75rem' }}
					onClick={() => setSort('name', 'asc')}
				>
					setSort('name', 'asc') (Natural Numeric)
				</button>
			</div>
		</div>
	);
}
