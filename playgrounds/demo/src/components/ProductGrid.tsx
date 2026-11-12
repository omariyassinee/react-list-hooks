import { PackageCheck } from 'lucide-react';
import { usePaginateContext } from '@omariyassine/react-list-hooks';
import type { ProductItem } from '../types';

export function ProductGrid() {
	const paginator = usePaginateContext<ProductItem>();

	if (paginator.paginatedItems.length === 0) {
		return (
			<div
				style={{
					textAlign: 'center',
					padding: '48px 20px',
					background: 'rgba(0,0,0,0.2)',
					borderRadius: '12px',
					border: '1px dashed var(--border-color)',
					marginBottom: '24px',
				}}
			>
				<PackageCheck size={48} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
				<h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
					No items match the current filters
				</h4>
				<p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
					<code>currentItems</code> is <code>[]</code> and <code>totalPages</code> is clamped to{' '}
					<code>1</code>.
				</p>
			</div>
		);
	}

	return (
		<div
			style={{
				display: 'grid',
				gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
				gap: '16px',
				marginBottom: '24px',
			}}
		>
			{paginator.paginatedItems.map((item) => (
				<div
					key={item.id}
					className="animate-fade-in"
					style={{
						background: 'rgba(255, 255, 255, 0.025)',
						border: '1px solid var(--border-color)',
						borderRadius: '12px',
						padding: '16px',
						display: 'flex',
						flexDirection: 'column',
						justifyContent: 'space-between',
						gap: '12px',
					}}
				>
					<div>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								marginBottom: '8px',
							}}
						>
							<span
								style={{
									fontSize: '0.75rem',
									color: '#a5b4fc',
									background: 'rgba(99, 102, 241, 0.15)',
									padding: '2px 8px',
									borderRadius: '4px',
									fontWeight: 600,
								}}
							>
								{item.category}
							</span>
							<span
								style={{
									fontSize: '0.75rem',
									color:
										item.status === 'In Stock'
											? '#34d399'
											: item.status === 'Low Stock'
												? '#fbbf24'
												: item.status === 'Pre-order'
													? '#f472b6'
													: '#9ca3af',
								}}
							>
								● {item.status ?? 'null/undefined (NULLS LAST)'}
							</span>
						</div>
						<h4
							style={{
								fontSize: '1rem',
								fontWeight: 600,
								color: 'var(--text-primary)',
								marginBottom: '4px',
							}}
						>
							{item.name}
						</h4>
						<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
							Item #{item.id} • Created: {item.createdAt.toLocaleDateString()}
						</div>
						<div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
							{item.tags.map((t) => (
								<span
									key={t}
									style={{
										fontSize: '0.7rem',
										background: 'rgba(255,255,255,0.06)',
										color: 'var(--text-secondary)',
										padding: '1px 6px',
										borderRadius: '4px',
									}}
								>
									#{t}
								</span>
							))}
						</div>
					</div>

					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							borderTop: '1px solid rgba(255, 255, 255, 0.05)',
							paddingTop: '10px',
						}}
					>
						<span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#38bdf8' }}>${item.price}</span>
						<span
							style={{
								fontSize: '0.85rem',
								color: Number.isNaN(item.rating) ? 'var(--text-muted)' : '#fbbf24',
							}}
						>
							{Number.isNaN(item.rating) ? 'NaN Rating' : `★ ${item.rating}`}
						</span>
					</div>
				</div>
			))}
		</div>
	);
}
