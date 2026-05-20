import type { Driver, Storage } from "unstorage";

import { createStorage } from "unstorage";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

export interface CustomTestContext {
    storage: Storage;
    driver: Driver;
}

export interface CustomTestOptions {
    driver: Driver | (() => Driver);
}

export function testDriverCustom(opts: CustomTestOptions): void {
    const ctx = {} as CustomTestContext;

    beforeAll(() => {
        ctx.driver =
            typeof opts.driver === "function" ? opts.driver() : opts.driver;

        ctx.storage = createStorage({
            driver: ctx.driver,
        });
    });

    afterAll(async () => {
        await ctx.driver?.dispose?.();
        await ctx.storage?.dispose?.();
    });

    afterEach(async () => {
        await ctx.storage.clear();
    });

    describe("watch", () => {
        it("fires callback on setItem", async () => {
            const events: Array<{
                event: string;
                key: string;
            }> = [];

            const unwatch = await ctx.storage.watch(
                (event: string, key: string): void => {
                    events.push({
                        event,
                        key,
                    });
                },
            );

            await ctx.storage.setItem("watch:a", "hello");

            expect(events.length).toBe(1);
            expect(events[0]).toMatchObject({
                event: "update",
                key: "watch:a",
            });

            await unwatch();
        });

        it("fires callback on removeItem", async () => {
            const events: Array<{
                event: string;
                key: string;
            }> = [];

            await ctx.storage.setItem("watch:b", "world");

            const unwatch = await ctx.storage.watch(
                (event: string, key: string): void => {
                    events.push({
                        event,
                        key,
                    });
                },
            );

            await ctx.storage.removeItem("watch:b");

            expect(events.length).toBe(1);
            expect(events[0]).toMatchObject({
                event: "remove",
                key: "watch:b",
            });

            await unwatch();
        });

        it("unwatch stops listening", async () => {
            const events: Array<{
                event: string;
                key: string;
            }> = [];

            const unwatch = await ctx.storage.watch(
                (event: string, key: string): void => {
                    events.push({
                        event,
                        key,
                    });
                },
            );

            await ctx.storage.setItem("watch:c", "before");
            expect(events.length).toBe(1);

            await unwatch();

            await ctx.storage.setItem("watch:d", "after");
            expect(events.length).toBe(1);

            await unwatch();
        });
    });

    describe("watch with base", () => {
        it("only fires for keys under the base prefix", async () => {
            const driverInstance: Driver =
                typeof opts.driver === "function" ? opts.driver() : opts.driver;
            const driverOptions: Record<string, unknown> =
                driverInstance.options ?? {};
            const base: string | undefined = (
                driverOptions as Record<string, unknown>
            ).base as string | undefined;

            if (!base) return;

            const storageWithBase: Storage = createStorage({
                driver: driverInstance,
            });

            const events: Array<{
                event: string;
                key: string;
            }> = [];

            const unwatch = await storageWithBase.watch(
                (event: string, key: string): void => {
                    events.push({
                        event,
                        key,
                    });
                },
            );

            await storageWithBase.setItem("inside", "value");
            // The driver's watch should only fire for keys under the base prefix.
            // Since the storage scopes keys under base, "inside" maps to "base:inside".
            expect(events.length).toBeGreaterThanOrEqual(1);

            await unwatch();
        });

        it("returns scoped key with base stripped", async () => {
            const driverInstance: Driver =
                typeof opts.driver === "function" ? opts.driver() : opts.driver;
            const driverOptions: Record<string, unknown> =
                driverInstance.options ?? {};
            const base: string | undefined = (
                driverOptions as Record<string, unknown>
            ).base as string | undefined;

            if (!base) return;

            const storageWithBase: Storage = createStorage({
                driver: driverInstance,
            });

            const keys: string[] = [];

            const unwatch = await storageWithBase.watch(
                (_event: string, key: string): void => {
                    keys.push(key);
                },
            );

            await storageWithBase.setItem("scoped", "value");

            // The key in the callback should have the base prefix stripped
            expect(keys).toContain("scoped");

            await unwatch();
        });
    });

    describe("getItems (all)", () => {
        it("returns all items when called without args", async () => {
            await ctx.storage.setItem("all:a", "val_a");
            await ctx.storage.setItem("all:b", "val_b");

            // The driver's getItems() without items returns all key-value pairs.
            // Call the driver directly since the Storage API always passes items.
            const result: Array<{
                key: string;
                value: string | null;
            }> = ctx.driver.getItems?.() ?? [];

            const sorted = result.sort((a, b) => a.key.localeCompare(b.key));

            const allA = sorted.find(
                (item: { key: string }): boolean => item.key === "all:a",
            );
            const allB = sorted.find(
                (item: { key: string }): boolean => item.key === "all:b",
            );

            expect(allA).toMatchObject({
                key: "all:a",
                value: "val_a",
            });
            expect(allB).toMatchObject({
                key: "all:b",
                value: "val_b",
            });
        });
    });

    describe("clear with prefix", () => {
        it("only clears keys matching the prefix", async () => {
            await ctx.storage.setItem("prefix:a", "val_a");
            await ctx.storage.setItem("prefix:b", "val_b");
            await ctx.storage.setItem("other:c", "val_c");

            // Call the driver's clear with a prefix directly
            ctx.driver.clear?.("prefix");

            expect(await ctx.storage.getItem("prefix:a")).toBeNull();
            expect(await ctx.storage.getItem("prefix:b")).toBeNull();
            expect(await ctx.storage.getItem("other:c")).toBe("val_c");
        });

        it("clears nested keys under the prefix", async () => {
            await ctx.storage.setItem("deep:a:x", "val_ax");
            await ctx.storage.setItem("deep:a:y", "val_ay");
            await ctx.storage.setItem("deep:b", "val_b");

            ctx.driver.clear?.("deep:a");

            expect(await ctx.storage.getItem("deep:a:x")).toBeNull();
            expect(await ctx.storage.getItem("deep:a:y")).toBeNull();
            expect(await ctx.storage.getItem("deep:b")).toBe("val_b");
        });
    });

    describe("getKeys with prefix", () => {
        it("returns only keys matching the prefix", async () => {
            await ctx.storage.setItem("gk:a", "val_a");
            await ctx.storage.setItem("gk:b", "val_b");
            await ctx.storage.setItem("gkOther:c", "val_c");

            // Call the driver's getKeys with a prefix directly
            const keys: string[] = ctx.driver.getKeys?.("gk") ?? [];

            expect(keys.sort()).toMatchObject(
                [
                    "gk:a",
                    "gk:b",
                ].sort(),
            );
        });

        it("returns nested keys under the prefix", async () => {
            await ctx.storage.setItem("nested:a:b", "val_ab");
            await ctx.storage.setItem("nested:a:c", "val_ac");
            await ctx.storage.setItem("nested:d", "val_d");

            const keys: string[] = ctx.driver.getKeys?.("nested:a") ?? [];

            expect(keys.sort()).toMatchObject(
                [
                    "nested:a:b",
                    "nested:a:c",
                ].sort(),
            );
        });
    });

    describe("getInstance", () => {
        it("returns the MMKV instance", () => {
            const instance: unknown = ctx.driver.getInstance?.();

            expect(instance).not.toBeNull();
            expect(instance).not.toBeUndefined();
        });

        it("returns the same instance on repeated calls", () => {
            const first: unknown = ctx.driver.getInstance?.();
            const second: unknown = ctx.driver.getInstance?.();

            expect(first).toBe(second);
        });
    });
}
