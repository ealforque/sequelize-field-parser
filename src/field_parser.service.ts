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
    this.fields = fields
      .split(",")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    const relationshipTree: RelationshipTree = {};
    const columns: string[] = [...model.DEFAULT_FIELDS];
    const selectableFields = model.SELECTABLE_FIELDS;

    for (const field of this.fields) {
      const segments = field.split(".");
      if (segments.length === 1) {
        const topField = segments[0];
        if (selectableFields.includes(topField)) {
          columns.push(topField);
        }
      } else {
        let relationship = relationshipTree;
        for (let i = 0; i < segments.length; i++) {
          const field = segments[i];
          if (!relationship[field]) {
            relationship[field] = i === segments.length - 1 ? true : {};
          }
          if (relationship[field] !== true) {
            relationship = relationship[field] as RelationshipTree;
          }
        }
      }
    }

    return { columns, relationshipTree };
  };

  buildSequelizeInclude = <M extends Model>(
    tree: RelationshipTree,
    model: ModelStatic<M>,
  ): IncludeOptions[] => {
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

    return includeOptions;
  };
}

export default FieldParserService;
