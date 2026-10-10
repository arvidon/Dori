import express from "express"
import dotenv from "dotenv"
import proxy from "express-http-proxy"
import cors from "cors"
import cookieParser from "cookie-parser"
import protect from "./middleware/auth.middleware.js"
import { getCurrentUser } from "./controller/user.controller.js"
import { proxyWithHeader } from "./utils/proxyWithHeader.js"
import morgan from "morgan"
dotenv.config()

const port = process.env.PORT

const app = express()
// Allow an explicit comma-separated list, since Vite can use another local port.
const frontendOrigins = (process.env.FRONTEND_URL || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean)

app.use(cors({
    origin: frontendOrigins,
    credentials:true
}))

app.use(morgan("dev"))
app.use(cookieParser())

app.use("/api/auth/update-plan", (_req, res) => res.sendStatus(404))

app.use(
    "/api/auth",
    proxy(process.env.AUTH_SERVICE, {
        proxyReqPathResolver: (req) => {
            console.log("Gateway received:", req.originalUrl)
            return req.originalUrl
        }
    })
)

app.use("/api/chat", protect, proxyWithHeader(process.env.CHAT_SERVICE))
app.use("/api/agents", protect, proxyWithHeader(process.env.AGENT_SERVICE, {
    reqAsBuffer: true,
    reqBodyEncoding: null,
    // Multer allows 20 MB files; leave room for multipart fields and boundaries.
    limit: "21mb"
}))
app.use("/api/billing", protect, proxyWithHeader(process.env.BILLING_SERVICE))
app.get("/api/me", protect, getCurrentUser)

app.get("/", (req, res) => {
    res.json({message: "hello from gateway v5555555663"})
})

app.listen(port, ()=>{
    console.log(`gateway started at ${port}`)
})
