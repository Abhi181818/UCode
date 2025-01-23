import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import admin from "firebase-admin";
import serviceAccount from "./serviceAccountKey.json" with { "type": "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // databaseURL: "https://ucode-44860-default-rtdb.firebaseio.com",
});

const db = admin.firestore();
const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Create or retrieve default session for user
  socket.on('create-session', async (userEmail) => {
      try {
          const sessionRef = db.collection('sessions').where('host', '==', userEmail);
          const sessionSnapshot = await sessionRef.get();

          let sessionId;
          if (sessionSnapshot.empty) {
              // Create a new session
              const newSession = {
                  host: userEmail,
                  code: '// Write your code here',
                  language: 'javascript',
                  invitedUsers: [],
                  pendingRequests: [],
                  joinedUsers: [userEmail],
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)), 
                //   10 days ka epxire time
              };
              const sessionDoc = await db.collection('sessions').add(newSession);
              sessionId = sessionDoc.id;
          } else {
              sessionId = sessionSnapshot.docs[0].id;
          }

          socket.join(sessionId);
          socket.emit('session-created', { sessionId });
      } catch (error) {
          console.error('Error creating session:', error);
          socket.emit('error', 'Could not create session');
      }
  });

  // Join session by ID
  socket.on('join-session', async ({ sessionId, userEmail }) => {
      try {
          const sessionRef = db.collection('sessions').doc(sessionId);
          const sessionDoc = await sessionRef.get();

          if (!sessionDoc.exists) {
              socket.emit('error', 'Session does not exist');
              return;
          }

          const sessionData = sessionDoc.data();
          if (sessionData.invitedUsers.includes(userEmail) || sessionData.host === userEmail) {
              const updatedJoinedUsers = [...sessionData.joinedUsers, userEmail];
              await sessionRef.update({ joinedUsers: updatedJoinedUsers });

              socket.join(sessionId);
              socket.emit('load-session', {
                  code: sessionData.code,
                  language: sessionData.language,
                  joinedUsers: updatedJoinedUsers,
              });

              // Notify others in the session
              socket.to(sessionId).emit('user-joined', userEmail);
          } else {
              // Add the user to pending requests
              const updatedPendingRequests = [...sessionData.pendingRequests, userEmail];
              await sessionRef.update({ pendingRequests: updatedPendingRequests });

              // Notify the host
              io.to(sessionId).emit('pending-request', userEmail);
          }
      } catch (error) {
          console.error('Error joining session:', error);
          socket.emit('error', 'Could not join session');
      }
  });

  // Approve a join request
  socket.on('approve-request', async ({ sessionId, userEmail }) => {
      try {
          const sessionRef = db.collection('sessions').doc(sessionId);
          const sessionDoc = await sessionRef.get();

          if (!sessionDoc.exists) return;

          const sessionData = sessionDoc.data();
          const updatedPendingRequests = sessionData.pendingRequests.filter((email) => email !== userEmail);
          const updatedInvitedUsers = [...sessionData.invitedUsers, userEmail];

          await sessionRef.update({
              pendingRequests: updatedPendingRequests,
              invitedUsers: updatedInvitedUsers,
          });

          // Notify the user they are approved
          io.to(sessionId).emit('request-approved', userEmail);
      } catch (error) {
          console.error('Error approving request:', error);
          socket.emit('error', 'Could not approve request');
      }
  });

  // Handle code updates
  socket.on('code-change', async ({ sessionId, code }) => {
      try {
          const sessionRef = db.collection('sessions').doc(sessionId);
          await sessionRef.update({ code });
          io.to(sessionId).emit('receive-code', code); // Broadcast 
      } catch (error) {
          console.error('Error updating code:', error);
      }
  });

  // Handle language updates
  socket.on('language-change', async ({ sessionId, language }) => {
      try {
          const sessionRef = db.collection('sessions').doc(sessionId);
          await sessionRef.update({ language });
          io.to(sessionId).emit('update-language', language); // Broadcast to all clients including the sender
      } catch (error) {
          console.error('Error updating language:', error);
      }
  });

  socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
