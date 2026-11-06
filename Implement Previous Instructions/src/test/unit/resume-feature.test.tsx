import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { ResumePage } from "../../app/components/dashboard/ResumePage";
import {
  saveStoredResume,
  getStoredResume,
  deleteStoredResume,
} from "../../services/resumeStorage";

describe("Unit: Resume Page & Storage Feature", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("disables 'Start with Desktop App' button by default when no resume is uploaded", () => {
    render(
      <ResumePage
        onNavigateToGettingStarted={vi.fn()}
      />
    );

    const startBtn = screen.getByRole("button", { name: /Start with Desktop App/i });
    expect(startBtn).toBeDisabled();
    expect(startBtn).toHaveAttribute(
      "title",
      "Upload your resume first to enable starting with the desktop app"
    );
  });

  it("enables 'Start with Desktop App' button when user uploads a valid resume", async () => {
    render(
      <ResumePage
        onNavigateToGettingStarted={vi.fn()}
      />
    );

    const startBtn = screen.getByRole("button", { name: /Start with Desktop App/i });
    expect(startBtn).toBeDisabled();

    const file = new File(["sample resume content"], "alex_chen_cv.pdf", {
      type: "application/pdf",
    });

    const dropzone = screen.getByText("Drag and drop your resume here").closest(".dropzone")!;
    const input = dropzone.querySelector("input[type='file']")!;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("alex_chen_cv.pdf")).toBeInTheDocument();
      expect(startBtn).toBeEnabled();
    });
  });

  it("shows 'View' button and opens ResumePreviewModal when clicked", async () => {
    render(
      <ResumePage
        onNavigateToGettingStarted={vi.fn()}
      />
    );

    const file = new File(["resume body"], "sarah_engineer.pdf", {
      type: "application/pdf",
    });

    const dropzone = screen.getByText("Drag and drop your resume here").closest(".dropzone")!;
    const input = dropzone.querySelector("input[type='file']")!;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("sarah_engineer.pdf")).toBeInTheDocument();
    });

    // View button should be present
    const viewBtn = screen.getByRole("button", { name: /View/i });
    expect(viewBtn).toBeInTheDocument();

    // Click View
    fireEvent.click(viewBtn);

    // Modal should open
    const previewDialog = screen.getByRole("dialog", { name: /Resume Preview Dialog/i });
    expect(previewDialog).toBeInTheDocument();
    expect(within(previewDialog).getByText("Resume Preview")).toBeInTheDocument();
    expect(within(previewDialog).getByText(/sarah_engineer\.pdf/)).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByRole("button", { name: /Close dialog/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole("dialog", { name: /Resume Preview Dialog/i })).not.toBeInTheDocument();
  });

  it("allows deleting/removing resume and reverts 'Start with Desktop App' button to disabled", async () => {
    render(
      <ResumePage
        onNavigateToGettingStarted={vi.fn()}
      />
    );

    const file = new File(["dummy content"], "delete_test.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const dropzone = screen.getByText("Drag and drop your resume here").closest(".dropzone")!;
    const input = dropzone.querySelector("input[type='file']")!;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("delete_test.docx")).toBeInTheDocument();
    });

    const startBtn = screen.getByRole("button", { name: /Start with Desktop App/i });
    expect(startBtn).toBeEnabled();

    // Remove resume
    const removeBtn = screen.getByRole("button", { name: /Remove/i });
    fireEvent.click(removeBtn);

    // Dropzone restored and button re-disabled
    expect(screen.getByText("Drag and drop your resume here")).toBeInTheDocument();
    expect(startBtn).toBeDisabled();
  });

  it("tests resumeStorage service lifecycle: save, get, and delete", async () => {
    const file = new File(["pdf binary"], "storage_test.pdf", {
      type: "application/pdf",
    });

    const saved = await saveStoredResume(file);
    expect(saved.name).toBe("storage_test.pdf");
    expect(saved.type).toBe("PDF");

    const retrieved = await getStoredResume();
    expect(retrieved).not.toBeNull();
    expect(retrieved?.name).toBe("storage_test.pdf");

    await deleteStoredResume();
    const afterDelete = await getStoredResume();
    expect(afterDelete).toBeNull();
  });
});
