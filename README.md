# Sequelize Field Parser Package

![npm version](https://img.shields.io/npm/v/@ealforque/sequelize-field-parser)
![build](https://github.com/ealforque/sequelize-field-parser/actions/workflows/release.yaml/badge.svg)

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
npm install @ealforque/sequelize-field-parser
```

## Usage

Import and use in your project:

```typescript
import FieldParserService from "@ealforque/sequelize-field-parser";
import Task from "./models/task.model"; // Example Sequelize model

const parser = new FieldParserService();

// Example query parameter from API
const queryParams = "status.uuid,status.name,status.category.uuid,status.category.name";

// Parse fields and build relationship tree
const { columns, relationshipTree, invalidFields } = parser.parseFields(queryParams, Task);

// Build the sequelize include array
const include = parser.buildSequelizeInclude(relationshipTree, Task);

// Log invalid fields (if any)
if (invalidFields.length > 0) {
  console.warn("Invalid fields:", invalidFields);
}

// Use in a Sequelize query
const tasks = await Task.findAll({
  attributes: columns,
  include,
});

// Example output for include:
/*
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
