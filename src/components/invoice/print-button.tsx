"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-primary print:hidden">
      Download / Print Invoice
    </button>
  );
}
