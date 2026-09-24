import axios from "axios"
import { graph } from "../graph/graph.js"
import { addMessage } from "../config/memory.js"
import redis from "../../../shared/redis/redis.js"

export const agent = async (req, res) => {
    try {
        const { prompt, conversationId, agent } = req.body

        //await redis.del(`messages-${conversationId}`)
        console.log("🟢 CONTROLLER START")
        console.log("Prompt:", prompt)
        console.log("Conversation:", conversationId)

        console.log("💾 Saving user message...")

        await addMessage(conversationId, "user", prompt)

        await axios.post(`${process.env.CHAT_SERVICE}/save-messages`, {
            conversationId,
            role: "user",
            content: prompt
        })

        console.log("✅ User message saved")

        console.log("🧠 Starting graph...")

        const result = await graph.invoke({
            prompt,
            conversationId,
            agent
        })

        console.log("✅ Graph finished")
        console.log("Graph result:", result)

        const response = result.aiResponse
        const images = result.images || []
        const artifacts = result.artifacts || []

        await addMessage(conversationId, "assistant", response)

        await axios.post(`${process.env.CHAT_SERVICE}/save-messages`, {
            conversationId,
            role: "assistant",
            content: response,
            images,
            artifacts: result?.artifacts
        })

        return res.status(200).json({
            answer: response,
            images,
            artifacts
        })

    } catch (error) {
        console.error("❌ AGENT CONTROLLER ERROR:", error)

        return res.status(500).json({
            message: `agent error ${error.message}`
        })
    }
}