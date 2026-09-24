import express from "express"
import { createConversation, getConversations, getMessage, saveMessage, updateConversation } from "../controllers/chat.controller.js"

const router = express.Router()

router.get("/create-conversation", createConversation)
router.get("/get-conversations", getConversations)
router.post("/update-conversation", updateConversation)
router.post("/save-messages", saveMessage)
router.get("/get-messages/:conversationId", getMessage)


export default router