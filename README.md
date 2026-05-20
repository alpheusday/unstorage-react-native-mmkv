# unstorage React Native MMKV

A React Native MMKV driver for unstorage.

## Installation

> Both `unstorage` and `react-native-mmkv` are required to be installed.

Install this package as a dependency in the project:

```sh
# npm
npm i unstorage-react-native-mmkv

# Yarn
yarn add unstorage-react-native-mmkv

# pnpm
pnpm add unstorage-react-native-mmkv

# Deno
deno add npm:unstorage-react-native-mmkv

# Bun
bun add unstorage-react-native-mmkv
```

## Usage

```ts
import { createStorage } from "unstorage";
import { mmkvDriver } from "unstorage-react-native-mmkv";

const storage = createStorage({
  driver: mmkvDriver(),
});
```

### Options

`mmkvDriver` accepts [MMKV Configuration](https://github.com/mrousavy/react-native-mmkv/blob/main/packages/react-native-mmkv/src/specs/MMKV.nitro.ts) options and driver-specific options:

| Option | Type     | Default | Description                                                                |
| ------ | -------- | ------- | -------------------------------------------------------------------------- |
| `base` | `string` | `""`    | Prefix for all keys. Useful for namespacing within a shared MMKV instance. |

### Storage Operations

For the storage APIs, please refer to the [unstorage guide](https://unstorage.unjs.io/guide).

## Contributing

For contributing, please refer to the [contributing guide](./CONTRIBUTING.md).

## License

This project is licensed under the terms of the MIT license.
