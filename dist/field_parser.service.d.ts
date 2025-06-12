import { IncludeOptions, Model, ModelStatic } from "sequelize";
import ModelStaticWithFields from "./interfaces/model_fields.interface";
import { RelationshipTree } from "./types/model.relationship.tree.type";
declare class FieldParserService {
    private fields;
    constructor();
    parseFields: <M extends Model>(fields: string, model: ModelStaticWithFields<M>) => {
        columns: string[];
        relationshipTree: RelationshipTree;
    };
    buildSequelizeInclude: <M extends Model>(tree: RelationshipTree, model: ModelStatic<M>) => IncludeOptions[];
}
export default FieldParserService;
