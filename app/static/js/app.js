/**
 * HR Resume Agent - Client-side Application
 * Handles resume upload, chat with streaming responses, and session management
 */

// Application State
const state = {
  sessionId: null,
  isStreaming: false,
  resumes: [],
  selectedFiles: [],
  currentAssistantMessage: null,
  currentToolIndicator: null,
  currentTypingIndicator: null,
};

// Configure marked.js for markdown rendering
marked.setOptions({
  gfm: true,
  breaks: true,
  tables: true,
  headerIds: false,
  mangle: false,
});

// Initialize application on DOM ready
document.addEventListener('DOMContentLoaded', init);

/**
 * Initialize application
 */
function init() {
  setupFileInput();
  setupDragAndDrop();
  setupEventListeners();
  loadResumes();
  showWelcomeMessage();
  loadModelPreference();
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
  // Upload section
  const dropZone = document.getElementById('dropZone');
  const uploadBtn = document.getElementById('uploadBtn');
  const clearFilesBtn = document.getElementById('clearFilesBtn');

  if (dropZone) {
    dropZone.addEventListener('click', () => {
      document.getElementById('fileInput').click();
    });
  }

  if (uploadBtn) {
    uploadBtn.addEventListener('click', uploadResumes);
  }

  if (clearFilesBtn) {
    clearFilesBtn.addEventListener('click', clearFileSelection);
  }

  // Chat section
  const sendBtn = document.getElementById('sendBtn');
  const chatInput = document.getElementById('chatInput');
  const newChatBtn = document.getElementById('newChatBtn');

  if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
  }

  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    chatInput.addEventListener('input', () => {
      if (sendBtn) sendBtn.disabled = !chatInput.value.trim() || state.isStreaming;
    });
  }

  if (newChatBtn) {
    newChatBtn.addEventListener('click', newChat);
  }

  // Model selector
  const modelSelect = document.getElementById('modelSelect');
  if (modelSelect) {
    modelSelect.addEventListener('change', saveModelPreference);
  }

  // Mobile sidebar toggle
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.querySelector('.main-content');

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });

    // Close sidebar when clicking outside on mobile
    if (mainContent) {
      mainContent.addEventListener('click', () => {
        if (sidebar.classList.contains('open')) {
          sidebar.classList.remove('open');
        }
      });
    }
  }
}

/**
 * Set up file input change event
 */
function setupFileInput() {
  const fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      handleFilesSelected(Array.from(e.target.files));
    });
  }
}

/**
 * Set up drag and drop functionality
 */
function setupDragAndDrop() {
  const dropZone = document.getElementById('dropZone');
  if (!dropZone) return;

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('dragover');

    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter((file) => {
      const ext = file.name.toLowerCase().split('.').pop();
      return ext === 'pdf' || ext === 'docx';
    });

    const rejectedCount = files.length - validFiles.length;
    if (rejectedCount > 0) {
      showNotification(
        `${rejectedCount} file(s) rejected. Only PDF and DOCX files are accepted.`,
        'warning'
      );
    }

    if (validFiles.length > 0) {
      handleFilesSelected(validFiles);
    }
  });
}

/**
 * Handle files selected via input or drag-drop
 */
function handleFilesSelected(files) {
  state.selectedFiles = files;
  updateFileSelectionUI();
}

/**
 * Update UI to show selected files
 */
function updateFileSelectionUI() {
  const fileList = document.getElementById('fileList');
  const uploadBtn = document.getElementById('uploadBtn');
  const clearFilesBtn = document.getElementById('clearFilesBtn');

  if (!fileList) return;

  if (state.selectedFiles.length === 0) {
    fileList.innerHTML = '';
    if (uploadBtn) uploadBtn.disabled = true;
    if (clearFilesBtn) clearFilesBtn.style.display = 'none';
    return;
  }

  fileList.innerHTML = state.selectedFiles
    .map(
      (file, index) => `
    <div class="file-item">
      <span class="file-name">${escapeHtml(file.name)}</span>
      <span class="file-size">${formatFileSize(file.size)}</span>
      <button class="remove-file-btn" data-index="${index}" aria-label="Remove file">✕</button>
    </div>
  `
    )
    .join('');

  // Add remove file event listeners
  fileList.querySelectorAll('.remove-file-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      state.selectedFiles.splice(index, 1);
      updateFileSelectionUI();
    });
  });

  if (uploadBtn) uploadBtn.disabled = false;
  if (clearFilesBtn) clearFilesBtn.style.display = 'inline-block';
}

