import { describe, expect, it } from "vitest";
import { RISK_BANDS, bandLabel, worstBand } from "../src/index.js";

describe("bandLabel", () => {
  it("says 'No reports yet' for unknown items", () => {
    expect(bandLabel("unknown")).toBe("No reports yet");
  });

  it("never uses the word 'safe' in any band or language", () => {
    for (const band of RISK_BANDS) {
      expect(bandLabel(band, "en").toLowerCase()).not.toContain("safe");
      expect(bandLabel(band, "hi")).not.toContain("सुरक्षित");
    }
  });

  it("returns Hindi text when asked", () => {
    expect(bandLabel("high", "hi")).toBe("उच्च जोखिम");
  });
});

describe("worstBand", () => {
  it("is unknown for an empty list", () => {
    expect(worstBand([])).toBe("unknown");
  });

  it("picks the riskiest band", () => {
    expect(worstBand(["low", "high", "medium"])).toBe("high");
    expect(worstBand(["unknown", "medium"])).toBe("medium");
  });
});
