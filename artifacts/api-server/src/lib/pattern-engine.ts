import type { ProjectRecord } from "@workspace/db";

export type Point = { x: number; y: number };

export type PatternPiece = {
  id: string;
  name: string;
  cut: string;
  points: Point[];
  grainline?: [Point, Point];
  fold?: [Point, Point];
  notches?: Point[];
  seamAllowanceMm: number;
};

export const quadratic = (from: Point, control: Point, to: Point, steps = 8): Point[] =>
  Array.from({ length: steps }, (_, index) => {
    const t = (index + 1) / steps;
    const inverse = 1 - t;
    return {
      x: inverse * inverse * from.x + 2 * inverse * t * control.x + t * t * to.x,
      y: inverse * inverse * from.y + 2 * inverse * t * control.y + t * t * to.y,
    };
  });

export const perimeterCm = (piece: PatternPiece) => piece.points.reduce((total, point, index) => {
  const next = piece.points[(index + 1) % piece.points.length]!;
  return total + Math.hypot(next.x - point.x, next.y - point.y);
}, 0);

export const offsetPoints = (points: Point[], distanceCm: number): Point[] => {
  const signedArea = points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length]!;
    return sum + point.x * next.y - next.x * point.y;
  }, 0) / 2;
  const direction = signedArea >= 0 ? 1 : -1;
  return points.map((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length]!;
    const next = points[(index + 1) % points.length]!;
    const edgeA = { x: point.x - previous.x, y: point.y - previous.y };
    const edgeB = { x: next.x - point.x, y: next.y - point.y };
    const lengthA = Math.hypot(edgeA.x, edgeA.y) || 1;
    const lengthB = Math.hypot(edgeB.x, edgeB.y) || 1;
    const normalA = { x: direction * edgeA.y / lengthA, y: -direction * edgeA.x / lengthA };
    const normalB = { x: direction * edgeB.y / lengthB, y: -direction * edgeB.x / lengthB };
    const bisector = { x: normalA.x + normalB.x, y: normalA.y + normalB.y };
    const bisectorLength = Math.hypot(bisector.x, bisector.y) || 1;
    const dot = Math.max(0.25, Math.abs((bisector.x / bisectorLength) * normalA.x + (bisector.y / bisectorLength) * normalA.y));
    const miter = Math.min(distanceCm / dot, distanceCm * 4);
    return { x: point.x + bisector.x / bisectorLength * miter, y: point.y + bisector.y / bisectorLength * miter };
  });
};

export const seamAllowancePoints = (piece: PatternPiece): Point[] => {
  const offset = offsetPoints(piece.points, piece.seamAllowanceMm / 10);
  if (!piece.fold || piece.points.length < 2) return offset;
  return offset.map((point, index) =>
    index === 0 || index === piece.points.length - 1 ? piece.points[index]! : point,
  );
};

const value = (project: ProjectRecord, code: string, fallback: number) =>
  project.measurements.find((measurement) => measurement.code === code)?.valueCm ?? fallback;

const rectangle = (id: string, name: string, width: number, height: number, cut: string, seamAllowanceMm = 10): PatternPiece => ({
  id,
  name,
  cut,
  seamAllowanceMm,
  points: [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ],
  grainline: [
    { x: width / 2, y: height * 0.18 },
    { x: width / 2, y: height * 0.82 },
  ],
});

