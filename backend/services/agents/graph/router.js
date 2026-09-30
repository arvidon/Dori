import { getModel } from "../config/llmModels.js";

export const router = async (state) => {

    if (state.agent && state.agent !== "auto") {
        return {
            ...state,
            agent: state.agent
        };
    }

    const llm = await getModel("router");

    const prompt = `
You are an agent router.

Choose exactly ONE agent.

Available agents:

chat
search
coding
pdf
ppt
imageGen

Definitions:

chat:
General conversation, explanations, learning, normal questions.

search:
Current events, latest information, news, recent developments, internet lookup.

coding:
Generate code, debug code, build projects, architecture, API design.

pdf:
Generate a PDF or document.

ppt:
Generate a PowerPoint presentation.

imageGen:
Generate or create an image, picture, illustration, photo, artwork, visual, or any other image.

IMPORTANT:
If the user says "generate an image", "generate a cat", "create a picture", "make an image", "draw a cat", or similar visual-generation request, choose imageGen.

Return ONLY ONE of these exact values:

chat
search
coding
pdf
ppt
imageGen

User Query:
${state.prompt}
`;

    const response = await llm.invoke(prompt);

    console.log("🚦 ROUTER RAW RESPONSE:", response.content);

    let agent = response.content
        .trim()
        .replace(/[`"' ]/g, "");

    console.log("🚦 ROUTER FINAL AGENT:", agent);

    // Safety normalization
    if (agent.toLowerCase() === "image") {
        agent = "imageGen";
    }

    return {
        ...state,
        agent
    };
};