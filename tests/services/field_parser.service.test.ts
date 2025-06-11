import { Model, ModelStatic } from "sequelize";

import FieldParserService from "@/field_parser.service";
import ModelStaticWithFields from "@/interfaces/model_fields.interface";
import { RelationshipTree } from "@/types/model.relationship.tree.type";

describe("FieldParserService", () => {
  let service: FieldParserService;

  beforeEach(() => {
    service = new FieldParserService();
  });

  const createMockModel = (
    options: Partial<{
      associations: any;
      DEFAULT_FIELDS: string[];
      SELECTABLE_FIELDS: string[];
    }> = {},
  ): ModelStaticWithFields<Model> => {
    return {
      associations: options.associations ?? {},
      DEFAULT_FIELDS: options.DEFAULT_FIELDS ?? [],
      SELECTABLE_FIELDS: options.SELECTABLE_FIELDS ?? [],
    } as ModelStaticWithFields<Model>;
  };

  describe("parseFields()", () => {
    it("should not include fields not in selecteable fields", () => {
      const mockModel = createMockModel({
        DEFAULT_FIELDS: ["uuid"],
        SELECTABLE_FIELDS: ["name", "created_at"],
      });

      const result = service.parseFields(
        "name,created_at,deleted_at",
        mockModel,
      );

      expect(result.columns).toEqual(["uuid", "name", "created_at"]);
      expect(result.relationshipTree).toEqual({});
    });

    it("should handle default fields", () => {
      const mockModel = createMockModel({
        DEFAULT_FIELDS: ["uuid"],
        SELECTABLE_FIELDS: ["name", "created_at"],
      });

      const result = service.parseFields("name,created_at", mockModel);

      expect(result.columns).toEqual(["uuid", "name", "created_at"]);
      expect(result.relationshipTree).toEqual({});
    });

    it("should trim and ignore empty fields", () => {
      const mockModel = createMockModel({
        DEFAULT_FIELDS: ["uuid"],
        SELECTABLE_FIELDS: ["name", "created_at"],
      });

      const result = service.parseFields("name,, , created_at", mockModel);

      expect(result.columns).toEqual(["uuid", "name", "created_at"]);
      expect(result.relationshipTree).toEqual({});
    });

    it("should build nested relationship tree", () => {
      const mockModel = createMockModel({ DEFAULT_FIELDS: ["uuid"] });

      const result = service.parseFields(
        "status.name,status.created_at",
        mockModel,
      );

      expect(result.columns).toEqual(["uuid"]);
      expect(result.relationshipTree).toEqual({
        status: {
          name: true,
          created_at: true,
        },
      });
    });

    it("should support deeply nested fields", () => {
      const mockModel = createMockModel();

      const result = service.parseFields("user.profile.avatar.url", mockModel);

      expect(result.columns).toEqual([]);
      expect(result.relationshipTree).toEqual({
        user: {
          profile: {
            avatar: {
              url: true,
            },
          },
        },
      });
    });
  });

  describe("buildSequelizeInclude()", () => {
    const mockTargetModel = (selectableFields: string[]) =>
      ({
        SELECTABLE_FIELDS: selectableFields,
      }) as ModelStaticWithFields<Model>;

    it("should return empty array if association is missing", () => {
      const model = createMockModel();

      const tree = { invalid: true };
      const result = service.buildSequelizeInclude(
        tree as RelationshipTree,
        model,
      );

      expect(result).toEqual([]);
    });

    it("should handle leaf-only include", () => {
      const currentModel = createMockModel({
        associations: {
          status: {
            target: mockTargetModel(["name", "created_at"]),
          },
        },
      });

      const tree = {
        status: {
          name: true,
          created_at: true,
          invalid_field: true,
        },
      };

      const result = service.buildSequelizeInclude(
        tree as RelationshipTree,
        currentModel,
      );

      expect(result).toEqual([
        {
          model: expect.anything(),
          as: "status",
          attributes: ["name", "created_at"],
          include: [],
        },
      ]);
    });

    it("should handle deeper nested includes", () => {
      const profileModel = mockTargetModel(["avatar"]);
      const userModel = {
        associations: {
          profile: {
            target: profileModel,
          },
        },
        SELECTABLE_FIELDS: ["username"],
      } as unknown as ModelStatic<Model>;

      const mainModel = createMockModel({
        associations: {
          user: {
            target: userModel,
          },
        },
      });

      const tree = {
        user: {
          username: true,
          profile: {
            avatar: true,
          },
        },
      };

      const result = service.buildSequelizeInclude(
        tree as RelationshipTree,
        mainModel,
      );

      expect(result).toEqual([
        {
          model: userModel,
          as: "user",
          attributes: ["username"],
          include: [
            {
              model: profileModel,
              as: "profile",
              attributes: ["avatar"],
              include: [],
            },
          ],
        },
      ]);
    });

    it("should handle true as direct include with no attributes", () => {
      const mockModel = createMockModel({
        associations: {
          details: {
            target: mockTargetModel(["field"]),
          },
        },
      });

      const tree = {
        details: true,
      };

      const result = service.buildSequelizeInclude(
        tree as RelationshipTree,
        mockModel,
      );

      expect(result).toEqual([
        {
          model: expect.anything(),
          as: "details",
          attributes: [],
        },
      ]);
    });
  });
});
