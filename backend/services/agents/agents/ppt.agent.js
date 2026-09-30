import { getModel } from "../config/llmModels.js"
import { generatePpt } from "../utils/generatePpt.js"
import { getFromS3 } from "../utils/getFromS3.js"
import { uploadToS3 } from "../utils/uploadTos3.js"


export const pptAgent = async(state) => {
    try{
        const llm = await getModel("ppt")
        const prompt = `
            You are a professional presentation designer.

            RETURN ONLY valid JSON.

            Format:
            {
            "title":"",
            "subtitle":"",
            "slides":[
            {
            "title":"",
            "points":[
            "",
            "",
            "",
            ""
            ]
            }
            ]
            }

            Rules:

            - Generate exaclty 6 content slides.
            - Each slide should have 4-6 concise bullet points.
            - No markdown.
            - No code block.
            - Return ONLY JSON.

            Topic: ${state.prompt}
        `
        const res = await llm.invoke(prompt)
        console.log(JSON.parse(res.content))
        const data = JSON.parse(res.content)
        const ppt = await generatePpt(data)
        const buffer = await ppt.write({
            outputType:"nodebuffer"
        })

        const filename = `ppt-${Date.now()}.pptx`;

        const key = await uploadToS3(
            filename,
            buffer,
            "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        );

        const downloadUrl = await getFromS3(
            key,
            10 * 60
        );

        return {
    ...state,
    aiResponse: `# Presentation Generated

**${data.title}**

[Download PPT](${downloadUrl})

_Link expires in 10 minutes._`
};
    }catch(error){
        console.log(error)
        return{
            ...state,
            aiResponse: "Failed to generate PPT..."
        }
    }
}