import type {
  ProjectMeasurement,
  ProjectRecord,
} from "@workspace/db";
import {
  bounds,
  draftPattern,
  draftPatternForSize,
  patternSizes,
  perimeterCm,
  seamAllowancePoints,
  type PatternPiece,
  type PatternSize,
  type Point,
} from "./pattern-engine";

export const PRELIMINARY_WARNING =
  "PRELIMINARY_UNVALIDATED — Development pattern only. A qualified pattern maker must review this output, validate it in the specified fabric, correct it after a physical fitting, and approve a signed PP sample before bulk cutting.";

const xml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export const defaultMeasurements = {
  oversized_hoodie: [
    ["A01", "Chest width", 68, 1, "2"],
    ["A02", "Body length", 72, 1, "1"],
    ["A03", "Shoulder width", 64, 0.8, "1.5"],
    ["A04", "Sleeve length", 58, 0.8, "1"],
    ["A05", "Bottom opening", 54, 1, "2"],
    ["A06", "Armhole depth", 29, 0.8, "1"],
    ["A07", "Bicep width", 27, 0.6, "1"],
    ["A08", "Cuff opening", 10.5, 0.5, "0.5"],
    ["A09", "Hood height", 39, 0.8, "1"],
    ["A10", "Hood width", 30, 0.8, "1"],
    ["A11", "Pocket width", 36, 0.8, "1"],
    ["A12", "Pocket height", 20, 0.8, "0.5"],
  ],
  wide_cargo: [
    ["B01", "Waist relaxed", 41, 0.8, "2"],
    ["B02", "Waist extended", 47, 1, "2"],
    ["B03", "Seat width", 58, 1, "2"],
    ["B04", "Front rise", 34, 0.8, "1"],
    ["B05", "Back rise", 45, 0.8, "1"],
    ["B06", "Inseam", 78, 1, "1"],
    ["B07", "Outseam", 110, 1, "1"],
    ["B08", "Thigh width", 37, 0.8, "1.5"],
    ["B09", "Knee width", 31, 0.8, "1"],
    ["B10", "Leg opening", 29, 0.8, "1"],
    ["B11", "Cargo pocket width", 22, 0.6, "0.5"],
    ["B12", "Cargo pocket height", 25, 0.6, "0.5"],
    ["B13", "Waistband height", 4.5, 0.4, "0"],
  ],
  boxy_tee: [
    ["C01", "Chest width", 62, 0.8, "2"],
    ["C02", "Body length", 69, 0.8, "1"],
    ["C03", "Shoulder width", 58, 0.6, "1.5"],
    ["C04", "Sleeve length", 24, 0.6, "0.7"],
    ["C05", "Sleeve opening", 21, 0.5, "0.7"],
    ["C06", "Neck width", 19, 0.4, "0.4"],
    ["C07", "Front neck drop", 9, 0.4, "0.3"],
    ["C08", "Bottom opening", 61, 0.8, "2"],
  ],
  track_jacket: [
    ["D01", "Chest width", 66, 1, "2"],
    ["D02", "Body length", 70, 1, "1"],
    ["D03", "Shoulder width", 59, 0.8, "1.5"],
    ["D04", "Sleeve length", 63, 0.8, "1"],
    ["D05", "Bottom opening", 55, 1, "2"],
    ["D06", "Collar height", 7, 0.4, "0"],
    ["D07", "Bicep width", 26, 0.6, "1"],
    ["D08", "Cuff opening", 10.5, 0.5, "0.5"],
  ],
  tailored_short: [
    ["E01", "Waist width", 42, 0.8, "2"],
    ["E02", "Seat width", 57, 1, "2"],
    ["E03", "Front rise", 31, 0.8, "1"],
    ["E04", "Back rise", 41, 0.8, "1"],
    ["E05", "Outseam", 52, 0.8, "1"],
    ["E06", "Inseam", 20, 0.8, "0.7"],
    ["E07", "Leg opening", 34, 0.8, "1"],
    ["E08", "Waistband height", 4.5, 0.4, "0"],
  ],
} satisfies Record<
  "oversized_hoodie" | "wide_cargo" | "boxy_tee" | "track_jacket" | "tailored_short",
  [string, string, number, number, string][]
>;

