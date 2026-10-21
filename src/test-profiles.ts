/**
 * Bounded data budgets shared by hosted and ASP.NET Core test modes.
 * A profile limits only SpeedPulse's intentional payloads, not protocol overhead.
 * Changing profiles affects the next test; a running test keeps its snapshot.
 */
export type TestProfileId = 'quick' | 'standard' | 'thorough';

export interface TestProfile {
    readonly id: TestProfileId;
    readonly label: string;
    readonly downloadBytes: number;
    readonly uploadBytes: number;
}

export const TEST_PROFILES: Readonly<Record<TestProfileId, TestProfile>> = Object.freeze({
    quick: Object.freeze({
        id: 'quick', label: 'Quick • 5 MiB down + 1 MiB up',
        downloadBytes: 5 * 1024 * 1024, uploadBytes: 1 * 1024 * 1024,
    }),
    standard: Object.freeze({
        id: 'standard', label: 'Standard • 25 MiB down + 5 MiB up',
        downloadBytes: 25 * 1024 * 1024, uploadBytes: 5 * 1024 * 1024,
    }),
    thorough: Object.freeze({
        id: 'thorough', label: 'Thorough • 50 MiB down + 8 MiB up',
        downloadBytes: 50 * 1024 * 1024, uploadBytes: 8 * 1024 * 1024,
    }),
});

export const DEFAULT_TEST_PROFILE: TestProfileId = 'standard';
const STORAGE_KEY = 'speedpulse_test_profile';

export function getTestProfile(input: unknown): TestProfile {
    if (typeof input === 'string' &&
        Object.prototype.hasOwnProperty.call(TEST_PROFILES, input)) {
        return TEST_PROFILES[input as TestProfileId];
    }
    return TEST_PROFILES[DEFAULT_TEST_PROFILE];
}

export function loadTestProfile(): TestProfile {
    try {
        return getTestProfile(localStorage.getItem(STORAGE_KEY));
    } catch {
        return TEST_PROFILES[DEFAULT_TEST_PROFILE];
    }
}

export function saveTestProfile(input: unknown): TestProfile {
    const profile = getTestProfile(input);
    try {
        localStorage.setItem(STORAGE_KEY, profile.id);
    } catch {
        // Private browsing / blocked storage must not prevent a speed test.
    }
    return profile;
}
