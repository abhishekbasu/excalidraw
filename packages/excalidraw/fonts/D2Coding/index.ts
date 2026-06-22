import { type ExcalidrawFontFaceDescriptor } from "../Fonts";

import D2CodingLatin from "./D2CodingLigature-Latin.woff2";

// D2 Coding Ligature (Naver, OFL) — Latin + symbols subset. Coding ligatures
// are implemented via the `calt` feature, which is preserved in the subset and
// rendered by canvas `fillText` by default. The `unicodeRange` matches the
// glyphs bundled in the subsetted woff2.
export const D2CodingFontFaces: ExcalidrawFontFaceDescriptor[] = [
  {
    uri: D2CodingLatin,
    descriptors: {
      unicodeRange:
        "U+0000-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2070-209F,U+20A0-20BF,U+2122,U+2190-21FF,U+2200-22FF,U+2500-257F",
    },
  },
];
