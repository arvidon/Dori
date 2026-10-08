import axios from "axios"

export const deductCredits = async (userId, agent) => {
    const { data } = await axios.post(
        `${process.env.AUTH_SERVICE}/api/auth/deduct-credits`,
        { userId, agent }
    );

    return data;
};