import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { Link, redirect } from "@/i18n/routing";
import { User } from "@/lib/auth";
import { getServerSession } from "@/lib/get-session";
import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import {
  AlertCircle,
  ArrowUpRight,
  BookOpenCheck,
  Bot,
  BrainCircuit,
  CalendarDaysIcon,
  CheckCircle2,
  CreditCard,
  FilePlus2,
  FileText,
  FolderOpen,
  LayoutDashboard,
  MailIcon,
  Package,
  Plus,
  ShieldIcon,
  Sparkles,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { unauthorized } from "next/navigation";

export const metadata: Metadata = {
  title: "Dashboard",
};

export const dynamic = "force-dynamic";

type DashboardProject = {
  id: string;
  name: string;
  model: string;
  createdAt: number;
  manualCount: number;
};

type DashboardData = {
  projects: DashboardProject[];
  totalManuals: number;
  materialCount: number;
  userCount: number | null;
  activeUserCount: number | null;
  projectError: boolean;
};

export default async function DashboardPage() {
  const session = await getServerSession();
  const user = session?.user;
  const locale = await getLocale();

  if (!user) unauthorized();

  const userPrisma = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (userPrisma?.status === "pending" || userPrisma?.status === "blocked") {
    redirect({ href: `/waiting-approval`, locale });
  }

  const [t, dashboardData] = await Promise.all([
    getTranslations("Dashboard"),
    loadDashboardData(user.role === "admin" || user.role === "owner"),
  ]);

  const recentProjects = dashboardData.projects.slice(0, 5);
  const indexedProjects = dashboardData.projects.filter(
    (project) => project.manualCount > 0,
  ).length;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-3 py-4 sm:px-5 lg:px-8">
      <section className="rounded-lg border bg-background px-4 py-4 shadow-xs sm:px-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-md border bg-muted">
              <LayoutDashboard className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-normal sm:text-2xl">
                  {t("title")}
                </h1>
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="size-3" />
                  AI manuals
                </Badge>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {t("description")}
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button asChild variant="outline" className="justify-center">
              <Link href="/manuals">
                <BookOpenCheck className="size-4" />
                Manuale
              </Link>
            </Button>
            <Button asChild className="justify-center">
              <Link href="/dashboard/add-new">
                <Plus className="size-4" />
                Proiect nou
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {!user.emailVerified && <EmailVerificationAlert />}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStat
          icon={FolderOpen}
          label="Proiecte"
          value={dashboardData.projects.length.toString()}
          helper={
            dashboardData.projectError
              ? "Sincronizarea OpenAI nu a răspuns"
              : `${indexedProjects} cu manuale indexate`
          }
          tone={dashboardData.projectError ? "warning" : "default"}
        />
        <DashboardStat
          icon={FileText}
          label="Manuale indexate"
          value={dashboardData.totalManuals.toString()}
          helper="Disponibile în chat-ul proiectelor"
        />
        <DashboardStat
          icon={Package}
          label="Materiale"
          value={dashboardData.materialCount.toString()}
          helper="Biblioteca de produse și imagini"
        />
        <DashboardStat
          icon={Users}
          label="Utilizatori"
          value={
            dashboardData.userCount === null
              ? "Profil"
              : dashboardData.userCount.toString()
          }
          helper={
            dashboardData.userCount === null
              ? getRoleLabel(user.role)
              : `${dashboardData.activeUserCount ?? 0} conturi active`
          }
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <div className="rounded-lg border bg-background shadow-xs">
          <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-base font-semibold">Proiecte recente</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ultimele spații AI create pentru manuale tehnice.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/all-projects">
                Toate proiectele
                <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="divide-y">
            {recentProjects.length > 0 ? (
              recentProjects.map((project) => (
                <RecentProjectRow key={project.id} project={project} />
              ))
            ) : (
              <div className="flex min-h-64 items-center justify-center p-6 text-center">
                <div className="max-w-sm">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-md border bg-muted">
                    <FolderOpen className="size-5 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold">
                    Nu ai încă proiecte
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Creează primul proiect, încarcă PDF-uri și întreabă AI-ul
                    direct din manuale.
                  </p>
                  <Button asChild className="mt-4">
                    <Link href="/dashboard/add-new">
                      <Plus className="size-4" />
                      Adaugă proiect
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <ProfileInformation user={user} />
          <QuickActions />
        </div>
      </section>
    </main>
  );
}

async function loadDashboardData(includeUsers: boolean): Promise<DashboardData> {
  const [projectOverview, materialCount, usersOverview] = await Promise.all([
    loadProjectOverview(),
    prisma.material.count().catch(() => 0),
    includeUsers
      ? Promise.all([
          prisma.user.count().catch(() => 0),
          prisma.user.count({ where: { status: "active" } }).catch(() => 0),
        ])
      : Promise.resolve<[number | null, number | null]>([null, null]),
  ]);

  return {
    ...projectOverview,
    materialCount,
    userCount: usersOverview[0],
    activeUserCount: usersOverview[1],
  };
}

async function loadProjectOverview() {
  try {
    const assistants = await openai.beta.assistants.list({
      order: "desc",
      limit: 100,
    });

    const projects = await Promise.all(
      assistants.data.map(async (assistant) => {
        const vectorStoreId =
          assistant.tool_resources?.file_search?.vector_store_ids?.[0] ||
          assistant.metadata?.vectorStoreId;
        let manualCount = 0;

        if (typeof vectorStoreId === "string" && vectorStoreId.length > 0) {
          try {
            const files = await openai.vectorStores.files.list(vectorStoreId, {
              limit: 100,
            });
            manualCount = files.data.length;
          } catch (error) {
            console.error("Failed to load dashboard manual count", error);
          }
        }

        return {
          id: assistant.id,
          name: assistant.name ?? "Proiect fără nume",
          model:
            typeof assistant.metadata?.chatModel === "string"
              ? assistant.metadata.chatModel
              : assistant.model,
          createdAt: assistant.created_at,
          manualCount,
        };
      }),
    );

    return {
      projects,
      totalManuals: projects.reduce(
        (total, project) => total + project.manualCount,
        0,
      ),
      projectError: false,
    };
  } catch (error) {
    console.error("Failed to load dashboard projects", error);

    return {
      projects: [],
      totalManuals: 0,
      projectError: true,
    };
  }
}

function RecentProjectRow({ project }: { project: DashboardProject }) {
  return (
    <article className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-muted/35 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted">
          <FolderOpen className="size-5" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold sm:text-base">
            {project.name}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDaysIcon className="size-3.5" />
              {formatUnixDate(project.createdAt)}
            </span>
            <span className="inline-flex items-center gap-1">
              <FileText className="size-3.5" />
              {project.manualCount} manuale
            </span>
            <span className="inline-flex items-center gap-1">
              <Bot className="size-3.5" />
              {project.model}
            </span>
          </div>
        </div>
      </div>

      <Button asChild variant="outline" size="sm" className="shrink-0">
        <Link href={`/dashboard/project/${project.id}`}>
          Deschide
          <ArrowUpRight className="size-4" />
        </Link>
      </Button>
    </article>
  );
}

function DashboardStat({
  icon: Icon,
  label,
  value,
  helper,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className="rounded-lg border bg-background p-4 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="size-4" />
          {label}
        </div>
        {tone === "warning" ? (
          <AlertCircle className="size-4 text-amber-600" />
        ) : (
          <CheckCircle2 className="size-4 text-emerald-600" />
        )}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-normal">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

function ProfileInformation({ user }: { user: User }) {
  return (
    <aside className="rounded-lg border bg-background p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Profil</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Contul conectat și accesul curent.
          </p>
        </div>
        <Badge variant={user.emailVerified ? "secondary" : "outline"}>
          {user.emailVerified ? "Verificat" : "Neverificat"}
        </Badge>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <UserAvatar name={user.name} image={user.image} className="size-14" />
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{user.name}</h3>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-2 text-sm">
        <ProfileRow
          icon={ShieldIcon}
          label="Rol"
          value={getRoleLabel(user.role)}
        />
        <ProfileRow
          icon={CalendarDaysIcon}
          label="Membru din"
          value={formatDate(user.createdAt)}
        />
      </div>
    </aside>
  );
}

function ProfileRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}

function QuickActions() {
  const actions = [
    {
      title: "Creează proiect",
      description: "Pornește un spațiu nou pentru manuale.",
      href: "/dashboard/add-new",
      icon: FilePlus2,
    },
    {
      title: "Bibliotecă manuale",
      description: "Vezi, editează sau șterge PDF-urile indexate.",
      href: "/manuals",
      icon: BookOpenCheck,
    },
    {
      title: "Materiale",
      description: "Gestionează produsele și imaginile.",
      href: "/materials",
      icon: Package,
    },
    {
      title: "Experiență",
      description: "Cazuri salvate și memoria technicianului.",
      href: "/experience",
      icon: BrainCircuit,
    },
    {
      title: "Tehnicieni AI",
      description: "Specialiști pe brand, manuale și domenii.",
      href: "/technicians",
      icon: Bot,
    },
    {
      title: "Billing",
      description: "Vezi creditul și costurile OpenAI.",
      href: "/billing",
      icon: CreditCard,
    },
  ];

  return (
    <aside className="rounded-lg border bg-background p-4 shadow-xs">
      <h2 className="text-base font-semibold">Acțiuni rapide</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Cele mai folosite zone, la un click distanță.
      </p>

      <div className="mt-4 grid gap-2">
        {actions.map((action) => (
          <Button
            key={action.href}
            asChild
            variant="ghost"
            className="h-auto justify-start gap-3 rounded-md border px-3 py-3 text-left"
          >
            <Link href={action.href}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                <action.icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">
                  {action.title}
                </span>
                <span className="block text-xs font-normal text-muted-foreground">
                  {action.description}
                </span>
              </span>
            </Link>
          </Button>
        ))}
      </div>
    </aside>
  );
}

async function EmailVerificationAlert() {
  const t = await getTranslations("Dashboard");

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <MailIcon className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" />
          <span className="text-sm text-amber-900 dark:text-amber-100">
            {t("emailVerification.description")}
          </span>
        </div>
        <Button size="sm" asChild className="shrink-0">
          <Link href="/verify-email">{t("emailVerification.button")}</Link>
        </Button>
      </div>
    </div>
  );
}

function formatUnixDate(timestamp: number) {
  return formatDate(new Date(timestamp * 1000));
}

function formatDate(value: Date | string | number) {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getRoleLabel(role?: string | null) {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  return "Membru";
}
