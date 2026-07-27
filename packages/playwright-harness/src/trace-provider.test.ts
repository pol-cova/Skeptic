import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PlaywrightTraceProvider } from "./trace-provider.js";
import * as fs from "node:fs/promises";

// Mock fs.readFile
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

describe("PlaywrightTraceProvider", () => {
  const mockRunId = "test-run-123";
  const mockTracePath = "/tmp/trace-12345.zip";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should store trace path via setTracePath()", () => {
    // Arrange
    const provider = new PlaywrightTraceProvider();

    // Act
    provider.setTracePath(mockTracePath);

    // Assert - No direct assertion, but getTrace should work after this
    expect(() => provider.setTracePath(mockTracePath)).not.toThrow();
  });

  it("should read file and return Uint8Array when trace path is set", async () => {
    // Arrange
    const mockTraceData = Buffer.from("fake-trace-zip-data");
    vi.mocked(fs.readFile).mockResolvedValue(mockTraceData);

    const provider = new PlaywrightTraceProvider();
    provider.setTracePath(mockTracePath);

    // Act
    const result = await provider.getTrace(mockRunId);

    // Assert
    expect(fs.readFile).toHaveBeenCalledWith(mockTracePath);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result).toEqual(new Uint8Array(mockTraceData));
  });

  it("should throw when trace path was not set", async () => {
    // Arrange
    const provider = new PlaywrightTraceProvider();

    // Act & Assert
    await expect(provider.getTrace(mockRunId)).rejects.toThrow(
      "Trace not available. Tracing may have failed to start."
    );

    // Verify readFile was never called
    expect(fs.readFile).not.toHaveBeenCalled();
  });

  it("should use lazy file read pattern (only read when getTrace is called)", async () => {
    // Arrange
    const mockTraceData = Buffer.from("trace-data");
    vi.mocked(fs.readFile).mockResolvedValue(mockTraceData);

    const provider = new PlaywrightTraceProvider();

    // Act - Set path but don't call getTrace yet
    provider.setTracePath(mockTracePath);

    // Assert - File not read yet
    expect(fs.readFile).not.toHaveBeenCalled();

    // Act - Now call getTrace
    await provider.getTrace(mockRunId);

    // Assert - File read now
    expect(fs.readFile).toHaveBeenCalledTimes(1);
  });

  it("should allow multiple getTrace calls with the same path", async () => {
    // Arrange
    const mockTraceData = Buffer.from("trace-content");
    vi.mocked(fs.readFile).mockResolvedValue(mockTraceData);

    const provider = new PlaywrightTraceProvider();
    provider.setTracePath(mockTracePath);

    // Act - Call getTrace multiple times
    const result1 = await provider.getTrace("run-1");
    const result2 = await provider.getTrace("run-2");

    // Assert - Both calls should read the file
    expect(fs.readFile).toHaveBeenCalledTimes(2);
    expect(result1).toEqual(new Uint8Array(mockTraceData));
    expect(result2).toEqual(new Uint8Array(mockTraceData));
  });

  it("should propagate file system errors from readFile", async () => {
    // Arrange
    const mockError = new Error("ENOENT: file not found");
    vi.mocked(fs.readFile).mockRejectedValue(mockError);

    const provider = new PlaywrightTraceProvider();
    provider.setTracePath(mockTracePath);

    // Act & Assert
    await expect(provider.getTrace(mockRunId)).rejects.toThrow(
      "ENOENT: file not found"
    );
  });

  it("should accept runId parameter as per TraceProvider interface", async () => {
    // This test verifies that the provider accepts the runId parameter
    // as required by the interface, even though it doesn't use it for retrieval logic
    const mockTraceData = Buffer.from("trace-zip");
    vi.mocked(fs.readFile).mockResolvedValue(mockTraceData);

    const provider = new PlaywrightTraceProvider();
    provider.setTracePath(mockTracePath);

    const runIds = ["run-1", "run-2", "run-3"];

    // Act - Should work with different runIds
    for (const runId of runIds) {
      const result = await provider.getTrace(runId);
      expect(result).toBeInstanceOf(Uint8Array);
    }

    // Assert - ReadFile called same way regardless of runId
    expect(fs.readFile).toHaveBeenCalledTimes(3);
    runIds.forEach(() => {
      expect(fs.readFile).toHaveBeenCalledWith(mockTracePath);
    });
  });

  it("should overwrite previous trace path when setTracePath is called again", async () => {
    // Arrange
    const firstTracePath = "/tmp/trace-1.zip";
    const secondTracePath = "/tmp/trace-2.zip";
    const mockTraceData = Buffer.from("trace");
    vi.mocked(fs.readFile).mockResolvedValue(mockTraceData);

    const provider = new PlaywrightTraceProvider();

    // Act - Set path twice
    provider.setTracePath(firstTracePath);
    provider.setTracePath(secondTracePath);

    await provider.getTrace(mockRunId);

    // Assert - Should use the second path
    expect(fs.readFile).toHaveBeenCalledWith(secondTracePath);
    expect(fs.readFile).not.toHaveBeenCalledWith(firstTracePath);
  });

  it("should convert Buffer to Uint8Array correctly", async () => {
    // Arrange - Use realistic ZIP file header bytes
    const zipHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // PK\x03\x04
    vi.mocked(fs.readFile).mockResolvedValue(zipHeader);

    const provider = new PlaywrightTraceProvider();
    provider.setTracePath(mockTracePath);

    // Act
    const result = await provider.getTrace(mockRunId);

    // Assert
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(4);
    expect(Array.from(result)).toEqual([0x50, 0x4b, 0x03, 0x04]);
  });
});
