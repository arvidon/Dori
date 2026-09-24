import {signInWithPopup} from "firebase/auth";
import React from "react";
import { auth, googleProvider } from "../utils/firebase";
import Home from './pages/Home'
import { useEffect } from "react";
import getCurrentUser from "./features/getCurrentUser";
import { useDispatch } from "react-redux";
import { setUserdata } from "./redux/userSlice";

function App() {
    const dispatch = useDispatch();

    useEffect(() => {
        const getUser = async () => {
            try {
                const data = await getCurrentUser();
                dispatch(setUserdata(data));
            } catch (error) {
                console.log("Failed to get current user:", error);
            }
        };

        getUser();
    }, [dispatch]);

    return <Home />;
}


export default App;
