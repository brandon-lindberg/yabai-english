"use client";
import { usePathname } from "@/i18n/navigation";
import { ChatPanel } from "@/components/chat-panel";
export function AppChatPanel() {
  const pathname = usePathname();
  return pathname === "/japanese-placement" ? null : <ChatPanel />;
}
