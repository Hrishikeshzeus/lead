"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Send,
  X,
  Minimize2,
  Maximize2,
  RotateCcw,
  Bot,
  User,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  PhoneCall,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { sendChatMessageAction } from "@/app/actions/conversations";
import type {
  AssistantConfigRecord,
  ConversationMessageRecord,
  StudentChatTurnOutput,
} from "@/types/conversation";

interface AdmissionsChatWidgetProps {
  tenantId: string;
  config?: AssistantConfigRecord | null;
  initialSessionId?: string;
  embedded?: boolean;
  onTurnComplete?: (output: StudentChatTurnOutput) => void;
}

interface ChatMessageItem {
  id: string;
  sender: "assistant" | "student" | "system";
  content: string;
  citations?: Array<{
    title: string;
    sourceType: string;
    snippet: string;
  }>;
  needsHandoff?: boolean;
  handoffReason?: string | null;
  timestamp: string;
}

export function AdmissionsChatWidget({
  tenantId,
  config,
  initialSessionId,
  embedded = false,
  onTurnComplete,
}: AdmissionsChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(embedded);
  const [isMinimized, setIsMinimized] = useState(false);
  const [sessionId, setSessionId] = useState(initialSessionId || "");
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [handoffActive, setHandoffActive] = useState(false);
  const [activeCitation, setActiveCitation] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize session and greeting
  useEffect(() => {
    let sid = initialSessionId;
    if (!sid) {
      const stored = typeof window !== "undefined" ? window.sessionStorage.getItem(`admitflow_chat_${tenantId}`) : null;
      sid = stored || `sess-${crypto.randomUUID().slice(0, 8)}`;
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(`admitflow_chat_${tenantId}`, sid);
      }
    }
    setSessionId(sid);

    const greeting =
      config?.greetingMessage ||
      "Welcome to our admissions office! I am your AI Admissions Assistant. How can I help you with our courses, eligibility, or application process today?";

    setMessages([
      {
        id: "msg-greeting",
        sender: "assistant",
        content: greeting,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }, [tenantId, config, initialSessionId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    setErrorMessage(null);
    setInputMessage("");

    const studentMsgItem: ChatMessageItem = {
      id: `msg-student-${Date.now()}`,
      sender: "student",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, studentMsgItem]);
    setLoading(true);

    try {
      const res = await sendChatMessageAction({
        tenantId,
        sessionId,
        message: text,
      });

      if (!res.success || !res.data) {
        setErrorMessage(res.error || "Failed to receive response from assistant.");
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: "system",
            content: res.error || "A connection error occurred. Please try again in a moment.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        return;
      }

      const turn = res.data;
      if (turn.needsHumanHandoff) {
        setHandoffActive(true);
      }

      const assistantMsgItem: ChatMessageItem = {
        id: `msg-asst-${Date.now()}`,
        sender: "assistant",
        content: turn.reply,
        citations: turn.citations,
        needsHandoff: turn.needsHumanHandoff,
        handoffReason: turn.handoffReason,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsgItem]);

      if (onTurnComplete) {
        onTurnComplete(turn);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSession = () => {
    const newSid = `sess-${crypto.randomUUID().slice(0, 8)}`;
    setSessionId(newSid);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(`admitflow_chat_${tenantId}`, newSid);
    }
    setHandoffActive(false);
    setErrorMessage(null);
    const greeting =
      config?.greetingMessage ||
      "Welcome to our admissions office! I am your AI Admissions Assistant. How can I help you with our courses, eligibility, or application process today?";
    setMessages([
      {
        id: "msg-greeting-reset",
        sender: "assistant",
        content: greeting,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  const quickPrompts = [
    "What are the eligibility criteria for B.Tech?",
    "What is the annual course fee?",
    "Are weekend batches available?",
    "When does the Fall 2026 intake start?",
  ];

  if (!isOpen && !embedded) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-3 px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-blue-300"
          aria-label="Open Admissions Assistant Chat"
        >
          <div className="relative">
            <Bot className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
          </div>
          <span className="text-sm font-semibold tracking-wide">
            {config?.assistantName || "Ask Admissions AI"}
          </span>
        </button>
      </div>
    );
  }

  const containerClasses = embedded
    ? "w-full h-full flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
    : `fixed bottom-6 right-6 z-50 w-full sm:w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-200 ${
        isMinimized ? "h-16" : "h-[640px] max-h-[85vh]"
      }`;

  return (
    <div className={containerClasses}>
      {/* Widget Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white px-4 py-3.5 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-blue-600/80 border border-blue-400/30 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-100 truncate">
              {config?.assistantName || "Admissions Assistant"}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              <span className="truncate">{config?.personaTitle || "Online Admissions Advisor"}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-300">
          <button
            onClick={handleResetSession}
            title="Reset conversation"
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {!embedded && (
            <>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? "Expand" : "Minimize"}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close"
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Consent and Security Notice */}
          <div className="bg-blue-50/70 border-b border-blue-100/80 px-3.5 py-1.5 flex items-center gap-2 text-[11px] text-blue-900">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">
              Verified institutional responses. Never invents fees or guarantees.
            </span>
          </div>

          {/* Handoff Banner if triggered */}
          {handoffActive && (
            <div className="bg-amber-50 border-b border-amber-200 px-3.5 py-2 flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="font-medium">Human Counselor Escalation Recommended</span>
              </div>
              <span className="text-[10px] bg-amber-200/70 text-amber-900 px-1.5 py-0.5 rounded font-mono">
                Priority
              </span>
            </div>
          )}

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 max-w-[88%] ${
                  msg.sender === "student" ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
                    msg.sender === "student"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-blue-300"
                  }`}
                >
                  {msg.sender === "student" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                <div className="space-y-1">
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.sender === "student"
                        ? "bg-blue-600 text-white rounded-br-xs shadow-sm"
                        : "bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs shadow-xs"
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>

                    {/* Citations if available */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-500" /> Verified Sources
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {msg.citations.map((c, i) => (
                            <button
                              key={i}
                              onClick={() =>
                                setActiveCitation(activeCitation === c.title ? null : c.title)
                              }
                              className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors text-left"
                            >
                              <span className="font-medium truncate max-w-[150px]">{c.title}</span>
                              <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                            </button>
                          ))}
                        </div>

                        {activeCitation && (
                          <div className="p-2 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-200 mt-1.5 animate-fadeIn">
                            {msg.citations.find((c) => c.title === activeCitation)?.snippet}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div
                    className={`text-[10px] text-slate-400 px-1 ${
                      msg.sender === "student" ? "text-right" : "text-left"
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 max-w-[85%] mr-auto items-center">
                <div className="w-7 h-7 rounded-full bg-slate-800 text-blue-300 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-xs px-4 py-3 shadow-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips (show when few messages) */}
          {messages.length <= 2 && (
            <div className="px-3 py-2 bg-slate-50 border-t border-slate-200/80 flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider shrink-0 pl-1">
                Suggested:
              </span>
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  disabled={loading}
                  onClick={() => handleSendMessage(prompt)}
                  className="whitespace-nowrap px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-full text-xs font-medium transition-colors shadow-2xs shrink-0"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="px-4 py-2 bg-rose-50 border-t border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
              <span className="truncate">{errorMessage}</span>
            </div>
          )}

          {/* Chat Input Bar */}
          <div className="p-3 bg-white border-t border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask about admissions, courses, fees, or batches..."
                disabled={loading}
                maxLength={1500}
                className="flex-1 text-sm bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || loading}
                className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 px-1">
              <span>{config?.consentDisclaimer ? "Official Admissions Bot" : "AdmitFlow Assistant"}</span>
              <span>{inputMessage.length}/1500</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