const hoodiePieces = (project: ProjectRecord): PatternPiece[] => {
  const chest = value(project, "A01", 68);
  const length = value(project, "A02", 72);
  const shoulder = value(project, "A03", 64) / 2;
  const sleeve = value(project, "A04", 58);
  const hem = value(project, "A05", 54);
  const armhole = value(project, "A06", 29);
  const bicep = value(project, "A07", 27);
  const cuff = value(project, "A08", 10.5);
  const hoodHeight = value(project, "A09", 39);
  const hoodWidth = value(project, "A10", 30);
  const pocketWidth = value(project, "A11", 36);
  const pocketHeight = value(project, "A12", 20);
  const neck = Math.max(9, chest * 0.15);
  const quarterChest = chest / 2;
  const halfHem = hem / 2;

  const body = (id: string, name: string, neckDrop: number): PatternPiece => {
    const neckPoint = { x: 0, y: neckDrop };
    const neckShoulder = { x: neck, y: 0 };
    const shoulderPoint = { x: shoulder, y: 3 };
    const underarm = { x: quarterChest + 3, y: armhole };
    return ({
    id,
    name,
    cut: id === "front" ? "CUT 1 ON FOLD" : "CUT 1 ON FOLD",
    seamAllowanceMm: 10,
    points: [neckPoint, ...quadratic(neckPoint, { x: neck * 0.2, y: 0 }, neckShoulder, 5), shoulderPoint,
      ...quadratic(shoulderPoint, { x: quarterChest + 6, y: armhole * 0.28 }, underarm, 10),
      { x: halfHem, y: length },
      { x: 0, y: length },
    ],
    fold: [{ x: 0, y: neckDrop }, { x: 0, y: length }],
    grainline: [{ x: quarterChest * 0.45, y: 15 }, { x: quarterChest * 0.45, y: length - 12 }],
    notches: [{ x: quarterChest + 3, y: armhole * 0.56 }],
    });
  };

  return [
    body("front", "FRONT BODY", 8),
    body("back", "BACK BODY", 2.5),
    {
      id: "sleeve",
      name: "DROP-SHOULDER SLEEVE",
      cut: "CUT 2 MIRRORED",
      seamAllowanceMm: 10,
      points: [
        { x: 0, y: armhole * 0.72 },
        { x: bicep * 0.52, y: 0 },
        { x: bicep, y: armhole * 0.72 },
        { x: bicep * 0.5 + cuff, y: sleeve },
        { x: bicep * 0.5 - cuff, y: sleeve },
      ],
      grainline: [{ x: bicep / 2, y: 12 }, { x: bicep / 2, y: sleeve - 10 }],
      notches: [{ x: bicep * 0.52, y: 0 }, { x: 0, y: armhole * 0.72 }],
    },
    {
      id: "hood-side",
      name: "SCULPTED HOOD SIDE",
      cut: "CUT 2 MIRRORED",
      seamAllowanceMm: 10,
      points: [
        { x: 0, y: hoodHeight },
        { x: 2, y: hoodHeight * 0.35 },
        { x: hoodWidth * 0.38, y: 0 },
        { x: hoodWidth, y: hoodHeight * 0.12 },
        { x: hoodWidth * 0.92, y: hoodHeight * 0.82 },
        { x: hoodWidth * 0.55, y: hoodHeight },
      ],
      grainline: [{ x: hoodWidth * 0.55, y: 7 }, { x: hoodWidth * 0.55, y: hoodHeight - 6 }],
      notches: [{ x: hoodWidth, y: hoodHeight * 0.48 }],
    },
    rectangle("hood-centre", "HOOD CENTRE GUSSET", Math.max(8, hoodWidth * 0.34), hoodHeight, "CUT 1"),
    {
      id: "kangaroo",
      name: "KANGAROO POCKET",
      cut: "CUT 1",
      seamAllowanceMm: 10,
      points: [
        { x: pocketWidth * 0.1, y: 0 },
        { x: pocketWidth * 0.9, y: 0 },
        { x: pocketWidth, y: pocketHeight },
        { x: 0, y: pocketHeight },
      ],
      grainline: [{ x: pocketWidth / 2, y: 3 }, { x: pocketWidth / 2, y: pocketHeight - 3 }],
    },
    rectangle("cuff", "RIB CUFF", cuff * 2, 14, "CUT 2 / RIB", 7),
    rectangle("hem-rib", "HEM RIB", hem * 2, 12, "CUT 1 / RIB", 7),
  ];
};

