import {
  applyDarkModeFilter,
  COLOR_PALETTE,
  rgbToHex,
} from "@excalidraw/common";

describe("COLOR_PALETTE", () => {
  it("color palette doesn't regress", () => {
    expect(COLOR_PALETTE).toMatchSnapshot();
  });
});

describe("applyDarkModeFilter", () => {
  // Gruvbox build: both themes render authentic hand-picked colors, so the
  // legacy dark-mode invert/hue-rotate transform is disabled. The function is
  // an identity function — colors are always returned unchanged.
  it("returns the color unchanged", () => {
    expect(applyDarkModeFilter("#000000")).toBe("#000000");
    expect(applyDarkModeFilter("#ffffff")).toBe("#ffffff");
    expect(applyDarkModeFilter("#ff0000")).toBe("#ff0000");
  });

  it("returns the color unchanged regardless of the enable flag", () => {
    expect(applyDarkModeFilter("#abcdef", true)).toBe("#abcdef");
    expect(applyDarkModeFilter("#abcdef", false)).toBe("#abcdef");
  });

  it("passes through non-hex color formats verbatim", () => {
    expect(applyDarkModeFilter("red")).toBe("red");
    expect(applyDarkModeFilter("rgb(255, 0, 0)")).toBe("rgb(255, 0, 0)");
    expect(applyDarkModeFilter("rgba(255, 0, 0, 0.5)")).toBe(
      "rgba(255, 0, 0, 0.5)",
    );
    expect(applyDarkModeFilter("transparent")).toBe("transparent");
  });

  it("passes through palette colors verbatim", () => {
    expect(applyDarkModeFilter(COLOR_PALETTE.black)).toBe(COLOR_PALETTE.black);
    expect(applyDarkModeFilter(COLOR_PALETTE.white)).toBe(COLOR_PALETTE.white);
    expect(applyDarkModeFilter(COLOR_PALETTE.transparent)).toBe(
      COLOR_PALETTE.transparent,
    );
    for (const shade of COLOR_PALETTE.red) {
      expect(applyDarkModeFilter(shade)).toBe(shade);
    }
  });
});

describe("rgbToHex", () => {
  describe("basic RGB conversion", () => {
    it("converts black (0,0,0)", () => {
      expect(rgbToHex(0, 0, 0)).toBe("#000000");
    });

    it("converts white (255,255,255)", () => {
      expect(rgbToHex(255, 255, 255)).toBe("#ffffff");
    });

    it("converts red (255,0,0)", () => {
      expect(rgbToHex(255, 0, 0)).toBe("#ff0000");
    });

    it("converts green (0,255,0)", () => {
      expect(rgbToHex(0, 255, 0)).toBe("#00ff00");
    });

    it("converts blue (0,0,255)", () => {
      expect(rgbToHex(0, 0, 255)).toBe("#0000ff");
    });

    it("converts arbitrary color", () => {
      expect(rgbToHex(30, 30, 30)).toBe("#1e1e1e");
    });
  });

  describe("leading zeros preservation", () => {
    it("preserves leading zeros for low values", () => {
      expect(rgbToHex(0, 0, 1)).toBe("#000001");
      expect(rgbToHex(0, 1, 0)).toBe("#000100");
      expect(rgbToHex(1, 0, 0)).toBe("#010000");
    });

    it("preserves zeros for single-digit hex values", () => {
      expect(rgbToHex(15, 15, 15)).toBe("#0f0f0f");
    });
  });

  describe("alpha handling", () => {
    it("omits alpha when undefined", () => {
      expect(rgbToHex(255, 0, 0)).toBe("#ff0000");
      expect(rgbToHex(255, 0, 0, undefined)).toBe("#ff0000");
    });

    it("omits alpha when fully opaque (1)", () => {
      expect(rgbToHex(255, 0, 0, 1)).toBe("#ff0000");
    });

    it("includes alpha for semi-transparent (0.5)", () => {
      // 0.5 * 255 = 127.5 -> rounds to 128 = 0x80
      expect(rgbToHex(255, 0, 0, 0.5)).toBe("#ff000080");
    });

    it("includes alpha for fully transparent (0)", () => {
      expect(rgbToHex(255, 0, 0, 0)).toBe("#ff000000");
    });

    it("includes alpha for near-opaque (0.99)", () => {
      // 0.99 * 255 = 252.45 -> rounds to 252 = 0xfc
      expect(rgbToHex(255, 0, 0, 0.99)).toBe("#ff0000fc");
    });

    it("pads alpha with leading zero when needed", () => {
      // 0.05 * 255 = 12.75 -> rounds to 13 = 0x0d
      expect(rgbToHex(255, 0, 0, 0.05)).toBe("#ff00000d");
    });
  });
});
