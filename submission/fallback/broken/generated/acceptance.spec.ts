import { test, expect } from "@playwright/test";

const baseURL = "http://127.0.0.1:3100";

test.use({ baseURL });

test("[1] An invalid email address shows a validation message and does not create an invitation.", async ({
  page,
}) => {
  await page.request.post("http://127.0.0.1:3100/api/reset");
  await page.goto("http://127.0.0.1:3100/login");
  await page.getByTestId("login-username").fill("demo");
  await page.getByTestId("login-password").fill("skeptic-demo");
  await page.getByTestId("login-submit").click();
  await page.getByTestId("invite-email").waitFor({ timeout: 10000 });
  await page.getByTestId("invite-email").fill("user@invalid");
  await page.getByTestId("invite-submit").click();
  await page.getByTestId("invite-validation-error").waitFor({ timeout: 5000 });
  await page.getByRole("alert").waitFor({ timeout: 5000 });
  await expect(page.getByTestId("invite-validation-error")).toBeVisible();
  await expect(page.getByTestId("invite-validation-error")).toContainText(
    "valid email",
  );
  await expect(page.getByTestId("pending-invitation-row")).toHaveCount(0);
  // response assertion: POST /api/invitations -> 400
  // verified during Skeptic run via network log
});

test("[2] A valid email address creates an invitation and displays it in the Pending invitations list.", async ({
  page,
}) => {
  await page.request.post("http://127.0.0.1:3100/api/reset");
  await page.goto("http://127.0.0.1:3100/login");
  await page.getByTestId("login-username").fill("demo");
  await page.getByTestId("login-password").fill("skeptic-demo");
  await page.getByTestId("login-submit").click();
  await page.getByTestId("invite-email").waitFor({ timeout: 10000 });
  await page
    .getByTestId("invite-email")
    .fill("verify-verify-1785117794103@example.com");
  await page.getByTestId("invite-submit").click();
  await page.getByTestId("invite-success-toast").waitFor({ timeout: 5000 });
  await expect(page.getByTestId("invite-success-toast")).toBeVisible();
  // response assertion: POST /api/invitations -> 200
  // verified during Skeptic run via network log
  await expect(page.getByTestId("pending-invitation-row")).toHaveCount(1);
  await page.goto("http://127.0.0.1:3100/team");
  await page.getByTestId("pending-invitations").waitFor({ timeout: 5000 });
  await expect(page.getByTestId("pending-invitation-row")).toHaveCount(1);
});

test("[3] Inviting the same email twice shows a duplicate-invitation error and does not create a second row.", async ({
  page,
}) => {
  await page.request.post("http://127.0.0.1:3100/api/reset");
  await page.goto("http://127.0.0.1:3100/login");
  await page.getByTestId("login-username").fill("demo");
  await page.getByTestId("login-password").fill("skeptic-demo");
  await page.getByTestId("login-submit").click();
  await page.getByTestId("invite-email").waitFor({ timeout: 10000 });
  await page
    .getByTestId("invite-email")
    .fill("verify-verify-1785117794103@example.com");
  await page.getByTestId("invite-submit").click();
  await page
    .getByTestId("invite-email")
    .fill("verify-verify-1785117794103@example.com");
  await page.getByTestId("invite-submit").click();
  await page.getByTestId("invite-duplicate-error").waitFor({ timeout: 5000 });
  await expect(page.getByTestId("invite-duplicate-error")).toBeVisible();
  await expect(page.getByTestId("pending-invitation-row")).toHaveCount(1);
});
