import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ["en", "ro", "de", "fr", "ru", "pl"],

  // Used when no locale matches
  defaultLocale: "en",
  // pathnames: {
  //   "/dashboard": {
  //     en: "/dashboard",
  //     fr: "/tableau-de-bord",
  //     ro: "/dashboard",
  //     de: "/dashboard",
  //     ru: "/dashboard",
  //     pl: "/dashboard",
  //   },
  //   "/dashboard/add-new": {
  //     en: "/dashboard/add-new",
  //     fr: "/tableau-de-bord/ajouter-nouveau",
  //     ro: "/dashboard/add-new",
  //     de: "/dashboard/add-new",
  //     ru: "/dashboard/add-new",
  //     pl: "/dashboard/add-new",
  //   },
  //   "/dashboard/all-projects": {
  //     en: "/dashboard/all-projects",
  //     fr: "/tableau-de-bord/tous-les-projets",
  //     ro: "/dashboard/add-new",
  //     de: "/dashboard/add-new",
  //     ru: "/dashboard/add-new",
  //     pl: "/dashboard/add-new",
  //   },
  //   "/sign-in": {
  //     en: "/sign-in",
  //     fr: "/se connecter",
  //     ro: "/dashboard/add-new",
  //     de: "/dashboard/add-new",
  //     ru: "/dashboard/add-new",
  //     pl: "/dashboard/add-new",
  //   },
  // },
});

export type Locale = (typeof routing.locales)[number];

export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
