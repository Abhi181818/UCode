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
import { FaCode, FaLanguage, FaSignOutAlt, FaUserPlus, FaCopy, FaUsers, FaTerminal, FaVideo } from 'react-icons/fa';
import axios from 'axios';
import { getInitialCode } from '../utils/templateOfLanguages';

const Home = () => {
    const [code, setCode] = useState(getInitialCode('language'));
    const [language, setLanguage] = useState('language');
    const [sessionId, setSessionId] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [pendingRequests, setPendingRequests] = useState([]);
    const [joinedUsers, setJoinedUsers] = useState([]);
    const [compilationResult, setCompilationResult] = useState(null);
    const [isCompiling, setIsCompiling] = useState(false);
    const [incomingCallModal, setIncomingCallModal] = useState(false);
    const [caller, setCaller] = useState('');
    const navigate = useNavigate();
    const socket = useRef(null);

    const [langArray, setLangArray] = useState(['language', 'javascript', 'python', 'java', 'c++', 'ruby', 'rust', 'c#', 'c']);
    // let langArray = ['language', 'javascript', 'python', 'java', 'cpp', 'html', 'css'];

    const [isVideoCallActive, setIsVideoCallActive] = useState(false);
    const localVideoRef = useRef(null);
    const remoteVideoRefs = useRef({});
    const peerConnections = useRef({});

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
            if (updatedCode === code) return;
            setCode(updatedCode);
        });

        socket.current.on('update-language', (updatedLanguage) => {
            setLanguage(updatedLanguage);
        });

        socket.current.on('request-approved', () => {
            toast.info(`You have been approved to join the session.`);
        });

        socket.current.on('offer', async ({ offer, from, sessionId }) => {
            if (!peerConnections.current[sessionId]) return;
            await peerConnections.current[sessionId][from].setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnections.current[sessionId][from].createAnswer();
            await peerConnections.current[sessionId][from].setLocalDescription(answer);
            socket.current.emit('answer', { answer, to: from, sessionId });
        });

        socket.current.on('answer', async ({ answer, from, sessionId }) => {
            if (!peerConnections.current[sessionId]) return;
            await peerConnections.current[sessionId][from].setRemoteDescription(new RTCSessionDescription(answer));
        });

        socket.current.on('ice-candidate', async ({ candidate, from, sessionId }) => {
            if (!peerConnections.current[sessionId]) return;
            await peerConnections.current[sessionId][from].addIceCandidate(new RTCIceCandidate(candidate));
        });

        socket.current.on("call-invitation", ({ sessionId, caller }) => {
            if (caller !== userEmail) {
                setIncomingCallModal(true);
                setCaller(caller);
            }
        });

        return () => {
            socket.current.disconnect();
            Object.values(peerConnections.current).forEach(sessionPCs => {
                Object.values(sessionPCs).forEach(pc => pc.close());
            });
            peerConnections.current = {};
        };
    }, []);


    useEffect(() => {
        const authUser = auth.currentUser;
        if (authUser) {
            setUserEmail(authUser.email);
            createOrJoinDefaultSession(authUser.email);
        }

    }, []);

    useEffect(() => {
        if (language != 'language') {
            setLangArray(langArray.filter((lang) => lang !== 'language'))
            console.log(langArray);
        }
        // console.log(langArray);

    }, [language]);

    useEffect(() => {
        socket.current.on("call-invitation", ({ sessionId, caller }) => {
            if (caller !== userEmail) {
                setIncomingCallModal(true);
                setCaller(caller);
            }
        })
    }, []);

    const createOrJoinDefaultSession = (email) => {
        socket.current.emit('create-session', email);
    };

    const emitCodeChange = useCallback(
        debounce((newCode) => {
            socket.current.emit('code-change', { sessionId, code: newCode });
        }, 100),
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

    const handleCopySessionId = () => {
        navigator.clipboard.writeText(sessionId);
        toast.success(`Session ID copied to clipboard: ${sessionId}`);
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
            case 'c++':
                return 54; // C++ language ID
            case 'ruby':
                return 72; // Ruby language ID
            case 'rust':
                return 73; // Rust language ID
            case 'c#':
                return 51; // C# language ID
            case 'c':
                return 50; // C language ID
            default:
                return 63; // Default to JavaScript
        }
    };

    const handleLanguageChange = (e) => {
        const newLanguage = e.target.value;
        setLanguage(newLanguage);
        setCode(getInitialCode(newLanguage));
        socket.current.emit('language-change', { sessionId, language: newLanguage });
    };

    const startVideoCall = async () => {
        setIsVideoCallActive(true);
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideoRef.current.srcObject = stream;

        if (!peerConnections.current[sessionId]) {
            peerConnections.current[sessionId] = {};
        }

        joinedUsers.forEach(userEmail => {
            if (userEmail === userEmail) return; // Skip self

            const pc = new RTCPeerConnection();
            peerConnections.current[sessionId][userEmail] = pc;

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.current.emit('ice-candidate', { candidate: event.candidate, to: userEmail, sessionId });
                }
            };

            pc.ontrack = (event) => {
                if (!remoteVideoRefs.current[sessionId]) {
                    remoteVideoRefs.current[sessionId] = {};
                }
                if (!remoteVideoRefs.current[sessionId][userEmail]) {
                    remoteVideoRefs.current[sessionId][userEmail] = React.createRef();
                }
                remoteVideoRefs.current[sessionId][userEmail].current.srcObject = event.streams[0];
            };

            stream.getTracks().forEach((track) => {
                pc.addTrack(track, stream);
            });

            pc.createOffer().then(offer => {
                pc.setLocalDescription(offer);
                socket.current.emit('offer', { offer, to: userEmail, sessionId });
            });
        });

        socket.current.emit('start-call', { sessionId });
    };

    const stopVideoCall = () => {
        setIsVideoCallActive(false);
        if (peerConnections.current[sessionId]) {
            Object.values(peerConnections.current[sessionId]).forEach(pc => pc.close());
            delete peerConnections.current[sessionId];
        }
        if (localVideoRef.current && localVideoRef.current.srcObject) {
            localVideoRef.current.srcObject.getTracks().forEach((track) => track.stop());
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-4 lg:p-3"
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
                        Welcome, {userEmail.split('@')[0]}
                    </span>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleLogout}
                        className="bg-rose-600 text-white px-3 lg:px-4  rounded-lg hover:bg-rose-700 transition-colors flex items-center lg:text-base h-8 w-12"
                    >
                        <FaSignOutAlt className="" />
                    </motion.button>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                <motion.div
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="space-y-4 lg:space-y-4"
                >
                    {/* Language Selection and Share Button */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <select
                                id="language"
                                value={language}
                                onChange={handleLanguageChange}
                                className=" px-2 text-sm border border-purple-500  bg-white h-9"
                            >
                                {langArray.map((lang) => (
                                    <option key={lang} value={lang} className=''>
                                        {lang.charAt(0).toUpperCase() + lang.slice(1)}
                                    </option>
                                ))}

                            </select>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleCompileCode}
                            disabled={isCompiling}
                            className={`bg-emerald-600 text-white px-4  hover:bg-emerald-700 transition-colors h-9 
                                ${isCompiling ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isCompiling ? 'Compiling...' : 'Compile Code'}
                        </motion.button>
                    </div>

                    {/* Code Editor */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
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
                                wordWrap: 'on',
                                cursorBlinking: 'smooth',
                            }}
                            className='rounded-lg shadow-md'
                        />
                    </motion.div>

                    {/* Copy Session ID Button */}
                    {/* <div> */}
                    {/* <span className='text-purple-900'>Session ID is : {sessionId}</span> */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCopySessionId}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center w-full justify-center"
                    >
                        <FaCopy className="mr-2" /> Copy Session ID
                    </motion.button>
                    {/* </div> */}
                </motion.div>

                <motion.div
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="space-y-6 lg:space-y-8"
                >
                    {/* Compilation Output */}
                    <div className="bg-white rounded-lg shadow-md p-4 h-[81vh]">
                        <h2 className="text-lg font-bold mb-2 flex items-center">
                            <FaTerminal className="mr-2 text-purple-600" /> Compilation Output
                        </h2>
                        <div className="bg-gray-900 text-white p-3 rounded-lg h-[60vh] overflow-auto">
                            {isCompiling ? (
                                <div className="flex justify-center items-center h-full">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-purple-500"></div>
                                </div>
                            ) : (
                                <pre className="text-sm text-green-400">
                                    {compilationResult ||
                                        <div>
                                            <span className='text-red-500'>Hi [{userEmail.split('@')[0]}] </span>
                                            <br />
                                            <span>Compilation output will appear here...</span>
                                        </div>}
                                </pre>
                            )}
                        </div>
                    </div>

                    {/* Video Call Section */}
                    <div className="bg-white rounded-lg shadow-md p-4">
                        <h2 className="text-lg font-bold mb-2 flex items-center">
                            <FaVideo className="mr-2 text-purple-600" /> Video Call
                        </h2>
                        <div className="flex justify-between items-center mb-4">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={startVideoCall}
                                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
                                disabled={isVideoCallActive}
                            >
                                Start Call
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={stopVideoCall}
                                className="bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 transition-colors"
                                disabled={!isVideoCallActive}
                            >
                                End Call
                            </motion.button>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <video ref={localVideoRef} autoPlay muted className="w-full h-48 bg-black rounded-lg"></video>
                            {joinedUsers.map((email) => (
                                email !== userEmail && (
                                    <video
                                        key={email}
                                        ref={el => {
                                            if (!remoteVideoRefs.current[sessionId]) {
                                                remoteVideoRefs.current[sessionId] = {};
                                            }
                                            remoteVideoRefs.current[sessionId][email] = el;
                                        }}
                                        autoPlay
                                        className="w-full h-48 bg-black rounded-lg"
                                    ></video>
                                )
                            ))}
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
                                        {email.split('@')[0]}
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

            {/* Incoming Call Modal */}
            <AnimatePresence>
                {incomingCallModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"
                    >
                        <div className="bg-white rounded-lg shadow-lg p-4 max-w-sm w-full">
                            <h2 className="text-lg font-bold mb-2">Incoming Call</h2>
                            <p>{caller} is calling you.</p>
                            <div className="flex justify-between mt-4">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        setIncomingCallModal(false);
                                        startVideoCall();
                                    }}
                                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
                                >
                                    Accept
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setIncomingCallModal(false)}
                                    className="bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 transition-colors"
                                >
                                    Decline
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Home;