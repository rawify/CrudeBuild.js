# CrudeBuild.js

CrudeBuild.js is a simple JavaScript build tool designed to handle minification and header generation tasks for single file libraries, with no configuration needed. It supports the generation of CommonJS and ES module exports.

## Features

- **Minification**: Automatically minifies your JavaScript files for optimized production builds.
- **Header Generation**: Extracts metadata from your `package.json` file to generate headers for your build output.
- **Zero Configuration**: Works out of the box without any need for configuration files.
- **Zero Dependencies**: Lightweight and self-contained with no external dependencies.
- **CommonJS and ESM Export Generation**: Automatically generates both CommonJS (`.cjs`) and ES module (`.mjs`) exports for easy module consumption.

## Installation

Install CrudeBuild.js using npm:

```bash
npm install crude-build
```

## Usage

Once installed, you can add it to the scripts of your `package.json` :

```bash
 "build": "crude-build ModuleName",
```

By default, CrudeBuild.js will:

1. Create browser JavaScript files that get minified using Closure Compiler.
2. Generate output files in the `dist/` folder.
3. Add a header to the output file, which includes metadata (name, version, author) from your `package.json`.
4. Create both `.cjs` (CommonJS) and `.mjs` (ES Module) files in the `dist/` folder for cross-environment compatibility.

## Copyright and licensing

Copyright (c) 2025, [Robert Eisele](https://raw.org/)
Licensed under the MIT license.