const cargoPieces = (project: ProjectRecord): PatternPiece[] => {
  const waist = value(project, "B01", 41);
  const seat = value(project, "B03", 58);
  const frontRise = value(project, "B04", 34);
  const backRise = value(project, "B05", 45);
  const inseam = value(project, "B06", 78);
  const outseam = value(project, "B07", 110);
  const thigh = value(project, "B08", 37);
  const knee = value(project, "B09", 31);
  const opening = value(project, "B10", 29);
  const pocketW = value(project, "B11", 22);
  const pocketH = value(project, "B12", 25);
  const waistbandH = value(project, "B13", 4.5);
  const leg = (id: string, name: string, rise: number, backExtension: number): PatternPiece => ({
    id,
    name,
    cut: "CUT 2 MIRRORED",
    seamAllowanceMm: 10,
    points: [
      { x: 0, y: 0 },
      { x: waist / 2 + backExtension, y: 0 },
      { x: seat / 2 + backExtension, y: rise * 0.58 },
      { x: thigh + backExtension, y: rise },
      { x: knee + backExtension * 0.35, y: outseam - inseam + inseam * 0.52 },
      { x: opening + backExtension * 0.2, y: outseam },
      { x: 0, y: outseam },
    ],
    grainline: [{ x: opening * 0.52, y: rise + 8 }, { x: opening * 0.52, y: outseam - 10 }],
    notches: [{ x: knee + backExtension * 0.35, y: outseam - inseam + inseam * 0.52 }],
  });
  return [
    leg("front-leg", "FRONT LEG", frontRise, 0),
    leg("back-leg", "BACK LEG", backRise, 4),
    rectangle("waistband", "CONTOURED WAISTBAND", waist * 2 + 8, waistbandH * 2, "CUT 2", 10),
    rectangle("cargo-pocket", "3D CARGO POCKET", pocketW, pocketH, "CUT 2", 10),
    rectangle("cargo-gusset", "CARGO POCKET GUSSET", 6, pocketW * 2 + pocketH * 2, "CUT 2", 10),
    rectangle("pocket-flap", "CARGO POCKET FLAP", pocketW + 2, 8, "CUT 4 / SELF + FUSING", 10),
    rectangle("fly-shield", "FLY SHIELD", 7, frontRise * 0.65, "CUT 1", 10),
  ];
};

const boxyTeePieces = (project: ProjectRecord): PatternPiece[] => {
  const chest = value(project, "C01", 62);
  const length = value(project, "C02", 69);
  const shoulder = value(project, "C03", 58) / 2;
  const sleeveLength = value(project, "C04", 24);
  const sleeveOpening = value(project, "C05", 21);
  const neck = value(project, "C06", 19) / 2;
  const neckDrop = value(project, "C07", 9);
  const hem = value(project, "C08", 61) / 2;
  const body = (id: string, name: string, drop: number): PatternPiece => {
    const shoulderPoint = { x: shoulder, y: 3 };
    const underarm = { x: chest / 2 + 2, y: 25 };
    return {
      id, name, cut: "CUT 1 ON FOLD", seamAllowanceMm: 10,
      points: [{ x: 0, y: drop }, ...quadratic({ x: 0, y: drop }, { x: 2, y: 0 }, { x: neck, y: 0 }, 5), shoulderPoint,
        ...quadratic(shoulderPoint, { x: chest / 2 + 5, y: 10 }, underarm, 8), { x: hem, y: length }, { x: 0, y: length }],
      fold: [{ x: 0, y: drop }, { x: 0, y: length }],
      grainline: [{ x: chest * 0.2, y: 14 }, { x: chest * 0.2, y: length - 10 }],
      notches: [{ x: chest / 2 + 2, y: 18 }],
    };
  };
  return [
    body("front", "BOXY TEE FRONT", neckDrop),
    body("back", "BOXY TEE BACK", 2.5),
    {
      id: "short-sleeve", name: "SHORT SLEEVE", cut: "CUT 2 MIRRORED", seamAllowanceMm: 10,
      points: [{ x: 0, y: 12 }, ...quadratic({ x: 0, y: 12 }, { x: chest * 0.22, y: -4 }, { x: chest * 0.42, y: 12 }, 10),
        { x: sleeveOpening, y: sleeveLength }, { x: 0, y: sleeveLength }],
      grainline: [{ x: sleeveOpening / 2, y: 5 }, { x: sleeveOpening / 2, y: sleeveLength - 4 }],
    },
    rectangle("neck-rib", "NECK RIB", value(project, "C06", 19) * 2.05, 4.5, "CUT 1 / RIB", 7),
  ];
};

