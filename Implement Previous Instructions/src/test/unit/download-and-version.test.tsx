import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GettingStartedPage } from "../../app/components/dashboard/GettingStartedPage";
import * as apiModule from "../../services/api";

describe("Unit: Desktop Download & Version Integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("displays real release version, architecture, and installer size", async () => {
    vi.spyOn(apiModule, "getInstallerDownload").mockResolvedValue({
      success: true,
      data: {
        downloadUrl: "https://storage.googleapis.com/crackflow-releases/CrackFlow-Setup-2.4.1.exe",
        version: "v2.4.1",
        fileName: "CrackFlow-Setup-2.4.1.exe",
      },
    });

    render(
      <GettingStartedPage
        onOpenVideo={vi.fn()}
        onNavigateToPlans={vi.fn()}
      />
    );

    expect(screen.getByText("Windows 10 / 11 (64-bit)")).toBeInTheDocument();
    expect(screen.getByText("x64")).toBeInTheDocument();
    expect(screen.getByText("~85 MB")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("v2.4.1")).toBeInTheDocument();
    });
  });

  it("triggers download API and opens download link on button click", async () => {
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    vi.spyOn(apiModule, "getInstallerDownload").mockResolvedValue({
      success: true,
      data: {
        downloadUrl: "https://storage.googleapis.com/crackflow-releases/CrackFlow-Setup-2.4.1.exe",
        version: "v2.4.1",
        fileName: "CrackFlow-Setup-2.4.1.exe",
      },
    });

    render(
      <GettingStartedPage
        onOpenVideo={vi.fn()}
        onNavigateToPlans={vi.fn()}
      />
    );

    const downloadButton = screen.getByRole("button", {
      name: /Download CrackFlow Setup \(\.exe\)/i,
    });
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(windowOpenSpy).toHaveBeenCalledWith(
        "https://storage.googleapis.com/crackflow-releases/CrackFlow-Setup-2.4.1.exe",
        "_blank",
        "noopener,noreferrer"
      );
      expect(screen.getByText(/Downloading CrackFlow-Setup-2.4.1\.exe/i)).toBeInTheDocument();
    });
  });

  it("displays user-friendly error message if download API fails", async () => {
    vi.spyOn(apiModule, "getInstallerDownload").mockResolvedValue({
      success: false,
      error: "Temporary network interruption. Please try again.",
    });

    render(
      <GettingStartedPage
        onOpenVideo={vi.fn()}
        onNavigateToPlans={vi.fn()}
      />
    );

    const downloadButton = screen.getByRole("button", {
      name: /Download CrackFlow Setup \(\.exe\)/i,
    });
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(
        screen.getByText("Temporary network interruption. Please try again.")
      ).toBeInTheDocument();
    });
  });
});

