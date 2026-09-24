import { getModel } from "../config/llmModels.js"

export const coding = async(state) => {
    const intentLlm = await getModel("intent")
    const llm = await getModel("coding")
    const intentRes = await intentLlm.invoke(`
        You are an intent classifier.

        Return ONLY one of these values.

        CODE_GENERATION
        CODE_REVIEW
        CODE_EXPLANATION
        DEBUGGING
        OPTIMIZATION
        CONVERSION
        DOCUMENTATION

        User Request:${state.prompt}
    `)
    const intent = intentRes.content
    if(intent == "CODE_GENERATION"){
        const prompt = `
        You are Dori Coding Agent.

        Generate the requested project.

        Default stack:
        - HTML
        - CSS
        - Javascript

        Use React / Next.js / Vue ONLY if expected requested.

        Rules:

        - Responsive
        - Modern UI
        - CSS Variables
        - Flexbox/Grid
        - Smooth Scroll
        - Hover Effects
        - Beautiful spacing
        - Single page unless user asks otherwise.

        IMAGES

        ======================================

        Always use real Unsplash images.

        Never Use Placeholders.

        Return ONLY valid JSON.

        Schema:
        {
            "files": [
                {
                "name": "index.html",
                "content": "..."
                },
                {
                "name": "style.css",
                "content": "..."
                },
                {
                "name": "script.js",
                "content": "..."
                }
            ]
        }
        
        Rules:

        - Output must start with {
        - Output must end with }
        - No markdown
        - No explanation
        - No extra text
        - No \'\'\'
        - Never mention intent

        User Request:
        ${state.prompt}
        `
        const res = await llm.invoke(prompt)

        let content = res.content.trim()

        // Remove markdown code fences if the model adds them
        content = content.replace(/^```json\s*/i, "")
        content = content.replace(/^```\s*/i, "")
        content = content.replace(/\s*```$/i, "")

        console.log("========== RAW MODEL RESPONSE ==========")
        console.log(res.content)
        console.log("========== END RESPONSE ==========")

        const data = JSON.parse(content)

        console.log(data)
        return{
            ...state,
            aiResponse: "code generated successfully.",
            artifacts: [
                {
                    id: Date.now(),
                    type: "Project",
                    files: data.files || [],
                    title: state.prompt
                }
            ]
        }
    }

    const res = await llm.invoke(`
            The user's request is:
            ${intent}
            Return Markdown only.
            Never generate project files.
            Use headings like:
            # Overview
            ## Explanation
            ## Problems
            ## Improvements
            ## Best Practices
            ## Optimized code (if needed)

            User Request:
            ${state.prompt}
        `)

        const data = res.content
        return{
            ...state,
            aiResponse:data,
            artifacts: []
        }
}