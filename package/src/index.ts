import type { Configuration, MMKV } from "react-native-mmkv";
import type { Format, Partial } from "ts-vista";
import type {
    Driver,
    GetKeysOptions,
    StorageMeta,
    StorageValue,
    Unwatch,
    WatchCallback,
    WatchEvent,
} from "unstorage";

import { createMMKV } from "react-native-mmkv";
import {
    defineDriver,
    filterKeyByBase,
    filterKeyByDepth,
    normalizeBaseKey,
} from "unstorage";

type Listener = ReturnType<MMKV["addOnValueChangedListener"]>;

type DriverOptions = Format<Partial<Configuration>>;

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
    const driver = defineDriver<DriverOptions, MMKV>(
        (opts: DriverOptions): Driver<DriverOptions, MMKV> => {
            const mmkv: MMKV = createMMKV({
                compareBeforeSet: true,
                ...opts,
                id: opts?.id ?? "mmkv.default",
            });

            const activeListeners: Set<Listener> = new Set<Listener>();

            return {
                name: "react-native-mmkv",
                flags: {
                    maxDepth: true,
                },
                options: opts,
                getInstance: (): MMKV => mmkv,
                hasItem(key: string): boolean {
                    return mmkv.contains(key);
                },
                getItem(key: string): StorageValue {
                    return mmkv.getString(key) ?? null;
                },
                getItems(items?: GetItem[]): Item[] {
                    if (!items) {
                        return mmkv.getAllKeys().map(
                            (key: string): Item => ({
                                key,
                                value: mmkv.getString(key) ?? null,
                            }),
                        );
                    }

                    return items.map(
                        (item: GetItem): Item => ({
                            key: item.key,
                            value: mmkv.getString(item.key) ?? null,
                        }),
                    );
                },
                getItemRaw(key: string): ArrayBuffer | null {
                    return mmkv.getBuffer(key) ?? null;
                },
                setItem(key: string, value: string): void {
                    mmkv.set(key, value);
                },
                setItems(items: SetItem[]): void {
                    for (const item of items) {
                        mmkv.set(item.key, item.value);
                    }
                },
                setItemRaw(key: string, value: unknown): void {
                    if (value instanceof ArrayBuffer) {
                        mmkv.set(key, value);
                        return void 0;
                    }

                    if (ArrayBuffer.isView(value)) {
                        const view: ArrayBufferView = value as ArrayBufferView;

                        const buffer: ArrayBuffer = new ArrayBuffer(
                            view.byteLength,
                        );

                        new Uint8Array(buffer).set(
                            new Uint8Array(
                                view.buffer,
                                view.byteOffset,
                                view.byteLength,
                            ),
                        );

                        mmkv.set(key, buffer);

                        return void 0;
                    }

                    mmkv.set(key, String(value));
                },
                removeItem(key: string): void {
                    mmkv.remove(key);
                },
                getMeta(_key: string): StorageMeta | null {
                    return null;
                },
                getKeys(base?: string, opts?: GetKeysOptions): string[] {
                    const keys: string[] = mmkv.getAllKeys();

                    let filtered: string[] = keys;

                    if (base) {
                        const normalizedBase: string = normalizeBaseKey(base);

                        filtered = filtered.filter((key: string): boolean =>
                            filterKeyByBase(key, normalizedBase),
                        );
                    }

                    if (opts?.maxDepth !== void 0) {
                        filtered = filtered.filter((key: string): boolean =>
                            filterKeyByDepth(key, opts.maxDepth),
                        );
                    }

                    return filtered;
                },
                clear(base?: string): void {
                    if (!base) {
                        mmkv.clearAll();
                        return void 0;
                    }

                    const normalizedBase: string = normalizeBaseKey(base);

                    const keys: string[] = mmkv
                        .getAllKeys()
                        .filter((key: string): boolean =>
                            filterKeyByBase(key, normalizedBase),
                        );

                    for (const key of keys) {
                        mmkv.remove(key);
                    }
                },
                dispose(): void {
                    for (const listener of activeListeners) listener.remove();
                    activeListeners.clear();
                },
                watch(callback: WatchCallback): Unwatch {
                    const listener: Listener = mmkv.addOnValueChangedListener(
                        (key: string): void => {
                            const event: WatchEvent = mmkv.contains(key)
                                ? "update"
                                : "remove";

                            callback(event, key);
                        },
                    );

                    activeListeners.add(listener);

                    return (): void => {
                        listener.remove();
                        activeListeners.delete(listener);
                    };
                },
            };
        },
    );

    return driver(options ?? {});
};

export default mmkvDriver;
export type { DriverOptions };
export { mmkvDriver };
