import { buildInvoiceSnapshot, percentChange, sharePercent, splitIssuedByDue } from "@/lib/reports/invoice-snapshot";

const today = { year: 2026, month: 9, day: 27 };

describe("invoice snapshot", () => {
  it("does not invent a percent when the previous month is zero", () => {
    expect(percentChange(120, 0)).toBeNull();
    expect(sharePercent(0, 0)).toBeNull();
    expect(percentChange(150, 100)).toBe(50);
  });

  it("counts issued and paid sales, and skips drafts", () => {
    const snapshot = buildInvoiceSnapshot({
      today,
      sales: [
        { amount: 100, issueDate: "2026-09-01", dueDate: "2026-09-20", status: "draft" },
        { amount: 200, issueDate: "2026-09-10", dueDate: "2026-09-01", status: "issued" },
        { amount: 50, issueDate: "2026-08-01", dueDate: "2026-08-15", status: "paid" },
      ],
      purchases: [
        { amount: 80, issueDate: "2026-09-05", dueDate: "2026-09-30", status: "approved" },
        { amount: 40, issueDate: "2026-08-02", dueDate: "2026-08-20", status: "paid" },
      ],
    });

    expect(snapshot.revenue).toBe(250);
    expect(snapshot.expenses).toBe(120);
    expect(snapshot.salesThisMonth).toBe(200);
    expect(snapshot.salesLastMonth).toBe(50);
    expect(snapshot.salesChangePercent).toBe(300);
    expect(snapshot.overdueCount).toBe(1);
    expect(snapshot.overdueAmount).toBe(200);
    expect(snapshot.dueThisWeekCount).toBe(1);
    expect(snapshot.dueThisWeekAmount).toBe(80);
    expect(snapshot.lines.join(" ")).toContain("не от счетоводен баланс");
    expect(snapshot.lines.join(" ")).not.toContain("стабил");
  });

  it("splits overdue invoices from those due within seven days", () => {
    const split = splitIssuedByDue([
      { status: "issued", dueDate: "2026-09-01", amount: 10 },
      { status: "issued", dueDate: "2026-09-30", amount: 20 },
      { status: "issued", dueDate: "2026-10-20", amount: 30 },
      { status: "draft", dueDate: "2026-09-01", amount: 99 },
      { status: "paid", dueDate: "2026-09-01", amount: 40 },
    ], today);
    expect(split.overdueCount).toBe(1);
    expect(split.overdueAmount).toBe(10);
    expect(split.dueSoonCount).toBe(1);
    expect(split.dueSoonAmount).toBe(20);
  });

  it("says when there is nothing to total", () => {
    const snapshot = buildInvoiceSnapshot({ today, sales: [], purchases: [] });
    expect(snapshot.revenue).toBe(0);
    expect(snapshot.lines[0]).toContain("Черновите не влизат");
  });
});
