import "dotenv/config";

import express from "express";
import connectDb from "./config/db.js";
import agentRouter from "./routes/agent.route.js";

const port = process.env.PORT;

const app = express();

app.use(express.json());

app.use("/", agentRouter);

// Global error handler
app.use((err, req, res, next) => {
    console.error("❌ Agent error:", err);

    if (err.status) {
        return res.status(err.status).json(
            err.data || { message: err.message }
        );
    }

    return res.status(500).json({
        message: `agent error: ${err.message || "Internal server error"}`
    });
});

app.get("/", (req, res) => {
    res.json({ message: "hello from agent" });
});

app.listen(port, () => {
    console.log(`agent started at ${port}`);
    connectDb();
});