import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  srcDir: ".",
  outDir: "dist-builds",
  manifestVersion: 3,
  manifest: ({ browser }) => ({
    name: "Hammy - Break Reminder",
    short_name: "Hammy",
    description:
      "A tiny hamster reminds you to take breathing, stretching, posture, and hydration breaks. 100% local, no tracking.",
    version: "2.0.0",
    permissions: ["storage", "alarms", "notifications", "scripting", "tabs"],
    host_permissions: ["<all_urls>"],
    ...(browser !== "firefox" ? { minimum_chrome_version: "116" } : {}),
    ...(browser === "firefox"
      ? {
          browser_specific_settings: {
            gecko: {
              id: "@hammy-break-reminder",
              strict_min_version: "128.0",
              data_collection_permissions: {
                required: ["none"],
              },
            },
          },
        }
      : {}),
    action: {
      default_icon: {
        "16": "icon-16.png",
        "48": "icon-48.png",
        "128": "icon-128.png",
      },
      default_title: "Hammy - Break Reminder",
    },
    icons: {
      "16": "icon-16.png",
      "48": "icon-48.png",
      "128": "icon-128.png",
    },
    commands: {},
    web_accessible_resources: [
      {
        resources: ["videos/*.webm"],
        matches: ["<all_urls>"],
      },
    ],
  }),
  vite: () => ({
    build: {
      modulePreload: false,
    },
    optimizeDeps: {
      entries: ["entrypoints/**/*.html"],
    },
  }),
});