/**
 * Clear file selection
 */
function clearFileSelection() {
  state.selectedFiles = [];
  const fileInput = document.getElementById('fileInput');
  if (fileInput) fileInput.value = '';
  updateFileSelectionUI();
}

/**
 * Upload resumes to server
 */
async function uploadResumes() {
  if (state.selectedFiles.length === 0) return;

  const uploadBtn = document.getElementById('uploadBtn');
  const positionTagInput = document.getElementById('positionTag');

  if (uploadBtn) uploadBtn.disabled = true;

  const formData = new FormData();
  state.selectedFiles.forEach((file) => {
    formData.append('files', file);
  });

  if (positionTagInput && positionTagInput.value.trim()) {
    formData.append('position_tag', positionTagInput.value.trim());
  }

  try {
    showNotification('Uploading resumes...', 'info');

    const response = await fetch('/api/resumes/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.uploaded && result.uploaded.length > 0) {
      showNotification(
        `Successfully uploaded ${result.uploaded.length} resume(s)`,
        'success'
      );
      await loadResumes();
      clearFileSelection();
      if (positionTagInput) positionTagInput.value = '';
    }

    if (result.errors && result.errors.length > 0) {
      const errorMessages = result.errors
        .map((err) => `${err.file_name}: ${err.error}`)
        .join('\n');
      showNotification(`Upload errors:\n${errorMessages}`, 'error');
    }
  } catch (error) {
    console.error('Upload error:', error);
    showNotification(`Upload failed: ${error.message}`, 'error');
  } finally {
    if (uploadBtn) uploadBtn.disabled = false;
  }
}

/**
 * Load resumes from server
 */
async function loadResumes(positionTag = null) {
  try {
    const url = positionTag
      ? `/api/resumes?position_tag=${encodeURIComponent(positionTag)}`
      : '/api/resumes';

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to load resumes');
    }

    state.resumes = await response.json();
    renderResumeList(state.resumes);
  } catch (error) {
    console.error('Failed to load resumes:', error);
    showNotification('Failed to load resumes', 'error');
  }
}

/**
 * Render resume list in sidebar
 */
function renderResumeList(resumes) {
  const resumeList = document.getElementById('resumeList');
  if (!resumeList) return;

  const countBadge = document.getElementById('resumeCount');
  if (countBadge) countBadge.textContent = resumes.length;

  if (resumes.length === 0) {
    resumeList.innerHTML = '<p class="empty-state">No resumes uploaded yet</p>';
    return;
  }

  resumeList.innerHTML = resumes
    .map(
      (resume) => `
    <div class="resume-card">
      <div class="resume-header">
        <h4 class="resume-name">${escapeHtml(resume.candidate_name || 'Unknown')}</h4>
        <div class="resume-actions">
          <button class="icon-btn download-btn" data-id="${resume.id}" data-filename="${escapeHtml(resume.file_name)}" title="Download">
            ⬇
          </button>
          <button class="icon-btn delete-btn" data-id="${resume.id}" title="Delete">
            ✕
          </button>
        </div>
      </div>
      <div class="resume-details">
        <p class="resume-filename">${escapeHtml(resume.file_name)}</p>
        ${resume.position_tag ? `<span class="position-tag">${escapeHtml(resume.position_tag)}</span>` : ''}
        <p class="resume-meta">
          ${resume.sections_count || 0} sections · ${formatDate(resume.upload_date)}
        </p>
      </div>
    </div>
  `
    )
    .join('');

  // Attach event listeners
  resumeList.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      deleteResume(id);
    });
  });

  resumeList.querySelectorAll('.download-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      const filename = e.target.dataset.filename;
      downloadResume(id, filename);
    });
  });
}

/**
 * Delete resume
 */
