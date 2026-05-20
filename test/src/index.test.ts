import type { Configuration } from "react-native-mmkv";

import { mmkvDriver } from "unstorage-react-native-mmkv";
import { afterEach, describe, vi } from "vitest";

import { testDriverCustom } from "#/utils/custom";
import { testDriver } from "#/utils/unstorage";

class MockMMKV {
    private id: string;

    private data: Map<string, string> = new Map<string, string>();

    private listeners: Set<(key: string) => void> = new Set<
        (key: string) => void
    >();

    constructor(
        config: Configuration & {
            id?: string;
        },
    ) {
        this.id = config.id ?? "mmkv.default";
    }

    contains(key: string): boolean {
        return this.data.has(key);
    }

    getString(key: string): string | undefined {
        return this.data.get(key) ?? undefined;
    }

    set(key: string, value: string): void {
        this.data.set(key, value);
        for (const listener of this.listeners) {
            listener(key);
        }
    }

    remove(key: string): void {
        this.data.delete(key);
        for (const listener of this.listeners) {
            listener(key);
        }
    }

    getAllKeys(): string[] {
        return [
            ...this.data.keys(),
        ];
    }

    clearAll(): void {
        this.data.clear();
    }

    addOnValueChangedListener(cb: (key: string) => void): {
        remove: () => void;
    } {
        this.listeners.add(cb);
        return {
            remove: (): void => {
                this.listeners.delete(cb);
            },
        };
    }
}

type ReactNativeMmkv = {
    createMMKV: (
        config: Configuration & {
            id?: string;
        },
    ) => MockMMKV;
};

vi.mock("react-native-mmkv", (): ReactNativeMmkv => {
    return {
        createMMKV: (
            config: Configuration & {
                id?: string;
            },
        ): MockMMKV => new MockMMKV(config),
    };
});

describe("drivers: react-native-mmkv", (): void => {
    afterEach((): void => {
        vi.resetAllMocks();
    });

    testDriver({
        driver: mmkvDriver({
            id: "test",
        }),
    });
});

describe("drivers: react-native-mmkv (custom)", (): void => {
    afterEach((): void => {
        vi.resetAllMocks();
    });

    testDriverCustom({
        driver: mmkvDriver({
            id: "custom-test",
        }),
    });
});
