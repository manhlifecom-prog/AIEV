// A deliberately small, safe formatter: model text never becomes raw HTML.
export function ChatContent({ content }: { content: string }) {
  return <div className="studio-chat-content">{content.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part.startsWith('`') && part.endsWith('`') ? <code key={i}>{part.slice(1, -1)}</code> : part)}</p>)}</div>;
}
