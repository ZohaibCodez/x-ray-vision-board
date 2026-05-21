/**
 * React Query hooks for chat operations.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatApi } from "@/lib/api";

export function useChatSessions() {
  return useQuery({
    queryKey: ["chat-sessions"],
    queryFn: () => chatApi.sessions(),
    staleTime: 30_000,
  });
}

export function useChatMessages(sessionId: string | null) {
  return useQuery({
    queryKey: ["chat-messages", sessionId],
    queryFn: () => chatApi.messages(sessionId!),
    enabled: !!sessionId,
    refetchInterval: false,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: { message: string; sessionId?: string; language?: string }) =>
      chatApi.send(params.message, params.sessionId, params.language),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["chat-messages", data.session_id] });
      qc.invalidateQueries({ queryKey: ["chat-sessions"] });
    },
  });
}
