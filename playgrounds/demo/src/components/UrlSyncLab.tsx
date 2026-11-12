/** biome-ignore-all lint/a11y/noLabelWithoutControl: <!--> */
import { useState } from 'react';
import { Check, Code2, Copy, CheckSquare, Square } from 'lucide-react';
import { usePaginateContext } from '@omariyassine/react-list-hooks';
import type { ProductItem } from '../types';

interface UrlSyncLabProps {
	enableUrlSync: boolean;
	setEnableUrlSync: (val: boolean | ((prev: boolean) => boolean)) => void;
	pageParamName: string;
	setPageParamName: (val: string) => void;
	pageSizeParamName: string;
	setPageSizeParamName: (val: string) => void;
	historyMode: 'replace' | 'push';
	setHistoryMode: (val: 'replace' | 'push') => void;
	syncPageSizeFlag: boolean;
	setSyncPageSizeFlag: (val: boolean | ((prev: boolean) => boolean)) => void;
	keepOtherParamsFlag: boolean;
	setKeepOtherParamsFlag: (val: boolean | ((prev: boolean) => boolean)) => void;
}

export function UrlSyncLab({
	enableUrlSync,
	setEnableUrlSync,
	pageParamName,
	setPageParamName,
	pageSizeParamName,
	setPageSizeParamName,
	historyMode,
	setHistoryMode,
	syncPageSizeFlag,
	setSyncPageSizeFlag,
	keepOtherParamsFlag,
	setKeepOtherParamsFlag,
}: UrlSyncLabProps) {
	// Consume the paginate stage from context (bridged by <ListProvider>).
	const paginator = usePaginateContext<ProductItem>();
	const [customBaseUrl, setCustomBaseUrl] = useState('/products/catalog');
	const [copiedUrl, setCopiedUrl] = useState(false);

	const handleCopyShareableUrl = (url: string) => {
		if (navigator.clipboard) {
			navigator.clipboard.writeText(url);
			setCopiedUrl(true);
			setTimeout(() => setCopiedUrl(false), 2000);
		}
	};

	return (
		<div
			className="glass-panel"
			style={{
				padding: '24px',
				marginBottom: '24px',
				borderColor: 'rgba(6, 182, 212, 0.3)',
				background: 'rgba(10, 24, 34, 0.75)',
			}}
		>
			<div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
				<Code2 size={20} color="#06b6d4" />
				<h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#38bdf8' }}>
					URL Search Params Sync & `getShareableUrl` Generator
				</h3>
			</div>

			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
					gap: '14px',
					marginBottom: '16px',
				}}
			>
				<div>
					<label
						style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}
					>
						urlSync.enabled:
					</label>
					<button
						type="button"
						className="btn btn-secondary"
						onClick={() => setEnableUrlSync((prev) => !prev)}
						style={{ width: '100%', fontSize: '0.8rem' }}
					>
						{enableUrlSync ? <CheckSquare size={14} color="#34d399" /> : <Square size={14} />}{' '}
						{enableUrlSync ? 'Enabled' : 'Disabled'}
					</button>
				</div>

				<div>
					<label
						style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}
					>
						urlSync.pageParam:
					</label>
					<input
						type="text"
						className="custom-input"
						value={pageParamName}
						onChange={(e) => setPageParamName(e.target.value)}
						style={{ width: '100%', fontSize: '0.8rem' }}
					/>
				</div>

				<div>
					<label
						style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}
					>
						urlSync.pageSizeParam:
					</label>
					<input
						type="text"
						className="custom-input"
						value={pageSizeParamName}
						onChange={(e) => setPageSizeParamName(e.target.value)}
						style={{ width: '100%', fontSize: '0.8rem' }}
					/>
				</div>

				<div>
					<label
						style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}
					>
						urlSync.historyMode:
					</label>
					<select
						className="custom-input"
						value={historyMode}
						onChange={(e) => setHistoryMode(e.target.value as 'replace' | 'push')}
						style={{ width: '100%', fontSize: '0.8rem' }}
					>
						<option value="replace">replace (clean)</option>
						<option value="push">push (back/forward history)</option>
					</select>
				</div>

				<div>
					<label
						style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}
					>
						urlSync.syncPageSize:
					</label>
					<button
						type="button"
						className="btn btn-secondary"
						onClick={() => setSyncPageSizeFlag((prev) => !prev)}
						style={{ width: '100%', fontSize: '0.8rem' }}
					>
						{syncPageSizeFlag ? <CheckSquare size={14} color="#34d399" /> : <Square size={14} />}{' '}
						{syncPageSizeFlag ? 'Sync Size' : 'Page Only'}
					</button>
				</div>

				<div>
					<label
						style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}
					>
						urlSync.keepOtherParams:
					</label>
					<button
						type="button"
						className="btn btn-secondary"
						onClick={() => setKeepOtherParamsFlag((prev) => !prev)}
						style={{ width: '100%', fontSize: '0.8rem' }}
					>
						{keepOtherParamsFlag ? <CheckSquare size={14} color="#34d399" /> : <Square size={14} />}{' '}
						{keepOtherParamsFlag ? 'Preserve Others' : 'Wipe Others'}
					</button>
				</div>
			</div>

			<div
				style={{
					background: 'rgba(0,0,0,0.3)',
					padding: '16px',
					borderRadius: '10px',
					display: 'flex',
					flexDirection: 'column',
					gap: '10px',
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						flexWrap: 'wrap',
						gap: '8px',
					}}
				>
					<span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#7dd3fc' }}>
						Live `getShareableUrl()` Output:
					</span>
					<div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
						<input
							type="text"
							className="custom-input"
							placeholder="Custom base URL..."
							value={customBaseUrl}
							onChange={(e) => setCustomBaseUrl(e.target.value)}
							style={{ width: '180px', padding: '4px 8px', fontSize: '0.75rem' }}
						/>
						<button
							type="button"
							className="btn btn-secondary"
							onClick={() =>
								handleCopyShareableUrl(paginator.methods.getShareableUrl(undefined, undefined, customBaseUrl))
							}
							style={{ padding: '4px 10px', fontSize: '0.75rem' }}
						>
							{copiedUrl ? <Check size={12} color="#34d399" /> : <Copy size={12} />}{' '}
							{copiedUrl ? 'Copied' : 'Copy'}
						</button>
					</div>
				</div>

				<div
					style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#38bdf8', wordBreak: 'break-all' }}
				>
					<strong>Current Page Link:</strong> {paginator.methods.getShareableUrl()}
				</div>
				<div
					style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#a5b4fc', wordBreak: 'break-all' }}
				>
					<strong>Target Page 3 & Size 15:</strong> {paginator.methods.getShareableUrl(3, 15)}
				</div>
				<div
					style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#34d399', wordBreak: 'break-all' }}
				>
					<strong>Custom Base URL:</strong> {paginator.methods.getShareableUrl(2, 8, customBaseUrl)}
				</div>
			</div>
		</div>
	);
}
