# Sequelize Field Parser Package

![npm version](https://img.shields.io/npm/v/@ealforque/sequelize-field-parser)
![build](https://github.com/ealforque/sequelize-field-parser/actions/workflows/release.yaml/badge.svg)

## Description

A TypeScript utility for Sequelize models that lets users specify fields to include in queries and automatically builds the `include` parameter for Sequelize. It simplifies selecting fields and relationships, making complex query construction and model association management more efficient.

## Features

- **Parse Sequelize model fields and relationships:** Easily extract and validate fields and associations from models
- **Generate field trees for complex models:** Build nested relationship trees for Sequelize includes
- **Type-safe interfaces and types:** All parsing and tree generation is type-safe
- **Easy integration with MySQL via Sequelize:** Works seamlessly with Sequelize ORM
- **Test-driven development with Jest:** Comprehensive test suite for robust behavior
- **Handles maximum relationship depth (default: 10):** Prevents runaway includes and logs warnings
- **Detects and prevents circular relationships:** Safely handles circular model associations
- **Handles malformed input:** Catches empty, whitespace, consecutive dots, leading/trailing dots
- **Deduplicates columns:** Duplicate fields in the input string will not result in duplicate entries in the `columns` array
- **Model requirements:** Models must define static `DEFAULT_FIELDS` and `SELECTABLE_FIELDS` properties. If these are missing, no fields will be selectable and all user-specified fields may be reported as invalid.
- **Input requirements:** Only valid Sequelize model classes or objects with the required static properties should be passed. Passing a non-model or incorrectly typed object may result in type errors or runtime errors.

## Installation

```bash
npm install @ealforque/sequelize-field-parser
```

## Usage

> **Note:** Your Sequelize models must define static `DEFAULT_FIELDS` and `SELECTABLE_FIELDS` arrays. If these are missing, the parser will treat all user-specified fields as invalid and may return empty columns.
> **Warning:** Passing a non-Sequelize model or an incorrectly typed object may cause type errors or runtime errors. Always use valid Sequelize model classes.

Import and use in your project:

```typescript
import FieldParserService from "@ealforque/sequelize-field-parser";
import Task from "./models/task.model"; // Example Sequelize model

const parser = new FieldParserService();

// Example query parameter from API
const queryParams =
  "status.uuid,status.name,status.category.uuid,status.category.name";

// Parse fields and build relationship tree
const { columns, relationshipTree, invalidFields } = parser.parseFields(
  queryParams,
  Task,
);

// Build the sequelize include array
const include = parser.buildSequelizeInclude(relationshipTree, Task);

// Log invalid fields (if any)
if (invalidFields.length > 0) {
  console.warn("Invalid fields:", invalidFields);
}

// Example: Handling malformed input
const malformedQuery = "name.,.name,name..created_at,created_at";
const { columns: malformedColumns, invalidFields: malformedInvalid } =
  parser.parseFields(malformedQuery, Task);
console.log("Malformed columns:", malformedColumns); // valid fields only
console.warn("Malformed fields:", malformedInvalid); // ["name.", ".name", "name..created_at"]

// Example: Handling maximum depth and circular relationships
// If the relationship tree is too deep or circular, a warning will be logged and the include will be truncated.
const deepQuery = "a.b.c.d.e.f.g.h.i.j.k.field"; // 11 levels deep
const { relationshipTree: deepTree } = parser.parseFields(deepQuery, Task);
const deepInclude = parser.buildSequelizeInclude(deepTree, Task);
// Will log: "Maximum include depth exceeded."

const circularQuery = "self.self.self.field";
const { relationshipTree: circularTree } = parser.parseFields(
  circularQuery,
  Task,
);
const circularInclude = parser.buildSequelizeInclude(circularTree, Task);
// Will log: "Circular relationship detected."

// Use in a Sequelize query
const tasks = await Task.findAll({
  attributes: columns,
  include,
});
```

Example output for include:

```json
[
  {
    "model": "Status",
    "as": "status",
    "attributes": ["uuid", "name"],
    "include": [
      {
        "model": "Category",
        "as": "category",
        "attributes": ["uuid", "name"]
      }
    ]
  }
]
```
