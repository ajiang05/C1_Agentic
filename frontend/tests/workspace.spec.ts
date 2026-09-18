import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function sample(page: Page) {
  await page.goto("/#upload");
  await page.getByRole("button", { name: "Try the sample course" }).click();
  await expect(
    page.getByRole("heading", { name: "Graph Traversal & Topological Search" }),
  ).toBeVisible();
}
test("preferences, sensory controls, and navigation persist", async ({
  page,
}) => {
  await page.goto("/#preferences");
  await page
    .getByRole("radio", { name: "Seeing a structured visual diagram" })
    .check();
  await page.getByRole("radio", { name: "Deep Focus" }).check();
  await page.getByRole("radio", { name: "Complete breakdowns" }).check();
  await page.getByRole("button", { name: "Theme: Soft Day" }).click();
  await page.getByRole("button", { name: "Muted Slate", exact: true }).click();
  await page.getByRole("checkbox", { name: "Larger reading text" }).check();
  await page.getByRole("button", { name: "Back to my space" }).click();
  await page
    .getByRole("button", { name: "Save preferences & continue" })
    .click();
  await expect(page).toHaveURL(/#upload/);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "slate");
  await expect(page.locator("html")).toHaveAttribute("data-text-size", "large");
  await page.getByRole("link", { name: "1. Preferences" }).click();
  await expect(
    page.getByRole("radio", { name: "Seeing a structured visual diagram" }),
  ).toBeChecked();
  await expect(
    page.getByRole("radio", { name: "Complete breakdowns" }),
  ).toBeChecked();
});
test("sample lesson adapts, source flag persists, and progress exports", async ({
  page,
}) => {
  await sample(page);
  await page.getByRole("button", { name: "Begin lesson session" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Depth-First Search (DFS)",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "A Node C" }).check();
  await page.getByRole("button", { name: "Check my answer" }).click();
  await page.getByRole("button", { name: "Confirm answer" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Not quite — and that’s completely okay.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Step 1: Start at A" }).click();
  await expect(page.locator(".stack-frame")).toHaveCount(1);
  await page.getByRole("button", { name: "View source", exact: true }).click();
  await page.getByRole("button", { name: "Flag a discrepancy" }).click();
  await page
    .getByRole("textbox", { name: "What should be checked?" })
    .fill("Please clarify the order of children.");
  await page.getByRole("button", { name: "Save review note" }).click();
  await expect(page.getByText("Flag saved on this device.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Try a follow-up question" }).click();
  await expect(
    page.getByRole("heading", {
      name: "When D finishes, which paused call resumes next?",
    }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "B DFS(B)" }).check();
  await page.getByRole("button", { name: "Check my answer" }).click();
  await page.getByRole("button", { name: "Confirm answer" }).click();
  await expect(
    page.getByRole("heading", { name: "A little more understanding, built." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "5. Mastery & Knowledge" }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your Knowledge & Learning Model" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "View learning history" }).click();
  await expect(page.locator(".history-list li")).toHaveCount(2);
  await page.keyboard.press("Escape");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export progress report" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("edaptify-progress.json");
  const raw = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("edaptify.workspace.v1")!),
  );
  expect(raw.flags).toHaveLength(1);
  expect(raw.history).toHaveLength(2);
});
test("file selection rejects unsupported files and retains inputs on API failure", async ({
  page,
}) => {
  await page.route("**/api/v1/students", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.goto("/#upload");
  await page
    .getByRole("textbox", { name: "What’s your course called?" })
    .fill("Algorithms");
  await page
    .getByLabel("Upload syllabus", { exact: true })
    .setInputFiles({
      name: "syllabus.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 syllabus"),
    });
  await expect(page.getByText("syllabus.pdf", { exact: true })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page
    .getByLabel("Upload course notes", { exact: true })
    .setInputFiles({
      name: "notes.md",
      mimeType: "text/markdown",
      buffer: Buffer.from("DFS uses a stack"),
    });
  await page.getByRole("button", { name: "Generate learning journey" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "temporarily unavailable",
  );
  await expect(page.getByText("syllabus.pdf", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "What’s your course called?" }),
  ).toHaveValue("Algorithms");
});
test("live API contract flow uploads, generates, evaluates, and refreshes", async ({
  page,
}) => {
  const concept = {
    id: "c1",
    course_id: "course-live",
    name: "Vectors",
    description: "An ordered collection of components.",
    prerequisite_ids: [],
    order: 0,
  };
  const journey = {
    student_id: "s1",
    course_id: "course-live",
    course_name: "Linear Algebra",
    nodes: [{ concept, status: "available", mastery_score: 0 }],
    current_concept_id: "c1",
  };
  const progress = {
    student_id: "s1",
    course_id: "course-live",
    course_name: "Linear Algebra",
    concepts: [
      {
        concept_id: "c1",
        concept_name: "Vectors",
        mastery_score: 0,
        attempts: 0,
        correct_attempts: 0,
        status: "available",
      },
    ],
    overall_mastery: 0,
    recommended_reviews: [],
  };
  const source = {
    material_id: "m1",
    material_name: "Vector notes",
    location: "Section 1",
    excerpt: "A vector has ordered components.",
  };
  const lesson = {
    id: "l1",
    concept_id: "c1",
    course_id: "course-live",
    title: "Understanding Vectors",
    teaching_content: "A vector has ordered components.",
    teaching_format: "explanation",
    question: {
      id: "q1",
      prompt: "What does a vector contain?",
      question_type: "short_answer",
      difficulty: "easy",
      source_references: [source],
    },
    source_references: [source],
  };
  const calls: string[] = [];
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    calls.push(`${request.method()} ${path}`);
    let body: unknown = {};
    if (path.endsWith("/students"))
      body = { student_id: "s1", display_name: "Learner" };
    else if (path.endsWith("/preferences"))
      body = JSON.parse(request.postData()!).preferences;
    else if (path.endsWith("/upload")) {
      expect(request.postData()).toContain("syllabus");
      body = {
        course_id: "course-live",
        course_name: "Linear Algebra",
        material_ids: ["m1"],
        message: "Uploaded",
      };
    } else if (path.endsWith("/journey"))
      body = request.method() === "POST" ? { journey } : journey;
    else if (path.includes("/lessons/")) body = lesson;
    else if (path.endsWith("/progress")) body = progress;
    else if (path.endsWith("/attempts")) {
      expect(request.postDataJSON().student_answer).toBe("Ordered components");
      body = {
        attempt: {
          id: "a1",
          ...request.postDataJSON(),
          correct: true,
          created_at: new Date().toISOString(),
        },
        evaluation: {
          correct: true,
          understanding: "strong",
          feedback: "Correct: a vector has ordered components.",
          estimated_mastery: 0.7,
          source_references: [source],
        },
        next_action: {
          action: "harder_question",
          reason: "Try another example.",
          next_concept_id: "c1",
          suggested_difficulty: "medium",
        },
        progress: {
          ...progress,
          overall_mastery: 0.7,
          concepts: [
            {
              ...progress.concepts[0],
              attempts: 1,
              correct_attempts: 1,
              mastery_score: 0.7,
              status: "in_progress",
            },
          ],
        },
      };
    }
    await route.fulfill({ json: body });
  });
  await page.goto("/#upload");
  await page
    .getByRole("textbox", { name: "What’s your course called?" })
    .fill("Linear Algebra");
  for (const [label, name] of [
    ["Upload syllabus", "syllabus.txt"],
    ["Upload course notes", "notes.txt"],
  ])
    await page
      .getByLabel(label, { exact: true })
      .setInputFiles({
        name,
        mimeType: "text/plain",
        buffer: Buffer.from("Vector content"),
      });
  await page.getByRole("button", { name: "Generate learning journey" }).click();
  await page.getByRole("button", { name: "Begin lesson session" }).click();
  await page
    .getByRole("textbox", { name: "Your answer" })
    .fill("Ordered components");
  await page.getByRole("button", { name: "Check my answer" }).click();
  await page.getByRole("button", { name: "Confirm answer" }).click();
  await expect(
    page.getByText("Correct: a vector has ordered components.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "5. Mastery & Knowledge" }).click();
  await expect(page.getByText("70% mastery")).toBeVisible();
  await page.getByRole("button", { name: "Refresh progress" }).click();
  expect(calls).toContain("POST /api/v1/courses/upload");
  expect(calls).toContain("POST /api/v1/attempts");
});
test("mobile screens fit and key routes have no serious accessibility violations", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await sample(page);
  for (const [hash, label] of [
    ["journey", "3. Learning Journey"],
    ["progress", "5. Mastery & Knowledge"],
    ["preferences", "1. Preferences"],
    ["upload", "2. Course Upload"],
  ]) {
    await page.getByRole("link", { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`#${hash}`));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      audit.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact || ""),
      ),
    ).toEqual([]);
  }
  await page.getByRole("link", { name: "3. Learning Journey" }).click();
  await page.getByRole("button", { name: "Begin lesson session" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    audit.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact || ""),
    ),
  ).toEqual([]);
});
test("keyboard dialog traps focus, restores it, and sample reviews can be dismissed", async ({
  page,
}) => {
  await sample(page);
  await page.getByRole("button", { name: "Dismiss for today" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Dismiss for today" }),
  ).toHaveCount(0);
  const theme = page.getByRole("button", { name: "Theme: Soft Day" });
  await theme.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  expect(
    await page.evaluate(() =>
      document.querySelector("dialog")!.contains(document.activeElement),
    ),
  ).toBeTruthy();
  await page.keyboard.press("Escape");
  await expect(theme).toBeFocused();
});
test("desktop screens render without runtime errors, including dark theme", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Welcome, Matthew" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("welcome-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Start learning" }).click();
  await expect(page).toHaveURL(/#preferences/);
  await page.screenshot({
    path: testInfo.outputPath("preferences-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "2. Course Upload" }).click();
  await page.screenshot({
    path: testInfo.outputPath("upload-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Try the sample course" }).click();
  await page.screenshot({
    path: testInfo.outputPath("journey-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Begin lesson session" }).click();
  await page.getByRole("radio", { name: "A Node C" }).check();
  await page.getByRole("button", { name: "Check my answer" }).click();
  await page.getByRole("button", { name: "Confirm answer" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Not quite — and that’s completely okay.",
    }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("lesson-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "5. Mastery & Knowledge" }).click();
  await page.screenshot({
    path: testInfo.outputPath("progress-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: testInfo.outputPath("progress-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Theme: Soft Day" }).click();
  await page.getByRole("button", { name: "Muted Slate", exact: true }).click();
  await page.getByRole("button", { name: "Back to my space" }).click();
  await page.screenshot({
    path: testInfo.outputPath("progress-slate-mobile.png"),
    fullPage: true,
  });
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    audit.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact || ""),
    ),
  ).toEqual([]);
  expect(errors).toEqual([]);
});
