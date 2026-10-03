# Conversational video assistant — Windows 0.3.0

Customers can discuss an idea before selecting a source. `/api/customer/assistant` uses OpenAI structured decisions (`reply` or `prepare`), the last 24 conversation messages and the latest completed/pending source request. Greetings and clarification do not open a file picker. Supported edit requests prepare a quote in the native app. Further edits reuse the locally stored source and the resolved cumulative request.

Website, Android wrapper and iPhone PWA can chat; rendering requires Windows 0.3.0. Existing Windows 0.2.0 users must update. Sources and output videos stay on the customer's device. Audio transcription and edit planning still use the shared authenticated AI API.

Chat costs **1 service token per AI message**, deducted atomically. Completed turns are cached by owner/request ID. Upstream failure refunds the chat token once and does not append a misleading assistant response. Video rendering retains its separate quoted cost and prior refund policy. Saying “đồng ý” after a quote in Windows starts rendering; “hủy” cancels a pending quote. Those exact control commands do not invoke or charge chat AI.

Available operations remain source cuts/reordering, aspect ratio, original-language speech captions, title and removal of speech pauses. AI does not generate arbitrary new scenes, add music, translate captions or run arbitrary commands. Context is bounded; it is not the complete Codex coding agent.

Verified locally: authenticated billing/ownership/history/refund integration tests, real OpenAI greeting without file selection, initial 4-second square render with captions, confirmation by chat, follow-up revision on the same source without another file picker, and a second completed render. Wallet used for this verification was isolated in memory. No production wallet was funded or charged for tests.
