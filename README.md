# React Component Tree Generator

![npm](https://img.shields.io/npm/v/react-component-tree-generator)
![license](https://img.shields.io/github/license/your-repo/react-component-tree-generator)

A CLI tool to analyze a React project and generate a component tree in Markdown format for visualization with [Markmap](https://markmap.js.org/).

## Features

- Automatically detects React components in a project.
- Generates a structured Markdown representation of the component hierarchy.
- Allows filtering of external library components.
- Supports scanning specific directories.

## Installation

```sh
npm install -g react-component-tree-generator
```

## Usage

```sh
react-tree [directory] [options]
```

### Arguments

- `directory` (optional) - The root directory of your React project (default: current directory `.`).

### Options

- `--ignore-libs <libs...>` - Ignore components imported from specified libraries.
- `--project-only` - Only include components defined within the project.
- `--in <dirs...>` - Restrict scanning to specific directories (relative to the project root).

### Example Commands

#### Generate a component tree for the whole project:
```sh
react-tree ./my-react-app
```

#### Ignore external UI libraries:
```sh
react-tree ./my-react-app --ignore-libs react-bootstrap antd
```

#### Only scan specific directories:
```sh
react-tree ./my-react-app --in src/components src/pages
```

#### Include only project-defined components:
```sh
react-tree ./my-react-app --project-only
```

## Output Format
The script generates a Markdown file `componentsTree.mm.md` in the following format:

```md
---
title: Component Tree
markmap:
  colorFreezeLevel: 4
---

## Layout
- Navbar
- Home
  - SlideShowA
  - SlideShowB
- PersonalDetails
  - CardContainerA
    - Card
  - CardContainerB
    - Card
```

You can visualize this file using [Markmap](https://markmap.js.org/).

## License
This project is licensed under the MIT License.
