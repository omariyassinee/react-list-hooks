import { useState } from 'react';

import { usePaginateContext } from '@omariyassine/react-list-hooks';

import { Code2 } from 'lucide-react';

import type { ProductItem } from '../types';

export function ClampingLab() {
	const paginator = usePaginateContext<ProductItem>();

	const [customSizeInput, setCustomSizeInput] = useState('');
	const [customJumpPage, setCustomJumpPage] = useState('');

	return (
		<div className="glass-panel" style={{ padding: '24px' }}>
			<div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
				<Code2 size={20} color="#ec4899" />
				<h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Edge-Case Clamping & Return Shape Inspection</h3>
			</div>

			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
					gap: '16px',
				}}
			>
				<div
					style={{
						background: 'rgba(255,255,255,0.02)',
						padding: '16px',
						borderRadius: '10px',
						border: '1px solid var(--border-color)',
					}}
				>
					<h4
						style={{
							fontSize: '0.9rem',
							fontWeight: 600,
							color: 'var(--text-secondary)',
							marginBottom: '8px',
						}}
					>
						1. Navigation & Size Clamping
					</h4>
					<div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
						<input
							type="number"
							className="custom-input"
							placeholder="Jump page (e.g. -99 or 999)"
							value={customJumpPage}
							onChange={(e) => setCustomJumpPage(e.target.value)}
							style={{ width: '100%', fontSize: '0.8rem' }}
						/>
						<button
							type="button"
							className="btn btn-secondary"
							onClick={() => {
								const val = parseInt(customJumpPage, 10);
								if (!Number.isNaN(val)) paginator.methods.goToPage(val);
							}}
							style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}
						>
							goToPage()
						</button>
					</div>

					<div style={{ display: 'flex', gap: '8px' }}>
						<input
							type="number"
							className="custom-input"
							placeholder="Page size (e.g. 0 or -5)"
							value={customSizeInput}
							onChange={(e) => setCustomSizeInput(e.target.value)}
							style={{ width: '100%', fontSize: '0.8rem' }}
						/>
						<button
							type="button"
							className="btn btn-secondary"
							onClick={() => {
								const val = parseInt(customSizeInput, 10);
								if (!Number.isNaN(val)) paginator.methods.setPageSize(val);
							}}
							style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}
						>
							setPageSize()
						</button>
					</div>
					<p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
						`goToPage` clamps automatically to <code>[1, {paginator.state.totalPages}]</code>. `setPageSize`
						safely clamps invalid inputs to 1.
					</p>
				</div>

				<div
					style={{
						background: 'rgba(255,255,255,0.02)',
						padding: '16px',
						borderRadius: '10px',
						border: '1px solid var(--border-color)',
					}}
				>
					<h4
						style={{
							fontSize: '0.9rem',
							fontWeight: 600,
							color: 'var(--text-secondary)',
							marginBottom: '8px',
						}}
					>
						2. Return Shape Inspection
					</h4>
					<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
						<code>Object.keys(paginator)</code> (exactly paginatedItems / state / methods):
					</div>
					<div
						style={{
							fontFamily: 'monospace',
							fontSize: '0.75rem',
							background: 'rgba(0,0,0,0.3)',
							padding: '6px 10px',
							borderRadius: '6px',
							color: '#34d399',
							marginBottom: '8px',
						}}
					>
						{JSON.stringify(Object.keys(paginator))}
					</div>

					<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
						<code>JSON.stringify(paginator.paginatedItems)</code> (clean item serialization):
					</div>
					<div
						style={{
							fontFamily: 'monospace',
							fontSize: '0.75rem',
							background: 'rgba(0,0,0,0.3)',
							padding: '6px 10px',
							borderRadius: '6px',
							color: '#c084fc',
							maxHeight: '70px',
							overflowY: 'auto',
						}}
					>
						{JSON.stringify(
							paginator.paginatedItems.map((i) => ({ id: i.id, name: i.name, price: i.price })),
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
