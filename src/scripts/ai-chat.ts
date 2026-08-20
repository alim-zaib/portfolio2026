type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function getElement<T extends Element>(selector: string) {
  const element = document.querySelector<T>(selector);
  if (!element)
    throw new Error("The AI chat interface could not be initialized.");
  return element;
}

const chat = getElement<HTMLElement>(".chat");
const chatForm = getElement<HTMLFormElement>("#chat-form");
const chatInput = getElement<HTMLTextAreaElement>("#chat-input");
const chatLog = getElement<HTMLElement>("#chat-log");
const sendButton = getElement<HTMLButtonElement>("#send-button");
const clearButton = getElement<HTMLButtonElement>("#clear-button");
const suggestions = getElement<HTMLElement>("#suggestions");
const aiStatus = getElement<HTMLElement>("#ai-status");
const statusText = getElement<HTMLElement>("#ai-status-text");

const maxMessages = Number(chat.dataset.maxMessages) || 11;
const genericError =
  "I couldn't answer that right now. Please try again shortly.";
const messages: ChatMessage[] = [];
let isGenerating = false;

function setStatus(
  label: string,
  state: "ready" | "generating" | "error" = "ready",
) {
  statusText.textContent = label;
  aiStatus.dataset.state = state;
}

function resizeInput() {
  chatInput.style.height = "auto";
  chatInput.style.height = `${Math.min(chatInput.scrollHeight, 144)}px`;
}

function updateControls() {
  sendButton.disabled = isGenerating || chatInput.value.trim().length === 0;
  clearButton.disabled = isGenerating || chatLog.childElementCount === 0;
}

function scrollConversation() {
  chatLog.scrollTo({ top: chatLog.scrollHeight, behavior: "smooth" });
}

function appendInlineMarkdown(parent: Node, markdown: string) {
  let plainText = "";

  const flushText = () => {
    if (!plainText) return;
    parent.appendChild(document.createTextNode(plainText));
    plainText = "";
  };

  for (let index = 0; index < markdown.length;) {
    const character = markdown[index];

    if (character === "\\" && index + 1 < markdown.length) {
      plainText += markdown[index + 1];
      index += 2;
      continue;
    }

    const strongMarker = markdown.slice(index, index + 2);
    if (strongMarker === "**" || strongMarker === "__") {
      const closingIndex = markdown.indexOf(strongMarker, index + 2);
      if (closingIndex > index + 2) {
        flushText();
        const strong = document.createElement("strong");
        appendInlineMarkdown(strong, markdown.slice(index + 2, closingIndex));
        parent.appendChild(strong);
        index = closingIndex + 2;
        continue;
      }
    }

    if (character === "*" || character === "_") {
      const closingIndex = markdown.indexOf(character, index + 1);
      if (closingIndex > index + 1 && !/\s/.test(markdown[index + 1] ?? "")) {
        flushText();
        const emphasis = document.createElement("em");
        appendInlineMarkdown(emphasis, markdown.slice(index + 1, closingIndex));
        parent.appendChild(emphasis);
        index = closingIndex + 1;
        continue;
      }
    }

    if (character === "`") {
      const closingIndex = markdown.indexOf("`", index + 1);
      if (closingIndex > index + 1) {
        flushText();
        const code = document.createElement("code");
        code.textContent = markdown.slice(index + 1, closingIndex);
        parent.appendChild(code);
        index = closingIndex + 1;
        continue;
      }
    }

    if (character === "[") {
      const labelEnd = markdown.indexOf("](", index + 1);
      const urlEnd = labelEnd === -1 ? -1 : markdown.indexOf(")", labelEnd + 2);

      if (labelEnd > index + 1 && urlEnd > labelEnd + 2) {
        const href = markdown.slice(labelEnd + 2, urlEnd).trim();
        let url: URL | null = null;

        try {
          url = new URL(href, window.location.origin);
        } catch {
          // Invalid links remain visible as plain text.
        }

        if (url && ["http:", "https:", "mailto:"].includes(url.protocol)) {
          flushText();
          const link = document.createElement("a");
          link.href = url.href;
          appendInlineMarkdown(link, markdown.slice(index + 1, labelEnd));

          if (url.origin !== window.location.origin) {
            link.target = "_blank";
            link.rel = "noreferrer noopener";
          }

          parent.appendChild(link);
          index = urlEnd + 1;
          continue;
        }
      }
    }

    if (character === "\n") {
      flushText();
      parent.appendChild(document.createElement("br"));
      index += 1;
      continue;
    }

    plainText += character;
    index += 1;
  }

  flushText();
}

