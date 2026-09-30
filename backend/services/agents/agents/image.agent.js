import { getModel } from "../config/llmModels.js";
import axios from "axios";
import { uploadToS3 } from "../utils/uploadTos3.js";
import { getFromS3 } from "../utils/getFromS3.js";

export const imageGenAgent = async (state) => {
    console.log("🔥🔥🔥 IMAGE AGENT ACTUALLY CALLED 🔥🔥🔥");
    console.log("IMAGE STATE:", state);
    try {
        const llm = await getModel("image");

        const res = await llm.invoke(`
You are an elite AI image prompt engineer.

Convert the user request into a highly detailed image generation prompt.

Requirements:
- Cinematic lighting
- Professional composition
- Ultra realistic
- High detail
- Beautiful color palette
- Sharp focus
- 8K quality
- Photorealistic
- Depth of field
- Professional photography
- Stunning visuals

Return only the image prompt.

User Request:
${state.prompt}
        `);

        const prompt = res.content.trim();

        console.log("🎨 IMAGE PROMPT:", prompt);

        const imageUrl =
            `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;

        const imageRes = await axios.get(imageUrl, {
            responseType: "arraybuffer"
        });

        const buffer = Buffer.from(imageRes.data);

        const filename = `image-${Date.now()}.png`;

        const key = await uploadToS3(
            filename,
            buffer,
            "image/png"
        );

        console.log("🖼️ S3 IMAGE KEY:", key);

        const downloadUrl = await getFromS3(
            key,
            10 * 60
        );

        console.log("🔗 IMAGE URL:", downloadUrl);

        return {
            ...state,

            aiResponse: `# Image Generated

![Generated Image](${downloadUrl})

[Download Image](${downloadUrl})

_Link expires in 10 minutes._`,

            images: [downloadUrl]
        };

    } catch (error) {
        console.error("❌ IMAGE GENERATION ERROR:", error);

        return {
            ...state,
            aiResponse: "Failed to generate image"
        };
    }
};