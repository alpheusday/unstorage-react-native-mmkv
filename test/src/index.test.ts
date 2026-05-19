import driver from "unstorage-mmkv";
import { afterEach, describe, vi } from "vitest";

import { testDriver } from "./utils";

class MockMMKV {
    private data: Map<string, string> = new Map<string, string>();

    contains(key: string): boolean {
        return this.data.has(key);
    }

    getString(key: string): string | undefined {
        return this.data.get(key) ?? undefined;
    }

    set(key: string, value: string): void {
        this.data.set(key, value);
    }

    remove(key: string): void {
        this.data.delete(key);
    }

    getAllKeys(): string[] {
        return [
            ...this.data.keys(),
        ];
    }

    clearAll(): void {
        this.data.clear();
    }

    addOnValueChangedListener(_cb: (key: string) => void): {
        remove: () => void;
    } {
        return {
            remove: (): void => {},
        };
    }
}

type ReactNativeMmkv = {
    createMMKV: () => MockMMKV;
};

vi.mock("react-native-mmkv", (): ReactNativeMmkv => {
    return {
        createMMKV: () => new MockMMKV(),
    };
});

describe("drivers: react-native-mmkv", (): void => {
    afterEach((): void => {
        vi.resetAllMocks();
    });

    testDriver({
        driver: driver({
            id: "test",
        }),
    });

    testDriver({
        driver: driver({
            id: "test-with-base",
            base: "app",
        }),
    });
});
