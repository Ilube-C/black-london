import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [],
  footer: Component.Footer({
    links: {
      GitHub: "https://github.com/jackyzha0/quartz",
      "Discord Community": "https://discord.gg/cRFFHYye7t",
    },
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    // Title + small meta sit at the top of every page — consistent header.
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ArticleTitle(),
    Component.ContentMeta(),
    Component.TagList(),
    // Then the big interactive graph, present on EVERY page so the user's
    // sense of place doesn't shift when they click a node — only the body
    // info beneath the graph changes.
    Component.Graph({
      localGraph: {
        depth: -1,
        scale: 0.9,
        repelForce: 0.9,
        centerForce: 0.3,
        linkDistance: 60,
        fontSize: 0.7,
        opacityScale: 1,
        focusOnHover: true,
        showTags: false,
      },
      globalGraph: {
        depth: -1,
        scale: 1.0,
        repelForce: 0.8,
        linkDistance: 60,
        fontSize: 0.7,
        focusOnHover: true,
        showTags: false,
        enableRadial: false,
      },
    }),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
        { Component: Component.ReaderMode() },
      ],
    }),
    Component.Explorer(),
  ],
  right: [
    // Hero graph is at the top of every page now, so the right sidebar
    // shrinks to just TOC + backlinks. No second graph here.
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Backlinks(),
  ],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle(), Component.ContentMeta()],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    Component.Explorer(),
  ],
  right: [],
}
