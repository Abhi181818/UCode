import React, { useEffect, useState, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { getAuth, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { toast, ToastContainer } from 'react-toastify';
import { io } from "socket.io-client";
import 'react-toastify/dist/ReactToastify.css';
import debounce from 'lodash.debounce';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCode, FaLanguage, FaSignOutAlt, FaUserPlus, FaCopy, FaUsers, FaTerminal } from 'react-icons/fa';
import axios from 'axios';

const Home = () => {
    const [code, setCode] = useState('// Write your code here');
    const [language, setLanguage] = useState('javascript');
    const [sessionId, setSessionId] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [pendingRequests, setPendingRequests] = useState([]);
    const [joinedUsers, setJoinedUsers] = useState([]);
    const [compilationResult, setCompilationResult] = useState(null);
    const [isCompiling, setIsCompiling] = useState(false);
    const navigate = useNavigate();
    const socket = useRef(null);

    useEffect(() => {
        socket.current = io('https://ucode-backend-snz6.onrender.com');

        socket.current.on('session-created', ({ sessionId }) => {
            setSessionId(sessionId);
        });

        socket.current.on('load-session', (data) => {
            setCode(data.code);
            setLanguage(data.language);
            setJoinedUsers(data.joinedUsers);
        });

        socket.current.on('pending-request', (email) => {
            setPendingRequests((prev) => [...prev, email]);
        });

        socket.current.on('user-joined', (email) => {
            setJoinedUsers((prev) => [...prev, email]);
            toast.info(`${email} has joined the session.`);
        });

        socket.current.on('receive-code', (updatedCode) => {
            setCode(updatedCode);
        });

        socket.current.on('update-language', (updatedLanguage) => {
            setLanguage(updatedLanguage);
        });

        socket.current.on('request-approved', () => {
            toast.info(`You have been approved to join the session.`);
        });

        return () => {
            socket.current.disconnect();
        };
    }, []);

    // Fetch user email from Firebase Authentication
    useEffect(() => {
        const authUser = auth.currentUser;
        if (authUser) {
            setUserEmail(authUser.email);
            createOrJoinDefaultSession(authUser.email);
        }
    }, []);

    // Create or retrieve the default session for the logged-in user
    const createOrJoinDefaultSession = (email) => {
        socket.current.emit('create-session', email);
    };

    const emitCodeChange = useCallback(
        debounce((newCode) => {
            socket.current.emit('code-change', { sessionId, code: newCode });
        }, 300),
        [sessionId]
    );

    const handleCodeChange = (newCode) => {
        setCode(newCode);
        emitCodeChange(newCode);
    };

    // Handle logout
    const handleLogout = async () => {
        try {
            await signOut(auth);
            toast.success('Logged out successfully!');
            navigate('/');
        } catch (error) {
            toast.error(error.message);
        }
    };

    // Approve a user request to join the session
    const handleApproveRequest = (email) => {
        socket.current.emit('approve-request', { sessionId, userEmail: email });
        toast.success(`Approved request for ${email}`);
        setPendingRequests((prev) => prev.filter((request) => request !== email));
    };

    const handleJoinSession = (sessionId) => {
        socket.current.emit('join-session', { sessionId, userEmail });
    };

    const handleCopySessionId = (sessionId) => {

        toast.success(`Session ID is : ${sessionId}`);
    };

    const handleCompileCode = async () => {
        setIsCompiling(true);
        setCompilationResult(null);
        try {
            const options = {
                method: 'POST',
                url: 'https://judge029.p.rapidapi.com/submissions',
                params: {
                    base64_encoded: 'true',
                    wait: 'true',
                    fields: '*'
                },
                headers: {
                    'x-rapidapi-key': '825b502bf7mshd3009c8060ce4acp1d9cf8jsn3d7b176d1f55',
                    'x-rapidapi-host': 'judge029.p.rapidapi.com',
                    'Content-Type': 'application/json'
                },
                data: {
                    source_code: btoa(code),
                    language_id: getLanguageId(language),
                    stdin: btoa(''),
                    expected_output: btoa('')
                }
            };

            const response = await axios.request(options);
            const result = response.data;

            const output = atob(result.stdout || result.stderr || result.compile_output);
            setCompilationResult(output);
            toast.success('Code compiled successfully!');
        } catch (error) {
            console.error(error);
            toast.error('Failed to compile code.');
            setCompilationResult('Compilation error. Please check your code.');
        } finally {
            setIsCompiling(false);
        }
    };


    const getLanguageId = (language) => {
        switch (language) {
            case 'javascript':
                return 63; // JavaScript language ID
            case 'python':
                return 71; // Python language ID
            case 'java':
                return 62; // Java language ID
            case 'cpp':
                return 54; // C++ language ID
            case 'html':
                return 83; // HTML language ID
            case 'css':
                return 84; // CSS language ID
            default:
                return 63; // Default to JavaScript
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-4 lg:p-8"
        >
            <ToastContainer />

            {/* Header Section */}
            <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="flex justify-between items-center mb-6 lg:mb-8"
            >
                <h1 className="text-2xl lg:text-3xl font-bold text-purple-800 flex items-center">
                    <FaCode className="mr-2 text-purple-600" /> UCode
                </h1>
                <div className="flex items-center">
                    <span className="text-gray-700 mr-2 text-sm lg:text-base hidden lg:inline">
                        Logged in as: {userEmail}
                    </span>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleLogout}
                        className="bg-rose-600 text-white px-3 py-1 lg:px-4 lg:py-2 rounded-lg hover:bg-rose-700 transition-colors flex items-center text-sm lg:text-base"
                    >
                        <FaSignOutAlt className="mr-1 lg:mr-2" /> Logout
                    </motion.button>
                </div>
            </motion.div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {/* Left Column: Code Editor */}
                <motion.div
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="space-y-6 lg:space-y-8"
                >
                    {/* Language Selection and Share Button */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <FaLanguage className="mr-2 text-purple-600" />
                            <label htmlFor="language" className="mr-2 text-sm font-medium text-gray-700">
                                Language:
                            </label>
                            <select
                                id="language"
                                value={language}
                                onChange={(e) => {
                                    setLanguage(e.target.value);
                                    socket.current.emit('language-change', { sessionId, language: e.target.value });
                                }}
                                className="p-1 text-sm border border-purple-300 rounded-lg bg-white"
                            >
                                {['javascript', 'python', 'java', 'cpp', 'html', 'css'].map((lang) => (
                                    <option key={lang} value={lang}>
                                        {lang.charAt(0).toUpperCase() + lang.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleCopySessionId(sessionId)}
                            className="bg-indigo-600 text-white px-2 py-1 text-sm rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
                        >
                            <FaCopy className="mr-1" /> Share ID
                        </motion.button>
                    </div>

                    {/* Code Editor */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="bg-white rounded-lg shadow-xl overflow-hidden border-2 border-purple-100"
                    >
                        <Editor
                            height="60vh"
                            theme="vs-dark"
                            language={language}
                            value={code}
                            onChange={handleCodeChange}
                            options={{
                                fontSize: 14,
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                            }}
                        />
                    </motion.div>

                    {/* Compile Button */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCompileCode}
                        disabled={isCompiling}
                        className={`w-full bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors 
                    ${isCompiling ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isCompiling ? 'Compiling...' : 'Compile Code'}
                    </motion.button>
                </motion.div>

                {/* Right Column: Compilation Results & Session Management */}
                <motion.div
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="space-y-6 lg:space-y-8"
                >
                    {/* Compilation Result Section */}
                    <div className="bg-white rounded-lg shadow-md p-4">
                        <h2 className="text-lg font-bold mb-2 flex items-center">
                            <FaTerminal className="mr-2 text-purple-600" /> Compilation Output
                        </h2>
                        <div className="bg-gray-900 text-white p-3 rounded-lg h-64 overflow-auto">
                            {isCompiling ? (
                                <div className="flex justify-center items-center h-full">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-purple-500"></div>
                                </div>
                            ) : (
                                <pre className="text-sm text-green-400">
                                    {compilationResult || 'Compilation output will appear here...'}
                                </pre>
                            )}
                        </div>
                    </div>

                    {/* Join Session Section */}
                    <div className="bg-white rounded-lg shadow-md p-4">
                        <label htmlFor="join-session" className="block text-sm font-medium text-gray-700 flex items-center mb-2">
                            <FaUserPlus className="mr-2 text-purple-600" /> Join Session
                        </label>
                        <div className="flex">
                            <input
                                type="text"
                                id="join-session"
                                placeholder="Enter session ID"
                                className="p-2 border border-purple-300 rounded-l-lg flex-grow"
                                onChange={(e) => setSessionId(e.target.value)}
                            />
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleJoinSession(sessionId)}
                                className="bg-emerald-600 text-white px-4 py-2 rounded-r-lg hover:bg-emerald-700 transition-colors"
                            >
                                Join
                            </motion.button>
                        </div>
                    </div>

                    {/* Joined Users & Pending Requests */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Joined Users */}
                        <div className="bg-white rounded-lg shadow-md p-4 max-h-64 overflow-auto">
                            <h2 className="text-lg font-bold mb-2 flex items-center">
                                <FaUsers className="mr-2 text-purple-600" /> Joined Users
                            </h2>
                            <ul className="space-y-1">
                                {joinedUsers.map((email) => (
                                    <li key={email} className="bg-purple-50 p-1 rounded text-sm truncate">
                                        {email}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Pending Requests */}
                        <AnimatePresence>
                            {pendingRequests.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="bg-white rounded-lg shadow-md p-4 max-h-64 overflow-auto"
                                >
                                    <h2 className="text-lg font-bold mb-2 flex items-center">
                                        <FaUserPlus className="mr-2 text-purple-600" /> Pending
                                    </h2>
                                    <ul className="space-y-2">
                                        {pendingRequests.map((email) => (
                                            <li key={email} className="flex justify-between items-center bg-purple-50 p-2 rounded">
                                                <span className="text-sm truncate mr-2">{email}</span>
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => handleApproveRequest(email)}
                                                    className="bg-emerald-600 text-white px-2 py-1 text-xs rounded-lg hover:bg-emerald-700"
                                                >
                                                    Approve
                                                </motion.button>
                                            </li>
                                        ))}
                                    </ul>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default Home;