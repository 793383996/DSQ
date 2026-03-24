import { readFile } from "node:fs/promises";

const REQUIRED_LOCALE_KEYS = [
  "meta.dynamic_title",
  "meta.dynamic_description",
  "meta.dynamic_item_fallback",
  "meta.og_image_alt",
  "seo.breadcrumb.home",
  "seo.breadcrumb.current",
  "seo.faq.q1.question",
  "seo.faq.q1.answer",
  "seo.faq.q2.question",
  "seo.faq.q2.answer",
  "seo.faq.q3.question",
  "seo.faq.q3.answer",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(`seo:check failed: ${message}`);
  }
}

function assertIndexHtml(indexHtml) {
  assert(/id="canonicalLink"/.test(indexHtml), "missing canonical link id in index.html");
  assert(/hreflang="zh-CN"/.test(indexHtml), "missing zh-CN hreflang");
  assert(/hreflang="en-US"/.test(indexHtml), "missing en-US hreflang");
  assert(/id="schemaWebApplication"/.test(indexHtml), "missing schemaWebApplication JSON-LD slot");
  assert(/id="schemaBreadcrumbList"/.test(indexHtml), "missing schemaBreadcrumbList JSON-LD slot");
  assert(/id="schemaFAQPage"/.test(indexHtml), "missing schemaFAQPage JSON-LD slot");
  assert(/id="linkBreadcrumbHome"/.test(indexHtml), "missing breadcrumb home link id");

  const imgWithoutAlt = indexHtml.match(/<img\b(?![^>]*\balt=)[^>]*>/i);
  assert(!imgWithoutAlt, "found <img> without alt in index.html");
}

function assertSitemaps(sitemapXml, imageSitemapXml, robotsTxt) {
  assert(/xmlns:image=/.test(sitemapXml), "sitemap.xml missing image namespace");
  assert(/<image:image>/.test(sitemapXml), "sitemap.xml missing image:image entry");
  assert(/https:\/\/dsqstar\.xyz\/og-image\.png/.test(sitemapXml), "sitemap.xml missing OG image loc");
  assert(/legal\/privacy\.html/.test(sitemapXml), "sitemap.xml missing legal privacy URL");
  assert(/legal\/privacy\.en-US\.html/.test(sitemapXml), "sitemap.xml missing legal privacy en-US URL");

  assert(/<image:image>/.test(imageSitemapXml), "sitemap-images.xml missing image entries");
  assert(
    /https:\/\/dsqstar\.xyz\/img\/component-icon\.png/.test(imageSitemapXml),
    "sitemap-images.xml missing component icon"
  );

  assert(/Sitemap:\s*https:\/\/dsqstar\.xyz\/sitemap\.xml/i.test(robotsTxt), "robots.txt missing sitemap.xml");
  assert(
    /Sitemap:\s*https:\/\/dsqstar\.xyz\/sitemap-images\.xml/i.test(robotsTxt),
    "robots.txt missing sitemap-images.xml"
  );
}

function assertLocaleKeys(localeName, dictionary) {
  for (const key of REQUIRED_LOCALE_KEYS) {
    assert(typeof dictionary[key] === "string" && dictionary[key].trim(), `${localeName} missing locale key "${key}"`);
  }
}

async function main() {
  const [indexHtml, sitemapXml, imageSitemapXml, robotsTxt, zhLocaleRaw, enLocaleRaw] = await Promise.all([
    readFile("index.html", "utf8"),
    readFile("sitemap.xml", "utf8"),
    readFile("sitemap-images.xml", "utf8"),
    readFile("robots.txt", "utf8"),
    readFile("locales/zh-CN.json", "utf8"),
    readFile("locales/en-US.json", "utf8"),
  ]);

  const zhLocale = JSON.parse(zhLocaleRaw);
  const enLocale = JSON.parse(enLocaleRaw);

  assertIndexHtml(indexHtml);
  assertSitemaps(sitemapXml, imageSitemapXml, robotsTxt);
  assertLocaleKeys("zh-CN", zhLocale);
  assertLocaleKeys("en-US", enLocale);

  console.log("seo:check passed.");
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
