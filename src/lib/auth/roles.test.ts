import { describe, it, expect } from "vitest";
import {
  resolveWorkshopRole,
  toLegacyRole,
  toWorkshopRoleSet,
  isOwnerRole,
  isWorkshopRole,
} from "./roles";

describe("resolveWorkshopRole", () => {
  it("passes through PLATFORM_OWNER directly", () => {
    expect(resolveWorkshopRole({ role: "PLATFORM_OWNER" })).toBe("PLATFORM_OWNER");
  });

  it("passes through SHOP_OWNER directly", () => {
    expect(resolveWorkshopRole({ role: "SHOP_OWNER" })).toBe("SHOP_OWNER");
  });

  it("passes through MECHANIC directly", () => {
    expect(resolveWorkshopRole({ role: "MECHANIC" })).toBe("MECHANIC");
  });

  it("passes through CLIENT directly", () => {
    expect(resolveWorkshopRole({ role: "CLIENT" })).toBe("CLIENT");
  });

  it("maps CUSTOMER to CLIENT", () => {
    expect(resolveWorkshopRole({ role: "CUSTOMER" })).toBe("CLIENT");
  });

  it("maps ADMIN with platform phone (+27110000002) to PLATFORM_OWNER", () => {
    expect(
      resolveWorkshopRole({ role: "ADMIN", phone: "+27110000002" })
    ).toBe("PLATFORM_OWNER");
  });

  it("maps ADMIN with shopId to SHOP_OWNER", () => {
    expect(
      resolveWorkshopRole({ role: "ADMIN", phone: "+27999999999", shopId: "shop_1" })
    ).toBe("SHOP_OWNER");
  });

  it("maps ADMIN with no shopId to SHOP_OWNER", () => {
    expect(
      resolveWorkshopRole({ role: "ADMIN", phone: "+27999999999" })
    ).toBe("SHOP_OWNER");
  });

  it('maps ADMIN with name containing "platform owner" to PLATFORM_OWNER', () => {
    expect(
      resolveWorkshopRole({
        role: "ADMIN",
        phone: "+27999999999",
        shopId: "shop_1",
        name: "Platform Owner Account",
      })
    ).toBe("PLATFORM_OWNER");
  });

  it("maps unknown role to CLIENT", () => {
    expect(resolveWorkshopRole({ role: "UNKNOWN_ROLE" })).toBe("CLIENT");
  });

  it("maps null/undefined role to CLIENT", () => {
    expect(resolveWorkshopRole({ role: null })).toBe("CLIENT");
    expect(resolveWorkshopRole({ role: undefined })).toBe("CLIENT");
    expect(resolveWorkshopRole({})).toBe("CLIENT");
  });
});

describe("toLegacyRole", () => {
  it("maps MECHANIC to MECHANIC", () => {
    expect(toLegacyRole("MECHANIC")).toBe("MECHANIC");
  });

  it("maps CLIENT to CUSTOMER", () => {
    expect(toLegacyRole("CLIENT")).toBe("CUSTOMER");
  });

  it("maps SHOP_OWNER to ADMIN", () => {
    expect(toLegacyRole("SHOP_OWNER")).toBe("ADMIN");
  });

  it("maps PLATFORM_OWNER to ADMIN", () => {
    expect(toLegacyRole("PLATFORM_OWNER")).toBe("ADMIN");
  });
});

describe("toWorkshopRoleSet", () => {
  it('expands "ADMIN" to include both SHOP_OWNER and PLATFORM_OWNER', () => {
    const result = toWorkshopRoleSet(["ADMIN"]);
    expect(result.has("SHOP_OWNER")).toBe(true);
    expect(result.has("PLATFORM_OWNER")).toBe(true);
  });

  it("passes through direct workshop roles", () => {
    const result = toWorkshopRoleSet(["MECHANIC", "CLIENT"]);
    expect(result.has("MECHANIC")).toBe(true);
    expect(result.has("CLIENT")).toBe(true);
    expect(result.size).toBe(2);
  });

  it("maps CUSTOMER to CLIENT in the set", () => {
    const result = toWorkshopRoleSet(["CUSTOMER"]);
    expect(result.has("CLIENT")).toBe(true);
  });
});

describe("isOwnerRole", () => {
  it("returns true for SHOP_OWNER", () => {
    expect(isOwnerRole("SHOP_OWNER")).toBe(true);
  });

  it("returns true for PLATFORM_OWNER", () => {
    expect(isOwnerRole("PLATFORM_OWNER")).toBe(true);
  });

  it("returns false for CLIENT", () => {
    expect(isOwnerRole("CLIENT")).toBe(false);
  });

  it("returns false for MECHANIC", () => {
    expect(isOwnerRole("MECHANIC")).toBe(false);
  });
});

describe("isWorkshopRole", () => {
  it("returns true for valid workshop roles", () => {
    expect(isWorkshopRole("PLATFORM_OWNER")).toBe(true);
    expect(isWorkshopRole("SHOP_OWNER")).toBe(true);
    expect(isWorkshopRole("MECHANIC")).toBe(true);
    expect(isWorkshopRole("CLIENT")).toBe(true);
  });

  it("returns false for legacy or invalid roles", () => {
    expect(isWorkshopRole("ADMIN")).toBe(false);
    expect(isWorkshopRole("CUSTOMER")).toBe(false);
    expect(isWorkshopRole("UNKNOWN")).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isWorkshopRole(null)).toBe(false);
    expect(isWorkshopRole(undefined)).toBe(false);
  });
});
