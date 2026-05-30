import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Home, Send, Mic, MicOff, Loader2, MessageSquare, Plus, Sparkles, Stethoscope, UserRound } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { useChatSessions, useSendMessage } from "@/hooks/use-chat";
import type { ChatMessage } from "@/lib/types";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "Health Chat — XRayVision AI" }] }),
  component: ChatPage,
});

function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState<"en" | "ur">("en");
  const bottomRef = useRef<HTMLDivElement>(null);
  const { data: sessions } = useChatSessions();
  const sendMutation = useSendMessage();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || sendMutation.isPending) return;

    const userMsg: ChatMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    const msg = input;
    setInput("");

    sendMutation.mutate(
      { message: msg, sessionId: sessionId || undefined, language },
      {
        onSuccess: (res) => {
          setSessionId(res.session_id);
          let reply = res.reply;
          if (res.doctor_type) {
            reply += `\n\nRecommended specialist: **${res.doctor_type}**`;
          }
          if (res.home_remedies.length > 0) {
            reply += `\n\nHome remedies:\n${res.home_remedies.map(r => `- ${r}`).join("\n")}`;
          }
          setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        },
        onError: (err) => {
          setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
        },
      },
    );
  };

  const handleVoice = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Voice input is not supported in this browser. Try Chrome.");
      return;
    }
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = language === "ur" ? "ur-PK" : "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev) => prev + transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.start();
  };

  const handleNewChat = () => {
    setSessionId(null);
    setMessages([]);
  };

  return (
    <AppShell title="Health Chat">
      <div className="mx-auto flex h-[calc(100vh-12rem)] max-w-4xl flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold">XRayVision Health Assistant</h2>
              <p className="text-xs text-muted-foreground">Ask about symptoms, diseases, remedies, or diet</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 rounded-md border border-border bg-background/60 p-1">
              <button onClick={() => setLanguage("en")} className={`rounded px-2.5 py-1 text-xs font-medium ${language === "en" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>EN</button>
              <button onClick={() => setLanguage("ur")} className={`rounded px-2.5 py-1 text-xs font-medium ${language === "ur" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>اردو</button>
            </div>
            <button onClick={handleNewChat} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/60 px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
              <Plus size={14} /> New Chat
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card/40 p-4 space-y-4" style={{ background: "var(--gradient-card)" }}>
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <MessageSquare size={40} className="text-primary/30" />
              <p className="mt-4 font-display text-lg font-bold text-muted-foreground">Start a health conversation</p>
              <p className="mt-1 text-sm text-muted-foreground">Ask about symptoms, get home remedies, or request a diet plan</p>
              <div className="mt-6 grid grid-cols-2 gap-2">
                {[
                  { icon: Stethoscope, text: "I have a headache and fever" },
                  { icon: Home, text: "Home remedies for sore throat" },
                  { icon: UserRound, text: "Which doctor for back pain?" },
                  { icon: Sparkles, text: "Diet plan for diabetes" },
                ].map(({ icon: Icon, text }) => (
                  <button
                    key={text}
                    onClick={() => { setInput(text); }}
                    className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2.5 text-left text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  >
                    <Icon size={14} className="shrink-0 text-primary" />
                    {text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-background/80 border border-border text-foreground rounded-bl-md"
              }`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {sendMutation.isPending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-background/80 border border-border px-4 py-3 text-sm">
                <Loader2 size={14} className="animate-spin text-primary" />
                <span className="text-muted-foreground">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-card/60 p-2">
          <button
            onClick={handleVoice}
            className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
              isListening ? "bg-destructive/15 text-destructive" : "bg-background/60 text-muted-foreground hover:text-foreground"
            }`}
            aria-label={isListening ? "Stop listening" : "Start voice input"}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={language === "ur" ? "اپنی علامات بتائیں..." : "Describe your symptoms or ask a health question..."}
            className="flex-1 bg-transparent px-2 text-sm placeholder:text-muted-foreground focus:outline-none"
            dir={language === "ur" ? "rtl" : "ltr"}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sendMutation.isPending}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:shadow-[var(--glow-cyan)] disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </AppShell>
  );
}
