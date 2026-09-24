import { configureStore } from "@reduxjs/toolkit";
import useReducer  from "./userSlice";
import conversationReducer from "./conversationSlice"
import messageReducer from "./messageSlice"

export const store = configureStore({
    reducer:{
        user: useReducer,
        conversation: conversationReducer,
        message: messageReducer
    }
})