async function deleteResume(id) {
  if (!confirm('Are you sure you want to delete this resume?')) {
    return;
  }

  try {
    const response = await fetch(`/api/resumes/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete resume');
    }

    showNotification('Resume deleted successfully', 'success');
    await loadResumes();
  } catch (error) {
    console.error('Delete error:', error);
    showNotification('Failed to delete resume', 'error');
  }
}

/**
 * Download resume
 */
async function downloadResume(id, fileName) {
  try {
    const response = await fetch(`/api/resumes/${id}/download`);
    if (!response.ok) {
      throw new Error('Failed to download resume');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'resume.pdf';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Download error:', error);
    showNotification('Failed to download resume', 'error');
  }
}

/**
 * Send chat message
 */
function sendMessage() {
  const chatInput = document.getElementById('chatInput');
  if (!chatInput) return;

  const message = chatInput.value.trim();
  if (!message || state.isStreaming) return;

  chatInput.value = '';
  chatInput.disabled = true;
  
  const sendBtn = document.getElementById('sendBtn');
  if (sendBtn) sendBtn.disabled = true;

  streamChat(message);
}

/**
 * Stream chat response from server
 */
async function streamChat(message) {
  state.isStreaming = true;

  // Add user message to chat
  addMessageBubble('user', message);

  // Create streaming assistant bubble
  const assistantBubble = createStreamingBubble();
  state.currentAssistantMessage = assistantBubble;

  let buffer = '';
  let rawText = '';

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        session_id: state.sessionId,
        position_tag: getCurrentPositionTag(),
        model: getSelectedModel(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Chat request failed: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete last line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;

        const jsonStr = trimmed.slice(6); // Remove 'data: ' prefix
        if (!jsonStr) continue;

        try {
          const event = JSON.parse(jsonStr);

          if (event.type === 'token') {
            rawText += event.content;
          }

          handleSSEEvent(event, assistantBubble, rawText);
        } catch (e) {
          console.error('Failed to parse SSE event:', e, jsonStr);
        }
      }
    }
  } catch (error) {
    console.error('Chat error:', error);
    assistantBubble.innerHTML = `<p class="error-message">Error: ${escapeHtml(error.message)}</p>`;
  } finally {
    state.isStreaming = false;
    state.currentAssistantMessage = null;
    hideToolIndicator();
    hideTypingIndicator();

    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');

    if (chatInput) {
      chatInput.disabled = false;
      chatInput.focus();
    }
    if (sendBtn) sendBtn.disabled = !chatInput || !chatInput.value.trim();

    scrollToBottom();
  }
}

/**
 * Handle individual SSE event
 */
function handleSSEEvent(event, assistantBubble, accumulatedText) {
  switch (event.type) {
    case 'session':
      state.sessionId = event.session_id;
      break;

    case 'token':
      assistantBubble.innerHTML = renderMarkdown(accumulatedText);
      scrollToBottom();
      break;

    case 'tool_call':
      showToolIndicator(event.name);
      break;

    case 'error':
      assistantBubble.innerHTML = `<p class="error-message">Error: ${escapeHtml(event.content)}</p>`;
      hideToolIndicator();
      break;

    case 'done':
      hideToolIndicator();
      break;

    default:
      console.warn('Unknown SSE event type:', event.type);
  }
}

/**
 * Add message bubble to chat
 */
function addMessageBubble(role, content) {
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return;

  const bubble = document.createElement('div');
  bubble.className = `message ${role}`;

  if (role === 'user') {
    bubble.innerHTML = `<div class="bubble">${escapeHtml(content)}</div>`;
  } else {
    bubble.innerHTML = `<div class="bubble markdown-content">${renderMarkdown(content)}</div>`;
  }

  chatMessages.appendChild(bubble);
  scrollToBottom();

  return bubble;
}

/**
 * Create empty streaming bubble for assistant
 */
function createStreamingBubble() {
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return null;

  const bubble = document.createElement('div');
  bubble.className = 'message assistant';
  bubble.innerHTML = '<div class="bubble streaming markdown-content"></div>';

  chatMessages.appendChild(bubble);
  scrollToBottom();

  return bubble.querySelector('.bubble');
}

/**
 * Show tool usage indicator
 */
function showToolIndicator(toolName) {
  hideToolIndicator();

  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return;

  const indicator = document.createElement('div');
  indicator.className = 'tool-indicator';
  indicator.innerHTML = `
    <span class="tool-spinner">⟳</span>
    <span>Using tool: ${escapeHtml(toolName)}...</span>
  `;

  chatMessages.appendChild(indicator);
  state.currentToolIndicator = indicator;
  scrollToBottom();
}

/**
 * Hide tool indicator
 */
function hideToolIndicator() {
  if (state.currentToolIndicator) {
    state.currentToolIndicator.remove();
    state.currentToolIndicator = null;
  }
}

/**
 * Show typing indicator
 */
function showTypingIndicator() {
  hideTypingIndicator();

  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return;

  const indicator = document.createElement('div');
  indicator.className = 'message assistant';
  indicator.innerHTML = `
    <div class="bubble typing-indicator">
      <span></span><span></span><span></span>
    </div>
  `;

  chatMessages.appendChild(indicator);
  state.currentTypingIndicator = indicator;
  scrollToBottom();
}

/**
 * Hide typing indicator
 */
function hideTypingIndicator() {
  if (state.currentTypingIndicator) {
    state.currentTypingIndicator.remove();
    state.currentTypingIndicator = null;
  }
}

/**
 * Start new chat session
 */
function newChat() {
  if (state.isStreaming) return;

  state.sessionId = null;
  const chatMessages = document.getElementById('chatMessages');
  if (chatMessages) {
    chatMessages.innerHTML = '';
  }
  showWelcomeMessage();
}

/**
 * Show welcome message
 */
function showWelcomeMessage() {
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return;

  chatMessages.innerHTML = `
    <div class="welcome-message">
      <h2>Welcome to HR Resume Agent</h2>
      <p>Ask me anything about the uploaded resumes. I can help you:</p>
      <ul>
        <li>Search for candidates by skills, experience, or education</li>
        <li>Compare candidates for specific positions</li>
        <li>Find candidates matching job requirements</li>
        <li>Analyze resume content and extract information</li>
      </ul>
      <p class="tip">Try asking: "Find candidates with Python experience" or "Who has worked in healthcare?"</p>
    </div>
  `;
}

/**
 * Get current position tag from chat input area
 */
function getCurrentPositionTag() {
  const select = document.getElementById('chatPositionTag');
  const value = select ? select.value.trim() : '';
  return value || null;
}

/**
 * Get selected model from dropdown
 */
function getSelectedModel() {
  const select = document.getElementById('modelSelect');
  return select ? select.value : null;
}

/**
 * Load model preference from localStorage
 */
function loadModelPreference() {
  const savedModel = localStorage.getItem('selectedModel');
  const modelSelect = document.getElementById('modelSelect');
  if (savedModel && modelSelect) {
    // Verify the saved model is a valid option
    const options = Array.from(modelSelect.options).map(opt => opt.value);
    if (options.includes(savedModel)) {
      modelSelect.value = savedModel;
    }
  }
}

/**
 * Save model preference to localStorage
 */
function saveModelPreference() {
  const modelSelect = document.getElementById('modelSelect');
  if (modelSelect) {
    localStorage.setItem('selectedModel', modelSelect.value);
  }
}

/**
 * Render markdown to HTML
 */
function renderMarkdown(text) {
  try {
    return marked.parse(text);
  } catch (error) {
    console.error('Markdown rendering error:', error);
    return escapeHtml(text);
  }
}

/**
 * Scroll chat to bottom
 */
function scrollToBottom() {
  const chatMessages = document.getElementById('chatMessages');
  if (chatMessages) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

/**
 * Format date string
 */
function formatDate(dateString) {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  } catch (error) {
    return dateString;
  }
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const units = ['Bytes', 'KB', 'MB', 'GB'];
  const exponent = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, exponent);
  return Math.round(value * 100) / 100 + ' ' + units[exponent];
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;

  // Add to document
  document.body.appendChild(notification);

  // Trigger animation
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);

  // Remove after delay
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 4000);
}
