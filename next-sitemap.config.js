/** @type {import('next-sitemap').IConfig} */
const config = {
  siteUrl: "https://cycledesk.co.za",
  generateRobotsTxt: true,
  outDir: "public",
  exclude: [
    "/api/*",
    "/admin/*",
    "/app/*",
    "/auth/*",
    "/book/*",
    "/forbidden",
    "/invites/*",
    "/login*",
    "/logout",
    "/mech/*",
    "/partner*",
    "/platform/*",
    "/profile/*",
    "/register",
    "/signup*",
    "/start",
    "/success",
    "/services"
  ],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/app/", "/auth/", "/mech/", "/platform/"]
      }
    ],
    additionalSitemaps: ["https://cycledesk.co.za/sitemap.xml"]
  },
  additionalPaths: async () => [
    { loc: "/" }
  ]
};

module.exports = config;
