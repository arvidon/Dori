import api from "../../utils/axios"

export const createConversation = async () => {
    try {
        const { data } = await api.get("/api/chat/create-conversation")

        console.log("🟢 CREATED CONVERSATION:", data)
        console.log("🆔 ID:", data?._id)

        return data
    } catch (error) {
        console.error("❌ CREATE CONVERSATION ERROR:", error)
        console.error("Status:", error.response?.status)
        console.error("Response:", error.response?.data)

        throw error
    }
}