export const getCurrentUser = async(req, res)=>{
    try{
        // The session stores the Mongo id as userId; the frontend reads _id.
        return res.status(200).json({ ...req.user, _id: req.user.userId })
    }catch(error){
        return res.status(500).json({message: `get current user error ${error}`})
    }
}