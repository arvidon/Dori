import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import fs from "fs/promises"
import { getModel } from "../config/llmModels.js"
import { deductCredits } from "../utils/deductCredits.js"

export const imageAnalyzer = async (state) => {
    try {
        if (!state.file?.path) throw new Error("Please upload an image to analyze")
        const llm = await getModel("imageAnalyzer")

        const imageBuffer = await fs.readFile(state.file.path)
        const base64image = imageBuffer.toString("base64")

        const messages = [
            new SystemMessage(`
You are Dori image analyzer agent.

Rules:
- Analyze only the uploaded image.
- Answer the user's question accurately.
- If text exists in the image, extract it.
- If charts or tables exist, explain them.
- If something is unclear, say so.
- Use Markdown when helpful.
- Do not hallucinate.
            `),

            new HumanMessage({
                content: [
                    {
                        type: "text",
                        text: state.prompt || "Analyze the image."
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:${state.file.mimetype};base64,${base64image}`
                        }
                    }
                ]
            })
        ]

        const response = await llm.invoke(messages)
        await deductCredits(state.userId, "image")
        return {
            ...state,
            aiResponse: response.content
        }

    } catch (error) {

        console.error("Image analyzer error:", error)

        throw new Error(`Image analysis failed: ${error.message}`, { cause: error })

    } finally {

        try {
            await fs.unlink(state.file.path)
        } catch {}
    }
}
