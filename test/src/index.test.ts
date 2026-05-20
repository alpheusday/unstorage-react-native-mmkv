import type { Configuration } from "react-native-mmkv";

import { mmkvDriver } from "unstorage-react-native-mmkv";
import { afterEach, describe, vi } from "vitest";

import { testDriverCustom } from "#/utils/custom";
import { testDriver } from "#/utils/unstorage";

type StoredValue = string | ArrayBuffer;

class MockMMKV {
    private id: string;

    private data: Map<string, StoredValue> = new Map<string, StoredValue>();

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
        const value: StoredValue | undefined = this.data.get(key);

        if (typeof value === "string") {
            return value;
        }

        return void 0;
    }

    getBuffer(key: string): ArrayBuffer | undefined {
        const value: StoredValue | undefined = this.data.get(key);

        if (value instanceof ArrayBuffer) {
            return value;
        }

        return void 0;
    }

    set(key: string, value: boolean | string | number | ArrayBuffer): void {
        if (typeof value === "string" || value instanceof ArrayBuffer) {
            this.data.set(key, value);
        } else {
            this.data.set(key, String(value));
        }

        for (const listener of this.listeners) {
            listener(key);
        }
    }

    remove(key: string): boolean {
        const existed: boolean = this.data.has(key);

        this.data.delete(key);

        for (const listener of this.listeners) {
            listener(key);
        }

        return existed;
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
