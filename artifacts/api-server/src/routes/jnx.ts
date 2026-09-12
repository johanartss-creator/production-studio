import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db, projectsTable, type ProjectRecord } from "@workspace/db";
import {
  CreateProjectBody,
  CreateProjectResponse,
  DeleteProjectParams,
  GenerateFactoryPackageParams,
  GenerateFactoryPackageResponse,
  GetFlatPreviewParams,
  GetFlatPreviewResponse,
  GetGradingTableParams,
  GetGradingTableResponse,
  GetPatternPreviewParams,
  GetPatternPreviewResponse,
  GetProjectParams,
  GetProjectResponse,
  GetProjectSummaryResponse,
  ListProjectsResponse,
  ListTemplatesResponse,
  UpdateProjectBody,
  UpdateProjectParams,
  UpdateProjectResponse,
} from "@workspace/api-zod";
import {
  buildFactoryZip,
  flatSvg,
  gradingRows,
  measurementsFor,
  packageFileNames,
  patternSvg,
  PRELIMINARY_WARNING,
} from "../lib/jnx-production";

const router: IRouter = Router();

const toProject = (project: ProjectRecord) => ({
  ...project,
  garmentType: project.garmentType,
  validationState: project.validationState,
  createdAt: project.createdAt.toISOString(),
  updatedAt: project.updatedAt.toISOString(),
});

const findProject = async (id: string) => {
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, id));
  return project;
};

router.get("/templates", (_req, res): void => {
  const templates = [
    {
      id: "oversized_hoodie",
      name: "Oversized Hoodie",
      description:
        "Relaxed drop-shoulder base with hood, kangaroo pocket, rib cuff and hem controls.",
      measurements: measurementsFor("oversized_hoodie"),
    },
    {
      id: "wide_cargo",
      name: "Wide Cargo Pants",
      description:
        "Wide-leg utility base with articulated rise, cargo pocket and waistband controls.",
      measurements: measurementsFor("wide_cargo"),
    },
  ];
  res.json(ListTemplatesResponse.parse(templates));
});

router.get("/projects", async (_req, res): Promise<void> => {
  const projects = await db
    .select()
    .from(projectsTable)
    .orderBy(desc(projectsTable.updatedAt));
  res.json(ListProjectsResponse.parse(projects.map(toProject)));
});

router.post("/projects", async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid project input");
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const input = parsed.data;
  const measurements =
    input.measurements.length > 0
      ? input.measurements
      : measurementsFor(input.garmentType);
  const [project] = await db
    .insert(projectsTable)
    .values({
      ...input,
      measurements,
      validationState: "PRELIMINARY_UNVALIDATED",
      revision: 1,
    })
    .returning();
  res.status(201).json(CreateProjectResponse.parse(toProject(project!)));
});

router.get("/projects/:projectId", async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const project = await findProject(params.data.projectId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(GetProjectResponse.parse(toProject(project)));
});

router.put("/projects/:projectId", async (req, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse(req.params);
  const body = UpdateProjectBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const measurements =
    body.data.measurements.length > 0
      ? body.data.measurements
      : measurementsFor(body.data.garmentType);
  const [project] = await db
    .update(projectsTable)
    .set({
      ...body.data,
      measurements,
      revision: sql`${projectsTable.revision} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(projectsTable.id, params.data.projectId))
    .returning();
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(UpdateProjectResponse.parse(toProject(project)));
});

router.delete("/projects/:projectId", async (req, res): Promise<void> => {
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(projectsTable)
    .where(eq(projectsTable.id, params.data.projectId))
    .returning({ id: projectsTable.id });
  if (!deleted) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.status(204).send();
});

router.get("/projects/:projectId/flat", async (req, res): Promise<void> => {
  const params = GetFlatPreviewParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const project = await findProject(params.data.projectId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(
    GetFlatPreviewResponse.parse({
      kind: "flat",
      svg: flatSvg(project),
      warning: PRELIMINARY_WARNING,
    }),
  );
});

router.get("/projects/:projectId/pattern", async (req, res): Promise<void> => {
  const params = GetPatternPreviewParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const project = await findProject(params.data.projectId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(
    GetPatternPreviewResponse.parse({
      kind: "pattern",
      svg: patternSvg(project),
      warning: PRELIMINARY_WARNING,
    }),
  );
});

router.get("/projects/:projectId/grading", async (req, res): Promise<void> => {
  const params = GetGradingTableParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const project = await findProject(params.data.projectId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(GetGradingTableResponse.parse(gradingRows(project)));
});

router.post(
  "/projects/:projectId/generate",
  async (req, res): Promise<void> => {
    const params = GenerateFactoryPackageParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const project = await findProject(params.data.projectId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const packageName = `${project.styleNumber.replace(/[^a-z0-9_-]/gi, "_")}_REV${project.revision}_factory_package.zip`;
    res.json(
      GenerateFactoryPackageResponse.parse({
        packageName,
        downloadUrl: `/api/packages/${project.id}.zip`,
        files: packageFileNames(project),
        validationState: "PRELIMINARY_UNVALIDATED",
        warning: PRELIMINARY_WARNING,
      }),
    );
  },
);

router.get("/packages/:projectId.zip", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.projectId)
    ? req.params.projectId[0]
    : req.params.projectId;
  if (!rawId) {
    res.status(400).json({ error: "Project ID is required" });
    return;
  }
  const project = await findProject(rawId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const packageName = `${project.styleNumber.replace(/[^a-z0-9_-]/gi, "_")}_REV${project.revision}_factory_package.zip`;
  const zip = buildFactoryZip(project);
  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${packageName}"`,
  );
  res.setHeader("Content-Length", zip.length);
  res.send(zip);
});

router.get("/summary", async (_req, res): Promise<void> => {
  const projects = await db
    .select()
    .from(projectsTable)
    .orderBy(desc(projectsTable.updatedAt));
  const counts = projects.reduce<Record<string, number>>((accumulator, item) => {
    accumulator[item.garmentType] =
      (accumulator[item.garmentType] ?? 0) + 1;
    return accumulator;
  }, {});
  res.json(
    GetProjectSummaryResponse.parse({
      totalProjects: projects.length,
      preliminaryProjects: projects.filter(
        (project) => project.validationState === "PRELIMINARY_UNVALIDATED",
      ).length,
      garmentCounts: counts,
      latestProject: projects[0] ? toProject(projects[0]) : null,
    }),
  );
});

export default router;