# Web UI Templates Index

## Pages

| Route | Template | Description |
|-------|----------|-------------|
| `GET /` | `app/templates/index.html` | Single-page HR Resume Agent app |

## Static Assets

| File | Purpose |
|------|---------|
| `app/static/css/style.css` | Main stylesheet - sidebar+chat layout, responsive, markdown styles |
| `app/static/js/app.js` | Client JS - upload, SSE chat streaming, resume CRUD, notifications |

## External Dependencies

| Library | CDN | Purpose |
|---------|-----|---------|
| marked.js | `cdn.jsdelivr.net/npm/marked@latest` | Markdown-to-HTML rendering for chat responses |

## Key DOM IDs

| ID | Element | Used by |
|----|---------|---------|
| `sidebar` | Sidebar `<aside>` | Mobile toggle |
| `sidebarToggle` | Mobile menu button | Sidebar open/close |
| `dropZone` | Upload drag-drop area | File drop + click-to-browse |
| `fileInput` | Hidden file input | File picker |
| `fileList` | Selected files display | Pre-upload file list |
| `positionTag` | Position tag input (upload) | Resume tagging |
| `uploadBtn` | Upload button | Trigger upload |
| `resumeList` | Resume cards container | Sidebar resume list |
| `resumeCount` | Count badge | Resume total |
| `chatMessages` | Chat area | Message bubbles + welcome |
| `chatInput` | Chat textarea | User message input |
| `sendBtn` | Send button | Submit chat message |
| `newChatBtn` | New chat button | Reset session |
| `chatPositionTag` | Position scope select | Filter chat by position |
