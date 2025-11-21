"use client";

import { useState, useEffect, useRef } from 'react';
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  startAfter,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { ChevronDown, ChevronUp, Send } from 'lucide-react';

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: any;
}

interface ChatBoxProps {
  betId: string;
  currentUserId: string;
  currentUserName: string;
  isExpanded: boolean;
  onToggle: () => void;
}

export function ChatBox({
  betId,
  currentUserId,
  currentUserName,
  isExpanded,
  onToggle
}: ChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadTimestamp, setLastReadTimestamp] = useState<Date | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Calculate dynamic height based on message count
  const getMessagesHeightPx = (): number => {
    const messageCount = messages.length;

    // Empty state - minimal height
    if (messageCount === 0) {
      return 80;
    }

    // Height per message (bubble + spacing)
    const singleMessageHeight = 50;
    const padding = 16;

    // Cap at 5 messages visible
    const visibleMessages = Math.min(messageCount, 5);
    return (visibleMessages * singleMessageHeight) + padding;
  };

  const messagesHeight = getMessagesHeightPx();

  // Fetch initial messages (last 5)
  useEffect(() => {
    if (!betId) return;

    const messagesRef = collection(db, 'bets', betId, 'messages');
    const q = query(
      messagesRef,
      orderBy('timestamp', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];

      setMessages(msgs.reverse());

      if (lastReadTimestamp && !isExpanded) {
        const unread = msgs.filter(msg =>
          msg.userId !== currentUserId &&
          msg.timestamp?.toDate() > lastReadTimestamp
        ).length;
        setUnreadCount(unread);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [betId, currentUserId, lastReadTimestamp, isExpanded]);

  // Mark messages as read when expanded
  useEffect(() => {
    if (isExpanded) {
      setLastReadTimestamp(new Date());
      setUnreadCount(0);
    }
  }, [isExpanded]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (isExpanded && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isExpanded]);

  // Load more messages
  const loadMoreMessages = async () => {
    if (!hasMore || messages.length === 0) return;

    const messagesRef = collection(db, 'bets', betId, 'messages');
    const oldestMessage = messages[0];

    const q = query(
      messagesRef,
      orderBy('timestamp', 'desc'),
      startAfter(oldestMessage.timestamp),
      limit(10)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      setHasMore(false);
      return;
    }

    const olderMsgs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChatMessage[];

    setMessages([...olderMsgs.reverse(), ...messages]);
    setHasMore(snapshot.docs.length === 10);
  };

  // Handle scroll for infinite scroll
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;

    const { scrollTop } = messagesContainerRef.current;

    if (scrollTop === 0 && hasMore && !loading) {
      loadMoreMessages();
    }
  };

  // Handle toggle with proper scroll control
  const handleToggle = () => {
    const newExpandedState = !isExpanded;

    // If collapsing, just toggle
    if (!newExpandedState) {
      onToggle();
      return;
    }

    // If expanding, prevent scroll jump and center card
    if (chatContainerRef.current) {
      // Toggle expansion first
      onToggle();

      // Wait for DOM to update with expansion
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const element = chatContainerRef.current;
          if (!element) return;

          // Get element position after expansion
          const rect = element.getBoundingClientRect();
          const elementTop = rect.top + window.pageYOffset;

          // Calculate scroll to center card in viewport
          const viewportHeight = window.innerHeight;
          const cardElement = element.parentElement;
          const cardRect = cardElement?.getBoundingClientRect();
          const cardHeight = cardRect?.height || 0;

          // Center the entire card (not just chat)
          const targetScroll = elementTop - cardHeight - (viewportHeight / 2) + (cardHeight / 1.2);

          // Smooth scroll
          window.scrollTo({
            top: Math.max(0, targetScroll),
            behavior: 'smooth'
          });
        });
      });
    } else {
      onToggle();
    }
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    try {
      const messagesRef = collection(db, 'bets', betId, 'messages');

      await addDoc(messagesRef, {
        userId: currentUserId,
        userName: currentUserName,
        message: newMessage.trim(),
        timestamp: Timestamp.now(),
        betId
      });

      setNewMessage('');
      inputRef.current?.focus();

    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  // Format timestamp
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';

    const date = timestamp?.toDate?.() || new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;

    return date.toLocaleDateString();
  };

  return (
    <div ref={chatContainerRef} className="border-t border-zinc-800">
      {/* Collapsed Header */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleToggle();
        }}
        type="button"
        className="
          w-full px-3 py-2
          flex items-center justify-between
          hover:bg-zinc-800/50 transition-colors
        "
      >
        <div className="flex items-center gap-2">
          <span className="text-white font-montserrat font-semibold text-[8px]">
            💬 Chat
          </span>

          {unreadCount > 0 && !isExpanded && (
            <div className="
              bg-[#ff6b35] text-white
              px-1.5 py-0.5 rounded-full
              text-[8px] font-bold font-montserrat
            ">
              {unreadCount}
            </div>
          )}
        </div>

        {isExpanded ? (
          <ChevronUp size={12} className="text-zinc-400" />
        ) : (
          <ChevronDown size={12} className="text-zinc-400" />
        )}
      </button>

      {/* Expanded Chat */}
      {isExpanded && (
        <div className="bg-[#0a0a0a] border-t border-zinc-800">
          {/* Messages Container - Dynamic Height */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="
              overflow-y-auto
              px-3 py-2 space-y-2
              scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent
              transition-all duration-300
            "
            style={{
              height: `${messagesHeight}px`,
              minHeight: '80px',
              maxHeight: '266px'
            }}
          >
            {/* Load More Button */}
            {hasMore && messages.length >= 5 && (
              <button
                onClick={loadMoreMessages}
                className="
                  w-full text-center text-zinc-500 text-[8px]
                  font-montserrat py-1.5
                  hover:text-zinc-400
                "
              >
                Load older messages
              </button>
            )}

            {/* Messages or Empty State */}
            {messages.length === 0 ? (
              <div className="
                h-full flex items-center justify-center
                text-zinc-500 text-[8px] font-montserrat
              ">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg) => {
                const isOwnMessage = msg.userId === currentUserId;

                return (
                  <div
                    key={msg.id}
                    className={`
                      flex items-start gap-2
                      ${isOwnMessage ? 'justify-end' : 'justify-start'}
                    `}
                  >
                    <div className={`
                      max-w-[75%] rounded-2xl px-3 py-2
                      ${isOwnMessage
                        ? 'bg-[#ff6b35] rounded-br-sm'
                        : 'bg-[#27272A] rounded-bl-sm'
                      }
                    `}>
                      {!isOwnMessage && (
                        <p className="
                          text-[#ff6b35] font-montserrat font-semibold text-[8px] mb-1
                        ">
                          {msg.userName}
                        </p>
                      )}

                      {/* Message + Timestamp INLINE */}
                      <div className="flex items-end gap-2">
                        <p className="
                          text-white font-montserrat text-[8px]
                          break-words flex-1
                        ">
                          {msg.message}
                        </p>

                        <p className={`
                          font-montserrat text-[7px] flex-shrink-0 whitespace-nowrap
                          ${isOwnMessage ? 'text-white/70' : 'text-zinc-500'}
                        `}>
                          {formatTime(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form
            onSubmit={handleSendMessage}
            className="
              px-3 py-2 border-t border-zinc-800
              flex items-center gap-2
              bg-[#18181B]
            "
            style={{
              position: 'sticky',
              bottom: 0,
              zIndex: 10
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="
                flex-1 bg-[#27272A] text-white
                px-3 py-1.5 rounded-full
                font-montserrat text-[8px]
                border border-zinc-700
                focus:outline-none focus:border-[#ff6b35]
                placeholder:text-zinc-500
              "
              style={{ fontSize: '16px' }}
              maxLength={500}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="sentences"
            />

            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="
                bg-[#ff6b35] text-white
                w-8 h-8 rounded-full
                flex items-center justify-center
                hover:bg-[#ff7b45] transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
