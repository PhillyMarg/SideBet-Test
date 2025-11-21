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

      // Reverse to show oldest first
      setMessages(msgs.reverse());

      // Calculate unread count
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

  // Load more messages (infinite scroll)
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

    // Load more when scrolled to top
    if (scrollTop === 0 && hasMore && !loading) {
      loadMoreMessages();
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

      // Focus back on input
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

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <div className="border-t border-zinc-800">
      {/* Collapsed Header */}
      <button
        onClick={onToggle}
        className="
          w-full px-4 py-3
          flex items-center justify-between
          hover:bg-zinc-800/50 transition-colors
        "
      >
        <div className="flex items-center gap-2">
          <span className="text-white font-montserrat font-semibold text-sm">
            Chat
          </span>

          {/* Unread Badge */}
          {unreadCount > 0 && !isExpanded && (
            <div className="
              bg-[#ff6b35] text-white
              px-2 py-0.5 rounded-full
              text-[10px] font-bold font-montserrat
            ">
              {unreadCount}
            </div>
          )}
        </div>

        {isExpanded ? (
          <ChevronUp size={16} className="text-zinc-400" />
        ) : (
          <ChevronDown size={16} className="text-zinc-400" />
        )}
      </button>

      {/* Expanded Chat */}
      {isExpanded && (
        <div className="bg-[#0a0a0a] border-t border-zinc-800">
          {/* Messages Container - Fixed Height with Scroll */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="
              h-[200px] overflow-y-auto
              px-4 py-3 space-y-2
              scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent
            "
          >
            {/* Load More Indicator */}
            {hasMore && messages.length >= 5 && (
              <button
                onClick={loadMoreMessages}
                className="
                  w-full text-center text-zinc-500 text-xs
                  font-montserrat py-2
                  hover:text-zinc-400
                "
              >
                Load older messages
              </button>
            )}

            {/* Messages */}
            {messages.length === 0 ? (
              <div className="
                h-full flex items-center justify-center
                text-zinc-500 text-sm font-montserrat
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
                    {/* Message Bubble */}
                    <div className={`
                      max-w-[75%] rounded-2xl px-3 py-2
                      ${isOwnMessage
                        ? 'bg-[#ff6b35] rounded-br-sm'
                        : 'bg-[#27272A] rounded-bl-sm'
                      }
                    `}>
                      {/* Name (only for others' messages) */}
                      {!isOwnMessage && (
                        <p className="
                          text-[#ff6b35] font-montserrat font-semibold text-[10px] mb-0.5
                        ">
                          {msg.userName}
                        </p>
                      )}

                      {/* Message Text */}
                      <p className="
                        text-white font-montserrat text-sm
                        break-words
                      ">
                        {msg.message}
                      </p>

                      {/* Timestamp */}
                      <p className={`
                        font-montserrat text-[9px] mt-1
                        ${isOwnMessage ? 'text-white/70' : 'text-zinc-500'}
                      `}>
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}

            {/* Auto-scroll anchor */}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form
            onSubmit={handleSendMessage}
            className="
              px-4 py-3 border-t border-zinc-800
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
                px-3 py-2 rounded-full
                font-montserrat text-sm
                border border-zinc-700
                focus:outline-none focus:border-[#ff6b35]
                placeholder:text-zinc-500
              "
              maxLength={500}
              // Prevent zoom on iOS
              style={{ fontSize: '16px' }}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="sentences"
            />

            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="
                bg-[#ff6b35] text-white
                w-10 h-10 rounded-full
                flex items-center justify-center
                hover:bg-[#ff7b45] transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
