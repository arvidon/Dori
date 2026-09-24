import { searchTool } from "../config/tavily.js"

export const searchAgent = async (state) => {
    try {
        console.log("🔎 SEARCH AGENT STARTED")
        console.log("Query:", state.prompt)

        const results = await searchTool.invoke({
            query: state.prompt
        })

        console.log("✅ TAVILY RESULT:")
        console.log(JSON.stringify(results, null, 2))

        console.log("🖼️ TAVILY IMAGES:")
        console.log(results.images)

        return {
            ...state,
            searchResults: results,
            images: results.images || []
        }

    } catch (error) {
        console.error("❌ SEARCH AGENT ERROR:", error)

        return {
            ...state,
            searchResults: [],
            images: []
        }
    }
}