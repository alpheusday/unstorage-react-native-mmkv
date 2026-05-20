# unstorage React Native MMKV

A React Native MMKV driver for unstorage.

## Usage

```ts
import { createStorage } from "unstorage";
import { mmkvDriver } from "unstorage-react-native-mmkv";

const storage = createStorage({
    driver: mmkvDriver(),
});
```

### Options

`mmkvDriver` accepts React Native MMKV [Configuration](https://github.com/mrousavy/react-native-mmkv/blob/main/packages/react-native-mmkv/src/specs/MMKV.nitro.ts) options and driver-specific options:

| Option | Type     | Default | Description                                                                |
| ------ | -------- | ------- | -------------------------------------------------------------------------- |
| `base` | `string` | `""`    | Prefix for all keys. Useful for namespacing within a shared MMKV instance. |

### Storage APIs

For the storage APIs, please refer to the [unstorage guide](https://unstorage.unjs.io/guide).

## License

This project is licensed under the terms of the MIT license.
