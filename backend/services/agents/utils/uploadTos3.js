import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../config/s3.js";

export const uploadToS3 = async (filename, buffer, contentType) => {
    const key = `pdfs/${filename}`;

    console.log("⬆️ S3 UPLOAD KEY:", key);

    const command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType
    });

    await s3.send(command);

    console.log("✅ S3 UPLOAD SUCCESS:", key);

    return key;
};