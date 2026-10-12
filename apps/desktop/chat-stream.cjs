async function readChatStream(response, onEvent) {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.error || 'Không kết nối được AI'); error.status = response.status; throw error;
  }
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let buffer = '', result;
  try {
    for (;;) {
      const chunk = await reader.read();
      buffer += decoder.decode(chunk.value, { stream: !chunk.done });
      let boundary;
      while ((boundary = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
        if (!frame.startsWith('data: ')) continue;
        const event = JSON.parse(frame.slice(6));
        if (event.type === 'error') { const error = new Error(event.data.message); error.status = event.data.status; throw error; }
        if (event.type === 'result') result = event.data;
        onEvent(event);
      }
      if (chunk.done) break;
      if (buffer.length > 100000) throw new Error('Phản hồi AI không hợp lệ');
    }
    if (!result) throw new Error('Kết nối AI bị ngắt. Hãy thử lại tin nhắn.');
    return result;
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
module.exports = { readChatStream };
