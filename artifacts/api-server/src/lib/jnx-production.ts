import type {
  ProjectMeasurement,
  ProjectRecord,
} from "@workspace/db";
import { bounds, draftPattern, type PatternPiece, type Point } from "./pattern-engine";

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
} satisfies Record<
  "oversized_hoodie" | "wide_cargo",
  [string, string, number, number, string][]
>;

export const measurementsFor = (
  garmentType: "oversized_hoodie" | "wide_cargo",
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

  return svgShell(
    `<text x="48" y="54" class="label">${xml(project.styleNumber)} / OVERSIZED HOODIE / REV ${project.revision}</text>
     <g transform="translate(70 105)">
      <path class="piece" d="M155 105L40 165L85 265L138 235L120 555L390 555L372 235L425 265L470 165L355 105L320 70L190 70Z"/>
      <path class="detail" d="M190 70Q255 132 320 70M190 70Q205 0 255 0Q305 0 320 70"/>
      <path class="detail" d="M185 355Q255 305 325 355L315 470L195 470Z"/>
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
    <polygon class="seam" points="${outline}" transform="translate(${piece.seamAllowanceMm / 2} ${piece.seamAllowanceMm / 2})"/>
    ${grain}${fold}${notches}
    <text class="label" x="${x + 8}" y="${y + 20}">${xml(piece.name)}</text>
    <text class="meta" x="${x + 8}" y="${y + 39}">${xml(piece.cut)} · SA ${piece.seamAllowanceMm} MM</text>
  </g>`;
};

export const patternSvg = (project: ProjectRecord) => {
  const pieces = draftPattern(project);
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
    const rendered = renderPatternPiece(piece, cursorX, cursorY, scale);
    cursorX += width;
    rowHeight = Math.max(rowHeight, height);
    return rendered;
  }).join("");

  return svgShell(
    `<text x="48" y="42" class="label">${xml(project.styleNumber)} / PARAMETRIC BASE PATTERN / REV ${project.revision}</text>
     <text x="48" y="66" class="meta">BASE ${xml(project.baseSize)} · DIMENSION-DRIVEN DEVELOPMENT BLOCK · RED = SA REFERENCE · BLUE = FOLD</text>
     ${body}`,
    `${project.styleNumber} parametric base pattern`,
  );
};

export const gradingRows = (project: ProjectRecord) => {
  const sizes = ["XS", "S", "M", "L", "XL", "XXL"];
  const offsets = [-2, -1, 0, 1, 2, 3];
  return project.measurements.map((measurement) => {
    const step = Number.parseFloat(measurement.gradeRule) || 0;
    return {
      code: measurement.code,
      name: measurement.name,
      sizes: Object.fromEntries(
        sizes.map((size, index) => [
          size,
          Number((measurement.valueCm + offsets[index]! * step).toFixed(1)),
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
  const operations = project.garmentType === "wide_cargo"
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
    })),
    gatesBeforeBulk: ["fabric shrinkage test", "pattern-maker review", "seam walk", "physical toile", "fit sample", "PP sample approval"],
    warning: PRELIMINARY_WARNING,
  };
};

const dxfPolyline = (piece: PatternPiece, offsetX: number) => `0
LWPOLYLINE
8
${piece.id.toUpperCase()}
90
${piece.points.length}
70
1
${piece.points.map((point) => `10\n${((point.x + offsetX) * 10).toFixed(3)}\n20\n${(-point.y * 10).toFixed(3)}`).join("\n")}
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

const dxf = (project: ProjectRecord) => {
  let offsetX = 0;
  const entities = draftPattern(project).map((piece) => {
    const entity = dxfPolyline(piece, offsetX);
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
  const text = [
    "JNX PRODUCTION STUDIO / TECH PACK",
    `${project.styleNumber} — ${project.styleName}`,
    `GARMENT: ${project.garmentType.replaceAll("_", " ").toUpperCase()}`,
    `SEASON: ${project.season} / BASE SIZE: ${project.baseSize} / REV: ${project.revision}`,
    `FIT: ${project.fit}`,
    `COLOR: ${project.primaryColor.name} / ${project.primaryColor.hex} / ${project.primaryColor.pantone}`,
    `PATTERN ENGINE: JNX PARAMETRIC BLOCK V1 / ${draftPattern(project).length} PIECES`,
    `MATERIALS: ${project.materials.map((material) => `${material.name}: ${material.specification}`).join("; ") || "TBC AFTER FABRIC TEST"}`,
    `ARTWORK: ${project.artworks.map((artwork) => `${artwork.name}: ${artwork.placement}`).join("; ") || "NONE SPECIFIED"}`,
    "MANDATORY GATES: SHRINKAGE / SEAM WALK / TOILE / FIT SAMPLE / PP SAMPLE",
    PRELIMINARY_WARNING,
  ]
    .map((line) => line.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)"))
    .map((line, index) => `BT /F1 ${index === 0 ? 16 : 10} Tf 50 ${790 - index * 45} Td (${line}) Tj ET`)
    .join("\n");
  const stream = Buffer.from(text, "utf8");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${stream.length} >>\nstream\n${text}\nendstream`,
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