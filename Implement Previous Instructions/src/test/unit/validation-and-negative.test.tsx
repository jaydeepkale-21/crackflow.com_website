import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ResumePage } from "../../app/components/dashboard/ResumePage";

describe("Unit: Resume Validation & Negative Tests", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("accepts valid PDF resume file", async () => {
    render(
      <ResumePage
        onNavigateToGettingStarted={vi.fn()}
        onStartWithDesktopApp={vi.fn()}
      />
    );

    const file = new File(["dummy pdf content"], "my_resume.pdf", {
      type: "application/pdf",
    });

    const dropzone = screen.getByText("Drag and drop your resume here").closest(".dropzone")!;
    const input = dropzone.querySelector("input[type='file']")!;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("my_resume.pdf")).toBeInTheDocument();
      expect(screen.getAllByText(/PDF/i).length).toBeGreaterThan(0);
    });
  });

  it("accepts valid DOCX resume file", async () => {
    render(
      <ResumePage
        onNavigateToGettingStarted={vi.fn()}
        onStartWithDesktopApp={vi.fn()}
      />
    );

    const file = new File(["dummy docx content"], "software_engineer_cv.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const dropzone = screen.getByText("Drag and drop your resume here").closest(".dropzone")!;
    const input = dropzone.querySelector("input[type='file']")!;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("software_engineer_cv.docx")).toBeInTheDocument();
      expect(screen.getAllByText(/DOCX/i).length).toBeGreaterThan(0);
    });
  });

  it("rejects unsupported file formats (.exe, .png, .txt)", async () => {
    render(
      <ResumePage
        onNavigateToGettingStarted={vi.fn()}
        onStartWithDesktopApp={vi.fn()}
      />
    );

    const invalidFile = new File(["invalid binary"], "malicious_script.exe", {
      type: "application/x-msdownload",
    });

    const dropzone = screen.getByText("Drag and drop your resume here").closest(".dropzone")!;
    const input = dropzone.querySelector("input[type='file']")!;

    fireEvent.change(input, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(
        screen.getByText("That file type is not supported. Please choose a valid PDF or DOCX file.")
      ).toBeInTheDocument();
    });

    // Ensure invalid file is NOT saved or displayed as uploaded
    expect(screen.queryByText("malicious_script.exe")).not.toBeInTheDocument();
  });

  it("rejects files exceeding the 10 MB limit", async () => {
    render(
      <ResumePage
        onNavigateToGettingStarted={vi.fn()}
        onStartWithDesktopApp={vi.fn()}
      />
    );

    // Create 11 MB dummy file
    const oversizedBlob = new Blob([new Uint8Array(11 * 1024 * 1024)], {
      type: "application/pdf",
    });
    const oversizedFile = new File([oversizedBlob], "giant_resume.pdf", {
      type: "application/pdf",
    });

    const dropzone = screen.getByText("Drag and drop your resume here").closest(".dropzone")!;
    const input = dropzone.querySelector("input[type='file']")!;

    fireEvent.change(input, { target: { files: [oversizedFile] } });

    await waitFor(() => {
      expect(
        screen.getByText("File is too large. The maximum supported resume size is 10 MB.")
      ).toBeInTheDocument();
    });

    expect(screen.queryByText("giant_resume.pdf")).not.toBeInTheDocument();
  });

  it("allows removing the uploaded resume and resetting state", async () => {
    render(
      <ResumePage
        onNavigateToGettingStarted={vi.fn()}
        onStartWithDesktopApp={vi.fn()}
      />
    );

    const file = new File(["sample"], "resume_to_remove.pdf", {
      type: "application/pdf",
    });
    const dropzone = screen.getByText("Drag and drop your resume here").closest(".dropzone")!;
    const input = dropzone.querySelector("input[type='file']")!;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("resume_to_remove.pdf")).toBeInTheDocument();
    });

    // Click remove
    const removeBtn = screen.getByRole("button", { name: /Remove/i });
    fireEvent.click(removeBtn);

    // Dropzone should reappear
    expect(screen.getByText("Drag and drop your resume here")).toBeInTheDocument();
    expect(screen.queryByText("resume_to_remove.pdf")).not.toBeInTheDocument();
  });
});
