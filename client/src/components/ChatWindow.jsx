import { useEffect, useRef } from 'react';

const ChatWindow = ({ messages, currentUserId }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div ref={scrollRef} className="h-72 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="space-y-2">
        {messages.map((message) => {
          const isMine = (message.senderId?._id || message.senderId) === currentUserId;
          const senderName = message.senderId?.fullName || (isMine ? 'You' : 'User');
          return (
            <div key={message._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  isMine ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-900'
                }`}
              >
                <p className={`mb-1 text-[11px] font-semibold ${isMine ? 'text-blue-100' : 'text-slate-600'}`}>{senderName}</p>
                {message.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChatWindow;
