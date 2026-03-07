# Sequelize Field Parser Package

![npm version](https://img.shields.io/npm/v/@ealforque/sequelize-field-parser)
![build](https://github.com/ealforque/sequelize-field-parser/actions/workflows/release.yaml/badge.svg)
![license](https://img.shields.io/badge/license-MIT-green)
[![Socket Badge](https://badge.socket.dev/npm/package/@ealforque/sequelize-field-parser)](https://badge.socket.dev/npm/package/@ealforque/sequelize-field-parser)

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

## Usage (Correct Example)

```typescript
import FieldParserService from "./src/field_parser.service";
import SomeModel from "./models/SomeModel";

const parser = new FieldParserService();
const result = parser.parseFields("id,name,profile.email", SomeModel);
console.log(result);
/*
{
  columns: ['id', 'name'],
  relationshipTree: { profile: { email: true } },
  invalidFields: []
}
*/
```

---

## Edge Case Handling

### Malformed Input

```typescript
const parser = new FieldParserService();
const result = parser.parseFields(" ,foo..bar,.baz,", SomeModel);
console.log(result); // invalidFields will include malformed entries
/*
{
  columns: [],
  relationshipTree: {},
  invalidFields: ['foo..bar', '.baz']
}
*/
```

### Missing Static Properties

```typescript
const parser = new FieldParserService();
const result = parser.parseFields("id,name", ModelWithoutStatics);
console.log(result); // columns will be empty, invalidFields will include all
/*
{
  columns: [],
  relationshipTree: {},
  invalidFields: ['id', 'name']
}
*/
```

### Non-Model Input

```typescript
const parser = new FieldParserService();
const result = parser.parseFields("id,name", {});
console.log(result); // columns empty, invalidFields includes all
/*
{
  columns: [],
  relationshipTree: {},
  invalidFields: ['id', 'name']
}
*/
```

### Non-Existent Associations

```typescript
const parser = new FieldParserService();
const result = parser.parseFields("profile.address.zip", SomeModel);
console.log(result); // invalidFields includes non-existent associations
/*
{
  columns: [],
  relationshipTree: {},
  invalidFields: ['profile.address.zip']
}
*/
```

### Deeply Nested/Circular Relationships

```typescript
const parser = new FieldParserService();
const result = parser.parseFields("a.b.c.d.e.f.g.h.i.j.k", SomeModel);
console.log(result); // invalidFields includes overly deep/circular fields
/*
{
  columns: [],
  relationshipTree: {},
  invalidFields: ['a.b.c.d.e.f.g.h.i.j.k']
}
*/
```

### Duplicate Fields

```typescript
const parser = new FieldParserService();
const result = parser.parseFields("id,id,name,name", SomeModel);
console.log(result); // columns deduplicated
/*
{
  columns: ['id', 'name'],
  relationshipTree: {},
  invalidFields: []
}
*/
```

### Relationship Leaf Attribute Filtering

If a nested relationship contains attributes not in `SELECTABLE_FIELDS`, those attributes are filtered out and a warning is logged for each ignored attribute.

```typescript
const parser = new FieldParserService();
const tree = {
  status: {
    name: true,
    invalid_field: true,
  },
};
const mockModel = {
  associations: {
    status: {
      target: { SELECTABLE_FIELDS: ["name"] },
    },
  },
};
const result = parser.buildSequelizeInclude(tree, mockModel);
console.log(result);
/*
Warning: FieldParserService: Attribute 'invalid_field' in relationship 'status' is not in SELECTABLE_FIELDS and will be ignored.
[
  {
    model: { SELECTABLE_FIELDS: ["name"] },
    as: "status",
    attributes: ["name"],
    include: [],
  },
]
*/
```

### Empty Relationship Attributes (No DEFAULT_FIELDS)

If a relationship is specified but no attributes are selected and the related model does not define `DEFAULT_FIELDS`, a warning is logged and the attributes array will be empty.

```typescript
const parser = new FieldParserService();
const tree = {
  status: {}, // No attributes selected
};
const mockModel = {
  associations: {
    status: {
      target: { SELECTABLE_FIELDS: [] }, // No DEFAULT_FIELDS
    },
  },
};
const result = parser.buildSequelizeInclude(tree, mockModel);
console.log(result);
/*
Warning: FieldParserService: No attributes selected and no DEFAULT_FIELDS available for relationship 'status'. Attributes array will be empty.
[
  {
    model: { SELECTABLE_FIELDS: [] },
    as: "status",
    attributes: [],
    include: [],
  },
]
*/
```

### Association Alias Mismatches

If the association alias in the model does not match the field string, the relationship will not be included and a warning is logged.

```typescript
const parser = new FieldParserService();
const mockModel = {
  associations: {}, // No 'profile' association
  SELECTABLE_FIELDS: ["id", "name"],
};
const result = parser.parseFields("profile.email", mockModel);
console.log(result);
/*
Warning: FieldParserService: Association alias 'profile' does not exist in model 'unknown'. Field 'profile.email' will be treated as invalid.
{
  columns: [],
  relationshipTree: {},
  invalidFields: ["profile.email"]
}
*/
```

## Supply Chain Security

This package runs `npm audit` in its CI workflow to check for vulnerabilities in dependencies before publishing. Automated dependency updates and vulnerability checks are enabled for maximum supply chain security.

Example GitHub Actions step:

```yaml
- name: Audit dependencies
  run: npm audit --audit-level=high
```
