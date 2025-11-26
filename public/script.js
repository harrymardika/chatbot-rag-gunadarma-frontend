/**
 * Chainlit Chat History & UI Enhancements
 * - Chat history with localStorage
 * - Sidebar with Qwen-style UI
 * - Top-left controls (Sidebar + New Chat buttons)
 * - Watermark customization
 * Author: Harry Mardika
 * Year: 2025
 */

(function () {
  "use strict";

  // ==========================================
  // CHAT HISTORY & SESSION MANAGEMENT
  // ==========================================

  const STORAGE_KEY = "chat_sessions";
  let currentSessionId = null;
  let currentMessages = [];
  let isSidebarOpen = false;

  // Generate UUID v4
  function generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  // Get all sessions from localStorage
  function getAllSessions() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error("Error loading sessions:", e);
      return {};
    }
  }

  // Save all sessions to localStorage
  function saveAllSessions(sessions) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error("Error saving sessions:", e);
    }
  }

  // Create new session
  function createNewSession() {
    const sessionId = generateUUID();
    const now = new Date().toISOString();
    const sessions = getAllSessions();

    sessions[sessionId] = {
      id: sessionId,
      title: "New Chat",
      created_at: now,
      updated_at: now,
      messages: [],
    };

    saveAllSessions(sessions);
    currentSessionId = sessionId;
    currentMessages = [];

    console.log("✅ New session created:", sessionId);
    return sessionId;
  }

  // Save message to current session
  function saveMessageToSession(role, content, sources = null) {
    if (!currentSessionId) {
      console.log("⚠️ No current session, creating new one...");
      createNewSession();
    }

    const sessions = getAllSessions();
    const session = sessions[currentSessionId];

    if (!session) {
      console.error("❌ Session not found:", currentSessionId);
      return;
    }

    const message = { role, content, timestamp: new Date().toISOString() };
    if (sources) {
      message.sources = sources;
    }

    session.messages.push(message);
    session.updated_at = new Date().toISOString();

    // Auto-title from first user message
    if (role === "user" && session.title === "New Chat" && content) {
      const newTitle =
        content.substring(0, 50) + (content.length > 50 ? "..." : "");
      session.title = newTitle;
      console.log("📝 Session title updated:", newTitle);
    }

    saveAllSessions(sessions);
    currentMessages = session.messages;

    console.log(
      `✅ Message saved! Session: ${currentSessionId}, Total messages: ${session.messages.length}`
    );
    console.log(`   Role: ${role}, Content length: ${content.length}`);

    // Update sidebar to show latest
    renderSidebar();
  }

  // Load session - Direct navigation to chat view (NO MODAL, NO BANNER)
  function loadSession(sessionId) {
    const sessions = getAllSessions();
    const session = sessions[sessionId];

    if (!session) {
      console.error("Session not found:", sessionId);
      return;
    }

    if (session.messages.length === 0) {
      alert("This session has no messages yet.");
      return;
    }

    console.log("📂 Loading session directly to chat:", sessionId);
    console.log("📝 Messages to restore:", session.messages.length);

    // Switch to this session as active
    currentSessionId = sessionId;
    currentMessages = session.messages;

    // Close sidebar immediately
    closeSidebar();

    // Hide welcome screen and render chat directly
    hideWelcomeScreen();
    renderHistoryIntoChat(session);

    console.log("✅ Session loaded successfully - chat view active");

    return session;
  }

  // Hide welcome screen to show chat interface
  function hideWelcomeScreen() {
    // Find and hide welcome screen elements
    const selectors = [
      ".flex.flex-col.gap-2.mb-2.items-center", // Welcome container
      '[class*="welcome"]',
      '[class*="starter"]', // Starter questions
      'img[src*="favicon"]', // Logo on welcome
    ];

    selectors.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        // Check if it's actually the welcome screen (has logo + description)
        if (
          el.querySelector("img") ||
          el.querySelector("h2") ||
          selector.includes("starter")
        ) {
          el.style.display = "none";
        }
      });
    });

    console.log("👻 Welcome screen hidden");
  }

  // Continue session - Load history as active context
  function continueSession(sessionId) {
    const sessions = getAllSessions();
    const session = sessions[sessionId];

    if (!session || session.messages.length === 0) {
      alert("No messages to continue from.");
      return;
    }

    console.log("🔄 Continuing session:", sessionId);

    // Close preview modal and sidebar
    const modal = document.querySelector(".session-preview-modal");
    if (modal) modal.remove();
    closeSidebar();

    // Switch to this session as active
    currentSessionId = sessionId;
    currentMessages = session.messages;

    // Create a visual context banner showing history is loaded
    createContextBanner(session);

    // Strategy: Render messages directly into chat UI (like ChatGPT)
    // This requires recreating the message bubbles in Chainlit's format
    renderHistoryIntoChat(session);

    console.log("✅ Session context loaded");
    console.log(`� ${session.messages.length} messages restored to chat`);

    // Show success notification
    showNotification(
      `✅ Restored ${session.messages.length} messages. Continue chatting!`
    );
  }

  // Create context banner to show active session
  function createContextBanner(session) {
    // Remove existing banner if any
    const existingBanner = document.getElementById("session-context-banner");
    if (existingBanner) existingBanner.remove();

    const banner = document.createElement("div");
    banner.id = "session-context-banner";
    banner.className = "session-context-banner";
    banner.innerHTML = `
      <div class="context-banner-content">
        <div class="context-banner-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
        </div>
        <div class="context-banner-text">
          <strong>Continued from:</strong> ${escapeHtml(session.title)}
          <span class="context-banner-count">${
            session.messages.length
          } messages</span>
        </div>
        <button class="context-banner-close" onclick="document.getElementById('session-context-banner').remove()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;

    // Insert at top of chat container
    const chatContainer = findChatContainer();
    if (chatContainer) {
      chatContainer.insertBefore(banner, chatContainer.firstChild);
    } else {
      document.body.insertBefore(banner, document.body.firstChild);
    }
  }

  // Render history messages into chat UI (CLEAN - NO BANNER)
  function renderHistoryIntoChat(session) {
    const chatContainer = findChatContainer();
    if (!chatContainer) {
      console.warn("⚠️ Could not find chat container for rendering");
      return;
    }

    // Clear existing messages in UI
    const existingMessages = chatContainer.querySelectorAll("[data-step-type]");
    existingMessages.forEach((msg) => msg.remove());

    // Remove any existing banners
    const existingBanner = document.getElementById("session-context-banner");
    if (existingBanner) existingBanner.remove();

    // Render each message from history
    session.messages.forEach((msg, index) => {
      const messageElement = createMessageElement(msg.role, msg.content, index);
      chatContainer.appendChild(messageElement);
    });

    // Attach event listeners to copy buttons in restored messages
    attachCopyButtonListeners();

    // Scroll to bottom to show latest messages
    setTimeout(() => {
      const lastMessage = chatContainer.querySelector(
        "[data-step-type]:last-child"
      );
      if (lastMessage) {
        lastMessage.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }, 100);

    console.log(`✅ Rendered ${session.messages.length} messages in chat`);
  }

  // Attach copy functionality to restored messages
  function attachCopyButtonListeners() {
    const copyButtons = document.querySelectorAll(
      ".restored-message .lucide-copy"
    );
    copyButtons.forEach((button) => {
      button.parentElement.addEventListener("click", (e) => {
        e.preventDefault();
        const messageElement = button.closest("[data-step-type]");
        const messageContent = messageElement.querySelector(".message-content");

        if (messageContent) {
          const textToCopy = messageContent.textContent.trim();
          navigator.clipboard
            .writeText(textToCopy)
            .then(() => {
              showNotification("✅ Message copied to clipboard!");
            })
            .catch((err) => {
              console.error("Failed to copy:", err);
            });
        }
      });
    });
  }

  // Create message element in EXACT Chainlit format
  function createMessageElement(role, content, index) {
    const stepType = role === "user" ? "user_message" : "assistant_message";
    const stepId = "step-" + generateUUID();

    // Create outer container
    const messageDiv = document.createElement("div");
    messageDiv.setAttribute("data-step-type", stepType);
    messageDiv.setAttribute("data-history-restored", "true");
    messageDiv.setAttribute("data-message-index", index);
    messageDiv.className = "step py-2 restored-message";

    if (role === "user") {
      // USER MESSAGE - Exact Chainlit structure
      messageDiv.innerHTML = `
        <div class="flex flex-col" style="max-width: min(48rem, 100vw);">
          <div class="flex flex-grow pb-2" id="${stepId}">
            <div class="flex flex-col flex-grow max-w-full">
              <div class="flex flex-col w-full gap-1">
                <div class="flex flex-row items-center gap-1 w-full group">
                  <div class="px-5 py-2.5 relative bg-accent rounded-3xl max-w-[70%] flex-grow-0">
                    <div class="flex flex-col">
                      <div class="message-content w-full flex flex-col gap-2">
                        <div class="flex flex-col gap-4">
                          <div class="prose lg:prose-xl">
                            <div class="leading-7 [&:not(:first-child)]:mt-4 whitespace-pre-wrap break-words" role="article">${escapeHtml(
                              content
                            )}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      // ASSISTANT MESSAGE - Exact Chainlit structure
      messageDiv.innerHTML = `
        <div class="flex flex-col" style="max-width: min(48rem, 100vw);">
          <div class="flex flex-grow pb-2" id="${stepId}">
            <div class="ai-message flex gap-4 w-full">
              <span class="inline-block">
                <span class="relative flex shrink-0 overflow-hidden rounded-full h-5 w-5 mt-[3px]" data-state="closed">
                  <img class="aspect-square h-full w-full bg-transparent" alt="Avatar for Assistant" src="http://localhost:8080/avatars/Assistant">
                </span>
              </span>
              <div class="flex flex-col items-start min-w-[150px] flex-grow gap-2">
                <div class="message-content w-full flex flex-col gap-2">
                  <div class="flex flex-col gap-4">
                    <div class="prose lg:prose-xl">
                      <div class="leading-7 [&:not(:first-child)]:mt-4 whitespace-pre-wrap break-words" role="article">${escapeHtml(
                        content
                      )}</div>
                    </div>
                  </div>
                </div>
                <div class="-ml-1.5 flex items-center flex-wrap">
                  <button class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-9 w-9 text-muted-foreground" data-state="closed">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy h-4 w-4">
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    return messageDiv;
  }

  // Find chat container intelligently - the parent that holds all message steps
  function findChatContainer() {
    // STRATEGY 1: If messages exist, find their parent container
    const existingMessages = document.querySelectorAll("[data-step-type]");
    if (existingMessages.length > 0) {
      // Get the common parent of all messages
      let container = existingMessages[0].parentElement;

      // Verify this container holds all messages
      while (container && container !== document.body) {
        const messagesInContainer =
          container.querySelectorAll("[data-step-type]").length;
        if (messagesInContainer === existingMessages.length) {
          console.log(
            `📦 Found chat container from existing messages: ${container.tagName}`
          );
          return container;
        }
        container = container.parentElement;
      }
    }

    // STRATEGY 2: Look for Chainlit's specific structure
    // Messages are typically in a flex column container inside main
    const selectors = [
      "main > div > div.flex.flex-col",
      "main > div.flex.flex-col",
      'main [class*="flex"][class*="flex-col"]:not([class*="gap-2"])',
      "main > div > div",
      "main > div",
      "main",
      "#root > div > main",
      "#root > main",
      "#root",
    ];

    for (const selector of selectors) {
      const container = document.querySelector(selector);
      if (container) {
        // Additional validation: check if it's not a header/footer
        const isNotHeaderFooter =
          !container.classList.contains("header") &&
          !container.classList.contains("footer") &&
          !container.id.includes("header") &&
          !container.id.includes("footer");

        if (isNotHeaderFooter) {
          console.log(`📦 Found chat container via selector: ${selector}`);
          return container;
        }
      }
    }

    console.warn("⚠️ Could not find suitable chat container, using main");
    return document.querySelector("main") || document.body;
  }

  // Copy session history to clipboard
  function copySessionToClipboard(sessionId) {
    const sessions = getAllSessions();
    const session = sessions[sessionId];

    if (!session || session.messages.length === 0) {
      alert("No messages to copy.");
      return;
    }

    const historyText = session.messages
      .map((msg) => {
        const role = msg.role === "user" ? "User" : "Assistant";
        const timestamp = new Date(msg.timestamp).toLocaleString();
        return `[${timestamp}] ${role}:\n${msg.content}\n`;
      })
      .join("\n---\n\n");

    const fullText =
      `Chat History: ${session.title}\n` +
      `Created: ${new Date(session.created_at).toLocaleString()}\n` +
      `Messages: ${session.messages.length}\n\n` +
      `${"=".repeat(50)}\n\n${historyText}`;

    navigator.clipboard
      .writeText(fullText)
      .then(() => {
        console.log("📋 Session copied to clipboard");
        showNotification("✅ Chat history copied to clipboard!");
      })
      .catch((err) => {
        console.error("❌ Failed to copy:", err);
        alert("Failed to copy to clipboard. Please try again.");
      });
  }

  // Show notification toast
  function showNotification(message) {
    const notification = document.createElement("div");
    notification.className = "chat-notification";
    notification.textContent = message;
    document.body.appendChild(notification);

    // Trigger animation
    setTimeout(() => notification.classList.add("show"), 10);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Show session preview in a modal
  function showSessionPreview(session) {
    // Create modal overlay
    const modal = document.createElement("div");
    modal.className = "session-preview-modal";
    modal.innerHTML = `
      <div class="session-preview-content">
        <div class="session-preview-header">
          <h3>${escapeHtml(session.title)}</h3>
          <button class="session-preview-close" aria-label="Close preview">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="session-preview-body">
          ${session.messages
            .map(
              (msg) => `
            <div class="preview-message preview-message-${msg.role}">
              <div class="preview-message-role">${
                msg.role === "user" ? "You" : "Assistant"
              }</div>
              <div class="preview-message-content">${escapeHtml(
                msg.content
              )}</div>
            </div>
          `
            )
            .join("")}
        </div>
        <div class="session-preview-footer">
          <div class="session-preview-actions">
            <button class="btn-continue-session" data-session-id="${
              session.id
            }">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
              Continue Chat
            </button>
            <button class="btn-copy-session" data-session-id="${session.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              Copy History
            </button>
          </div>
          <p class="session-preview-note">
            💡 Click "Continue Chat" to load this conversation history into your current chat.
          </p>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close modal on click outside or close button
    modal.addEventListener("click", (e) => {
      if (e.target === modal || e.target.closest(".session-preview-close")) {
        modal.remove();
      }
    });

    // Continue session button
    const continueBtn = modal.querySelector(".btn-continue-session");
    if (continueBtn) {
      continueBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const sessionId = continueBtn.dataset.sessionId;
        continueSession(sessionId);
      });
    }

    // Copy session button
    const copyBtn = modal.querySelector(".btn-copy-session");
    if (copyBtn) {
      copyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const sessionId = copyBtn.dataset.sessionId;
        copySessionToClipboard(sessionId);
      });
    }
  }

  // Delete session
  function deleteSession(sessionId) {
    const sessions = getAllSessions();
    delete sessions[sessionId];
    saveAllSessions(sessions);

    if (currentSessionId === sessionId) {
      createNewSession();
    }

    renderSidebar();
    console.log("🗑️ Session deleted:", sessionId);
  }

  // Rename session
  function renameSession(sessionId, newTitle) {
    const sessions = getAllSessions();
    const session = sessions[sessionId];

    if (session) {
      session.title = newTitle;
      session.updated_at = new Date().toISOString();
      saveAllSessions(sessions);
      renderSidebar();
      console.log("✏️ Session renamed:", sessionId);
    }
  }

  // Group sessions by date
  function groupSessionsByDate(sessions) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const groups = {
      Today: [],
      Yesterday: [],
      "Previous 7 Days": [],
      "Previous 30 Days": [],
      Older: [],
    };

    Object.values(sessions).forEach((session) => {
      const sessionDate = new Date(session.updated_at);

      if (sessionDate >= today) {
        groups.Today.push(session);
      } else if (sessionDate >= yesterday) {
        groups.Yesterday.push(session);
      } else if (sessionDate >= sevenDaysAgo) {
        groups["Previous 7 Days"].push(session);
      } else if (sessionDate >= thirtyDaysAgo) {
        groups["Previous 30 Days"].push(session);
      } else {
        groups.Older.push(session);
      }
    });

    // Sort each group by updated_at descending
    Object.keys(groups).forEach((key) => {
      groups[key].sort(
        (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
      );
    });

    return groups;
  }

  // ==========================================
  // SIDEBAR UI
  // ==========================================

  function createSidebar() {
    // Remove existing sidebar if any
    const existingSidebar = document.getElementById("chat-history-sidebar");
    if (existingSidebar) {
      existingSidebar.remove();
    }

    const sidebar = document.createElement("div");
    sidebar.id = "chat-history-sidebar";
    sidebar.className = "chat-history-sidebar";

    sidebar.innerHTML = `
      <div class="sidebar-header">
        <button id="sidebar-toggle-inside" class="sidebar-toggle-inside" aria-label="Toggle sidebar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
        </button>
        <h3>Chat History</h3>
        <button class="sidebar-close" aria-label="Close sidebar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="sidebar-actions">
        <button class="btn-new-chat" id="sidebar-new-chat">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Chat
        </button>
      </div>
      <div class="sidebar-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <input 
          type="text" 
          id="sidebar-search-input" 
          class="sidebar-search-input" 
          placeholder="Search Chats"
          autocomplete="off"
        />
      </div>
      <div class="sidebar-content" id="sidebar-sessions"></div>
    `;

    document.body.appendChild(sidebar);

    // Event listeners
    sidebar
      .querySelector("#sidebar-toggle-inside")
      .addEventListener("click", closeSidebar);
    sidebar
      .querySelector(".sidebar-close")
      .addEventListener("click", closeSidebar);
    sidebar
      .querySelector("#sidebar-new-chat")
      .addEventListener("click", handleNewChat);
    sidebar
      .querySelector("#sidebar-search-input")
      .addEventListener("input", handleSearchInput);

    renderSidebar();
  }

  function createExternalToggle() {
    // Remove existing toggle if any
    const existing = document.getElementById("chat-history-toggle-external");
    if (existing) {
      existing.remove();
    }

    const toggle = document.createElement("button");
    toggle.id = "chat-history-toggle-external";
    toggle.className = "chat-history-toggle-external";
    toggle.setAttribute("aria-label", "Open chat history");

    toggle.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
      </svg>
    `;

    toggle.addEventListener("click", openSidebar);

    // Try to insert before the New Chat button
    const newChatButton = document.getElementById("new-chat-button");
    if (newChatButton && newChatButton.parentNode) {
      newChatButton.parentNode.insertBefore(toggle, newChatButton);
      console.log("✅ External toggle inserted before New Chat button");
      return true;
    } else {
      console.warn("⚠️ New Chat button not found yet");
      return false;
    }
  }

  function tryCreateExternalToggle(attempt = 0) {
    const success = createExternalToggle();

    if (!success && attempt < 5) {
      // Retry with increasing delays: 100ms, 300ms, 500ms, 1000ms, 2000ms
      const delays = [100, 300, 500, 1000, 2000];
      setTimeout(() => tryCreateExternalToggle(attempt + 1), delays[attempt]);
    }
  }

  function renderSidebar(searchQuery = "") {
    const sessionsContainer = document.getElementById("sidebar-sessions");
    if (!sessionsContainer) return;

    const sessions = getAllSessions();

    // Filter sessions by search query
    let filteredSessions = sessions;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredSessions = Object.fromEntries(
        Object.entries(sessions).filter(([id, session]) =>
          session.title.toLowerCase().includes(query)
        )
      );
    }

    const grouped = groupSessionsByDate(Object.values(filteredSessions));

    let html = "";

    Object.entries(grouped).forEach(([groupName, groupSessions]) => {
      if (groupSessions.length === 0) return;

      html += `<div class="session-group">
        <div class="session-group-title">${groupName}</div>`;

      groupSessions.forEach((session) => {
        const isActive = session.id === currentSessionId;
        const dateObj = new Date(session.updated_at);
        const timeStr = dateObj.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });

        html += `
          <div class="session-item ${
            isActive ? "active" : ""
          }" data-session-id="${session.id}">
            <div class="session-info">
              <div class="session-title">${escapeHtml(session.title)}</div>
              <div class="session-date">${timeStr}</div>
            </div>
            <div class="session-actions">
              <button class="session-action-btn rename" data-session-id="${
                session.id
              }" aria-label="Rename">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button class="session-action-btn delete" data-session-id="${
                session.id
              }" aria-label="Delete">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
        `;
      });

      html += `</div>`;
    });

    if (Object.keys(filteredSessions).length === 0 && searchQuery.trim()) {
      html = '<div class="no-sessions">No chats found</div>';
    } else if (Object.keys(sessions).length === 0) {
      html = '<div class="no-sessions">No chat history yet</div>';
    }

    sessionsContainer.innerHTML = html;

    // Attach event listeners
    document.querySelectorAll(".session-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        if (!e.target.closest(".session-actions")) {
          const sessionId = item.dataset.sessionId;
          loadSession(sessionId);
          closeSidebar();
        }
      });
    });

    document.querySelectorAll(".session-action-btn.rename").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const sessionId = btn.dataset.sessionId;
        const sessions = getAllSessions();
        const session = sessions[sessionId];
        if (session) {
          const newTitle = prompt("Enter new title:", session.title);
          if (newTitle && newTitle.trim()) {
            renameSession(sessionId, newTitle.trim());
          }
        }
      });
    });

    document.querySelectorAll(".session-action-btn.delete").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const sessionId = btn.dataset.sessionId;
        if (confirm("Delete this chat?")) {
          deleteSession(sessionId);
        }
      });
    });
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function openSidebar() {
    const sidebar = document.getElementById("chat-history-sidebar");
    const externalToggle = document.getElementById(
      "chat-history-toggle-external"
    );

    if (sidebar) {
      sidebar.classList.add("open");
      isSidebarOpen = true;
      hideChainlitNewChatButton();

      // Hide external toggle when sidebar is open
      if (externalToggle) {
        externalToggle.style.display = "none";
      }

      console.log("📂 Sidebar opened");
    }
  }

  function closeSidebar() {
    const sidebar = document.getElementById("chat-history-sidebar");
    const externalToggle = document.getElementById(
      "chat-history-toggle-external"
    );

    if (sidebar) {
      sidebar.classList.remove("open");
      isSidebarOpen = false;
      showChainlitNewChatButton();

      // Show external toggle when sidebar is closed (use inline-flex to maintain horizontal layout)
      if (externalToggle) {
        externalToggle.style.display = "inline-flex";
      }

      console.log("📂 Sidebar closed");
    }
  }

  function toggleSidebar() {
    if (isSidebarOpen) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  // ==========================================
  // CHAINLIT BUTTON CONTROLS
  // ==========================================

  function findChainlitNewChatButton() {
    // Find Chainlit's built-in New Chat button by ID first
    let button = document.getElementById("new-chat-button");
    if (button) {
      return button;
    }

    // Fallback: Find by other attributes
    const selectors = [
      'button[aria-label*="new chat" i]',
      'button[aria-label*="New Chat" i]',
      'button[title*="new chat" i]',
      'button[title*="New Chat" i]',
    ];

    for (const selector of selectors) {
      const buttons = document.querySelectorAll(selector);
      for (const btn of buttons) {
        return btn;
      }
    }

    return null;
  }

  function hideChainlitNewChatButton() {
    const chainlitBtn = findChainlitNewChatButton();
    if (chainlitBtn) {
      chainlitBtn.setAttribute("data-hidden-by-sidebar", "true");
      chainlitBtn.style.display = "none";
      console.log("🙈 Chainlit New Chat button hidden");
    }
  }

  function showChainlitNewChatButton() {
    const chainlitBtn = findChainlitNewChatButton();
    if (chainlitBtn && chainlitBtn.getAttribute("data-hidden-by-sidebar")) {
      chainlitBtn.removeAttribute("data-hidden-by-sidebar");
      chainlitBtn.style.display = "";
      console.log("👁️ Chainlit New Chat button shown");
    }
  }

  function handleNewChat() {
    createNewSession();
    closeSidebar();

    // Reload page to show initial screen
    window.location.reload();

    console.log("🆕 New chat started");
  }

  function handleSearchInput(event) {
    const searchQuery = event.target.value;
    renderSidebar(searchQuery);
  }

  // ==========================================
  // MESSAGE OBSERVER
  // ==========================================

  function observeMessages() {
    console.log("👀 Starting message observer...");

    let hasScannedOnce = false;

    const messageObserver = new MutationObserver((mutations) => {
      console.log(
        `🔄 MutationObserver triggered! ${mutations.length} mutation(s)`
      );

      // Check if we should scan existing messages (only once, when first message appears)
      if (!hasScannedOnce) {
        const hasMessages =
          document.querySelectorAll("[data-step-type]").length > 0;
        if (hasMessages) {
          hasScannedOnce = true;
          console.log(
            "🔍 First messages detected! Scanning existing messages..."
          );
          setTimeout(() => captureExistingMessages(), 500);
        }
      }

      mutations.forEach((mutation) => {
        console.log(
          `   - Mutation type: ${mutation.type}, ${mutation.addedNodes.length} nodes added`
        );

        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            console.log(`   - Checking node:`, node.tagName, node.className);

            let role = null;
            let content = null;

            // Chainlit uses data-step-type attribute
            const stepType = node.getAttribute("data-step-type");
            console.log(`     - data-step-type: ${stepType}`);

            if (
              stepType === "user_message" ||
              stepType === "assistant_message"
            ) {
              // Determine role
              role = stepType === "user_message" ? "user" : "assistant";

              // Get content from .message-content div
              const messageContent = node.querySelector(".message-content");
              if (messageContent) {
                // Get all text content, removing extra whitespace
                content = messageContent.textContent?.trim() || "";

                console.log(
                  `🔍 Found ${role} message, length: ${content.length}`
                );
              } else {
                console.log(`     - No .message-content found in this step`);
              }
            }

            // Also check if a child was added that is a step
            if (!role) {
              const stepElement = node.querySelector("[data-step-type]");
              if (stepElement) {
                const childStepType =
                  stepElement.getAttribute("data-step-type");
                console.log(
                  `     - Found child with data-step-type: ${childStepType}`
                );

                if (
                  childStepType === "user_message" ||
                  childStepType === "assistant_message"
                ) {
                  role =
                    childStepType === "user_message" ? "user" : "assistant";
                  const messageContent =
                    stepElement.querySelector(".message-content");
                  if (messageContent) {
                    content = messageContent.textContent?.trim() || "";
                    console.log(
                      `🔍 Found ${role} message in child, length: ${content.length}`
                    );
                  }
                }
              }
            }

            // Save message if we found valid content
            if (role && content && content.length > 10) {
              // Avoid duplicates
              const alreadySaved = currentMessages.some(
                (m) => m.content === content && m.role === role
              );

              if (!alreadySaved) {
                console.log(
                  `💾 Capturing ${role} message:`,
                  content.substring(0, 80) + "..."
                );
                saveMessageToSession(role, content);
              } else {
                console.log(`⏭️ Skipping duplicate ${role} message`);
              }
            } else if (role && content) {
              console.log(
                `     - Message too short (${content.length} chars), skipping`
              );
            }
          }
        });
      });
    });

    // CRITICAL: Find the ACTUAL container that holds messages
    // Strategy: Find where data-step-type elements exist, then get their common ancestor
    function findMessageContainer() {
      const existingMessages = document.querySelectorAll("[data-step-type]");

      if (existingMessages.length > 0) {
        // Get the parent that contains all messages
        let container = existingMessages[0].parentElement;

        // Go up until we find a container that holds ALL messages
        while (container && container !== document.body) {
          const messagesInContainer =
            container.querySelectorAll("[data-step-type]").length;
          if (messagesInContainer === existingMessages.length) {
            console.log(
              `📦 Found message container: ${container.tagName}.${container.className}`
            );
            return container;
          }
          container = container.parentElement;
        }
      }

      // Fallback: Try common Chainlit selectors
      const fallbacks = [
        "#root",
        '[id^="root"]',
        "main",
        '[role="main"]',
        ".app",
        '[class*="app"]',
        "body",
      ];

      for (const selector of fallbacks) {
        const elem = document.querySelector(selector);
        if (elem) {
          console.log(`📦 Using fallback container: ${selector}`);
          return elem;
        }
      }

      console.warn("⚠️ No suitable container found, using body");
      return document.body;
    }

    const chatContainer = findMessageContainer();

    messageObserver.observe(chatContainer, {
      childList: true,
      subtree: true,
      characterData: false,
      attributes: false,
    });

    console.log(
      "✅ Message observer active on:",
      chatContainer.tagName,
      chatContainer.className || "(no class)"
    );
    console.log(
      "📍 Container has",
      chatContainer.querySelectorAll("[data-step-type]").length,
      "existing messages"
    );
  }

  // Capture messages that already exist on page
  function captureExistingMessages() {
    console.log("🔍 Starting existing messages scan...");
    console.log("🔍 DOM structure investigation:");

    // Log what we can find in the DOM
    const allDivs = document.querySelectorAll("div");
    console.log(`   Total divs on page: ${allDivs.length}`);

    const divsWithDataAttrs = Array.from(allDivs).filter((div) =>
      Array.from(div.attributes).some((attr) => attr.name.startsWith("data-"))
    );
    console.log(`   Divs with data-* attributes: ${divsWithDataAttrs.length}`);

    // Show sample of data attributes
    if (divsWithDataAttrs.length > 0) {
      const sample = divsWithDataAttrs.slice(0, 3).map((div) => {
        const attrs = Array.from(div.attributes)
          .filter((attr) => attr.name.startsWith("data-"))
          .map((attr) => `${attr.name}="${attr.value}"`)
          .join(", ");
        return attrs;
      });
      console.log("   Sample data attributes:", sample);
    }

    // Try to find messages by class patterns
    const possibleMessages = document.querySelectorAll(
      '[class*="message"], [class*="step"], [class*="Message"], [class*="Step"]'
    );
    console.log(
      `   Elements with message/step classes: ${possibleMessages.length}`
    );

    const existingSteps = document.querySelectorAll("[data-step-type]");
    console.log(`   Elements with data-step-type: ${existingSteps.length}`);

    if (existingSteps.length === 0) {
      console.warn("⚠️ No elements with data-step-type found!");
      console.log("💡 Please send a test message, then run this in console:");
      console.log(
        '   const msgs = document.querySelectorAll("[class*=message], [class*=Message], [class*=step], [class*=Step]");'
      );
      console.log(
        '   console.log("Found:", msgs.length); msgs.forEach(m => console.log(m));'
      );
      return;
    }

    existingSteps.forEach((step) => {
      const stepType = step.getAttribute("data-step-type");

      if (stepType === "user_message" || stepType === "assistant_message") {
        const role = stepType === "user_message" ? "user" : "assistant";
        const messageContent = step.querySelector(".message-content");

        if (messageContent) {
          const content = messageContent.textContent?.trim() || "";

          if (content && content.length > 10) {
            // Check if already saved
            const alreadySaved = currentMessages.some(
              (m) => m.content === content && m.role === role
            );

            if (!alreadySaved) {
              console.log(
                `📥 Capturing existing ${role} message:`,
                content.substring(0, 80) + "..."
              );
              saveMessageToSession(role, content);
            }
          }
        }
      }
    });

    console.log(
      `✅ Finished scanning. Total messages in session: ${currentMessages.length}`
    );
  }

  // ==========================================
  // WATERMARK CUSTOMIZATION
  // ==========================================

  let isWatermarkCustomized = false;

  function customizeWatermark() {
    if (isWatermarkCustomized) return;

    const watermarkSelectors = [
      "a.watermark",
      'a[href*="chainlit.io"]',
      ".watermark",
      '[class*="watermark"]',
    ];

    let watermarkElement = null;

    for (const selector of watermarkSelectors) {
      watermarkElement = document.querySelector(selector);
      if (watermarkElement) break;
    }

    if (!watermarkElement) {
      const elements = document.querySelectorAll("a, div, span");
      for (const el of elements) {
        if (
          el.textContent &&
          el.textContent.toLowerCase().includes("built with")
        ) {
          watermarkElement = el.closest("a") || el;
          break;
        }
      }
    }

    if (watermarkElement) {
      try {
        watermarkElement.removeAttribute("href");
        watermarkElement.removeAttribute("target");
        watermarkElement.classList.add("watermark");

        watermarkElement.innerHTML = `
          <div class="text-xs text-muted-foreground">
            <span>Copyright © 2025 Harry Mardika</span>
          </div>
        `;

        watermarkElement.style.cursor = "default";
        watermarkElement.style.textDecoration = "none";
        watermarkElement.style.pointerEvents = "none";
        watermarkElement.setAttribute("data-customized", "true");

        isWatermarkCustomized = true;
        console.log("✅ Watermark customized");
      } catch (error) {
        console.error("❌ Error customizing watermark:", error);
      }
    }
  }

  // ==========================================
  // INITIALIZATION
  // ==========================================

  function initialize() {
    console.log("🚀 Initializing Chat History System...");

    // Check if we need to restore a specific session
    const sessionToLoad = sessionStorage.getItem("loadSessionId");
    if (sessionToLoad) {
      sessionStorage.removeItem("loadSessionId");
      currentSessionId = sessionToLoad;
      const sessions = getAllSessions();
      const session = sessions[sessionToLoad];
      if (session) {
        currentMessages = session.messages;
        console.log("📂 Restoring session from reload:", sessionToLoad);
        console.log("📝 Messages in session:", session.messages.length);
      }
    }

    // Initialize session if none exists
    if (!currentSessionId) {
      const sessions = getAllSessions();
      const sessionIds = Object.keys(sessions);

      if (sessionIds.length > 0) {
        // Load most recent session
        const mostRecent = Object.values(sessions).sort(
          (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
        )[0];
        currentSessionId = mostRecent.id;
        currentMessages = mostRecent.messages;
      } else {
        createNewSession();
      }
    }

    // Create UI components
    createSidebar();
    tryCreateExternalToggle(); // Use retry mechanism
    observeMessages();
    customizeWatermark();

    // Re-customize watermark periodically
    setInterval(customizeWatermark, 2000);

    console.log("✅ Chat History System initialized");
    console.log("📌 Current session:", currentSessionId);
  }

  // Start initialization
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }

  // Expose API for Chainlit integration
  window.ChainlitChatHistory = {
    saveMessage: saveMessageToSession,
    loadSession: loadSession,
    createSession: createNewSession,
    getCurrentSessionId: () => currentSessionId,
    getAllSessions: getAllSessions,
    getCurrentMessages: () => currentMessages,
    debugInfo: () => {
      const sessions = getAllSessions();
      const currentSession = sessions[currentSessionId];
      console.log("=== CHAT HISTORY DEBUG INFO ===");
      console.log("Current Session ID:", currentSessionId);
      console.log("Current Messages Count:", currentMessages.length);
      console.log("Total Sessions:", Object.keys(sessions).length);
      console.log("Current Session Data:", currentSession);
      console.log("All Sessions:", sessions);
      console.log("LocalStorage Key:", STORAGE_KEY);
      return {
        currentSessionId,
        currentMessagesCount: currentMessages.length,
        totalSessions: Object.keys(sessions).length,
        currentSession,
        allSessions: sessions,
      };
    },
  };

  console.log("📦 Chainlit Chat History module loaded");
  console.log(
    "💡 Debug tip: Use window.ChainlitChatHistory.debugInfo() in console to see chat history status"
  );
})();
