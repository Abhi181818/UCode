import React, { useEffect, useState, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { getAuth, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { toast, ToastContainer } from 'react-toastify';
import { io } from "socket.io-client";
import 'react-toastify/dist/ReactToastify.css';
import debounce from 'lodash.debounce';
import { useNavigate } from 'react-router';

const Home = () => {
    const [code, setCode] = useState('// Write your code here');
    const [language, setLanguage] = useState('javascript');
    const [sessionId, setSessionId] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [pendingRequests, setPendingRequests] = useState([]);
    const [joinedUsers, setJoinedUsers] = useState([]);
    const navigate = useNavigate();
    const socket = useRef(null);

    useEffect(() => {
        socket.current = io('http://localhost:4000'); // Update with your backend address

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
        navigator.clipboard.writeText(sessionId);
        toast.success('Session ID copied to clipboard');
    }
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-6"
        >
            <ToastContainer />

            <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="flex justify-between items-center mb-6"
            >
                <h1 className="text-3xl font-bold text-purple-800 flex items-center">
                    <FaCode className="mr-3 text-purple-600" /> UCode
                </h1>
                <div className="flex items-center">
                    <span className="text-gray-700 mr-4">Logged in as: {userEmail}</span>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleLogout}
                        className="bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 transition-colors flex items-center"
                    >
                        <FaSignOutAlt className="mr-2" /> Logout
                    </motion.button>
                </div>
            </motion.div>

            <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex items-center mb-4"
            >
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
                    className="p-2 border border-purple-300 rounded-lg bg-white"
                >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                </select>
            </motion.div>

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

            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="mt-4 flex justify-end"
            >
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleCopySessionId(sessionId)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
                >
                    <FaCopy className="mr-2" /> Share Session ID
                </motion.button>
            </motion.div>

            <motion.div
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="mt-4"
            >
                <label htmlFor="join-session" className="block text-sm font-medium text-gray-700 flex items-center">
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
            </motion.div>

            <AnimatePresence>
                {pendingRequests.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-6"
                    >
                        <h2 className="text-lg font-bold mb-2 flex items-center">
                            <FaUserPlus className="mr-2 text-purple-600" /> Pending Requests
                        </h2>
                        <motion.ul className="list-none space-y-2">
                            {pendingRequests.map((email) => (
                                <motion.li
                                    key={email}
                                    initial={{ opacity: 0, x: -50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 50 }}
                                    className="flex justify-between items-center bg-purple-50 p-3 rounded-lg"
                                >
                                    <span>{email}</span>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleApproveRequest(email)}
                                        className="bg-emerald-600 text-white px-2 py-1 rounded-lg hover:bg-emerald-700"
                                    >
                                        Approve
                                    </motion.button>
                                </motion.li>
                            ))}
                        </motion.ul>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="mt-6"
            >
                <h2 className="text-lg font-bold mb-2 flex items-center">
                    <FaUsers className="mr-2 text-purple-600" /> Joined Users
                </h2>
                <ul className="list-none space-y-2">
                    {joinedUsers.map((email) => (
                        <motion.li
                            key={email}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-purple-50 p-2 rounded-lg"
                        >
                            {email}
                        </motion.li>
                    ))}
                </ul>
            </motion.div>
        </motion.div>
    );
};

export default Home;