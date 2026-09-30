import { getModel } from "../config/llmModels.js";
import { generatePdf } from "../utils/generatePdf.js";
import { getFromS3 } from "../utils/getFromS3.js";
import { uploadToS3 } from "../utils/uploadTos3.js";

export const pdfAgent = async (state) => {
    try {
        const llm = await getModel("pdf");

        const prompt = `
            You are an expert document writer.

            RETURN ONLY VALID JSON.

            DO NOT return markdown.

            DO NOT return explanations.

            Structure:
            {
                "title":"",
                "subtitle":"",
                "sections":[
                    {
                        "heading":"",
                        "points":[]
                    }
                ]
            }

            Generate 4-8 sections.

            Each section should have 3-6 concise bullet points.

            Topic: ${state.prompt}
        `;

        const res = await llm.invoke(prompt);

        const data = JSON.parse(res.content);

        console.log(data);

        const pdfBuffer = await generatePdf(data);

        const filename = `pdf-${Date.now()}.pdf`;

        const key = await uploadToS3(
            filename,
            pdfBuffer,
            "application/pdf"
        );

        console.log("🔑 RETURNED S3 KEY:", key);

        const downloadUrl = await getFromS3(
            key,
            10 * 60
        );

        console.log("🔗 DOWNLOAD URL:", downloadUrl);

        return {
            ...state,
            aiResponse: `# PDF generated

**${data.title}**

[Download PDF](${downloadUrl})

_Link expires in 10 minutes._`
        };

    } catch (error) {
        console.log(error);

        return {
            ...state,
            aiResponse: "Failed to generate PDF"
        };
    }
};