import { PLANS } from "../config/plans.js"
import Payment from "../models/payment.models.js"
import crypto from "crypto"
import razorpay from "../config/razorpay.js"
import axios from "axios"

export const createOrder = async(req, res) => {
    try{
        const {plan} = req.body
        const userId = req.headers["x-user-id"]
        const selectedPlan = PLANS[plan]

        if(!selectedPlan){
            return res.status(404).json({message:"plan not found"})
        }

        const order = await razorpay.orders.create({
            amount: selectedPlan.amount * 100,
            currency: "INR",
            receipt: `receipt-${Date.now()}`
        })

        await Payment.create({
            userId,
            orderId: order.id,
            amount: selectedPlan.amount,
            credits: selectedPlan.credits,
            plan: selectedPlan.id,
            currency: order.currency,
            status: "created"
        })

        return res.status(200).json({order, plan:selectedPlan})
    }catch(error){
        return res.status(500).json({message: `create order error ${error}`})
    }
}

export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body
        if (![razorpay_order_id, razorpay_payment_id, razorpay_signature].every(value => typeof value === "string" && value.length > 0)) {
            return res.status(400).json({ message: "Missing payment verification details" })
        }
        const payment = await Payment.findOne({
            orderId: razorpay_order_id,
            userId: req.headers["x-user-id"]
        })
        if (!payment) return res.status(404).json({ message: "Payment not found" })
        const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${payment.orderId}|${razorpay_payment_id}`).digest("hex")
        if (razorpay_signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpay_signature))) {
            return res.status(400).json({ message: "Payment verification failed" })
        }
        if (payment.paymentId && payment.paymentId !== razorpay_payment_id) {
            return res.status(400).json({ message: "Payment ID does not match" })
        }

        // Retry the idempotent plan update even if an earlier attempt marked this paid.
        await axios.post(`${process.env.AUTH_SERVICE}/api/auth/update-plan`, {
            userId: payment.userId,
            plan: payment.plan,
            credits: payment.credits,
            paymentId: razorpay_payment_id
        })
        payment.status = "paid"
        payment.paymentId = razorpay_payment_id
        await payment.save()
        return res.status(200).json({ message: "Payment verified" })
    } catch (error) {
        console.error("Payment verification failed:", error.response?.data || error.message)
        return res.status(500).json({ message: "Payment verification or plan update failed. Please retry verification." })
    }
}