function isBlockStart(line: string) {
  return (
    /^\s*$/.test(line) ||
    /^\s*```/.test(line) ||
    /^\s{0,3}#{1,3}\s+/.test(line) ||
    /^\s{0,3}>\s?/.test(line) ||
    /^\s{0,3}[-*+]\s+/.test(line) ||
    /^\s{0,3}\d+[.)]\s+/.test(line) ||
    /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)
  );
}

function renderMarkdown(container: HTMLElement, markdown: string) {
  const fragment = document.createDocumentFragment();
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");

  for (let index = 0; index < lines.length;) {
    const line = lines[index] ?? "";

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^\s*```([\w-]*)\s*$/);
    if (fence) {
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !/^\s*```\s*$/.test(lines[index] ?? "")) {
        codeLines.push(lines[index] ?? "");
        index += 1;
      }

      if (index < lines.length) index += 1;
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      code.textContent = codeLines.join("\n");
      if (fence[1]) code.className = `language-${fence[1]}`;
      pre.append(code);
      fragment.append(pre);
      continue;
    }

    const heading = line.match(/^\s{0,3}(#{1,3})\s+(.+)$/);
    if (heading) {
      const element = document.createElement(
        `h${heading[1]?.length ?? 3}` as "h1" | "h2" | "h3",
      );
      appendInlineMarkdown(element, heading[2] ?? "");
      fragment.append(element);
      index += 1;
      continue;
    }

    if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      fragment.append(document.createElement("hr"));
      index += 1;
      continue;
    }

    if (/^\s{0,3}>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length) {
        const quote = (lines[index] ?? "").match(/^\s{0,3}>\s?(.*)$/);
        if (!quote) break;
        quoteLines.push(quote[1] ?? "");
        index += 1;
      }

      const blockquote = document.createElement("blockquote");
      appendInlineMarkdown(blockquote, quoteLines.join("\n"));
      fragment.append(blockquote);
      continue;
    }

    const unorderedItem = line.match(/^\s{0,3}[-*+]\s+(.+)$/);
    const orderedItem = line.match(/^\s{0,3}\d+[.)]\s+(.+)$/);
    if (unorderedItem || orderedItem) {
      const ordered = Boolean(orderedItem);
      const list = document.createElement(ordered ? "ol" : "ul");
      const itemPattern = ordered
        ? /^\s{0,3}\d+[.)]\s+(.+)$/
        : /^\s{0,3}[-*+]\s+(.+)$/;

      while (index < lines.length) {
        const item = (lines[index] ?? "").match(itemPattern);
        if (!item) break;
        const listItem = document.createElement("li");
        appendInlineMarkdown(listItem, item[1] ?? "");
        list.append(listItem);
        index += 1;
      }

      fragment.append(list);
      continue;
    }

    const paragraphLines = [line.trim()];
    index += 1;
    while (index < lines.length && !isBlockStart(lines[index] ?? "")) {
      paragraphLines.push((lines[index] ?? "").trim());
      index += 1;
    }

    const paragraph = document.createElement("p");
    appendInlineMarkdown(paragraph, paragraphLines.join(" "));
    fragment.append(paragraph);
  }

  container.replaceChildren(fragment);
}

function appendMessage(message: ChatMessage, generating = false) {
  const article = document.createElement("article");
  article.className = `chat-message chat-message-${message.role}`;

  const role = document.createElement("p");
  role.className = "chat-message-role";
  role.textContent = message.role === "user" ? "You" : "AI";

  const content = document.createElement("div");
  content.className = "chat-message-content";
  if (message.role === "assistant" && message.content) {
    renderMarkdown(content, message.content);
  } else {
    content.textContent = message.content || "Thinking";
  }

  if (generating) article.classList.add("is-generating");

  article.append(role, content);
  chatLog.append(article);
  scrollConversation();

  return { article, content };
}

function setConversationStarted() {
  suggestions.hidden = true;
  chatLog.classList.add("has-messages");
}

function resetConversation() {
  messages.length = 0;
  chatLog.replaceChildren();
  chatLog.classList.remove("has-messages");
  chatLog.setAttribute("aria-busy", "false");
  suggestions.hidden = false;
  chatInput.value = "";
  resizeInput();
  setStatus("AI · ready");
  updateControls();
  chatInput.focus();
}

async function getErrorMessage(response: Response) {
  if (response.status === 429) {
    try {
      const payload = (await response.json()) as { error?: unknown };
      if (typeof payload.error === "string") return payload.error;
    } catch {
      return "Too many questions. Please wait a moment and try again.";
    }
  }

  return genericError;
}

async function sendQuestion(question: string) {
  if (isGenerating) return;

  const userMessage: ChatMessage = { role: "user", content: question };
  messages.push(userMessage);
  appendMessage(userMessage);
  setConversationStarted();

  const assistantMessage: ChatMessage = { role: "assistant", content: "" };
  const renderedAssistant = appendMessage(assistantMessage, true);

  isGenerating = true;
  chatLog.setAttribute("aria-busy", "true");
  setStatus("AI · generating", "generating");
  updateControls();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messages.slice(-maxMessages) }),
    });

    if (!response.ok) throw new Error(await getErrorMessage(response));
    if (!response.body) throw new Error(genericError);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      assistantMessage.content += decoder.decode(value, { stream: true });
      renderMarkdown(renderedAssistant.content, assistantMessage.content);
      renderedAssistant.article.classList.remove("is-generating");
      scrollConversation();
    }

    assistantMessage.content += decoder.decode();

    if (!assistantMessage.content.trim()) throw new Error(genericError);

    renderMarkdown(renderedAssistant.content, assistantMessage.content.trim());
    renderedAssistant.article.classList.remove("is-generating");
    messages.push({
      ...assistantMessage,
      content: assistantMessage.content.trim(),
    });
    setStatus("AI · ready");
  } catch (error) {
    messages.pop();
    renderedAssistant.article.classList.remove("is-generating");
    renderedAssistant.article.classList.add("is-error");
    renderedAssistant.content.textContent =
      error instanceof Error && error.message ? error.message : genericError;
    setStatus("AI · unavailable", "error");
  } finally {
    isGenerating = false;
    chatLog.setAttribute("aria-busy", "false");
    updateControls();
    scrollConversation();
    chatInput.focus();
  }
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const question = chatInput.value.trim();
  if (!question || isGenerating) return;

  chatInput.value = "";
  resizeInput();
  void sendQuestion(question);
});

chatInput.addEventListener("input", () => {
  resizeInput();
  updateControls();
});

chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

for (const button of document.querySelectorAll<HTMLButtonElement>(
  "[data-question]",
)) {
  button.addEventListener("click", () => {
    if (isGenerating) return;
    chatInput.value = button.dataset.question || "";
    resizeInput();
    updateControls();
    chatForm.requestSubmit();
  });
}

clearButton.addEventListener("click", resetConversation);
resizeInput();
updateControls();
