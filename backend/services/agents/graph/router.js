import { getModel } from "../config/llmModels.js" 


export const router = async(state) => {

    if(state.agent && state.agent!=="auto"){
        return{
            ...state,
            agent: state.agent
        }
    }


    const llm = getModel("router")
    const prompt = `You are an agent router.
    
    Available agents:
    
    - chat
    - search
    - coding
    - pdf
    - ppt
    - image

    Rules:

    chat:
    General conversation,
    explanations,
    learning,
    questions.

    search:
    current events,
    latest information,
    news,
    recent developments,
    internet lookup.

    coding:
    Generate code,
    debug code,
    build projects,
    architecture,
    API design.

    pdf: 
    Questions about generate PDFs,
    or document context.

    ppt:
    Questions about generate ppts
    or ppt context.

    Image:
    Generate image

    Return ONLY one word:

    chat 
    search
    coding
    pdf
    Image

    User Query:
    ${state.prompt}
    `
    const response = await llm.invoke(prompt)
    console.log(response)
    return{
        ...state,
        agent:response.content.trim().toLowerCase()
    }
}