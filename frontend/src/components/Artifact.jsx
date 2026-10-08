import {
  Check,
  Code2,
  Copy,
  Eye,
  PanelRightClose,
  PanelRightOpen,
  X,
} from "lucide-react";

import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { AnimatePresence, motion } from "motion/react";
import Editor from "@monaco-editor/react";

function Artifact() {
  const { artifacts = [] } = useSelector((state) => state.message);

  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState("code");
  const [activeFile, setActiveFile] = useState(0);
  const [copied, setCopied] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const artifact = artifacts[0];

  /*
   * Always calculate files before the conditional return.
   * This allows the useEffect below to run on every render.
   */
  const files = Array.isArray(artifact?.files)
    ? artifact.files
    : [];

  /*
   * Keep activeFile valid when the artifact/files change.
   */
  useEffect(() => {
    if (files.length === 0) {
      setActiveFile(0);
      return;
    }

    if (activeFile >= files.length) {
      setActiveFile(0);
    }
  }, [files.length, activeFile]);

  /*
   * Only return after ALL hooks have been called.
   *
   * This fixes:
   * "React has detected a change in the order of Hooks"
   */
  if (!artifact) {
    return null;
  }

  const file = files[activeFile] || files[0];

  /*
   * Find preview files
   */
  const htmlFile = files.find(
    (item) => item?.name?.toLowerCase() === "index.html"
  );

  const cssFile = files.find(
    (item) => item?.name?.toLowerCase() === "style.css"
  );

  const jsFile = files.find(
    (item) => item?.name?.toLowerCase() === "script.js"
  );

  const canPreview = Boolean(htmlFile);

  /*
   * Preview document
   */
  const previewDoc = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <style>
    ${cssFile?.content || ""}
  </style>
</head>

<body>
  ${htmlFile?.content || ""}

  <script>
    ${jsFile?.content || ""}
  </script>
</body>
</html>
`;

  /*
   * Copy current file
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(file?.content || "");

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy file:", error);
    }
  };

  /*
   * Monaco language detection
   */
  const detectLanguage = (fileName = "") => {
    const name = fileName.toLowerCase();

    if (name.endsWith(".html")) return "html";
    if (name.endsWith(".css")) return "css";
    if (name.endsWith(".js")) return "javascript";
    if (name.endsWith(".jsx")) return "javascript";
    if (name.endsWith(".ts")) return "typescript";
    if (name.endsWith(".tsx")) return "typescript";
    if (name.endsWith(".json")) return "json";
    if (name.endsWith(".py")) return "python";
    if (name.endsWith(".java")) return "java";
    if (name.endsWith(".cpp")) return "cpp";
    if (name.endsWith(".c")) return "c";

    return "plaintext";
  };

  /*
   * Select a file
   */
  const handleFileSelect = (index) => {
    setActiveFile(index);
    setTab("code");
  };

  /*
   * Shared panel
   */
  const PanelContent = ({ mobile = false }) => {
    /*
     * Collapsed desktop panel
     */
    if (collapsed && !mobile) {
      return (
        <div
          className="
            h-full
            w-full
            bg-[#0d0f14]
            border
            border-white/[0.06]
            flex
            flex-col
            items-center
            py-4
            gap-3
          "
        >
          <button
            onClick={() => setCollapsed(false)}
            className="
              flex
              items-center
              justify-center
              w-7
              h-7
              rounded-lg
              text-slate-500
              hover:text-slate-200
              hover:bg-white/[0.05]
              transition-colors
              duration-150
              bg-transparent
              border-none
              cursor-pointer
              shrink-0
            "
          >
            <PanelRightOpen size={16} />
          </button>

          <div className="flex items-center justify-center flex-1">
            <div
              className="
                text-[10px]
                font-medium
                text-slate-600
                tracking-widest
                uppercase
                whitespace-nowrap
              "
              style={{
                writingMode: "vertical-lr",
                transform: "rotate(180deg)",
              }}
            >
              {artifact.title || "Artifact"}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className="
          flex
          flex-col
          h-full
          w-full
          bg-[#0d0f14]
        "
      >
        {/* HEADER */}
        <div
          className="
            h-14
            px-4
            border-b
            border-white/[0.06]
            flex
            items-center
            gap-3
            shrink-0
          "
        >
          {/* Close / collapse */}
          {mobile ? (
            <button
              onClick={() => setMobileOpen(false)}
              className="
                flex
                items-center
                justify-center
                w-7
                h-7
                rounded-lg
                text-slate-500
                hover:text-slate-200
                hover:bg-white/[0.05]
                transition-colors
                duration-150
                bg-transparent
                border-none
                cursor-pointer
                shrink-0
              "
            >
              <X size={16} />
            </button>
          ) : (
            <button
              onClick={() => setCollapsed(true)}
              className="
                flex
                items-center
                justify-center
                w-7
                h-7
                rounded-lg
                text-slate-500
                hover:text-slate-200
                hover:bg-white/[0.05]
                transition-colors
                duration-150
                bg-transparent
                border-none
                cursor-pointer
                shrink-0
              "
            >
              <PanelRightClose size={16} />
            </button>
          )}

          {/* TITLE */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className="
                flex
                items-center
                justify-center
                w-6
                h-6
                rounded-md
                bg-amber-200
                border
                border-pink-300/25
                shrink-0
              "
            >
              <Code2
                className="text-blue-300"
                size={12}
              />
            </div>

            <div
              className="
                text-[13px]
                font-medium
                text-slate-200
                truncate
              "
            >
              {artifact.title || "Artifact"}
            </div>
          </div>

          {/* COPY */}
          <button
            onClick={handleCopy}
            className="
              flex
              items-center
              gap-1.5
              px-2.5
              py-1.5
              text-[11px]
              font-medium
              text-slate-400
              hover:text-slate-200
              hover:bg-white/[0.05]
              rounded-lg
              transition-colors
              duration-150
              bg-transparent
              border-none
              cursor-pointer
            "
            title="Copy code"
          >
            {copied ? (
              <Check size={15} />
            ) : (
              <Copy size={15} />
            )}
          </button>

          {/* CODE / PREVIEW */}
          {canPreview && (
            <div
              className="
                flex
                items-center
                gap-1
                bg-white/[0.04]
                border
                border-white/[0.06]
                p-1
                rounded-lg
              "
            >
              <button
                onClick={() => setTab("code")}
                className={`
                  flex
                  items-center
                  gap-1.5
                  px-2.5
                  py-1
                  text-[11px]
                  font-medium
                  rounded-md
                  transition-colors
                  duration-150

                  ${
                    tab === "code"
                      ? "bg-pink-200 text-white"
                      : "text-slate-500 hover:text-slate-200"
                  }
                `}
              >
                <Code2 size={11} />
                Code
              </button>

              <button
                onClick={() => setTab("preview")}
                className={`
                  flex
                  items-center
                  gap-1.5
                  px-2.5
                  py-1
                  text-[11px]
                  font-medium
                  rounded-md
                  transition-colors
                  duration-150

                  ${
                    tab === "preview"
                      ? "bg-pink-200 text-white"
                      : "text-slate-500 hover:text-slate-200"
                  }
                `}
              >
                <Eye size={11} />
                Preview
              </button>
            </div>
          )}
        </div>

        {/* FILE TABS */}
        {tab === "code" && files.length > 0 && (
          <div
            className="
              flex
              border-b
              border-white/[0.06]
              overflow-x-auto
              shrink-0
              [scrollbar-width:none]
              [&::-webkit-scrollbar]:hidden
            "
          >
            {files.map((item, index) => (
              <button
                key={`${item?.name || "file"}-${index}`}
                onClick={() => handleFileSelect(index)}
                className={`
                  relative
                  px-4
                  py-2.5
                  text-[11px]
                  font-medium
                  whitespace-nowrap
                  transition-colors
                  duration-150
                  border-r
                  border-white/[0.05]
                  cursor-pointer
                  bg-transparent

                  ${
                    activeFile === index
                      ? "text-amber-200"
                      : "text-slate-500 hover:text-slate-300"
                  }
                `}
              >
                {item?.name || `File ${index + 1}`}

                {activeFile === index && (
                  <div
                    className="
                      absolute
                      bottom-0
                      left-0
                      right-0
                      h-[2px]
                      bg-pink-200
                      rounded-t-full
                    "
                  />
                )}
              </button>
            ))}
          </div>
        )}

        {/* CONTENT */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {tab === "preview" && canPreview ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="w-full h-full"
            >
              <iframe
                title="artifact-preview"
                srcDoc={previewDoc}
                className="
                  w-full
                  h-full
                  bg-white
                  border-0
                "
                sandbox="allow-scripts"
              />
            </motion.div>
          ) : (
            <motion.div
              key={file?.name || "editor"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full"
            >
              <Editor
                theme="vs-dark"
                language={detectLanguage(file?.name)}
                value={file?.content || ""}
                options={{
                  readOnly: true,
                  minimap: {
                    enabled: false,
                  },
                  fontSize: 13,
                  wordWrap: "on",
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  padding: {
                    top: 16,
                  },
                  lineNumbers: "on",
                  renderLineHighlight: "none",
                  folding: true,
                  smoothScrolling: true,
                }}
              />
            </motion.div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* MOBILE VIEW CODE BUTTON */}
      <button
        onClick={() => setMobileOpen(true)}
        className="
          lg:hidden
          fixed
          bottom-24
          right-4
          z-40
          flex
          items-center
          gap-2
          px-3.5
          py-2
          rounded-xl
          bg-pink-300
          text-white
          text-[12px]
          font-medium
          shadow-lg
          shadow-amber-300/20
          border-none
          cursor-pointer
          transition-colors
          duration-150
        "
      >
        <Code2 size={13} />
        View Code
      </button>

      {/* MOBILE PANEL */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* BACKDROP */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="
                lg:hidden
                fixed
                inset-0
                z-40
                bg-black/60
                backdrop-blur-sm
              "
            />

            {/* PANEL */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{
                duration: 0.25,
                ease: "easeInOut",
              }}
              className="
                lg:hidden
                fixed
                inset-y-0
                right-0
                z-50
                w-[88vw]
                max-w-[420px]
                border-l
                border-white/[0.06]
                overflow-hidden
                bg-[#0d0f14]
              "
            >
              <PanelContent mobile />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* DESKTOP PANEL */}
      <motion.div
        initial={false}
        animate={{
          width: collapsed ? 48 : 400,
        }}
        transition={{
          duration: 0.25,
          ease: "easeInOut",
        }}
        className="
          hidden
          lg:flex
          h-full
          border
          border-white/[0.06]
          flex-col
          overflow-hidden
          shrink-0
        "
      >
        <PanelContent />
      </motion.div>
    </>
  );
}

export default Artifact;