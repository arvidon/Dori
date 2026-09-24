import express from "express"
import dotenv from "dotenv"
import connectDb from "./config/db.js"
import authRouter from "./routes/auth.route.js"

dotenv.config()

const port = process.env.PORT

const app = express()

app.use(express.json())
app.use("/api/auth", authRouter)

app.get("/", (req, res) => {
    res.json({ message: "hello from auth" })
})

const startServer = async () => {
    try {
        await connectDb()

        app.listen(port, () => {
            console.log(`auth started at ${port}`)
        })
    } catch (error) {
        console.error("Failed to start auth service:", error)
        process.exit(1)
    }
}

startServer()