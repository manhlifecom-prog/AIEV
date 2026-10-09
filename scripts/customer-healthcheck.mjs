const port = process.env.CUSTOMER_WEB_PORT || "6870";
try {
  const config = await fetch(`http://127.0.0.1:${port}/api/customer/config`, { signal: AbortSignal.timeout(10_000) });
  if (!config.ok || !(await config.json()).mediaReady) throw new Error("Customer API or media renderer unavailable");
  const page = await fetch(`http://127.0.0.1:${port}/studio`, { signal: AbortSignal.timeout(10_000) });
  if (!page.ok || !(await page.text()).includes("Trợ lý dựng video")) throw new Error("Studio page unavailable");
  console.log("Customer web, API and media renderer are healthy");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Studio unavailable");
  process.exitCode = 1;
}