export const measurementsFor = (
  garmentType: "oversized_hoodie" | "wide_cargo" | "boxy_tee" | "track_jacket" | "tailored_short",
): ProjectMeasurement[] =>
  defaultMeasurements[garmentType].map(
    ([code, name, valueCm, toleranceCm, gradeRule]) => ({
      code,
      name,
      valueCm,
      toleranceCm,
      gradeRule,
    }),
  );

const svgShell = (body: string, title: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 760" role="img" aria-label="${xml(title)}">
  <rect width="1200" height="760" fill="#f4f0e8"/>
  <style>
    .piece{fill:#fffdf7;stroke:#181816;stroke-width:3;vector-effect:non-scaling-stroke}
    .seam{fill:none;stroke:#d43126;stroke-width:2;stroke-dasharray:9 8;vector-effect:non-scaling-stroke}
    .detail{fill:none;stroke:#181816;stroke-width:2;vector-effect:non-scaling-stroke}
    .grain{stroke:#746f65;stroke-width:1.5;marker-end:url(#arrow)}
    text{font-family:Arial,sans-serif;fill:#181816}.label{font-size:15px;font-weight:700}.meta{font-size:12px;letter-spacing:1px}
  </style>
  <defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#746f65"/></marker></defs>
  ${body}
  <rect x="22" y="690" width="1156" height="48" fill="#181816"/>
  <text x="44" y="720" fill="#fffdf7" style="fill:#fffdf7;font-size:15px;font-weight:700">${xml(PRELIMINARY_WARNING)}</text>
</svg>`;

export const flatSvg = (project: ProjectRecord) => {
  const title = `${project.styleNumber} technical flat`;
  if (project.garmentType === "tailored_short") {
    return svgShell(
      `<text x="48" y="54" class="label">${xml(project.styleNumber)} / TAILORED SPORT SHORT / REV ${project.revision}</text>
       <g transform="translate(170 150)"><path class="piece" d="M90 0L310 0L340 145L290 390L205 390L180 180L155 390L70 390L55 145Z"/><path class="detail" d="M55 145Q200 190 340 145M90 0Q200 26 310 0M180 180L205 150L230 180"/></g>
       <g transform="translate(690 150)"><path class="piece" d="M90 0L310 0L350 150L298 390L210 390L180 185L145 390L58 390L48 150Z"/><path class="detail" d="M48 150Q200 205 350 150M90 0Q200 32 310 0"/></g>
       <text x="330" y="610" class="meta">FRONT</text><text x="850" y="610" class="meta">BACK</text>`, title);
  }
  if (project.garmentType === "wide_cargo") {
    return svgShell(
      `<text x="48" y="54" class="label">${xml(project.styleNumber)} / WIDE CARGO / REV ${project.revision}</text>
       <g transform="translate(90 95)">
        <path class="piece" d="M100 0L300 0L330 160L300 555L185 555L170 205L150 555L35 555L70 160Z"/>
        <path class="detail" d="M70 160Q200 205 330 160M100 0Q200 28 300 0M170 205L200 175L230 205"/>
        <rect class="detail" x="70" y="235" width="92" height="130" rx="4"/><path class="detail" d="M70 260L162 260"/>
        <rect class="detail" x="238" y="235" width="92" height="130" rx="4"/><path class="detail" d="M238 260L330 260"/>
       </g>
       <g transform="translate(650 95)">
        <path class="piece" d="M100 0L300 0L342 165L307 555L192 555L175 205L145 555L30 555L58 165Z"/>
        <path class="detail" d="M58 165Q200 220 342 165M100 0Q200 35 300 0M175 205Q198 165 225 205"/>
        <path class="detail" d="M94 82Q132 118 168 82M232 82Q268 118 306 82"/>
       </g>
       <text x="210" y="670" class="meta">FRONT</text><text x="778" y="670" class="meta">BACK</text>`,
      title,
    );
  }

  const isHoodie = project.garmentType === "oversized_hoodie";
  const isTrack = project.garmentType === "track_jacket";
  const garmentLabel = project.garmentType.replaceAll("_", " ").toUpperCase();
  const neckline = isHoodie
    ? `<path class="detail" d="M190 70Q255 132 320 70M190 70Q205 0 255 0Q305 0 320 70"/>`
    : isTrack
      ? `<path class="detail" d="M190 70L205 5L305 5L320 70M255 5L255 555"/>`
      : `<path class="detail" d="M190 70Q255 125 320 70"/>`;
  const pocket = isHoodie ? `<path class="detail" d="M185 355Q255 305 325 355L315 470L195 470Z"/>` : "";
  return svgShell(
    `<text x="48" y="54" class="label">${xml(project.styleNumber)} / ${garmentLabel} / REV ${project.revision}</text>
     <g transform="translate(70 105)">
      <path class="piece" d="M155 105L40 165L85 265L138 235L120 555L390 555L372 235L425 265L470 165L355 105L320 70L190 70Z"/>
      ${neckline}${pocket}
      <path class="detail" d="M120 515L390 515M85 265L138 235M372 235L425 265"/>
     </g>
     <g transform="translate(650 105)">
      <path class="piece" d="M155 105L40 165L85 265L138 235L120 555L390 555L372 235L425 265L470 165L355 105L320 70L190 70Z"/>
      <path class="detail" d="M190 70Q205 0 255 0Q305 0 320 70M120 515L390 515"/>
     </g>
     <text x="280" y="680" class="meta">FRONT</text><text x="875" y="680" class="meta">BACK</text>`,
    title,
  );
};

const pointString = (points: Point[], scale: number, ox: number, oy: number) =>
  points.map((point) => `${(point.x * scale + ox).toFixed(1)},${(point.y * scale + oy).toFixed(1)}`).join(" ");

const renderPatternPiece = (piece: PatternPiece, x: number, y: number, scale: number) => {
  const outline = pointString(piece.points, scale, x, y);
  const allowance = pointString(seamAllowancePoints(piece), scale, x, y);
  const grain = piece.grainline
    ? `<line class="grain" x1="${piece.grainline[0].x * scale + x}" y1="${piece.grainline[0].y * scale + y}" x2="${piece.grainline[1].x * scale + x}" y2="${piece.grainline[1].y * scale + y}"/>`
    : "";
  const fold = piece.fold
    ? `<line x1="${piece.fold[0].x * scale + x}" y1="${piece.fold[0].y * scale + y}" x2="${piece.fold[1].x * scale + x}" y2="${piece.fold[1].y * scale + y}" stroke="#2f63a3" stroke-width="3" stroke-dasharray="4 5"/>`
    : "";
  const notches = (piece.notches ?? [])
    .map((notch) => `<circle cx="${notch.x * scale + x}" cy="${notch.y * scale + y}" r="4" fill="#d43126"/>`)
    .join("");
  return `<g data-piece="${xml(piece.id)}">
    <polygon class="piece" points="${outline}"/>
    <polygon class="seam" points="${allowance}"/>
    ${grain}${fold}${notches}
    <text class="label" x="${x + 8}" y="${y + 20}">${xml(piece.name)}</text>
    <text class="meta" x="${x + 8}" y="${y + 39}">${xml(piece.cut)} · SA ${piece.seamAllowanceMm} MM</text>
  </g>`;
};

export const patternSvg = (project: ProjectRecord) => {
  const pieces = draftPattern(project);
  const gradedBySize = Object.fromEntries(
    patternSizes.map((size) => [size, draftPatternForSize(project, size)]),
  ) as Record<PatternSize, PatternPiece[]>;
  let cursorX = 40;
  let cursorY = 95;
  let rowHeight = 0;
  const scale = project.garmentType === "wide_cargo" ? 3.4 : 5.2;
  const body = pieces.map((piece) => {
    const size = bounds(piece);
    const width = size.width * scale + 35;
    const height = size.height * scale + 55;
    if (cursorX + width > 1160) {
      cursorX = 40;
      cursorY += rowHeight + 22;
      rowHeight = 0;
    }
    const graded = patternSizes.map((size, index) => {
      if (size === project.baseSize) return "";
      const gradedPiece = gradedBySize[size].find((candidate) => candidate.id === piece.id);
      if (!gradedPiece) return "";
      const colors = ["#a7a197", "#77736c", "#181817", "#4c77a8", "#8e5a9d", "#2c8a70"];
      return `<g data-size="${size}">
        <polygon points="${pointString(gradedPiece.points, scale, cursorX, cursorY)}" fill="none" stroke="${colors[index]}" stroke-width="1" opacity="0.65"/>
        <polygon points="${pointString(seamAllowancePoints(gradedPiece), scale, cursorX, cursorY)}" fill="none" stroke="${colors[index]}" stroke-width="0.7" stroke-dasharray="3 3" opacity="0.5"/>
      </g>`;
    }).join("");
    const rendered = `${graded}${renderPatternPiece(piece, cursorX, cursorY, scale)}`;
    cursorX += width;
    rowHeight = Math.max(rowHeight, height);
    return rendered;
  }).join("");

  return svgShell(
    `<text x="48" y="42" class="label">${xml(project.styleNumber)} / PARAMETRIC BASE PATTERN / REV ${project.revision}</text>
     <text x="48" y="66" class="meta">XS–XXL NEST · BASE ${xml(project.baseSize)} BLACK · RED = TRUE OFFSET SA · BLUE = FOLD</text>
     ${body}`,
    `${project.styleNumber} parametric base pattern`,
  );
};

export const gradingRows = (project: ProjectRecord) => {
  const baseIndex = patternSizes.indexOf(project.baseSize as PatternSize);
  const resolvedBaseIndex = baseIndex >= 0 ? baseIndex : patternSizes.indexOf("M");
  return project.measurements.map((measurement) => {
    const step = Number.parseFloat(measurement.gradeRule) || 0;
    return {
      code: measurement.code,
      name: measurement.name,
      sizes: Object.fromEntries(
        patternSizes.map((size, index) => [
          size,
          Number((measurement.valueCm + (index - resolvedBaseIndex) * step).toFixed(1)),
        ]),
      ),
      toleranceCm: measurement.toleranceCm,
    };
  });
};

const csv = (project: ProjectRecord) => {
  const rows = gradingRows(project);
  return [
    "POM,Description,XS,S,M,L,XL,XXL,Tolerance cm",
    ...rows.map((row) =>
      [
        row.code,
        `"${row.name.replaceAll('"', '""')}"`,
        ...["XS", "S", "M", "L", "XL", "XXL"].map(
          (size) => row.sizes[size],
        ),
        row.toleranceCm,
      ].join(","),
    ),
  ].join("\n");
};

const bomCsv = (project: ProjectRecord) => [
  "CATEGORY,ITEM,SPECIFICATION,SUPPLIER,STATUS",
  ...(project.materials.length ? project.materials : [{ name: "Main fabric", specification: "TO BE CONFIRMED AFTER FABRIC TEST", supplier: "TBC" }])
    .map((item) => `MATERIAL,"${item.name}","${item.specification}","${item.supplier}",DEVELOPMENT`),
  `COLOR,"${project.primaryColor.name}","${project.primaryColor.hex} / ${project.primaryColor.pantone}",TBC,DEVELOPMENT`,
].join("\n");

const constructionCsv = (project: ProjectRecord) => {
  const operations = ["wide_cargo", "tailored_short"].includes(project.garmentType)
    ? [
        ["C01", "Rise and inseam", "5-thread safety stitch", "10-12", "Match notches; reinforce crotch"],
        ["C02", "Cargo pocket", "Lockstitch + edge stitch", "10-12", "Confirm finished position on fit sample"],
        ["C03", "Waistband", "Lockstitch / clean finish", "10-12", "Verify extension and closure"],
        ["C04", "Hem", "Blind or lockstitch per sample", "10-12", "Finished opening must match POM"],
      ]
    : [
        ["C01", "Shoulder / armhole", "5-thread safety stitch", "10-12", "Stabilize shoulder; match sleeve notches"],
        ["C02", "Hood assembly", "Lockstitch + clean finish", "10-12", "Confirm hood volume on fit sample"],
        ["C03", "Pocket", "Lockstitch + bartack", "10-12", "Mirror placement from centre front"],
        ["C04", "Rib attachment", "Overlock + cover/lock stitch", "10-12", "Confirm rib stretch ratio after test"],
      ];
  return ["OPERATION,AREA,SEAM/STITCH,SPI,QUALITY CONTROL", ...operations.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
};

const validationReport = (project: ProjectRecord) => {
  const pieces = draftPattern(project);
  const perimeters = Object.fromEntries(pieces.map((piece) => [piece.id, Number(perimeterCm(piece).toFixed(2))]));
  const seamWalkByGarment: Record<ProjectRecord["garmentType"], Array<{ pair: string; status: "REVIEW"; note: string }>> = {
    oversized_hoodie: [
      { pair: "front/back shoulder", status: "REVIEW", note: "Walk shoulder seams after grading" },
      { pair: "body/sleeve armhole", status: "REVIEW", note: "Walk armhole against sleeve after fabric selection" },
      { pair: "hood/neckline", status: "REVIEW", note: "Confirm neckline seam against hood assembly" },
    ],
    wide_cargo: [
      { pair: "front-leg/back-leg", status: "REVIEW", note: "Walk inseam and outseam after rise shaping" },
      { pair: "waist/waistband", status: "REVIEW", note: "Confirm waistband seam against finished waist" },
    ],
    boxy_tee: [
      { pair: "front/back shoulder", status: "REVIEW", note: "Walk shoulder seams after grading" },
      { pair: "body/short-sleeve armhole", status: "REVIEW", note: "Walk curved armhole against short sleeve" },
      { pair: "neckline/neck-rib", status: "REVIEW", note: "Confirm rib ratio after stretch recovery test" },
    ],
    track_jacket: [
      { pair: "front/back shoulder", status: "REVIEW", note: "Walk shoulder seams after grading" },
      { pair: "body/sleeve armhole", status: "REVIEW", note: "Walk armhole against shaped sleeve" },
      { pair: "neckline/stand-collar", status: "REVIEW", note: "Confirm stand collar seam after fusing test" },
    ],
    tailored_short: [
      { pair: "front-short/back-short", status: "REVIEW", note: "Walk inseam, side seam and rise" },
      { pair: "waist/waistband", status: "REVIEW", note: "Confirm contoured waistband seam against waist" },
    ],
  };
  const seamWalk = seamWalkByGarment[project.garmentType];
  return {
    status: "PRELIMINARY_UNVALIDATED",
    engine: "JNX_PARAMETRIC_BLOCK_V1",
    units: "millimetres",
    baseSize: project.baseSize,
    geometryDrivenByMeasurements: true,
    pieceCount: pieces.length,
    pieces: pieces.map((piece) => ({
      id: piece.id,
      name: piece.name,
      cut: piece.cut,
      seamAllowanceMm: piece.seamAllowanceMm,
      boundsCm: bounds(piece),
      hasGrainline: Boolean(piece.grainline),
      notchCount: piece.notches?.length ?? 0,
      seamLinePerimeterCm: perimeters[piece.id],
    })),
    seamWalk,
    gatesBeforeBulk: ["fabric shrinkage test", "pattern-maker review", "seam walk", "physical toile", "fit sample", "PP sample approval"],
    warning: PRELIMINARY_WARNING,
  };
};

const dxfEntity = (points: Point[], layer: string) => `0
LWPOLYLINE
8
${layer}
90
${points.length}
70
1
${points.map((point) => `10\n${(point.x * 10).toFixed(3)}\n20\n${(-point.y * 10).toFixed(3)}`).join("\n")}`;

const shifted = (points: Point[], offsetX: number) => points.map((point) => ({ x: point.x + offsetX, y: point.y }));

const dxfPolyline = (project: ProjectRecord, piece: PatternPiece, offsetX: number) => {
  const graded = patternSizes.map((size) => {
    const sizedPiece = draftPatternForSize(project, size).find((candidate) => candidate.id === piece.id);
    if (!sizedPiece) return "";
    const seam = shifted(sizedPiece.points, offsetX);
    const cut = shifted(seamAllowancePoints(sizedPiece), offsetX);
    return `${dxfEntity(seam, `SEAM_${size}_${piece.id.toUpperCase()}`)}
${dxfEntity(cut, `CUT_${size}_${piece.id.toUpperCase()}`)}`;
  }).join("\n");
  return `${graded}
0
TEXT
8
ANNOTATION
10
${(offsetX * 10).toFixed(3)}
20
100
40
8
1
${piece.name} / ${piece.cut} / SA ${piece.seamAllowanceMm} MM`;
};

const dxf = (project: ProjectRecord) => {
  let offsetX = 0;
  const entities = draftPattern(project).map((piece) => {
    const entity = dxfPolyline(project, piece, offsetX);
    offsetX += bounds(piece).width + 15;
    return entity;
  }).join("\n");
  return `0
SECTION
2
HEADER
9
$ACADVER
1
AC1027
9
$INSUNITS
70
4
0
ENDSEC
0
SECTION
2
ENTITIES
${entities}
0
TEXT
8
ANNOTATION
10
0
20
250
40
8
1
${project.styleNumber} REV ${project.revision} / MM / ${PRELIMINARY_WARNING}
0
ENDSEC
0
EOF`;
};

const pdf = (project: ProjectRecord) => {
  const ascii = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "-");
  const escapePdf = (value: string) => ascii(value).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
  const wrap = (value: string, max = 82) => {
    const words = ascii(value).split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      if (`${current} ${word}`.trim().length > max && current) {
        lines.push(current);
        current = word;
      } else current = `${current} ${word}`.trim();
    }
    if (current) lines.push(current);
    return lines;
  };
  const makePage = (title: string, sections: { heading: string; lines: string[] }[], pageNumber: number) => {
    const commands: string[] = ["0.1 0.1 0.09 rg", `BT /F1 18 Tf 48 790 Td (${escapePdf("JNX / " + title)}) Tj ET`, "0.95 0.42 0.08 RG 48 775 m 564 775 l S"];
    let y = 742;
    for (const section of sections) {
      commands.push(`BT /F1 11 Tf 48 ${y} Td (${escapePdf(section.heading.toUpperCase())}) Tj ET`);
      y -= 20;
      for (const raw of section.lines) {
        for (const line of wrap(raw)) {
          commands.push(`BT /F1 9 Tf 48 ${y} Td (${escapePdf(line)}) Tj ET`);
          y -= 14;
        }
        y -= 3;
      }
      y -= 13;
    }
    commands.push("0.75 0.75 0.72 RG 48 48 m 564 48 l S", `BT /F1 8 Tf 48 31 Td (${escapePdf(`CONFIDENTIAL DEVELOPMENT / ${project.styleNumber} / REV ${project.revision}`)}) Tj ET`, `BT /F1 8 Tf 530 31 Td (${pageNumber}/4) Tj ET`);
    return commands.join("\n");
  };
  const pages = [
    makePage("PILOT TECH PACK", [
      { heading: `${project.styleNumber} - ${project.styleName}`, lines: [`Garment: ${project.garmentType.replaceAll("_", " ").toUpperCase()}`, `Season: ${project.season}`, `Base size: ${project.baseSize} / Revision: ${project.revision}`, `Status: ${project.validationState}`] },
      { heading: "Fit and intent", lines: [project.fit, project.description, project.concept] },
      { heading: "Color", lines: [`${project.primaryColor.name} / ${project.primaryColor.hex} / ${project.primaryColor.pantone}`] },
      { heading: "Mandatory warning", lines: [PRELIMINARY_WARNING] },
    ], 1),
    makePage("MEASUREMENTS AND GRADING", [
      { heading: `Base ${project.baseSize} specification - centimetres`, lines: project.measurements.map((item) => `${item.code}  ${item.name}: ${item.valueCm.toFixed(1)} cm  | tolerance +/- ${item.toleranceCm.toFixed(1)}  | grade ${item.gradeRule}`) },
      { heading: "Measurement protocol", lines: ["Measure garment laid flat and relaxed. Factory must submit a complete measurement report before shipping the sample.", "Any block substitution or measurement change requires a new revision and a full graded nest for approval."] },
    ], 2),
    makePage("MATERIALS, CONSTRUCTION AND ARTWORK", [
      { heading: "Bill of materials", lines: (project.materials.length ? project.materials : [{ name: "Main fabric", specification: "TBC", supplier: "TBC" }]).map((item) => `${item.name}: ${item.specification}. Supplier: ${item.supplier}.`) },
      { heading: "Artwork controls", lines: (project.artworks.length ? project.artworks : [{ name: "No artwork", placement: "N/A", notes: "N/A" }]).map((item) => `${item.name} / ${item.placement}. ${item.notes}`) },
      { heading: "Construction controls", lines: ["Neck rib: finished width 2.5 cm. Shoulder-to-shoulder stabilization tape.", "Sleeve and body hems: two-needle coverstitch. Side vents: 2.5 cm with reinforcement bartacks.", "Factory must confirm seam type, SPI, thread, shrinkage and wash performance on the physical sample."] },
    ], 3),
    makePage("SAMPLE APPROVAL GATES", [
      { heading: "Before sample cutting", lines: ["[ ] Fabric swatch and handfeel approved", "[ ] GSM and composition verified", "[ ] Pattern maker completed seam walk", "[ ] DXF scale and all POM verified", "[ ] Artwork master vector and strike-off approved"] },
      { heading: "Fit sample review", lines: ["[ ] Base M measurements within tolerance", "[ ] Front, back and side photographs supplied", "[ ] Movement, comfort and balance approved", "[ ] Wash and shrinkage test passed", "[ ] Required corrections recorded as a new revision"] },
      { heading: "Bulk release", lines: ["[ ] Final pattern version recorded", "[ ] BOM locked", "[ ] PP sample approved", "[ ] Golden sample sealed", "[ ] JNX signature and date recorded", "Do not bulk cut until every gate above is complete."] },
    ], 4),
  ];
  const pageObjectIds = [3, 5, 7, 9];
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count 4 >>`,
    ...pages.flatMap((content, index) => {
      const stream = Buffer.from(content, "ascii");
      const contentId = pageObjectIds[index]! + 1;
      return [
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 11 0 R >> >> /Contents ${contentId} 0 R >>`,
        `<< /Length ${stream.length} >>\nstream\n${content}\nendstream`,
      ];
    }),
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let output = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(output));
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(output);
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(output, "utf8");
};

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let i = 0; i < 8; i += 1) {
    crc = (crc & 1) !== 0 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

const crc32 = (buffer: Buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const zipStore = (files: { name: string; content: Buffer }[]) => {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const crc = crc32(file.content);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(file.content.length, 18);
    local.writeUInt32LE(file.content.length, 22);
    local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, file.content);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(file.content.length, 20);
    central.writeUInt32LE(file.content.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + file.content.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, ...centralParts, end]);
};

