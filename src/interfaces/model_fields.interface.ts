import { Model, ModelStatic } from "sequelize";

export default interface ModelStaticWithFields<T extends Model>
  extends ModelStatic<T> {
  DEFAULT_FIELDS: string[];
  SELECTABLE_FIELDS: string[];
}
