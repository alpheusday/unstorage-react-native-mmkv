import type { Configuration, MMKV } from "react-native-mmkv";
import type { Listener } from "react-native-mmkv/lib/specs/MMKV.nitro";
import type { Format, Partial } from "ts-vista";
import type { Driver, StorageValue, Unwatch, WatchCallback } from "unstorage";

import { createMMKV } from "react-native-mmkv";
import { defineDriver } from "unstorage";
import { joinKeys, normalizeKey } from "unstorage/drivers/utils/index";

type ExtraDriverOptions = {
    /**
     * Prefix for keys.
     */
    base: string;
};

type DriverOptions = Format<
    Partial<Configuration> & Partial<ExtraDriverOptions>
>;

type GetItem = {
    key: string;
};

type SetItem = {
    key: string;
    value: string;
};

type Item = {
    key: string;
    value: string | null;
};

const mmkvDriver = (options?: DriverOptions): Driver<DriverOptions, MMKV> => {
    const { base: baseKey, ...remaining } = options ?? {};

    const base: string = normalizeKey(baseKey || "");

    const resolveKey = (key: string): string => joinKeys(base, key);

    const mmkv: MMKV = createMMKV({
        compareBeforeSet: true,
        ...remaining,
        id: remaining?.id ?? "mmkv.default",
    });

    const driver = defineDriver<DriverOptions, MMKV>(
        (opts: DriverOptions): Driver<DriverOptions, MMKV> => {
            return {
                name: "react-native-mmkv",
                options: opts,
                getInstance: (): MMKV => mmkv,
                hasItem(key: string): boolean {
                    return mmkv.contains(resolveKey(key));
                },
                getItem(key: string): StorageValue {
                    return mmkv.getString(resolveKey(key)) ?? null;
                },
                getItems(items?: GetItem[]): Item[] {
                    if (!items) {
                        const keys: string[] = mmkv.getAllKeys();

                        const result: Item[] = [];

                        for (const key of keys) {
                            result.push({
                                key: base ? key.slice(base.length + 1) : key,
                                value: mmkv.getString(key) ?? null,
                            });
                        }

                        return result;
                    }

                    const result: Item[] = [];

                    for (const item of items) {
                        const key: string = resolveKey(item.key);

                        result.push({
                            key: base ? key.slice(base.length + 1) : key,
                            value: mmkv.getString(key) ?? null,
                        });
                    }

                    return result;
                },
                setItem(key: string, value: string): void {
                    mmkv.set(resolveKey(key), value);
                },
                setItems(items: SetItem[]): void {
                    for (const item of items) {
                        mmkv.set(resolveKey(item.key), item.value);
                    }
                },
                removeItem(key: string): void {
                    mmkv.remove(resolveKey(key));
                },
                getKeys(basePrefix?: string): string[] {
                    const prefix: string = resolveKey(basePrefix || "");

                    const keys: string[] = mmkv.getAllKeys();

                    if (!prefix) {
                        if (base) {
                            return keys
                                .filter((key: string): boolean => {
                                    return (
                                        key === base ||
                                        key.startsWith(`${base}:`)
                                    );
                                })
                                .map((key: string): string => {
                                    return base
                                        ? key.slice(base.length + 1)
                                        : key;
                                })
                                .filter(Boolean);
                        } else {
                            return keys;
                        }
                    }

                    return keys
                        .filter((key: string): boolean => {
                            return (
                                key === prefix || key.startsWith(`${prefix}:`)
                            );
                        })
                        .map((key: string): string => {
                            return base ? key.slice(base.length + 1) : key;
                        })
                        .filter(Boolean);
                },
                clear(basePrefix?: string): void {
                    const prefix: string = resolveKey(basePrefix || "");

                    const keys: string[] = mmkv.getAllKeys();

                    const list: string[] = [];

                    if (prefix) {
                        list.push(
                            ...keys.filter((key: string): boolean => {
                                return (
                                    key === prefix ||
                                    key.startsWith(`${prefix}:`)
                                );
                            }),
                        );
                    } else if (base) {
                        list.push(
                            ...keys.filter((key: string): boolean => {
                                return (
                                    key === base || key.startsWith(`${base}:`)
                                );
                            }),
                        );
                    } else {
                        list.push(...keys);
                    }

                    for (const key of list) {
                        mmkv.remove(key);
                    }
                },
                watch(callback: WatchCallback): Unwatch {
                    const listener: Listener = mmkv.addOnValueChangedListener(
                        (key: string): void => {
                            if (
                                base &&
                                key !== base &&
                                !key.startsWith(`${base}:`)
                            )
                                return void 0;

                            const scopedKey: string = base
                                ? key === base
                                    ? ""
                                    : key.slice(base.length + 1)
                                : key;

                            callback("update", scopedKey);
                        },
                    );

                    return (): void => listener.remove();
                },
            };
        },
    );

    return driver(options ?? {});
};

export default mmkvDriver;
export type { DriverOptions, GetItem, Item, SetItem };
export { mmkvDriver };
