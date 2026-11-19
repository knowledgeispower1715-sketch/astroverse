import { vi, describe, it, expect } from "vitest";

vi.stubGlobal("localStorage", {
  getItem: vi.fn().mockReturnValue(null),
  setItem: vi.fn(),
  clear: vi.fn(),
  removeItem: vi.fn(),
  length: 0,
  key: vi.fn(),
});

import { astroCalendarContext } from "./AstroCalendarContext";

describe("AstroCalendarContext", () => {
  it("should fetch panchang data and update state", async () => {
    const mockData = { panchang: "data" };
    astroCalendarContext.api.get = vi.fn().mockResolvedValue(mockData);

    await astroCalendarContext.fetchPanchangData();

    expect(astroCalendarContext.api.get).toHaveBeenCalled();
    expect(astroCalendarContext.state.panchangData).toEqual(mockData);
  });

  it("should handle errors gracefully", async () => {
    astroCalendarContext.api.get = vi
      .fn()
      .mockRejectedValue(new Error("API error"));

    await astroCalendarContext.fetchPanchangData();

    expect(astroCalendarContext.state.panchangError).toBe("API error");
    expect(astroCalendarContext.state.panchangLoading).toBe(false);
  });
});
