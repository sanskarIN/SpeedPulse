/**
 * SpeedPulse readiness hints.
 * These are heuristic indicators, not guarantees that a service will work.
 * Missing measurements must never be presented as failed measurements.
 */
export type ReadinessState = 'pass' | 'fail' | 'unknown';
export type ReadinessCategory = 'streaming4K' | 'videoCalls' | 'gaming' | 'largeUploads';

export interface ReadinessMetrics {
    readonly download?: number | null;
    readonly upload?: number | null;
    readonly ping?: number | null;
    readonly jitter?: number | null;
}
export type ReadinessReport = Readonly<Record<ReadinessCategory, ReadinessState>>;

function valid(value: number | null | undefined): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function check(values: Array<number | null | undefined>, passes: () => boolean): ReadinessState {
    return values.every(valid) ? (passes() ? 'pass' : 'fail') : 'unknown';
}

export function calculateReadiness(metrics: ReadinessMetrics): ReadinessReport {
    const { download, upload, ping, jitter } = metrics;
    return {
        streaming4K: check([download], () => download! > 25),
        videoCalls: check([download, upload, ping],
            () => download! > 10 && upload! > 3 && ping! < 100),
        gaming: check([download, ping, jitter],
            () => download! > 25 && ping! < 50 && jitter! < 10),
        largeUploads: check([upload], () => upload! > 20),
    };
}

export const READINESS_ORDER: readonly ReadinessCategory[] = [
    'streaming4K', 'videoCalls', 'gaming', 'largeUploads',
];
