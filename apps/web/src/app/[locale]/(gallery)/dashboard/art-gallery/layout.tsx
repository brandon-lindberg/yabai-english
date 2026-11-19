import type { ReactNode } from "react";
import { renderDashboardFrame } from "@/components/dashboard/dashboard-frame";

export default function Layout({ children }: { children: ReactNode }) {
  return renderDashboardFrame(children, "gallery");
}
