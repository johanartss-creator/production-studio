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

  const body = (id: string, name: string, neckDrop: number): PatternPiece => ({
    id,
    name,
    cut: id === "front" ? "CUT 1 ON FOLD" : "CUT 1 ON FOLD",
    seamAllowanceMm: 10,
    points: [
      { x: 0, y: neckDrop },
      { x: neck, y: 0 },
      { x: shoulder, y: 3 },
      { x: quarterChest + 3, y: armhole },
      { x: halfHem, y: length },
      { x: 0, y: length },
    ],
    fold: [{ x: 0, y: neckDrop }, { x: 0, y: length }],
    grainline: [{ x: quarterChest * 0.45, y: 15 }, { x: quarterChest * 0.45, y: length - 12 }],
    notches: [{ x: quarterChest + 3, y: armhole * 0.56 }],
  });

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

export const draftPattern = (project: ProjectRecord) =>
  project.garmentType === "wide_cargo" ? cargoPieces(project) : hoodiePieces(project);

export const bounds = (piece: PatternPiece) => ({
  width: Math.max(...piece.points.map((point) => point.x)) - Math.min(...piece.points.map((point) => point.x)),
  height: Math.max(...piece.points.map((point) => point.y)) - Math.min(...piece.points.map((point) => point.y)),
});