import { ChatGroq } from "@langchain/groq"
import {ChatOpenRouter} from "@langchain/openrouter"

const groq = new ChatGroq({
    model: "openai/gpt-oss-120b"
})

const vision = new ChatGroq({
    model: process.env.GROQ_VISION_MODEL || "qwen/qwen3.8-27b",
    maxTokens: 2500
})

// Coding returns whole project files as JSON, so it needs far more output room.
const openrouter = new ChatOpenRouter({
    model: "deepseek/deepseek-chat",
    temperature: 0,
    maxTokens: 8000
})

export const getModel = (agent) => {
    switch (agent) {
        case "chat":
            return groq

        case "search":
            return groq

        case "coding":
            return openrouter
            
        case "imageAnalyzer":
            return vision

        default:
            return groq
    }
}
