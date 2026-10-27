import type { FullResult, Reporter, TestCase, TestResult } from "@playwright/test/reporter";

/** No traces/HTML or raw action arguments in reports (passwords and tokens). */
export default class SafeReporter implements Reporter {
  onTestEnd(test: TestCase, result: TestResult) {
    console.log(`${result.status}: ${test.parent.project()?.name} · ${test.title}`);
    if (result.status !== "passed") {
      const failure = result.errors[0]?.message ?? "Verificação falhou";
      // The first lines locate the assertion; omit Playwright's call log/arguments.
      console.log(failure.split(/Call log:|\n\s+at /)[0]?.replace(/https?:\/\/[^\s"<>]+/g, (value) => {
        try { const url = new URL(value); return `${url.origin}${url.pathname}${url.search ? "?[parâmetros omitidos]" : ""}`; }
        catch { return "[URL omitida]"; }
      }).slice(0, 1200));
      console.log(result.errors[0]?.stack?.match(/(?:access|recovery|administration|customers|products|commercial|helpers)\.spec\.ts:\d+:\d+/)?.[0] ?? "");
      console.log(`Local: ${test.location.file}:${test.location.line}`);
    }
  }
  onEnd(result: FullResult) { console.log(`Auth E2E: ${result.status}`); }
}
