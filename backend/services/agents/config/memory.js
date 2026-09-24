import redis from "../../../shared/redis/redis.js"
import { getMessages } from "../utils/getMessages.js"

const MAX_MESSAGES = 20
const TTL = 24 * 60 * 60

export const getMemory = async (conversationId) => {

    const key = `messages-${conversationId}`

    const cached = await redis.get(key)

    if (cached) {
        return JSON.parse(cached)
    }

    const messages = await getMessages(conversationId)

    const recentMessages = messages.slice(-MAX_MESSAGES)

    await redis.set(
        key,
        JSON.stringify(recentMessages),
        "EX",
        TTL
    )

    return recentMessages
}


export const addMessage = async (
    conversationId,
    role,
    content
) => {

    const key = `messages-${conversationId}`

    const rawMessages = await redis.get(key)

    const messages = rawMessages
        ? JSON.parse(rawMessages)
        : []

    messages.push({
        role,
        content
    })

    const recentMessages = messages.slice(-MAX_MESSAGES)

    await redis.set(
        key,
        JSON.stringify(recentMessages),
        "EX",
        TTL
    )
}