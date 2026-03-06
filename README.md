# Sequelize Field Parser Package

![npm version](https://img.shields.io/npm/v/sequelize-field-parser)
![build](https://img.shields.io/github/workflow/status/ealforque/sequelize-field-parser/CI)

## Description

A TypeScript utility for Sequelize models that lets users specify fields to include in queries and automatically builds the `include` parameter for Sequelize. It simplifies selecting fields and relationships, making complex query construction and model association management more efficient.

## Features

- Parse Sequelize model fields and relationships
- Generate field trees for complex models
- Type-safe interfaces and types
- Easy integration with MySQL via Sequelize
- Test-driven development with Jest

## Installation

```bash
npm install ealforque/sequelize-field-parser
```

## Usage

Import and use in your project:

```typescript
import FieldParserService from "sequelize-field-parser";
import Status from "./path/to/status.model";

const parser = new FieldParserService();

// query parameter
// api/resource?fields='status.uuid,status.name,status.category.uuid,status.category.name'
const queryParams =
  "status.uuid,status.name,status.category.uuid,status.category.name";

// Parse the query parameter
const { columns, relationshipTree } = parser.parseFields(queryParams, Model);

// Build the sequelize include
const include = parser.buildSequelizeInclude(relationshipTree, Model);

console.log(include);
/* Example output:
[
  {
    model: Status,
    as: 'status',
    attributes: ['uuid', 'name'],
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['uuid', 'name'],
      }
    ]
  }
]
*/
```
