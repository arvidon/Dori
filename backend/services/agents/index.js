import "dotenv/config"

import express from "express"
import connectDb from "./config/db.js"
import agentRouter from "./routes/agent.route.js"

const port = process.env.PORT

const app = express()

app.use(express.json())

app.use("/", agentRouter)

app.get("/", (req, res) => {
    res.json({ message: "hello from agent" })
})

app.listen(port, () => {
    console.log(`agent started at ${port}`)
    connectDb()
})