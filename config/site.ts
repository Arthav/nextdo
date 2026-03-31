export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "CB's Todo Today App",
  description: "Minimal planner for tasks and project reports.",
  navItems: [
    {
      label: "Todo App",
      href: "/",
    },
    {
      label: "Project Managing",
      href: "/project-managing",
    },
  ],
};
