import {
    Code2,
    FileText,
    Globe,
    ImageIcon,
    MessageSquare,
    Mic,
    Paperclip,
    Presentation,
    Send,
    X,
    Zap,
} from "lucide-react";

import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import sendMessage from "../features/sendMessage";
import { addMessage, setArtifacts } from "../redux/messageSlice";
import { createConversation } from "../features/createConversation";
import {
    addConversation,
    setConvTitle,
    setSelectedConversation,
} from "../redux/conversationSlice";
import { updateConversation } from "../features/updateConversation";


function ChatInput() {
    const [value, setValue] = useState("");
    const [selectedAgent, setSelectedAgent] = useState("auto");
    const [selectedFile, setSelectedFile] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const [sendError, setSendError] = useState("");

    const fileRef = useRef(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    const dispatch = useDispatch();

    const { selectedConversation } = useSelector(
        (state) => state.conversation
    );

    const { messages } = useSelector(
        (state) => state.message
    );


    /*
    |--------------------------------------------------------------------------
    | File preview
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (!selectedFile) {
            setPreviewUrl(null);
            return;
        }

        if (selectedFile.type.startsWith("image/")) {
            const url = URL.createObjectURL(selectedFile);

            setPreviewUrl(url);

            return () => {
                URL.revokeObjectURL(url);
            };
        }

        setPreviewUrl(null);
    }, [selectedFile]);


    /*
    |--------------------------------------------------------------------------
    | Send message
    |--------------------------------------------------------------------------
    */

    const handleMessage = async () => {
        const trimmedValue = value.trim();

        if (!trimmedValue || isSending) {
            return;
        }

        console.log(
            "🚨 HANDLER CALLED",
            new Date().toISOString()
        );

        setIsSending(true);
        setSendError("");

        try {
            /*
            |--------------------------------------------------------------------------
            | Get or create conversation
            |--------------------------------------------------------------------------
            */

            let conversation = selectedConversation;

            if (!conversation) {
                const conv = await createConversation();

                console.log(
                    "🔥 CONV IN CHAT INPUT:",
                    conv
                );

                console.log(
                    "🔥 CONV ID:",
                    conv?._id
                );

                dispatch(setSelectedConversation(conv));
                dispatch(addConversation(conv));

                conversation = conv;
            }

            if (!conversation?._id) {
                throw new Error("Conversation ID is missing");
            }

            console.log(
                "🔥 FINAL CONVERSATION:",
                conversation
            );

            console.log(
                "🔥 FINAL ID:",
                conversation._id
            );


            /*
            |--------------------------------------------------------------------------
            | Update title for new conversations
            |--------------------------------------------------------------------------
            */

            if (conversation.title === "New Chat") {
                await updateConversation({
                    id: conversation._id,
                    title: trimmedValue,
                });

                dispatch(
                    setConvTitle({
                        conversationId: conversation._id,
                        title: trimmedValue.slice(0, 40),
                    })
                );
            }


            /*
            |--------------------------------------------------------------------------
            | Create FormData
            |--------------------------------------------------------------------------
            */

            const formData = new FormData();

            formData.append(
                "prompt",
                trimmedValue
            );

            formData.append(
                "conversationId",
                conversation._id
            );

            formData.append(
                "agent",
                selectedAgent.toLowerCase()
            );

            if (selectedFile) {
                formData.append(
                    "file",
                    selectedFile
                );
            }


            console.log("🔥 SEND CLICKED");

            console.log(
                "Prompt:",
                trimmedValue
            );

            console.log(
                "Conversation:",
                conversation
            );

            console.log(
                "Agent:",
                selectedAgent
            );

            console.log(
                "File:",
                selectedFile
            );


            /*
            |--------------------------------------------------------------------------
            | Optimistically add user message
            |--------------------------------------------------------------------------
            */

            dispatch(
                addMessage({
                    role: "user",
                    content: trimmedValue,
                })
            );

            setValue("");


            /*
            |--------------------------------------------------------------------------
            | Send to backend
            |--------------------------------------------------------------------------
            */

            const data = await sendMessage(formData);

            console.log(
                "🤖 AGENT RESPONSE:",
                data
            );


            /*
            |--------------------------------------------------------------------------
            | Handle response
            |--------------------------------------------------------------------------
            */

            dispatch(
                setArtifacts(
                    data?.artifacts || []
                )
            );

            dispatch(
                addMessage({
                    role: "assistant",
                    content: data?.answer || "",
                    images: data?.images || [],
                })
            );


            /*
            |--------------------------------------------------------------------------
            | Clear uploaded file
            |--------------------------------------------------------------------------
            */

            setSelectedFile(null);

            if (fileRef.current) {
                fileRef.current.value = "";
            }

        } catch (error) {
            setSendError(error.response?.data?.message || "Unable to analyze this upload. Please try again.");
            console.error(
                "❌ Message failed:",
                error
            );
        } finally {
            setIsSending(false);
        }
    };


    /*
    |--------------------------------------------------------------------------
    | Agents
    |--------------------------------------------------------------------------
    */

    const agents = [
        {
            id: "auto",
            icon: Zap,
            label: "Auto",
        },
        {
            id: "chat",
            icon: MessageSquare,
            label: "Chat",
        },
        {
            id: "coding",
            icon: Code2,
            label: "Coding",
        },
        {
            id: "pdf",
            icon: FileText,
            label: "PDF",
        },
        {
            id: "ppt",
            icon: Presentation,
            label: "PPT",
        },
        {
            id: "imageGen",
            icon: ImageIcon,
            label: "Image",
        },
        {
            id: "search",
            icon: Globe,
            label: "Search",
        },
    ];


    /*
    |--------------------------------------------------------------------------
    | File selection
    |--------------------------------------------------------------------------
    */

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        const isPdf =
            file.type === "application/pdf";

        const isImage =
            file.type.startsWith("image/");

        if (!isPdf && !isImage) {
            console.warn(
                "Unsupported file type:",
                file.type
            );

            event.target.value = "";
            return;
        }

        setSelectedFile(file);
    };


    /*
    |--------------------------------------------------------------------------
    | Remove file
    |--------------------------------------------------------------------------
    */

    const handleRemoveFile = () => {
        setSelectedFile(null);

        if (fileRef.current) {
            fileRef.current.value = "";
        }
    };


    /*
    |--------------------------------------------------------------------------
    | Render
    |--------------------------------------------------------------------------
    */

    return (
        <div className="w-full overflow-hidden px-3 md:px-5 py-4 border-t border-white/[0.06] bg-[#0d0f14]">
            {sendError && <p role="alert" className="mb-2 text-sm text-red-400">{sendError}</p>}

            <div className="flex flex-col gap-2 bg-white/[0.03] border border-white/[0.07] rounded-2xl px-4 pt-3.5 pb-3">


                {/* Agents */}

                <div className="flex w-[80%] gap-2 pr-2 flex-wrap">

                    {agents.map((agent) => {

                        const isActive =
                            selectedAgent === agent.id;

                        const Icon =
                            agent.icon;

                        return (
                            <button
                                key={agent.id}
                                type="button"
                                onClick={() =>
                                    setSelectedAgent(
                                        agent.id
                                    )
                                }
                                className={`
                                    flex-shrink-0
                                    cursor-pointer
                                    inline-flex
                                    items-center
                                    gap-1.5
                                    px-3
                                    py-2
                                    rounded-full
                                    text-xs
                                    font-medium
                                    border
                                    transition-all

                                    ${
                                        isActive
                                            ? "bg-gradient-to-r from-amber-400 to-pink-300 text-white border-transparent shadow-[0_1px_8px_rgba(99,102,241,.35)]"
                                            : "bg-white/[0.03] text-slate-400 border-white/[0.06] hover:bg-white/[0.07]"
                                    }
                                `}
                            >
                                <Icon
                                    size={14}
                                    className={
                                        isActive
                                            ? "text-white"
                                            : "text-slate-500"
                                    }
                                />

                                {agent.label}
                            </button>
                        );
                    })}

                </div>


                {/* File preview */}

                {selectedFile && (
                    <div className="my-3">

                        <div className="inline-flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">

                            {/* PDF */}

                            {selectedFile.type ===
                                "application/pdf" && (
                                <FileText
                                    size={18}
                                    className="text-blue-300"
                                />
                            )}


                            {/* Image */}

                            {selectedFile.type.startsWith(
                                "image/"
                            ) &&
                                previewUrl && (
                                    <img
                                        src={previewUrl}
                                        alt={selectedFile.name}
                                        className="h-10 w-10 rounded-xl object-cover"
                                    />
                                )}


                            <div>

                                <p className="text-xs text-white">
                                    {selectedFile.name}
                                </p>

                                <p className="text-[10px] text-slate-500">
                                    {(
                                        selectedFile.size /
                                        1024
                                    ).toFixed(1)}
                                    KB
                                </p>

                            </div>


                            <button
                                type="button"
                                onClick={
                                    handleRemoveFile
                                }
                                className="ml-2"
                            >
                                <X
                                    size={14}
                                    className="text-slate-500 hover:text-white"
                                />
                            </button>

                        </div>

                    </div>
                )}


                {/* Text input */}

                <textarea
                    placeholder="Ask anything..."
                    onChange={(e) =>
                        setValue(e.target.value)
                    }
                    onKeyDown={(e) => {
                        if (
                            e.key === "Enter" &&
                            !e.shiftKey
                        ) {
                            e.preventDefault();

                            handleMessage();
                        }
                    }}
                    value={value}
                    disabled={isSending}
                    className="
                        w-full
                        bg-transparent
                        outline-none
                        resize-none
                        text-[14px]
                        text-slate-200
                        placeholder:text-slate-600
                        leading-relaxed
                        [scrollbar-width:none]
                        [&::-webkit-scrollbar]:hidden
                        disabled:opacity-50
                    "
                    rows={3}
                />


                {/* Bottom controls */}

                <div className="flex items-center justify-between">


                    {/* Left */}

                    <div className="flex items-center gap-1">

                        <input
                            type="file"
                            accept=".pdf,image/*"
                            hidden
                            ref={fileRef}
                            onChange={
                                handleFileChange
                            }
                        />


                        <button
                            type="button"
                            onClick={() =>
                                fileRef.current?.click()
                            }
                            className="
                                flex
                                items-center
                                justify-center
                                w-8
                                h-8
                                rounded-lg
                                text-slate-300
                                hover:text-slate-400
                                hover:bg-white/[0.05]
                                border
                                border-transparent
                                hover:border-white/[0.06]
                                transition-all
                                duration-150
                                bg-transparent
                                cursor-pointer
                            "
                        >
                            <Paperclip
                                size={16}
                                className="text-white"
                            />
                        </button>


                        <button
                            type="button"
                            className="
                                flex
                                items-center
                                justify-center
                                w-8
                                h-8
                                rounded-lg
                                text-slate-300
                                hover:text-slate-400
                                hover:bg-white/[0.05]
                                border
                                border-transparent
                                hover:border-white/[0.06]
                                transition-all
                                duration-150
                                bg-transparent
                                cursor-pointer
                            "
                        >
                            <Mic size={16} />
                        </button>

                    </div>


                    {/* Send */}

                    <button
                        type="button"
                        disabled={
                            !value.trim() ||
                            isSending
                        }
                        onClick={
                            handleMessage
                        }
                        className={`
                            flex
                            items-center
                            justify-center
                            w-8
                            h-8
                            rounded-lg
                            border-none
                            transition-all
                            duration-150

                            ${
                                value.trim() &&
                                !isSending
                                    ? "bg-gradient-to-br from-indigo-500 to-yellow-200 hover:opacity-90 text-white cursor-pointer"
                                    : "bg-white/[0.05] text-slate-600 cursor-not-allowed"
                            }
                        `}
                    >
                        <Send size={16} />
                    </button>

                </div>

            </div>

        </div>
    );
}


export default ChatInput;