const trackJacketPieces = (project: ProjectRecord): PatternPiece[] => {
  const mapped = {
    ...project,
    measurements: [
      ["A01", "D01"], ["A02", "D02"], ["A03", "D03"], ["A04", "D04"], ["A05", "D05"],
      ["A07", "D07"], ["A08", "D08"],
    ].map(([target, source]) => ({ code: target!, name: target!, valueCm: value(project, source!, 20), toleranceCm: 1, gradeRule: "1" })),
  } as ProjectRecord;
  const base = hoodiePieces(mapped).filter((piece) => !["hood-side", "hood-centre", "kangaroo"].includes(piece.id));
  const collar = rectangle("stand-collar", "STAND COLLAR", value(project, "D01", 66) * 0.62, value(project, "D06", 7) * 2, "CUT 2 SELF + FUSING", 10);
  return base.map((piece) => piece.id === "front" ? { ...piece, name: "TRACK JACKET FRONT", cut: "CUT 2 MIRRORED" } : piece.id === "back" ? { ...piece, name: "TRACK JACKET BACK" } : piece).concat(collar);
};

const tailoredShortPieces = (project: ProjectRecord): PatternPiece[] => {
  const mapped = {
    ...project,
    measurements: [
      ["B01", "E01"], ["B03", "E02"], ["B04", "E03"], ["B05", "E04"], ["B07", "E05"],
      ["B06", "E06"], ["B10", "E07"], ["B13", "E08"],
    ].map(([target, source]) => ({ code: target!, name: target!, valueCm: value(project, source!, 20), toleranceCm: 1, gradeRule: "1" })),
  } as ProjectRecord;
  return cargoPieces(mapped)
    .filter((piece) => ["front-leg", "back-leg", "waistband", "fly-shield"].includes(piece.id))
    .map((piece) => ({ ...piece, name: piece.name.replace("LEG", "TAILORED SHORT") }));
};

export const draftPattern = (project: ProjectRecord) => {
  switch (project.garmentType) {
    case "wide_cargo": return cargoPieces(project);
    case "boxy_tee": return boxyTeePieces(project);
    case "track_jacket": return trackJacketPieces(project);
    case "tailored_short": return tailoredShortPieces(project);
    default: return hoodiePieces(project);
  }
};

export const patternSizes = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export type PatternSize = typeof patternSizes[number];

export const draftPatternForSize = (project: ProjectRecord, size: PatternSize): PatternPiece[] => {
  const baseIndex = patternSizes.indexOf(project.baseSize as PatternSize);
  const resolvedBaseIndex = baseIndex >= 0 ? baseIndex : patternSizes.indexOf("M");
  const sizeDelta = patternSizes.indexOf(size) - resolvedBaseIndex;
  return draftPattern({
    ...project,
    baseSize: size,
    measurements: project.measurements.map((measurement) => ({
      ...measurement,
      valueCm: measurement.valueCm + (Number.parseFloat(measurement.gradeRule) || 0) * sizeDelta,
    })),
  });
};

export const bounds = (piece: PatternPiece) => ({
  width: Math.max(...piece.points.map((point) => point.x)) - Math.min(...piece.points.map((point) => point.x)),
  height: Math.max(...piece.points.map((point) => point.y)) - Math.min(...piece.points.map((point) => point.y)),
});