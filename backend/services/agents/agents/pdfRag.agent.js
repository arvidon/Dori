import fs from "fs"
import { PDFParse } from "pdf-parse"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { vectorStore } from "../config/vectorDb.js"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { deductCredits } from "../utils/deductCredits.js"
import { getModel } from "../config/llmModels.js"

export const pdfRag = async (state) => {
    let pdf
    try {
        if (!state.file?.path) throw new Error("Please upload a PDF to analyze")
        const buffer = fs.readFileSync(state.file.path)

        pdf = new PDFParse({
            data: buffer
        })

        const result = await pdf.getText()
        const text = result.text

        if (!text?.trim()) {
            return { ...state, aiResponse: "This PDF has no extractable text. Upload a text-based PDF; scanned PDFs require OCR." }
        }

        // Small documents fit entirely in context and do not need vector retrieval.
        let context = text
        if (text.length > 12000) {
            const splitter = new RecursiveCharacterTextSplitter({
                chunkSize: 1000,
                chunkOverlap: 200
            })

            const docs = await splitter.createDocuments([text])

            const collectionName = `pdf-${Date.now()}`

            const store = await vectorStore(
                docs,
                collectionName
            )

            const relevantDocs = await store.similaritySearch(
                state.prompt,
                5
            )

            context = relevantDocs
                .map((doc) => doc.pageContent)
                .join("\n\n")
        }

        const llm = await getModel("pdf-rag")

        const messages = [
            new SystemMessage(`
                You are Dori AI Assistant.

                Rules:
                - Answer ONLY from the uploaded PDF.
                - Never make up information.
                - If the answer is not present in the PDF, say that the information is not available in the uploaded PDF.
                - Use Markdown formatting.
            `),

            new HumanMessage(`
                Context:
                ${context}

                Question:
                ${state.prompt}
            `)
        ]

        const response = await llm.invoke(messages)

        await deductCredits(state.userId, "pdf")

        return {
            ...state,
            aiResponse: response.content
        }

    } catch (error) {
        console.error("PDF RAG error:", error)

        throw new Error(`PDF analysis failed: ${error.message}`, { cause: error })

    } finally {
        if (pdf) await pdf.destroy().catch(() => {})
        try {
            fs.unlinkSync(state.file.path)
        } catch {}
    }
}
