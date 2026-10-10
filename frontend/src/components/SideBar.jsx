import React from "react";
import { useEffect, useState } from "react";

import {
  Coins,
  LogOut,
  Menu,
  MessageSquare,
  PanelLeftIcon,
  PanelRight,
  PenBoxIcon,
  Plus,
  User,
  X,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";

import { getConversations } from "../features/getConversations";
import { createConversation } from "../features/createConversation";
import logOut from "../features/logOut";

import {
  addConversation,
  setConversation,
  setSelectedConversation,
} from "../redux/conversationSlice";

import { setUserdata } from "../redux/userSlice";

import BillingDrawer from "./billingDrawer";

function SideBar() {
  const dispatch = useDispatch();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showBilling, setShowBilling] = useState(false);

  const {
    conversations = [],
    selectedConversation = null,
  } = useSelector((state) => state.conversation);

  const { userData = null } = useSelector((state) => state.user);

  /*
   * Fetch conversations when the user changes.
   */
  useEffect(() => {
    const getConv = async () => {
      try {
        const data = await getConversations();

        dispatch(setConversation(data || []));
      } catch (error) {
        console.error("Failed to fetch conversations:", error);
      }
    };

    if (userData?._id) {
      getConv();
    }
  }, [dispatch, userData?._id]);

  /*
   * Create a new conversation.
   */
  const handleConversation = async () => {
    try {
      const data = await createConversation();

      if (!data) return;

      dispatch(addConversation(data));
      dispatch(setSelectedConversation(data));

      // Close mobile sidebar after selecting a conversation.
      setMobileOpen(false);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  /*
   * Select an existing conversation.
   */
  const handleSelectConversation = (conversation) => {
    dispatch(setSelectedConversation(conversation));
    setMobileOpen(false);
  };

  /*
   * Start a blank chat.
   */
  const handleNewChat = () => {
    dispatch(setSelectedConversation(null));
    setMobileOpen(false);
  };

  /*
   * Logout.
   */
  const handleLogout = async () => {
    try {
      await logOut();
      dispatch(setUserdata(null));
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  /*
   * Collapsed desktop sidebar.
   */
  if (collapsed) {
    return (
      <div className="hidden lg:flex flex-col items-center w-[56px] h-screen bg-[#0d0f14] border-r border-white/[0.06] py-4 gap-1 shrink-0">
        {/* Expand */}
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer mb-1"
          aria-label="Expand sidebar"
        >
          <PanelRight size={17} />
        </button>

        {/* New chat */}
        <button
          type="button"
          onClick={handleNewChat}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer mb-1"
          aria-label="New chat"
        >
          <Plus size={17} />
        </button>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto w-full px-2.5 pb-2 pt-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {conversations.map((conversation) => {
            const isActive =
              selectedConversation?._id === conversation?._id;

            return (
              <button
                key={conversation?._id}
                type="button"
                onClick={() => handleSelectConversation(conversation)}
                className={`w-full flex items-center justify-center cursor-pointer mb-0.5 px-3 py-2.5 rounded-[10px] border transition-colors duration-150 ${
                  isActive
                    ? "bg-indigo-500/10 border-indigo-500/[0.18]"
                    : "bg-transparent border-transparent hover:bg-white/[0.04]"
                }`}
                aria-label={conversation?.title || "Conversation"}
              >
                <div
                  className={`flex items-center justify-center shrink-0 w-[20px] h-[20px] rounded-lg transition-colors duration-150 ${
                    isActive
                      ? "bg-indigo-500/15 text-indigo-400"
                      : "bg-white/[0.05] text-slate-500"
                  }`}
                >
                  <MessageSquare size={13} />
                </div>
              </button>
            );
          })}
        </div>

        {/* User avatar */}
        <div className="relative shrink-0">
          {userData?.avatar && !imageError ? (
            <img
              className="w-9 h-9 rounded-[10px] object-cover border-2 border-indigo-500/25"
              src={userData.avatar}
              alt="User avatar"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-9 h-9 rounded-[10px] bg-white/[0.06] flex items-center justify-center">
              <User size={15} className="text-slate-400" />
            </div>
          )}
        </div>
      </div>
    );
  }

  /*
   * Expanded sidebar.
   */
  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3.5 left-4 z-50 flex items-center justify-center w-8 h-8 rounded-lg bg-[#0d0f14] border border-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors duration-150 cursor-pointer"
        aria-label="Open sidebar"
      >
        <Menu size={14} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[270px] h-screen shrink-0 bg-[#0d0f14] border-r border-white/[0.06] transition-transform duration-250 ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/[0.06]">
            {/* Collapse desktop */}
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer"
              aria-label="Collapse sidebar"
            >
              <PanelLeftIcon size={16} />
            </button>

            {/* Close mobile */}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="lg:hidden flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer"
              aria-label="Close sidebar"
            >
              <X size={16} />
            </button>

            {/* Logo */}
            <span className="text-[16px] font-semibold text-slate-100 tracking-tight flex-1">
              Dori
            </span>

            {/* Plan */}
            <span className="text-[10px] font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full tracking-wide">
              {userData?.plan || "free"}
            </span>

            {/* New chat icon */}
            <button
              type="button"
              onClick={handleNewChat}
              className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer"
              aria-label="New chat"
            >
              <PenBoxIcon size={14} />
            </button>
          </div>

          {/* New Chat */}
          <div className="px-4 pt-4 pb-1">
            <button
              type="button"
              onClick={handleConversation}
              className="w-full flex items-center justify-center gap-2 text-sm font-medium text-white bg-gradient-to-br from-indigo-500 to-violet-700 rounded-xl py-[10px] border-none cursor-pointer hover:opacity-90 transition-opacity duration-150"
            >
              <Plus size={15} />
              New Chat
            </button>
          </div>

          {/* Section label */}
          {conversations.length === 0 ? (
            <div className="px-5 pt-4 pb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-slate-600">
              No Recent Conversations
            </div>
          ) : (
            <div className="px-5 pt-4 pb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-slate-600">
              Recents
            </div>
          )}

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto px-2.5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {conversations?.map((conversation) => {
              const isActive =
                selectedConversation?._id === conversation?._id;

              return (
                <button
                  key={conversation?._id}
                  type="button"
                  onClick={() =>
                    handleSelectConversation(conversation)
                  }
                  className={`w-full flex items-center gap-2.5 cursor-pointer mb-0.5 px-3 py-2.5 rounded-[10px] border transition-colors duration-150 text-left ${
                    isActive
                      ? "bg-indigo-500/10 border-indigo-500/[0.18]"
                      : "bg-transparent border-transparent hover:bg-white/[0.04]"
                  }`}
                >
                  <div
                    className={`flex items-center justify-center shrink-0 w-[28px] h-[28px] rounded-lg transition-colors duration-150 ${
                      isActive
                        ? "bg-indigo-500/15 text-indigo-400"
                        : "bg-white/[0.05] text-slate-500"
                    }`}
                  >
                    <MessageSquare size={13} />
                  </div>

                  <span
                    className={`text-[13px] font-medium truncate ${
                      isActive
                        ? "text-slate-100"
                        : "text-slate-300"
                    }`}
                  >
                    {conversation?.title || "New Chat"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* User section */}
          <div className="border-t border-white/[0.06] mx-2.5">
            <div className="px-3.5 py-3.5">
              {userData ? (
                <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 hover:bg-white/[0.05] transition-colors duration-150">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {userData?.avatar && !imageError ? (
                      <img
                        className="w-9 h-9 rounded-[10px] object-cover border-2 border-indigo-500/25"
                        src={userData.avatar}
                        alt="User avatar"
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-[10px] bg-white/[0.06] flex items-center justify-center">
                        <User
                          size={15}
                          className="text-slate-400"
                        />
                      </div>
                    )}
                  </div>

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold text-slate-300 truncate">
                      {userData?.name || "User"}
                    </p>

                    <p className="text-[11px] text-slate-600 mt-px">
                      {userData?.plan || "free plan"}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1">
                    {/* Billing */}
                    <button
                      type="button"
                      onClick={() => setShowBilling(true)}
                      className="flex items-center justify-center w-7 h-7 rounded-[7px] border-none bg-transparent text-yellow-600 cursor-pointer hover:bg-white/[0.08] hover:text-slate-400 transition-all duration-150"
                      aria-label="Billing"
                    >
                      <Coins size={16} />
                    </button>

                    {/* Logout */}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex items-center justify-center w-7 h-7 rounded-[7px] border-none bg-transparent text-slate-600 cursor-pointer hover:bg-white/[0.08] hover:text-slate-400 transition-all duration-150"
                      aria-label="Logout"
                    >
                      <LogOut size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 text-sm font-medium text-slate-200 bg-white/[0.05] border border-white/[0.08] rounded-xl py-[11px] cursor-pointer hover:bg-white/[0.08] transition-colors duration-150"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Billing */}
      <BillingDrawer
        open={showBilling}
        onClose={() => setShowBilling(false)}
      />
    </>
  );
}

export default SideBar;