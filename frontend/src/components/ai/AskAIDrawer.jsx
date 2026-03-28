import {
  Bot,
  GripVertical,
  LoaderCircle,
  MessageCircle,
  Pin,
  PinOff,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";

import { useAskAgent } from "../../hooks/useAskAgent";
import CopilotResponseBlocks from "./CopilotResponseBlocks";
import { EmptyState, ContextStrip, TypingIndicator } from "./CopilotDrawerPanels";
import { getContextHealth, getContextMeta } from "./copilotDrawerMeta";
import {
  buildConversationMemory,
  buildRequestPayload,
  normalizeDrawerContext,
} from "./copilotUi";

const DRAWER_MIN_WIDTH = 460;
const DRAWER_MAX_WIDTH = 760;
const RESIZE_BREAKPOINT = 1280;
const MIN_THINKING_MS = 1800;

const THINKING_STEPS = [
  "Analyzing your question...",
  "Understanding trends...",
  "Generating insights...",
];

const createMessageId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createRequestId = () =>
  `copilot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const trimQuestion = (question) => {
  if (!question) return "Pinned AI insight";
  return question.length > 64 ? `${question.slice(0, 61)}...` : question;
};

const getFocusableElements = (container) => {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll(
      'button:not([disabled]), textarea:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute("aria-hidden"));
};

const AskAIDrawer = memo(function AskAIDrawer({
  isOpen = false,
  onClose,
  context = {},
  onPinInsight,
  pinnedInsightIds = new Set(),
}) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([]);
  const [submittedRequest, setSubmittedRequest] = useState(null);
  const [resolvedRequestId, setResolvedRequestId] = useState("");
  const [thinkingStepIndex, setThinkingStepIndex] = useState(0);
  const [hasPendingRender, setHasPendingRender] = useState(false);
  const [isContextExpanded, setIsContextExpanded] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState(null);
  const [canResize, setCanResize] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [scrollState, setScrollState] = useState({
    canScrollUp: false,
    canScrollDown: false,
  });

  const textareaRef = useRef(null);
  const responseTimerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const drawerRef = useRef(null);
  const scrollRef = useRef(null);
  const resizeStateRef = useRef(null);
  const previousFocusRef = useRef(null);

  const normalizedContext = useMemo(
    () => normalizeDrawerContext(context),
    [context],
  );
  const contextMeta = getContextMeta(normalizedContext.activeContext);
  const requestPayload = submittedRequest?.payload || null;
  const { data, isLoading, error } = useAskAgent(requestPayload);

  const nextSuggestion =
    contextMeta.suggestions[messages.length % contextMeta.suggestions.length] ||
    contextMeta.suggestions[0];

  const showTypingState =
    Boolean(submittedRequest) &&
    (isLoading || hasPendingRender) &&
    !messages.some(
      (message) =>
        message.requestId === submittedRequest.id &&
        message.role === "assistant",
    );

  useEffect(() => {
    const syncResizeAvailability = () => {
      const viewportWidth = window.innerWidth;
      const allowResize = viewportWidth >= RESIZE_BREAKPOINT;
      setCanResize(allowResize);

      if (allowResize) {
        setDrawerWidth((previous) => {
          const fallback = clamp(
            Math.round(viewportWidth * 0.36),
            DRAWER_MIN_WIDTH,
            DRAWER_MAX_WIDTH,
          );
          return clamp(previous || fallback, DRAWER_MIN_WIDTH, DRAWER_MAX_WIDTH);
        });
      } else {
        setDrawerWidth(null);
        setIsResizing(false);
        resizeStateRef.current = null;
      }
    };

    syncResizeAvailability();
    window.addEventListener("resize", syncResizeAvailability);

    return () => {
      window.removeEventListener("resize", syncResizeAvailability);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const timeoutId = window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 180);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timeoutId);
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) return;
    setHasPendingRender(false);
    setIsContextExpanded(false);
    setScrollState({
      canScrollUp: false,
      canScrollDown: false,
    });
  }, [isOpen]);

  useEffect(() => {
    if (!submittedRequest || isLoading || !data) return;
    if (resolvedRequestId === submittedRequest.id) return;

    if (responseTimerRef.current) {
      window.clearTimeout(responseTimerRef.current);
    }

    const elapsed = Date.now() - (submittedRequest.startedAt || Date.now());
    const delayMs = Math.max(0, MIN_THINKING_MS - elapsed);

    responseTimerRef.current = window.setTimeout(() => {
      setMessages((previous) => [
        ...previous,
        {
          id: createMessageId("assistant"),
          role: "assistant",
          question: submittedRequest.question,
          response: data,
          requestPayload: submittedRequest.payload,
          requestId: submittedRequest.id,
        },
      ]);
      setResolvedRequestId(submittedRequest.id);
      setHasPendingRender(false);
      responseTimerRef.current = null;
    }, delayMs);

    return () => {
      if (responseTimerRef.current) {
        window.clearTimeout(responseTimerRef.current);
        responseTimerRef.current = null;
      }
    };
  }, [data, isLoading, resolvedRequestId, submittedRequest]);

  useEffect(() => {
    if (!submittedRequest || isLoading || !error) return;

    const errorId = `${submittedRequest.id}-error`;
    if (resolvedRequestId === errorId) return;

    if (responseTimerRef.current) {
      window.clearTimeout(responseTimerRef.current);
    }

    const elapsed = Date.now() - (submittedRequest.startedAt || Date.now());
    const delayMs = Math.max(0, MIN_THINKING_MS - elapsed);

    responseTimerRef.current = window.setTimeout(() => {
      setMessages((previous) => [
        ...previous,
        {
          id: createMessageId("assistant-error"),
          role: "assistant",
          question: submittedRequest.question,
          response: {
            payload: {
              text: error,
              answerType: "text",
            },
          },
          requestPayload: submittedRequest.payload,
          requestId: errorId,
          isError: true,
        },
      ]);
      setResolvedRequestId(errorId);
      setHasPendingRender(false);
      responseTimerRef.current = null;
    }, delayMs);

    return () => {
      if (responseTimerRef.current) {
        window.clearTimeout(responseTimerRef.current);
        responseTimerRef.current = null;
      }
    };
  }, [error, isLoading, resolvedRequestId, submittedRequest]);

  useEffect(() => {
    if (!showTypingState) {
      setThinkingStepIndex(0);
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setThinkingStepIndex(
        (previous) => (previous + 1) % THINKING_STEPS.length,
      );
    }, 900);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [showTypingState]);

  useEffect(() => {
    return () => {
      if (responseTimerRef.current) {
        window.clearTimeout(responseTimerRef.current);
        responseTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const timeoutId = window.setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }, 40);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, messages, showTypingState]);

  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;

    node.style.height = "0px";
    node.style.height = `${Math.min(node.scrollHeight, 180)}px`;
  }, [draft, isOpen]);

  useEffect(() => {
    if (!isResizing || !canResize) return undefined;

    const handlePointerMove = (event) => {
      const state = resizeStateRef.current;
      if (!state) return;

      const nextWidth = clamp(
        state.startWidth + (state.startX - event.clientX),
        DRAWER_MIN_WIDTH,
        Math.min(DRAWER_MAX_WIDTH, window.innerWidth - 36),
      );

      setDrawerWidth(nextWidth);
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      resizeStateRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [canResize, isResizing]);

  const syncScrollState = () => {
    const node = scrollRef.current;
    if (!node) return;

    const canScrollUp = node.scrollTop > 8;
    const canScrollDown = node.scrollTop + node.clientHeight < node.scrollHeight - 8;

    setScrollState((previous) =>
      previous.canScrollUp === canScrollUp &&
      previous.canScrollDown === canScrollDown
        ? previous
        : { canScrollUp, canScrollDown },
    );
  };

  useEffect(() => {
    if (!isOpen) return;
    const timeoutId = window.setTimeout(syncScrollState, 60);
    return () => window.clearTimeout(timeoutId);
  }, [isOpen, messages, showTypingState]);

  const clearPendingResponse = () => {
    if (responseTimerRef.current) {
      window.clearTimeout(responseTimerRef.current);
      responseTimerRef.current = null;
    }
  };

  const resetConversation = () => {
    clearPendingResponse();
    setMessages([]);
    setDraft("");
    setSubmittedRequest(null);
    setResolvedRequestId("");
    setHasPendingRender(false);
    textareaRef.current?.focus();
  };

  const submitQuestion = (questionText) => {
    if (isLoading || hasPendingRender) return;

    const trimmed = questionText.trim();
    if (!trimmed) return;

    const requestId = createRequestId();
    const payload = buildRequestPayload(
      trimmed,
      normalizedContext,
      buildConversationMemory(messages),
    );

    setMessages((previous) => [
      ...previous,
      {
        id: createMessageId("user"),
        role: "user",
        text: trimmed,
        requestId,
      },
    ]);
    setSubmittedRequest({
      id: requestId,
      question: trimmed,
      payload,
      startedAt: Date.now(),
    });
    setHasPendingRender(true);
    setResolvedRequestId("");
    setDraft("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    submitQuestion(draft);
  };

  const handleSuggestionPick = (suggestion) => {
    setDraft(suggestion);
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(
        suggestion.length,
        suggestion.length,
      );
    });
  };

  const handleInputKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitQuestion(draft);
    }
  };

  const handleFollowUp = (suggestion) => {
    submitQuestion(suggestion);
  };

  const handleDrawerKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose?.();
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = getFocusableElements(drawerRef.current);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleResizeStart = (event) => {
    if (!canResize) return;

    const currentWidth = drawerRef.current?.offsetWidth || drawerWidth || DRAWER_MIN_WIDTH;
    resizeStateRef.current = {
      startX: event.clientX,
      startWidth: currentWidth,
    };
    setIsResizing(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const isComposerDisabled = isLoading || hasPendingRender;

  return (
    <div className="ai-copilot-shell" data-open={isOpen} data-resizing={isResizing}>
      <button
        type="button"
        aria-label="Close AI drawer backdrop"
        className="ai-copilot-backdrop"
        onClick={onClose}
      />

      <aside
        ref={drawerRef}
        className="ai-copilot-drawer"
        aria-hidden={!isOpen}
        aria-modal="true"
        aria-labelledby="ai-copilot-title"
        role="dialog"
        onKeyDown={handleDrawerKeyDown}
        style={
          canResize && drawerWidth
            ? { "--ai-copilot-width": `${drawerWidth}px` }
            : undefined
        }
      >
        {canResize && (
          <button
            type="button"
            className="ai-copilot-resize-handle"
            onPointerDown={handleResizeStart}
            aria-label="Resize Ask AI drawer"
          >
            <GripVertical size={14} />
          </button>
        )}

        <header className="ai-copilot-header">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[22px] border border-cyan-300/20 bg-cyan-400/10 text-cyan-100 shadow-[0_14px_30px_rgba(34,211,238,0.15)]">
                <Bot size={20} />
              </span>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="ai-copilot-chip ai-copilot-chip-primary">
                    <Sparkles size={13} />
                    Analytics Copilot
                  </span>
                  <span className="ai-copilot-chip">
                    {getContextHealth(normalizedContext) ? "Context ready" : "Awaiting data"}
                  </span>
                </div>

                <h2
                  id="ai-copilot-title"
                  className="mt-3 text-[1.35rem] font-semibold tracking-tight text-white"
                >
                  Ask AI
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetConversation}
                className="ai-copilot-icon-button"
              >
                <RefreshCw size={15} />
                <span className="hidden sm:inline">New chat</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="ai-copilot-icon-button"
                aria-label="Close Ask AI"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <ContextStrip
            context={normalizedContext}
            expanded={isContextExpanded}
            onToggle={() => setIsContextExpanded((previous) => !previous)}
          />
        </header>

        <div className="relative flex-1 overflow-hidden">
          <div
            className={`ai-copilot-scroll-shadow ai-copilot-scroll-shadow-top ${scrollState.canScrollUp ? "is-visible" : ""}`}
          />
          <div
            className={`ai-copilot-scroll-shadow ai-copilot-scroll-shadow-bottom ${scrollState.canScrollDown ? "is-visible" : ""}`}
          />

          <div
            ref={scrollRef}
            onScroll={syncScrollState}
            className="ai-copilot-scroll-area"
          >
            <div className="space-y-5 px-4 py-5 sm:px-5 lg:px-6">
              {messages.length === 0 && (
                <EmptyState
                  context={normalizedContext}
                  onPickSuggestion={handleSuggestionPick}
                />
              )}

              {messages.map((message) => {
                const isPinned = pinnedInsightIds?.has(message.requestId);

                return (
                  <article
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.role === "user" ? (
                      <div className="max-w-[88%] rounded-[28px] rounded-br-lg border border-cyan-300/18 bg-gradient-to-br from-cyan-400/[0.16] via-sky-500/[0.08] to-indigo-500/[0.14] px-4 py-3.5 text-sm leading-6 text-cyan-50 shadow-[0_18px_32px_rgba(14,165,233,0.16)]">
                        <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-cyan-100/70">
                          <MessageCircle size={12} />
                          You
                        </div>
                        <p>{message.text}</p>
                      </div>
                    ) : (
                      <div className="max-w-[96%] space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-cyan-300/18 bg-cyan-400/[0.10] text-cyan-100">
                              <Bot size={15} />
                            </span>
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                                AI response
                              </p>
                            </div>
                          </div>

                          {!message.isError && (
                            <button
                              type="button"
                              onClick={() =>
                                onPinInsight?.({
                                  id: message.requestId,
                                  intent: "analytics_copilot",
                                  title: trimQuestion(message.question),
                                  payload: message.requestPayload,
                                })
                              }
                              className={`ai-copilot-pin-button ${isPinned ? "ai-copilot-pin-button-active" : ""}`}
                            >
                              {isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                              {isPinned ? "Unpin" : "Pin"}
                            </button>
                          )}
                        </div>

                        {message.isError ? (
                          <section className="ai-copilot-card ai-copilot-error-card">
                            <p className="text-sm font-semibold text-rose-100">
                              Ask AI could not finish that request
                            </p>
                            <p className="mt-2 text-sm leading-6 text-rose-100/85">
                              {message.response?.payload?.text ||
                                "Something went wrong while generating the answer."}
                            </p>
                          </section>
                        ) : (
                          <CopilotResponseBlocks
                            payload={message.response?.payload}
                            followUpOptions={contextMeta.suggestions}
                            currentQuestion={message.question}
                            onFollowUp={handleFollowUp}
                            isBusy={isComposerDisabled}
                          />
                        )}
                      </div>
                    )}
                  </article>
                );
              })}

              {showTypingState && (
                <TypingIndicator stepText={THINKING_STEPS[thinkingStepIndex]} />
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="ai-copilot-composer">
          <div className="ai-copilot-composer-card">
            <div className="flex items-end gap-3">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleInputKeyDown}
                rows={1}
                placeholder={`Ask about ${normalizedContext.label.toLowerCase()}...`}
                className="ai-copilot-textarea"
              />

              <button
                type="submit"
                disabled={isComposerDisabled || !draft.trim()}
                className="ai-copilot-send-button"
              >
                {isComposerDisabled ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <Send size={17} />
                )}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={resetConversation}
                  className="ai-copilot-secondary-button"
                  disabled={messages.length === 0 && !draft}
                >
                  Clear chat
                </button>
                <button
                  type="button"
                  onClick={() => handleSuggestionPick(nextSuggestion)}
                  className="ai-copilot-secondary-button"
                >
                  Use suggestion
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-slate-300">
                  {nextSuggestion}
                </span>
              </div>
            </div>
          </div>
        </form>
      </aside>
    </div>
  );
});

export default AskAIDrawer;
