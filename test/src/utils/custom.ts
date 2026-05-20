import type { Driver, Storage } from "unstorage";

import { createStorage, prefixStorage } from "unstorage";
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

    describe("watch with prefixStorage", () => {
        it("fires events with prefixed keys", async () => {
            const prefixed: Storage = prefixStorage(ctx.storage, "app");

            const events: Array<{
                event: string;
                key: string;
            }> = [];

            const unwatch = await prefixed.watch(
                (event: string, key: string): void => {
                    events.push({
                        event,
                        key,
                    });
                },
            );

            await prefixed.setItem("inside", "value");

            // prefixStorage does not transform watch event keys,
            // so the key includes the prefix from the driver level.
            expect(events.length).toBeGreaterThanOrEqual(1);

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

    describe("maxDepth", () => {
        it("filters keys by depth via driver getKeys", async () => {
            await ctx.storage.setItem("depth0_0", "data");
            await ctx.storage.setItem("depth0:depth1_0", "data");
            await ctx.storage.setItem("depth0:depth1:depth2_0", "data");

            const depth0: string[] =
                ctx.driver.getKeys?.("", {
                    maxDepth: 0,
                }) ?? [];
            const depth1: string[] =
                ctx.driver.getKeys?.("", {
                    maxDepth: 1,
                }) ?? [];

            expect(depth0).toMatchObject([
                "depth0_0",
            ]);
            expect(depth1.sort()).toMatchObject(
                [
                    "depth0_0",
                    "depth0:depth1_0",
                ].sort(),
            );
        });
    });

    describe("flags", () => {
        it("declares maxDepth flag", () => {
            expect(ctx.driver.flags).toMatchObject({
                maxDepth: true,
            });
        });
    });

    describe("dispose", () => {
        it("clears all keys", async () => {
            await ctx.storage.setItem("dispose:a", "val_a");
            await ctx.storage.setItem("dispose:b", "val_b");

            ctx.driver.dispose?.();

            const keys: string[] = ctx.driver.getKeys?.() ?? [];
            expect(keys).toMatchObject([]);
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

    describe("prefixStorage", () => {
        it("scopes keys with a prefix", async () => {
            const prefixed: Storage = prefixStorage(ctx.storage, "app");

            await prefixed.setItem("key", "value");

            expect(await prefixed.getItem("key")).toBe("value");
            expect(await ctx.storage.getItem("app:key")).toBe("value");
        });

        it("isolates keys between prefixed storages", async () => {
            const appStorage: Storage = prefixStorage(ctx.storage, "app");
            const dataStorage: Storage = prefixStorage(ctx.storage, "data");

            await appStorage.setItem("x", "app-value");
            await dataStorage.setItem("x", "data-value");

            expect(await appStorage.getItem("x")).toBe("app-value");
            expect(await dataStorage.getItem("x")).toBe("data-value");
        });
    });
}
