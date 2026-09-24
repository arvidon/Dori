import React, { useState } from "react"
import Markdown from "react-markdown"
import { X, Check, Copy } from "lucide-react"
import remarkGfm from "remark-gfm"
import {Prism as SyntaxHighlighter} from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism"

function MessageBubble({ role, content, images = [] }) {
    const isUser = role === "user"
    const [lightBox, setLightBox] = useState(null)
    const [copyCode, setCopyCode] = useState("")

    const copycode = async(code) => {
        await navigator.clipboard.writeText(code)
        setCopyCode(code)
        setTimeout(() => {
            setCopyCode("")
        }, 2000)
    }

    return (
        <>
            <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div
                    className={`w-fit max-w-[92%] md:max-w-[72%] px-4 py-2.5 rounded-2xl break-words leading-relaxed
                    ${
                        isUser
                            ? "bg-linear-to-br from-indigo-500 to-yellow-200 text-white rounded-tr-sm"
                            : "bg-white/[0.04] border border-white/[0.07] text-slate-200 rounded-tl-sm"
                    }`}
                >
                    {images.length > 0 && (
                        <div className="flex flex-wrap gap-3 mt-4">
                            {images.map((img, i) => (
                                <img
                                    key={i}
                                    src={img}
                                    onClick={() => {
                                        console.log("IMAGE CLICKED:", img)
                                        setLightBox(img)
                                    }}
                                    loading="lazy"
                                    onError={(e) => e.currentTarget.remove()}
                                    className="w-40 h-28 rounded-xl object-cover border border-white/10 cursor-zoom-in hover:opacity-90 transition"
                                />
                            ))}
                        </div>
                    )}

                    <Markdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            h1: ({ children }) => (
                                <h1 className="text-2xl font-bold mt-5 mb-3">
                                    {children}
                                </h1>
                            ),

                            h2: ({ children }) => (
                                <h2 className="text-xl font-semibold mt-4 mb-2">
                                    {children}
                                </h2>
                            ),

                            h3: ({ children }) => (
                                <h3 className="text-lg font-semibold mt-3 mb-2">
                                    {children}
                                </h3>
                            ),

                            p: ({ children }) => (
                                <p className="mb-3 whitespace-pre-wrap break-words">
                                    {children}
                                </p>
                            ),

                            ul: ({ children }) => (
                                <ul className="list-disc pl-5 space-y-1 my-2">
                                    {children}
                                </ul>
                            ),

                            ol: ({ children }) => (
                                <ol className="list-decimal pl-5 space-y-1 my-2">
                                    {children}
                                </ol>
                            ),

                            table: ({ children }) => (
                                <div className="overflow-x-auto my-4">
                                    <table className="min-w-full border border-white/10">
                                        {children}
                                    </table>
                                </div>
                            ),

                            th: ({ children }) => (
                                <th className="border border-white/10 bg-white/5 px-3 py-2 text-left">
                                    {children}
                                </th>
                            ),

                            td: ({ children }) => (
                                <td className="border border-white/10 px-3 py-2">
                                    {children}
                                </td>
                            ),

                            a: ({ href, children }) => (
                                <a
                                    href={href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-pink-200 underline inline-flex items-center gap-1"
                                >
                                    {children}
                                </a>
                            ),

                            code: ({ className, children }) => {
                                const value = String(children).trim()

                                if (!className) {
                                    return (
                                        <code className="px-1.5 py-0.5 rounded bg-white/10 text-pink-400">
                                            {value}
                                        </code>
                                    )
                                }

                                const language = className.replace("language-", "")

                                return (
                                    <div className="my-4 overflow-hidden rounded-xl border border-white/10 bg-[#111318]">
                                        <div className="flex items-center justify-between bg-[#1b1d24] border-b border-white/10 px-4 py-2">
                                            <span className="uppercase text-xs text-slate-400">
                                                {language}
                                            </span>

                                            <button
                                                className="flex items-center gap-1 text-xs"
                                                onClick={() => copycode(value)}
                                            >
                                                {copyCode === value ? (
                                                    <>
                                                        <Check size={14} />
                                                        Copied
                                                    </>
                                                ) : (
                                                    <Copy size={14} />
                                                )}
                                            </button>
                                        </div>

                                        <SyntaxHighlighter
                                            language={language}
                                            style={oneDark}
                                            wrapLongLines
                                            showLineNumbers
                                            customStyle={{
                                                margin: 0,
                                                padding: "16px",
                                                background: "#0d1117",
                                                fontSize: "13px"
                                            }}
                                        >
                                            {value}
                                        </SyntaxHighlighter>
                                    </div>
                                )
                            }
                        }}
                    >
                        {content}
                    </Markdown>
                </div>
            </div>
            {lightBox && (
                <div
                    className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
                    onClick={() => setLightBox(null)}
                >
                    {/* Close button */}
                    <button
                        type="button"
                        className="absolute top-5 right-5 z-[100000] flex items-center justify-center
                        w-10 h-10 rounded-full bg-white/10 text-white/80 hover:text-white
                        hover:bg-white/20 transition cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation()
                            setLightBox(null)
                        }}
                    >
                        <X size={24} />
                    </button>

                    {/* Enlarged image */}
                    <img
                        src={lightBox}
                        alt="Expanded"
                        onClick={(e) => e.stopPropagation()}
                        className="block max-w-[95vw] max-h-[90vh] w-auto h-auto
                        rounded-xl object-contain shadow-2xl"
                    />
                </div>
            )}
        </>
    )
}

export default MessageBubble