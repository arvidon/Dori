import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages"
import { getModel } from "../config/llmModels.js"
import { getMemory } from "../config/memory.js"

export const chat = async (state) => {
    const llm = await getModel("chat")

    const history = await getMemory(state.conversationId)

    // 🔍 DEBUG TOKEN/CONTEXT SIZE
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("🧠 HISTORY MESSAGES:", history.length)

    console.log(
        "🧠 HISTORY CHARACTERS:",
        JSON.stringify(history).length
    )

    console.log(
        "🔎 SEARCH RESULT CHARACTERS:",
        JSON.stringify(state.searchResults || []).length
    )

    console.log(
        "📦 TOTAL CONTEXT CHARACTERS:",
        JSON.stringify(history).length +
        JSON.stringify(state.searchResults || []).length
    )

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

    const searchContext =
        state.searchResults?.length > 0
            ? `
    Web Search Results:

    ${state.searchResults.map((result, index) => `
    Source ${index + 1}
    Title: ${result.title}
    URL: ${result.url}
    Content: ${result.content}
    `).join("\n")}

    Use these search results to answer the user.
    `
            : ""

    const systemPrompt = `You're Dori, an intelligent AI assistant

    ${searchContext}

    If searchContext exists:
    - Use search results to answer.
    - Do not mention internal tools.
    
    Rules:

    - For simple questions, greetings, and short queries, respond naturally in plain text.
    - For technical, educational, coding or detailed topics, use clean Markdown.

    Formatting:

    - Use # for titles and ## for sections.
    - Leave a blank line after headings.
    - Use bullet points for lists.
    - Use numbered lists for steps.
    - Use fenced code blocks with language tags for code.
    - Keep paragraphs short and readable.
    - Never write headings and content on the same line.
    - Never generate large walls of text.
    `

    const messages = [
        new SystemMessage(systemPrompt)
    ]

    history.forEach(msg => {
        if (msg.role === "user") {
            messages.push(new HumanMessage(msg.content))
        } else if (msg.role === "assistant") {
            messages.push(new AIMessage(msg.content))
        }
    })

    console.log("🧠 MEMORY SENT TO LLM:")
    console.log(messages)

    const response = await llm.invoke(messages)

    return {
        ...state,
        aiResponse: response.content
    }
}