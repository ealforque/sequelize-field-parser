import { IncludeOptions, Model, ModelStatic } from "sequelize";

import ModelStaticWithFields from "./interfaces/model_fields.interface";
import { RelationshipTree } from "./types/model.relationship.tree.type";

class FieldParserService {
  private fields: string[];

  constructor() {
    this.fields = [];
  }

  parseFields = <M extends Model>(
    fields: string,
    model: ModelStaticWithFields<M>,
  ) => {
    if (
      typeof model !== "object" ||
      model === null ||
      !("associations" in model) ||
      typeof (model as any).associations !== "object"
    ) {
      console.warn(
        "FieldParserService: Input is not a valid Sequelize model. Returning all fields as invalid.",
      );
      const inputFields = fields
        .split(",")
        .map((f) => f.trim())
        .filter((f) => f.length > 0);
      return {
        columns: [],
        relationshipTree: {},
        invalidFields: inputFields,
      };
    }

    this.fields = fields
      .split(",")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    const relationshipTree: RelationshipTree = {};
    const invalidFields: string[] = [];
    const safeModel = model as ModelStaticWithFields<M>;
    const columns: string[] = Array.isArray(safeModel.DEFAULT_FIELDS)
      ? [...safeModel.DEFAULT_FIELDS]
      : [];
    const selectableFields = Array.isArray(safeModel.SELECTABLE_FIELDS)
      ? safeModel.SELECTABLE_FIELDS
      : [];

    for (const field of this.fields) {
      // Basic validation to catch empty fields, fields with only whitespace, and invalid dot usage
      if (
        field === "" ||
        /^\s*$/.test(field) ||
        /\.\./.test(field) ||
        /^\.|\.$/.test(field)
      ) {
        invalidFields.push(field);
        continue;
      }
      const segments = field.split(".");
      if (segments.length === 1) {
        const topField = segments[0];
        if (selectableFields.includes(topField)) {
          columns.push(topField);
        } else {
          invalidFields.push(field);
        }
      } else {
        let relationship = relationshipTree;
        let currentModel: any = model;
        let valid = true;
        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i];
          if (i < segments.length - 1) {
            if (!currentModel.associations || !currentModel.associations[seg]) {
              valid = false;
              break;
            }
            currentModel = currentModel.associations[seg].target;
            if (!relationship[seg]) {
              relationship[seg] = {};
            }
            relationship = relationship[seg] as RelationshipTree;
          } else {
            if (
              currentModel.SELECTABLE_FIELDS &&
              currentModel.SELECTABLE_FIELDS.includes(seg)
            ) {
              relationship[seg] = true;
            } else {
              valid = false;
            }
          }
        }
        if (!valid) {
          invalidFields.push(field);
        }
      }
    }

    const uniqueColumns = Array.from(new Set(columns));
    return { columns: uniqueColumns, relationshipTree, invalidFields };
  };

  buildSequelizeInclude = <M extends Model>(
    tree: RelationshipTree,
    model: ModelStatic<M>,
    depth = 0,
    visitedModels: Set<any> = new Set(),
  ): IncludeOptions[] => {
    const MAX_DEPTH = 10;
    if (depth > MAX_DEPTH) {
      console.warn("Maximum include depth exceeded.");
      return [];
    }
    if (visitedModels.has(model)) {
      console.warn("Circular relationship detected.");
      return [];
    }
    visitedModels.add(model);

    const includeOptions: IncludeOptions[] = Object.entries(tree).flatMap(
      ([relation, nested]) => {
        const relationship = model.associations?.[relation];
        if (!relationship || !relationship.target) return [];

        const currentModel =
          relationship.target as ModelStaticWithFields<Model>;
        const selectableFields = currentModel.SELECTABLE_FIELDS;

        if (nested === true) {
          return {
            model: currentModel,
            as: relation,
            attributes: [],
          };
        }

        const deeperIncludes = this.buildSequelizeInclude(
          nested as RelationshipTree,
          currentModel,
          depth + 1,
          visitedModels,
        );
        const leafAttributes = Object.entries(nested)
          .filter(([, value]) => value === true)
          .map(([key]) => key)
          .filter((attr) => selectableFields.includes(attr));

        return {
          model: currentModel,
          as: relation,
          attributes: leafAttributes,
          include: deeperIncludes,
        };
      },
    );

    visitedModels.delete(model);
    return includeOptions;
  };
}

export default FieldParserService;
