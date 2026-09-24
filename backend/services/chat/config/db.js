import mongoose from "mongoose"

const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL)
        console.log("🟢 AUTH MONGO CONNECTED")
    } catch (error) {
        console.error("🔴 AUTH MONGO ERROR:", error)
        throw error
    }
}

export default connectDb