export const packageFileNames = (project: ProjectRecord) => {
  const stem = `${project.styleNumber.replace(/[^a-z0-9_-]/gi, "_")}_REV${project.revision}`;
  return [
    `${stem}_technical_flat.svg`,
    `${stem}_graded_pattern.svg`,
    `${stem}_measurements.csv`,
    `${stem}_bill_of_materials.csv`,
    `${stem}_construction.csv`,
    `${stem}_pattern.dxf`,
    `${stem}_tech_pack.pdf`,
    `${stem}_pattern_validation.json`,
    `${stem}_manifest.json`,
    "READ_ME_FIRST.txt",
  ];
};

export const buildFactoryZip = (project: ProjectRecord) => {
  const names = packageFileNames(project);
  const manifest = {
    projectId: project.id,
    styleName: project.styleName,
    styleNumber: project.styleNumber,
    garmentType: project.garmentType,
    revision: project.revision,
    validationState: "PRELIMINARY_UNVALIDATED",
    generatedAt: new Date().toISOString(),
    files: names,
    warning: PRELIMINARY_WARNING,
  };
  return zipStore([
    { name: names[0]!, content: Buffer.from(flatSvg(project)) },
    { name: names[1]!, content: Buffer.from(patternSvg(project)) },
    { name: names[2]!, content: Buffer.from(csv(project)) },
    { name: names[3]!, content: Buffer.from(bomCsv(project)) },
    { name: names[4]!, content: Buffer.from(constructionCsv(project)) },
    { name: names[5]!, content: Buffer.from(dxf(project)) },
    { name: names[6]!, content: pdf(project) },
    {
      name: names[7]!,
      content: Buffer.from(JSON.stringify(validationReport(project), null, 2)),
    },
    {
      name: names[8]!,
      content: Buffer.from(JSON.stringify(manifest, null, 2)),
    },
    {
      name: names[9]!,
      content: Buffer.from(
        `${PRELIMINARY_WARNING}\n\nThis package uses an original JNX dimension-driven development block. It does not reproduce a third-party fashion house pattern. Seam allowances are annotated by piece and must be walked and confirmed edge-by-edge before sampling.`,
      ),
    },
  ]);
};