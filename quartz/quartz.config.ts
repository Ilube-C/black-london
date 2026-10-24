import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "Black London — knowledge graph",
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: null,
    locale: "en-GB",
    baseUrl: "graph.blacklondon.org",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "EB Garamond",
        body: "Source Sans Pro",
        code: "IBM Plex Mono",
      },
      colors: {
        // Light mode — warm paper-and-ink for daytime reading
        lightMode: {
          light: "#f4f1ec",       // surface (matches the app's --text colour used as bg here)
          lightgray: "#e3ddd1",
          gray: "#a8a098",
          darkgray: "#3a3a3c",
          dark: "#1a1a1c",
          secondary: "#8a6c1f",   // deeper accent gold for links/headings
          tertiary: "#d4a548",    // bright accent gold for hovers
          highlight: "rgba(212, 165, 72, 0.14)",
          textHighlight: "rgba(212, 165, 72, 0.30)",
        },
        // Dark mode — same palette as the main app
        darkMode: {
          light: "#0f0f10",       // bg
          lightgray: "#2c2c30",   // line
          gray: "#6c6c70",
          darkgray: "#b6b1a8",    // text-dim
          dark: "#f4f1ec",        // text
          secondary: "#d4a548",   // accent
          tertiary: "#e9c46a",    // accent-light
          highlight: "rgba(212, 165, 72, 0.10)",
          textHighlight: "rgba(212, 165, 72, 0.28)",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      // Comment out CustomOgImages to speed up build time
      Plugin.CustomOgImages(),
    ],
  },
}

export default config
