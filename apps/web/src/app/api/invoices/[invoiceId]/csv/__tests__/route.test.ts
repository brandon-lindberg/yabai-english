import { beforeEach, expect, test, vi } from "vitest";
import { conversationProduct, lessonSubjectCases } from "../../../../../../../test/lesson-subject-fixture";
const { authMock, invoice, payment, refund } = vi.hoisted(() => ({ authMock: vi.fn(), invoice: vi.fn(), payment: vi.fn(), refund: vi.fn() }));
vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: { invoice: { findUnique: invoice }, payment: { findUnique: payment }, refund: { findFirst: refund } } }));
import { GET } from "../route";
beforeEach(() => { vi.clearAllMocks(); authMock.mockResolvedValue({ user: { id: "student" } }); payment.mockResolvedValue({ method: "CARD" }); refund.mockResolvedValue(null); });
test.each(lessonSubjectCases)("a $learningLanguage receipt retains the original booking label after a subject switch", async ({ learningLanguage, nameEn }) => {
  invoice.mockResolvedValue({ studentId: "student", bookingId: "booking", invoiceNo: "INV-1", amountYen: 5000, paidAt: new Date(), student: { name: "Student" }, booking: { learningLanguage, lessonProduct: conversationProduct, teacher: { user: { name: "Teacher" } } } });
  const res = await GET(new Request("http://localhost/api/invoices/invoice/csv"), { params: Promise.resolve({ invoiceId: "invoice" }) });
  expect(res.status).toBe(200); expect(await res.text()).toContain(nameEn);
});
