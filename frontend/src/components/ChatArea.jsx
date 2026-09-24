import { useDispatch, useSelector } from "react-redux";
import Nav from "./Nav";
import React from "react"
import getMessages from "../features/getMessages";
import { setArtifacts, setMessages } from "../redux/messageSlice";
import { useEffect } from "react";
import MessageList from "./MessageList";
import ChatInput from "./chatInput";



function ChatArea() {

    const {selectedConversation} = useSelector(state=>state.conversation)
    const dispatch=useDispatch()
    useEffect(() => {
        const getMesg=async() => {
            if(selectedConversation){
                if(selectedConversation.title == "New Chat") return
                const data = await getMessages(selectedConversation?._id)
                dispatch(setMessages(data))
                const latestArtifacts = [...data].reverse().find(msg=>msg.artifacts && msg.artifacts.length > 0)
                dispatch(setArtifacts(latestArtifacts.artifacts || []))
            }
        }
        getMesg()
    }, [selectedConversation?._id])
    return (
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
            <Nav />
            <MessageList/>
            <ChatInput/>
        </div>
    );
}

export default ChatArea;