import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ResumePage } from "../../app/components/dashboard/ResumePage";
import * as apiModule from "../../services/api";

describe("Integration: Resume & Desktop Launch Workflow", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("integrates ResumePage with createAuthExchangeCode and opens DesktopLaunchModal", async () => {
    const mockExchangeCode = "cf_test_int_884920";
    vi.spyOn(apiModule, "createAuthExchangeCode").mockResolvedValue({
      success: true,
      data: {
        success: true,
        code: mockExchangeCode,
        expiresIn: 600,
        uid: "test-user-123",
      },
    });

    render(
      <ResumePage
        onNavigateToGettingStarted={vi.fn()}
      />
    );

    // Upload resume
    const file = new File(["cv data"], "lead_developer_resume.pdf", {
      type: "application/pdf",
    });
    const dropzone = screen.getByText("Drag and drop your resume here").closest(".dropzone")!;
    const input = dropzone.querySelector("input[type='file']")!;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("lead_developer_resume.pdf")).toBeInTheDocument();
    });

    // Start with Desktop App
    const startBtn = screen.getByRole("button", { name: /Start with Desktop App/i });
    expect(startBtn).toBeEnabled();
    fireEvent.click(startBtn);

    // Verify DesktopLaunchModal opened
    await waitFor(() => {
      expect(
        screen.getByRole("dialog", { name: /Desktop Launch Dialog/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Opening CrackFlow Desktop App/i)
      ).toBeInTheDocument();
      expect(screen.getByText(mockExchangeCode)).toBeInTheDocument();
    });

    expect(apiModule.createAuthExchangeCode).toHaveBeenCalled();
  });

  it("handles copy code and download fallback in DesktopLaunchModal", async () => {
    vi.spyOn(apiModule, "createAuthExchangeCode").mockResolvedValue({
      success: true,
      data: {
        success: true,
        code: "cf_copy_test_123",
        expiresIn: 600,
        uid: "test-user-456",
      },
    });

    vi.spyOn(apiModule, "getInstallerDownload").mockResolvedValue({
      success: true,
      data: {
        downloadUrl: "https://download.crackflow.com/CrackFlow-Setup-1.0.0.exe",
        version: "1.0.0",
        fileName: "CrackFlow-Setup-1.0.0.exe",
      },
    });

    // Mock clipboard
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    // Mock window.open
    const windowOpenMock = vi.fn();
    window.open = windowOpenMock;

    render(
      <ResumePage
        onNavigateToGettingStarted={vi.fn()}
      />
    );

    const file = new File(["resume"], "dev_resume.pdf", { type: "application/pdf" });
    const input = screen.getByText("Drag and drop your resume here").closest(".dropzone")!.querySelector("input[type='file']")!;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("dev_resume.pdf")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Start with Desktop App/i }));

    await waitFor(() => {
      expect(screen.getByText("cf_copy_test_123")).toBeInTheDocument();
    });

    // Click Copy Code
    const copyBtn = screen.getByRole("button", { name: /Copy/i });
    fireEvent.click(copyBtn);
    expect(writeTextMock).toHaveBeenCalledWith("cf_copy_test_123");

    // Click Download Installer
    const downloadBtn = screen.getByRole("button", { name: /Download Installer/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(apiModule.getInstallerDownload).toHaveBeenCalled();
      expect(windowOpenMock).toHaveBeenCalledWith(
        "https://download.crackflow.com/CrackFlow-Setup-1.0.0.exe",
        "_blank",
        "noopener,noreferrer"
      );
    });
  });
});
