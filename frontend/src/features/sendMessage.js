import api from "../../utils/axios"

async function sendMessage(payload) {
    try {
        console.log("🚀 Sending request to agent...")
        console.log("📦 PAYLOAD:", payload)
        console.log("🆔 conversationId:", payload?.conversationId)

        const { data } = await api.post("/api/agents/chat", payload)

        console.log("✅ Agent API returned:", data)

        return data
    } catch (error) {
        console.log("❌ Agent API ERROR:", error)
        console.log("Status:", error.response?.status)
        console.log("Response:", error.response?.data)
        console.log("URL:", error.config?.url)

        throw error
    }
}

export default sendMessage