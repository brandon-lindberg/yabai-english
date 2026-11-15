"use client";
import dynamic from "next/dynamic";
import { usePathname } from "@/i18n/navigation";
import { useVerifiedSession } from "@/hooks/use-verified-session";

const ChatPanel = dynamic(() => import("@/components/chat-panel").then(module => module.ChatPanel), { ssr: false });

export function AppChatPanel() {
  const pathname = usePathname();
  const { data: session, status } = useVerifiedSession();
  const assessment = pathname === "/japanese-placement" || pathname === "/placement"
    || /^\/learn\/study\/[^/]+\/assessment\/?$/.test(pathname);
  // Keep the existing unread/realtime behavior once chat is available, without
  // downloading or mounting the panel for guests or during an assessment.
  return assessment || status !== "authenticated" || !session?.user ? null : <ChatPanel />;
}
