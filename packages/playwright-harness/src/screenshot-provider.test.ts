import { describe, it, expect, vi } from "vitest";
import { PlaywrightScreenshotProvider } from "./screenshot-provider.js";
import type { Page } from "playwright";
import type { ScreenshotCaptureContext } from "@skeptic/evidence";

describe("PlaywrightScreenshotProvider", () => {
  const mockContext: ScreenshotCaptureContext = {
    runId: "test-run-123",
    criterionIndex: 1,
    sequence: 42,
  };

  it("should capture screenshot with fullPage option enabled", async () => {
    // Arrange
    const mockScreenshotData = Buffer.from("fake-png-data");
    const mockPage = {
      screenshot: vi.fn().mockResolvedValue(mockScreenshotData),
    } as unknown as Page;

    const provider = new PlaywrightScreenshotProvider(() => mockPage);

    // Act
    const result = await provider.capture(mockContext);

    // Assert
    expect(mockPage.screenshot).toHaveBeenCalledWith({
      type: "png",
      fullPage: true,
    });
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result).toEqual(new Uint8Array(mockScreenshotData));
  });

  it("should return Uint8Array from page.screenshot()", async () => {
    // Arrange
    const mockScreenshotData = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG header
    const mockPage = {
      screenshot: vi.fn().mockResolvedValue(mockScreenshotData),
    } as unknown as Page;

    const provider = new PlaywrightScreenshotProvider(() => mockPage);

    // Act
    const result = await provider.capture(mockContext);

    // Assert
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(4);
    expect(Array.from(result)).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it("should throw when page is null", async () => {
    // Arrange
    const provider = new PlaywrightScreenshotProvider(() => null);

    // Act & Assert
    await expect(provider.capture(mockContext)).rejects.toThrow(
      "Cannot capture screenshot: harness not launched"
    );
  });

  it("should use getter function to avoid stale references", async () => {
    // Arrange
    const mockScreenshotData1 = Buffer.from("screenshot-1");
    const mockScreenshotData2 = Buffer.from("screenshot-2");

    const mockPage1 = {
      screenshot: vi.fn().mockResolvedValue(mockScreenshotData1),
    } as unknown as Page;

    const mockPage2 = {
      screenshot: vi.fn().mockResolvedValue(mockScreenshotData2),
    } as unknown as Page;

    let currentPage: Page | null = mockPage1;
    const provider = new PlaywrightScreenshotProvider(() => currentPage);

    // Act - First capture
    const result1 = await provider.capture(mockContext);

    // Change page reference
    currentPage = mockPage2;

    // Act - Second capture with new page
    const result2 = await provider.capture(mockContext);

    // Assert - Provider used the updated page reference
    expect(mockPage1.screenshot).toHaveBeenCalledTimes(1);
    expect(mockPage2.screenshot).toHaveBeenCalledTimes(1);
    expect(result1).toEqual(new Uint8Array(mockScreenshotData1));
    expect(result2).toEqual(new Uint8Array(mockScreenshotData2));
  });

  it("should propagate playwright screenshot errors", async () => {
    // Arrange
    const mockError = new Error("Screenshot timeout");
    const mockPage = {
      screenshot: vi.fn().mockRejectedValue(mockError),
    } as unknown as Page;

    const provider = new PlaywrightScreenshotProvider(() => mockPage);

    // Act & Assert
    await expect(provider.capture(mockContext)).rejects.toThrow(
      "Screenshot timeout"
    );
  });

  it("should accept ScreenshotCaptureContext but not use it internally", async () => {
    // This test verifies that the provider accepts the context parameter
    // as required by the interface, even though it doesn't use it for capture logic
    const mockScreenshotData = Buffer.from("screenshot-data");
    const mockPage = {
      screenshot: vi.fn().mockResolvedValue(mockScreenshotData),
    } as unknown as Page;

    const provider = new PlaywrightScreenshotProvider(() => mockPage);

    const contexts: ScreenshotCaptureContext[] = [
      { runId: "run-1", criterionIndex: 0, sequence: 1 },
      { runId: "run-2", criterionIndex: 5, sequence: 99 },
    ];

    // Act - Should work with different contexts
    for (const ctx of contexts) {
      const result = await provider.capture(ctx);
      expect(result).toBeInstanceOf(Uint8Array);
    }

    // Assert - Screenshot called same way regardless of context
    expect(mockPage.screenshot).toHaveBeenCalledTimes(2);
    contexts.forEach(() => {
      expect(mockPage.screenshot).toHaveBeenCalledWith({
        type: "png",
        fullPage: true,
      });
    });
  });
});
