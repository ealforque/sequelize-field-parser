import { IncludeOptions, Model, ModelStatic } from "sequelize";

import FieldParserService from "../../src/field_parser.service";
import ModelStaticWithFields from "../../src/interfaces/model_fields.interface";
import { RelationshipTree } from "../../src/types/model.relationship.tree.type";

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
        "name,created_at,deleted_at,uuid,foo,bar, ,baz,created_at,name",
        mockModel,
      );
      expect(result.columns).toContain("uuid");
      expect(result.columns).toContain("name");
      expect(result.columns).toContain("created_at");
      expect(result.columns.length).toBeGreaterThanOrEqual(3);
      expect(result.relationshipTree).toEqual({});
      expect(result.invalidFields).toContain("deleted_at");
      expect(result.invalidFields).toContain("foo");
      expect(result.invalidFields).toContain("bar");
      expect(result.invalidFields).toContain("baz");
      expect(result.invalidFields.length).toBeGreaterThanOrEqual(4);
      expect(
        result.columns.filter((c) => c === "name").length,
      ).toBeGreaterThanOrEqual(1);
      expect(
        result.columns.filter((c) => c === "created_at").length,
      ).toBeGreaterThanOrEqual(1);
      expect(result.invalidFields).not.toContain("name");
      expect(result.invalidFields).not.toContain("created_at");
    });

    it("should handle default fields", () => {
      const mockModel = createMockModel({
        DEFAULT_FIELDS: ["uuid"],
        SELECTABLE_FIELDS: ["name", "created_at"],
      });
      const result = service.parseFields(
        "name,created_at,uuid,foo,bar,uuid",
        mockModel,
      );
      expect(result.columns).toContain("uuid");
      expect(result.columns).toContain("name");
      expect(result.columns).toContain("created_at");
      expect(result.columns.length).toBeGreaterThanOrEqual(3);
      expect(result.relationshipTree).toEqual({});
      expect(result.invalidFields).toContain("foo");
      expect(result.invalidFields).toContain("bar");
      expect(result.invalidFields.length).toBeGreaterThanOrEqual(2);
      expect(
        result.columns.filter((c) => c === "uuid").length,
      ).toBeGreaterThanOrEqual(1);
      expect(
        result.columns.filter((c) => c === "name").length,
      ).toBeGreaterThanOrEqual(1);
      expect(result.invalidFields).not.toContain("name");
      expect(result.invalidFields).not.toContain("created_at");
    });

    it("should trim and ignore empty fields", () => {
      const mockModel = createMockModel({
        DEFAULT_FIELDS: ["uuid"],
        SELECTABLE_FIELDS: ["name", "created_at"],
      });
      const result = service.parseFields("name,, , created_at, ,", mockModel);
      expect(result.columns).toContain("name");
      expect(result.columns).toContain("created_at");
      expect(result.columns.length).toBeGreaterThanOrEqual(2);
      expect(result.relationshipTree).toEqual({});
      expect(result.invalidFields.length).toBe(0);
      expect(
        result.columns.filter((c) => c === "name").length,
      ).toBeGreaterThanOrEqual(1);
      expect(
        result.columns.filter((c) => c === "created_at").length,
      ).toBeGreaterThanOrEqual(1);
      expect(result.invalidFields).not.toContain("name");
      expect(result.invalidFields).not.toContain("created_at");
    });

    it("should build nested relationship tree", () => {
      const statusModel = createMockModel({
        SELECTABLE_FIELDS: ["name", "created_at"],
      });
      const mockModel = createMockModel({
        DEFAULT_FIELDS: ["uuid"],
        associations: {
          status: { target: statusModel },
        },
      });
      const result = service.parseFields(
        "status.name,status.created_at,status.foo,status.name,status.created_at",
        mockModel,
      );
      expect(result.columns).toContain("uuid");
      expect(typeof result.relationshipTree.status).toBe("object");
      expect(result.relationshipTree.status).not.toBeUndefined();
      if (
        typeof result.relationshipTree.status === "object" &&
        result.relationshipTree.status.hasOwnProperty("name")
      ) {
        expect(result.relationshipTree.status.name).toBe(true);
      }
      if (
        typeof result.relationshipTree.status === "object" &&
        result.relationshipTree.status.hasOwnProperty("created_at")
      ) {
        expect(result.relationshipTree.status.created_at).toBe(true);
      }
      expect(result.invalidFields).toContain("status.foo");
      expect(result.invalidFields.length).toBeGreaterThanOrEqual(1);
      expect(
        Object.keys(result.relationshipTree.status).length,
      ).toBeGreaterThanOrEqual(2);
      expect(
        result.columns.filter((c) => c === "uuid").length,
      ).toBeGreaterThanOrEqual(1);
      expect(result.invalidFields).not.toContain("status.name");
      expect(result.invalidFields).not.toContain("status.created_at");
      expect(result.relationshipTree.status).not.toBeUndefined();
    });

    it("should support deeply nested fields", () => {
      const avatarModel = createMockModel({ SELECTABLE_FIELDS: ["url"] });
      const profileModel = createMockModel({
        associations: {
          avatar: { target: avatarModel },
        },
      });
      const userModel = createMockModel({
        associations: {
          profile: { target: profileModel },
        },
      });
      const mockModel = createMockModel({
        associations: {
          user: { target: userModel },
        },
      });
      const result = service.parseFields(
        "user.profile.avatar.url,user.profile.avatar.foo,user.profile.avatar.url",
        mockModel,
      );
      expect(result.columns).toEqual([]);
      expect(typeof result.relationshipTree.user).toBe("object");
      expect(result.relationshipTree.user).not.toBeUndefined();
      const userTree = result.relationshipTree.user;
      if (
        typeof userTree === "object" &&
        userTree !== null &&
        userTree.hasOwnProperty("profile")
      ) {
        const profileTree = userTree.profile;
        expect(profileTree).not.toBeUndefined();
        expect(typeof profileTree).toBe("object");
        if (
          typeof profileTree === "object" &&
          profileTree !== null &&
          profileTree.hasOwnProperty("avatar")
        ) {
          const avatarTree = profileTree.avatar;
          expect(avatarTree).not.toBeUndefined();
          expect(typeof avatarTree).toBe("object");
          if (
            typeof avatarTree === "object" &&
            avatarTree !== null &&
            avatarTree.hasOwnProperty("url")
          ) {
            expect(avatarTree.url).toBe(true);
            expect(Object.keys(avatarTree).length).toBeGreaterThanOrEqual(1);
          }
          expect(avatarTree.hasOwnProperty("foo")).toBe(false);
        }
        expect(profileTree.hasOwnProperty("avatar")).toBe(true);
      }
      expect(result.invalidFields).toContain("user.profile.avatar.foo");
      expect(result.invalidFields.length).toBeGreaterThanOrEqual(1);
      expect(result.invalidFields).not.toContain("user.profile.avatar.url");
      const userTree2 = result.relationshipTree.user;
      if (
        typeof userTree2 === "object" &&
        userTree2 !== null &&
        userTree2.hasOwnProperty("profile")
      ) {
        const profileTree2 = userTree2.profile;
        if (
          typeof profileTree2 === "object" &&
          profileTree2 !== null &&
          profileTree2.hasOwnProperty("avatar")
        ) {
          const avatarTree2 = profileTree2.avatar;
          expect(avatarTree2).not.toBeUndefined();
        }
        expect(profileTree2).not.toBeUndefined();
      }
      expect(userTree2).not.toBeUndefined();
      expect(result.relationshipTree).not.toBeUndefined();
      expect(result.columns).not.toBeUndefined();
      expect(result.invalidFields).not.toBeUndefined();
    });

    it("should report invalid nested fields", () => {
      const mockModel = createMockModel({
        associations: {
          status: {
            target: createMockModel({
              associations: {},
              SELECTABLE_FIELDS: ["name"],
            }),
          },
        },
      });
      const result = service.parseFields(
        "status.invalidField,status.name,status.invalidField",
        mockModel,
      );
      expect(result.invalidFields).toContain("status.invalidField");
      expect(result.invalidFields.length).toBeGreaterThanOrEqual(1);
      expect(result.invalidFields).not.toContain("status.name");
      const statusTree = result.relationshipTree.status;
      if (
        typeof statusTree === "object" &&
        statusTree !== null &&
        statusTree.hasOwnProperty("name")
      ) {
        expect(statusTree.name).toBe(true);
      }
      expect(statusTree).toBeDefined();
      expect(typeof statusTree).toBe("object");
      expect(statusTree).not.toBeUndefined();
      if (typeof statusTree === "object" && statusTree.hasOwnProperty("name")) {
        expect(statusTree.name).toBe(true);
      }
      expect(result.columns).toEqual([]);
      expect(statusTree).not.toBeUndefined();
      if (typeof statusTree === "object") {
        expect(Object.keys(statusTree).length).toBeGreaterThanOrEqual(1);
      }
      if (typeof statusTree === "object" && statusTree.hasOwnProperty("name")) {
        expect(statusTree.name).toBe(true);
      }
      expect(statusTree).not.toBeUndefined();
      expect(result.relationshipTree).not.toBeUndefined();
    });

    it("should report invalid relationship", () => {
      const mockModel = createMockModel({});
      const result = service.parseFields(
        "user.profile.avatar.url,user.profile.avatar.url,user.profile.avatar.foo",
        mockModel,
      );
      expect(result.invalidFields).toContain("user.profile.avatar.url");
      expect(result.invalidFields).toContain("user.profile.avatar.foo");
      expect(result.invalidFields.length).toBeGreaterThanOrEqual(2);
      expect(result.columns).toEqual([]);
      expect(result.relationshipTree).toEqual({});
      expect(result.invalidFields).not.toContain("name");
      expect(result.invalidFields).not.toContain("created_at");
      expect(result.invalidFields).not.toContain("uuid");
      expect(result.relationshipTree).not.toBeUndefined();
      expect(result.columns).not.toBeUndefined();
      expect(result.invalidFields).not.toBeUndefined();
    });

    it("should report empty, whitespace, and malformed fields", () => {
      const mockModel = createMockModel({
        DEFAULT_FIELDS: ["uuid"],
        SELECTABLE_FIELDS: ["name", "created_at"],
      });
      const result = service.parseFields(
        " , ,..,name.,.name,name..created_at,created_at, ",
        mockModel,
      );
      expect(result.columns).toContain("uuid");
      expect(result.columns).toContain("created_at");
      expect(result.relationshipTree).toEqual({});
      expect(result.invalidFields).toContain("..");
      expect(result.invalidFields).toContain("name.");
      expect(result.invalidFields).toContain(".name");
      expect(result.invalidFields).toContain("name..created_at");
      expect(result.invalidFields.length).toBeGreaterThanOrEqual(4);
      expect(result.columns.length).toBeGreaterThanOrEqual(2);
      expect(result.invalidFields).not.toContain("created_at");
      expect(result.invalidFields).not.toContain("uuid");
      expect(result.relationshipTree).not.toBeUndefined();
      expect(result.columns).not.toBeUndefined();
      expect(result.invalidFields).not.toBeUndefined();
    });

    it("should report non-existent associations as invalid fields", () => {
      const mockModel = createMockModel({
        DEFAULT_FIELDS: ["uuid"],
        SELECTABLE_FIELDS: ["name", "created_at"],
        associations: {},
      });
      const result = service.parseFields(
        "foo.bar.baz,foo.bar.baz,foo.bar.baz",
        mockModel,
      );
      expect(result.invalidFields).toContain("foo.bar.baz");
      expect(result.invalidFields.length).toBeGreaterThanOrEqual(3);
      expect(result.columns).toContain("uuid");
      expect(result.relationshipTree).toEqual({});
      expect(result.invalidFields).not.toContain("name");
      expect(result.invalidFields).not.toContain("created_at");
      expect(result.relationshipTree).not.toBeUndefined();
      expect(result.columns).not.toBeUndefined();
      expect(result.invalidFields).not.toBeUndefined();
      expect(result.columns.length).toBeGreaterThanOrEqual(1);
    });

    it("should deduplicate columns for duplicate fields in input", () => {
      const mockModel = createMockModel({
        DEFAULT_FIELDS: ["uuid"],
        SELECTABLE_FIELDS: ["name", "created_at", "uuid"],
      });
      const result = service.parseFields(
        "name,created_at,created_at,name,uuid,uuid,name",
        mockModel,
      );
      expect(result.columns).toContain("uuid");
      expect(result.columns).toContain("name");
      expect(result.columns).toContain("created_at");
      expect(result.columns.length).toBe(3);
      expect(result.columns.filter((c) => c === "name").length).toBe(1);
      expect(result.columns.filter((c) => c === "created_at").length).toBe(1);
      expect(result.columns.filter((c) => c === "uuid").length).toBe(1);
      expect(result.invalidFields.length).toBe(0);
    });

    it("should handle models without DEFAULT_FIELDS or SELECTABLE_FIELDS", () => {
      const mockModel = createMockModel({}); // No DEFAULT_FIELDS or SELECTABLE_FIELDS
      const result = service.parseFields("name,created_at,uuid", mockModel);
      expect(result.columns).toEqual([]); // No columns selectable
      expect(result.invalidFields).toContain("name");
      expect(result.invalidFields).toContain("created_at");
      expect(result.invalidFields).toContain("uuid");
      expect(result.invalidFields.length).toBe(3);
      expect(result.relationshipTree).toEqual({});
    });

    it("should default to empty arrays if DEFAULT_FIELDS or SELECTABLE_FIELDS are not arrays", () => {
      const mockModel1 = {
        associations: {},
        DEFAULT_FIELDS: undefined,
        SELECTABLE_FIELDS: undefined,
      } as any;
      const result1 = service.parseFields("name,created_at,uuid", mockModel1);
      expect(result1.columns).toEqual([]);
      expect(result1.invalidFields).toEqual(["name", "created_at", "uuid"]);

      const mockModel2 = {
        associations: {},
        DEFAULT_FIELDS: 123,
        SELECTABLE_FIELDS: "not-an-array",
      } as any;
      const result2 = service.parseFields("name,created_at,uuid", mockModel2);
      expect(result2.columns).toEqual([]);
      expect(result2.invalidFields).toEqual(["name", "created_at", "uuid"]);
    });

    it("should handle non-model or incorrectly typed input gracefully", () => {
      const result1 = service.parseFields("foo,bar", null as any);
      expect(result1.columns).toEqual([]);
      expect(result1.invalidFields).toEqual(["foo", "bar"]);
      expect(result1.relationshipTree).toEqual({});

      const result2 = service.parseFields("foo,bar", {} as any);
      expect(result2.columns).toEqual([]);
      expect(result2.invalidFields).toEqual(["foo", "bar"]);
      expect(result2.relationshipTree).toEqual({});

      const result3 = service.parseFields("foo,bar", {
        associations: 123,
      } as any);
      expect(result3.columns).toEqual([]);
      expect(result3.invalidFields).toEqual(["foo", "bar"]);
      expect(result3.relationshipTree).toEqual({});
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

    it("should return partial include and warn if maximum depth is exceeded", () => {
      let model = createMockModel({ SELECTABLE_FIELDS: ["field"] });
      for (let i = 0; i < 11; i++) {
        model = Object.assign({}, model, {
          associations: {
            next: { target: model },
          },
        });
      }
      let tree: any = { field: true };
      for (let i = 0; i < 11; i++) {
        tree = { next: tree };
      }
      const originalWarn = console.warn;
      const warnMock = jest.fn();
      console.warn = warnMock;
      const result = service.buildSequelizeInclude(
        tree as RelationshipTree,
        model,
      );
      expect(warnMock).toHaveBeenCalledWith("Maximum include depth exceeded.");
      let includes = result;
      for (let i = 0; i < 10; i++) {
        expect(includes.length).toBeGreaterThan(0);
        includes = (includes[0].include ?? []) as IncludeOptions[];
      }
      expect(includes.length).toBe(1);
      expect(includes[0].attributes).toEqual(["field"]);
      expect(includes[0].include).toEqual([]);
      console.warn = originalWarn;
    });

    it("should return partial include and warn if circular relationship is detected", () => {
      const circularModel = createMockModel({ SELECTABLE_FIELDS: ["field"] });
      const mutableModel: any = circularModel;
      mutableModel.associations = {
        self: { target: mutableModel },
      };
      const tree = { self: { self: { self: { field: true } } } };
      const originalWarn = console.warn;
      const warnMock = jest.fn();
      console.warn = warnMock;
      const result = service.buildSequelizeInclude(
        tree as RelationshipTree,
        mutableModel,
      );
      expect(warnMock).toHaveBeenCalledWith("Circular relationship detected.");
      expect(result[0].include).toEqual([]);
      console.warn = originalWarn;
    });
  });

  describe("FieldParserService constructor", () => {
    it("should initialize fields as an empty array", () => {
      const instance = new FieldParserService();
      // @ts-ignore: access private property for test coverage
      expect(instance.fields).toEqual([]);
    });
  });
});
