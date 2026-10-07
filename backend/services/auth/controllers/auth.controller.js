import {getAuth} from "firebase-admin/auth"
import { app } from "../config/firebase.js"
import User from "../models/user.model.js"
import redis from "../../../shared/redis/redis.js"

export const login=async(req, res)=>{
    try{
        const {token} = req.body
        const decoded = await getAuth(app).verifyIdToken(token)
        
        let user = await User.findOne({
            firebaseUid: decoded.uid
        })

        if (!user) {
            user = await User.create({
                firebaseUid: decoded.uid,
                name: decoded.name,
                email: decoded.email,
                avatar: decoded.picture
            })
        }

        const sessionId = crypto.randomUUID()
        await redis.set(`user-session-${user._id}`, JSON.stringify({
            sessionId: sessionId
        }))

        await redis.set(`session-${sessionId}`, JSON.stringify({
            userId: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            plan: user.plan,
            credits: user.credits,
            totalCredits: user.totalCredits,
            planExpiresAt: user.planExpiresAt
        }), "EX", 7*24*60*60)

        res.cookie("session", sessionId,{
            httpOnly:true,
            secure:false,
            sameSite:"strict",
            maxAge:70*24*60*60*1000
        })

        return res.status(200).json(user)
    }
    catch(error){
        console.error("LOGIN ERROR:", error)

        return res.status(500).json({
            message: error.message
        })
    }
}

export const logout=async(req, res)=>{
    try{
        const sessionId=req.cookies?.session
        await redis.del(`session-${sessionId}`)
        res.clearCookie("session")
        return res.status(200).json({message: "logout successfully"})
    }catch(error){
        return res.status(500).json({message: `logout error ${error}`})
    }
}

export const updateUserPayment = async(req, res) => {
    try {
        const { plan, credits, userId, paymentId } = req.body
        if (!paymentId || !["starter", "pro"].includes(plan) || !Number.isFinite(credits) || credits <= 0) {
            return res.status(400).json({ message: "Invalid plan update" })
        }

        // Apply a payment only once, including retries after a Redis failure.
        let user = await User.findOneAndUpdate(
            { _id: userId, appliedPaymentIds: { $ne: paymentId } },
            {
                $set: { plan, planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
                $inc: { credits, totalCredits: credits },
                $addToSet: { appliedPaymentIds: paymentId }
            },
            { new: true }
        )
        if (!user) user = await User.findById(userId)
        if (!user) return res.status(404).json({ message: "User not found" })

        const storedSession = await redis.get(`user-session-${user._id}`)
        const sessionId = storedSession ? JSON.parse(storedSession).sessionId : null
        if (sessionId) {
            const sessionKey = `session-${sessionId}`
            const session = await redis.get(sessionKey)
            if (session) {
                await redis.set(sessionKey, JSON.stringify({
                    ...JSON.parse(session),
                    plan: user.plan,
                    credits: user.credits,
                    totalCredits: user.totalCredits,
                    planExpiresAt: user.planExpiresAt
                }), "KEEPTTL")
            }
        }
        return res.status(200).json({ success: true })
    } catch (error) {
        console.error("Update plan failed:", error.message)
        return res.status(500).json({ message: "Unable to update plan" })
    }
}

export const deductCredits = async(req, res) => {
    try{
        const {userId, agent} = req.body
        const CONST = {
            chat: 1,
            search: 2,
            coding: 2,
            pdf: 2,
            ppt: 2,
            image: 2
        }

        const user = await User.findById(userId)

        if(!user){
            return res.status(400).json({message: "user not found"})
        }

        const requiredCredits = COST[agent] || 1
        if(user.credits < requiredCredits){
            return res.status(400).json({message:"Not enough credits"})
        }
        user.credits -= requiredCredits
        await user.save()

        const sessionId = await redis.get(`user-session-${user?._id}`)
        console.log("sessionId", sessionId)
        await redis.set(`session-${sessionId}`, JSON.stringify({
            userId: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            plan: user.plan,
            credits: user.credits,
            totalCredits: user.totalCredits,
            planExpiresAt: user.planExpiresAt
        }), "EX", 7*24*60*60)

        return res.status(200).json({success: true, credits: user.credits})
    }catch(error){
        return res.status(500).json({message: `update user payment error ${error}`})
    }
}