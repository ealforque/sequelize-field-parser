"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class FieldParserService {
    fields;
    constructor() {
        this.fields = [];
    }
    parseFields = (fields, model) => {
        this.fields = fields
            .split(",")
            .map((f) => f.trim())
            .filter((f) => f.length > 0);
        const relationshipTree = {};
        const columns = [...model.DEFAULT_FIELDS];
        const selectableFields = model.SELECTABLE_FIELDS;
        for (const field of this.fields) {
            const segments = field.split(".");
            if (segments.length === 1) {
                const topField = segments[0];
                if (selectableFields.includes(topField)) {
                    columns.push(topField);
                }
            }
            else {
                let relationship = relationshipTree;
                for (let i = 0; i < segments.length; i++) {
                    const field = segments[i];
                    if (!relationship[field]) {
                        relationship[field] = i === segments.length - 1 ? true : {};
                    }
                    if (relationship[field] !== true) {
                        relationship = relationship[field];
                    }
                }
            }
        }
        return { columns, relationshipTree };
    };
    buildSequelizeInclude = (tree, model) => {
        const includeOptions = Object.entries(tree).flatMap(([relation, nested]) => {
            const relationship = model.associations?.[relation];
            if (!relationship || !relationship.target)
                return [];
            const currentModel = relationship.target;
            const selectableFields = currentModel.SELECTABLE_FIELDS;
            if (nested === true) {
                return {
                    model: currentModel,
                    as: relation,
                    attributes: [],
                };
            }
            const deeperIncludes = this.buildSequelizeInclude(nested, currentModel);
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
        });
        return includeOptions;
    };
}
exports.default = FieldParserService;
