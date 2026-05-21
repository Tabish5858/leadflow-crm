import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/shared/status-badge";

describe("StatusBadge", () => {
  it("renders with New status", () => {
    render(<StatusBadge status="New" />);
    expect(screen.getByText(/new/i)).toBeInTheDocument();
  });

  it("renders with Won status", () => {
    render(<StatusBadge status="Won" />);
    expect(screen.getByText(/won/i)).toBeInTheDocument();
  });

  it("renders with Lost status", () => {
    render(<StatusBadge status="Lost" />);
    expect(screen.getByText(/lost/i)).toBeInTheDocument();
  });
});
