import { getServerSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import { unauthorized } from "next/navigation";
import ExperienceLibrary, { type ExperienceItem } from "./experience-library";

export const dynamic = "force-dynamic";

export default async function ExperiencePage() {
  const session = await getServerSession();

  if (!session?.user) unauthorized();

  const experiences = await prisma.technicianExperience.findMany({
    include: {
      technician: {
        select: {
          id: true,
          name: true,
          domain: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const items: ExperienceItem[] = experiences.map((experience) => ({
    id: experience.id,
    technicianId: experience.technicianId,
    technicianName: experience.technician?.name ?? null,
    technicianDomain: experience.technician?.domain ?? null,
    projectId: experience.projectId,
    manualId: experience.manualId,
    manualName: experience.manualName,
    title: experience.title,
    question: experience.question,
    answer: experience.answer,
    symptoms: experience.symptoms,
    cause: experience.cause,
    solution: experience.solution,
    tags: experience.tags,
    source: experience.source,
    createdAt: experience.createdAt.toISOString(),
    updatedAt: experience.updatedAt.toISOString(),
    canDelete:
      session.user.role === "admin" ||
      session.user.role === "owner" ||
      experience.createdById === session.user.id,
  }));

  return <ExperienceLibrary initialExperiences={items} />;
}
