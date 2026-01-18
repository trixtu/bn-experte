"use client";
import * as React from "react";
import {
  BookOpen,
  Bot,
  BrickWall,
  Folder,
  FolderTree,
  Settings2,
  Users,
} from "lucide-react";
import { NavMain } from "@/components/nav-main";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavProjects } from "./nav-projects";
import { Separator } from "@/components/ui/separator";
import { NavUser } from "./nav-user";
import { TeamSwitcher } from "./team-switcher";
import { useTranslations } from "next-intl";

// This is sample data.

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    id: string;
    email: string;
    name?: string;
    role?: string;
  };
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const t = useTranslations("Sidebar");

  const data = {
    navMain: [
      {
        title: t("navMain.project.title"),
        url: "#",
        icon: Folder,
        isActive: true,
        items: [
          {
            title: t("navMain.project.items.addNew"),
            url: "/dashboard/add-new",
          },
          {
            title: t("navMain.project.items.allProjects"),
            url: "/dashboard/all-projects",
          },
          {
            title: t("navMain.project.items.geminiAssistant"),
            url: "/dashboard/gemini",
          }
        ],
      },
      {
        title: "Materials",
        url: "#",
        icon: BrickWall,
        items: [
          {
            title: "Add new",
            url: "/materials/add-new",
          }
        ],
      },

      {
        title: "Documentation",
        url: "#",
        icon: BookOpen,
        items: [
          {
            title: "Introduction",
            url: "#",
          },
          {
            title: "Get Started",
            url: "#",
          },
          {
            title: "Tutorials",
            url: "#",
          },
          {
            title: "Changelog",
            url: "#",
          },
        ],
      },
      {
        title: "Settings",
        url: "#",
        icon: Settings2,
        items: [
          {
            title: "General",
            url: "#",
          },
          {
            title: "Team",
            url: "#",
          },
          {
            title: "Billing",
            url: "#",
          },
          {
            title: "Limits",
            url: "#",
          },
        ],
      },
    ],
    projects: [
      {
        name: "Manuals",
        url: "/manuals",
        icon: FolderTree,
      },
      { 
        name: "Materials",
        url: "/materials",
        icon: FolderTree, 
      },
      {
        name: "Users",
        url: "/admin",
        icon: Users,
      },
    ],
  };
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <Separator />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
