import { StateGraph } from "@langchain/langgraph";
import { agentState } from "./state.js";
import { router } from "./router.js";
import { chat } from "../agents/chat.agent.js";
import { searchAgent } from "../agents/searcha.agent.js";
import { coding } from "../agents/coding.agent.js";
import { pdfAgent } from "../agents/pdf.agent.js";
import { pptAgent } from "../agents/ppt.agent.js";
import { imageGenAgent } from "../agents/image.agent.js";


const workflow = new StateGraph(agentState)
workflow.addNode("router", router)
workflow.addNode("chat", chat)
workflow.addNode("search", searchAgent)
workflow.addNode("coding", coding)
workflow.addNode("pdf", pdfAgent)
workflow.addNode("ppt", pptAgent)
workflow.addNode("imageGen", imageGenAgent)

workflow.addEdge("__start__", "router")
workflow.addConditionalEdges("router", (state) => {
    switch(state.agent){
        case "chat":
            return "chat";
        case "search":
            return "search";
        case "coding":
            return "coding";
        case "pdf":
            return "pdf";
        case "ppt":
            return "ppt";
        case "imageGen":
            return "imageGen";
        default:
            return "chat";
    }
}, {
    // mapping
    chat: "chat",
    search: "search",
    coding: "coding",
    pdf: "pdf",
    ppt: "ppt",
    imageGen: "imageGen"
})

workflow.addEdge("search", "chat")
workflow.addEdge("chat", "__end__")
workflow.addEdge("coding", "__end__")
workflow.addEdge("ppt", "__end__")
workflow.addEdge("pdf", "__end__")
workflow.addEdge("imageGen", "__end__")

export const graph = workflow.compile()