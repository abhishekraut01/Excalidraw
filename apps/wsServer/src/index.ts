import { WebSocketServer } from "ws";
import dotenv from "dotenv";
import { checkAuth, safeSend } from "./utils";
import { IUser } from "./types";

// Load environment variables from .env file
dotenv.config();

// Create WebSocket server on port 9000
const wss = new WebSocketServer({
  port: 9000,
});
console.log(`WebSocket server is running on port 9000`);

// In-memory storage for all connected users
// In production, consider using Redis or another persistent store
const users: IUser[] = [];

/**
 * Helper function to broadcast a message to all users in a specific room
 */
const broadcastToRoom = (
  roomId: string,
  message: any,
  excludeUserId?: string
) => {
  // Find all users currently in the specified room
  const usersInRoom = users.filter((user) => user.rooms.includes(roomId));

  usersInRoom.forEach((user) => {
    // Optionally exclude a specific user (e.g., the sender)
    if (excludeUserId && user.userId === excludeUserId) {
      return;
    }

    safeSend(user.ws, message);
  });
};

// Handle new WebSocket connections
wss.on("connection", (socket, req) => {
  console.log("New connection attempt");

  // Extract authentication token from query parameters
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const token = url.searchParams.get("token");

  // Reject connection if no token provided
  if (!token) {
    console.log("Connection rejected: No token provided");
    socket.close(1008, "Authentication required"); // 1008 = Policy Violation
    return;
  }

  // Verify the JWT token
  const decoded = checkAuth(token);
  if (!decoded) {
    console.log("Connection rejected: Invalid token");
    socket.close(1008, "Invalid authentication token");
    return;
  }

  // Create user object for this connection
  const currentUser: IUser = {
    userId: decoded.userId,
    rooms: [],
    ws: socket as unknown as WebSocket,
  };

  // Add user to our in-memory users array
  users.push(currentUser);
  console.log(
    `User ${currentUser.userId} connected. Total users: ${users.length}`
  );

  // Send connection confirmation to the client
  safeSend(currentUser.ws, {
    type: "connection-established",
    data: {
      userId: currentUser.userId,
      message: "Successfully connected to WebSocket server",
    },
  });

  // Handle incoming messages from this user
  socket.on("message", (message) => {
    try {
      // Parse the incoming JSON message
      const parsedMessage = JSON.parse(message.toString());
      console.log(`Message from ${currentUser.userId}:`, parsedMessage.type);

      // Handle different message types
      switch (parsedMessage.type) {
        case "join":
          handleJoinRoom(currentUser, parsedMessage.data);
          break;

        case "chat":
          handleChatMessage(currentUser, parsedMessage.data);
          break;

        case "leave-room":
          handleLeaveRoom(currentUser, parsedMessage.data);
          break;

        default:
          console.log(`Unknown message type: ${parsedMessage.type}`);
          safeSend(currentUser.ws, {
            type: "error",
            data: {
              message: `Unknown message type: ${parsedMessage.type}`,
            },
          });
      }
    } catch (error) {
      console.error("Error parsing message:", error);
      safeSend(currentUser.ws, {
        type: "error",
        data: {
          message: "Invalid message format. Expected JSON.",
        },
      });
    }
  });

  // Handle user disconnection
  socket.on("close", (code, reason) => {
    console.log(
      `User ${currentUser.userId} disconnected. Code: ${code}, Reason: ${reason}`
    );

    // Remove user from the users array to prevent memory leaks
    const userIndex = users.findIndex((u) => u.userId === currentUser.userId);
    if (userIndex !== -1) {
      users.splice(userIndex, 1);
      console.log(
        `User ${currentUser.userId} removed from users array. Total users: ${users.length}`
      );
    }
  });

  // Handle WebSocket errors
  socket.on("error", (error) => {
    console.error(`WebSocket error for user ${currentUser.userId}:`, error);
  });
});

/**
 * Handle user joining a room
 */
function handleJoinRoom(user: IUser, data: any) {
  const { roomId } = data;

  // Validate roomId
  if (!roomId || typeof roomId !== "string") {
    safeSend(user.ws, {
      type: "error",
      data: {
        message: "Invalid or missing roomId",
      },
    });
    return;
  }

  // Check if user is already in the room
  if (user.rooms.includes(roomId)) {
    safeSend(user.ws, {
      type: "already-in-room",
      data: {
        roomId,
        message: `You are already in room: ${roomId}`,
      },
    });
    return;
  }

  // Add user to the room
  user.rooms.push(roomId);
  console.log(`User ${user.userId} joined room ${roomId}`);

  // Send confirmation to the user
  safeSend(user.ws, {
    type: "joined-room",
    data: {
      roomId,
      message: `Successfully joined room: ${roomId}`,
    },
  });

  // Optionally notify other users in the room about the new member
  broadcastToRoom(
    roomId,
    {
      type: "user-joined",
      data: {
        userId: user.userId,
        roomId,
        message: `User ${user.userId} joined the room`,
      },
    },
    user.userId
  ); // Exclude the user who just joined
}

/**
 * Handle chat messages in a room
 */
function handleChatMessage(user: IUser, data: any) {
  const { roomId, message } = data;

  console.log(roomId)
  console.log(message)
  // Validate required fields
  if (!roomId || !message) {
    safeSend(user.ws, {
      type: "error",
      data: {
        message: "Missing roomId or message content",
      },
    });
    return;
  }

  // Check if user is actually in the room they're trying to send a message to
  if (!user.rooms.includes(roomId)) {
    safeSend(user.ws, {
      type: "error",
      data: {
        message: `You are not in room: ${roomId}. Join the room first.`,
      },
    });
    return;
  }

  // Create the message payload
  const messagePayload = {
    type: "chat",
    data: {
      sender: user.userId,
      roomId,
      message,
      timestamp: Date.now(),
    },
  };

  console.log(`Broadcasting message from ${user.userId} to room ${roomId}`);

  // Broadcast the message to all users in that room
  broadcastToRoom(roomId, messagePayload);
}

/**
 * Handle user leaving a room
 */
function handleLeaveRoom(user: IUser, data: any) {
  const { roomId } = data;

  // Validate roomId
  if (!roomId || typeof roomId !== "string") {
    safeSend(user.ws, {
      type: "error",
      data: {
        message: "Invalid or missing roomId",
      },
    });
    return;
  }

  // Check if user is actually in the room
  if (!user.rooms.includes(roomId)) {
    safeSend(user.ws, {
      type: "error",
      data: {
        message: `You are not in room: ${roomId}`,
      },
    });
    return;
  }

  // Remove the room from user's rooms array
  user.rooms = user.rooms.filter((r) => r !== roomId);
  console.log(`User ${user.userId} left room ${roomId}`);

  // Send confirmation to the user
  safeSend(user.ws, {
    type: "left-room",
    data: {
      roomId,
      message: `You have left room: ${roomId}`,
    },
  });

  // Optionally notify other users in the room about the user leaving
  broadcastToRoom(
    roomId,
    {
      type: "user-left",
      data: {
        userId: user.userId,
        roomId,
        message: `User ${user.userId} left the room`,
      },
    },
    user.userId
  ); // Exclude the user who just left
}

// Handle graceful server shutdown
process.on("SIGINT", () => {
  console.log("Shutting down WebSocket server...");

  // Close all active connections
  users.forEach((user) => {
    safeSend(user.ws, {
      type: "server-shutdown",
      data: {
        message: "Server is shutting down",
      },
    });
    user.ws.close(1001, "Server shutdown"); // 1001 = Going Away
  });

  // Close the WebSocket server
  wss.close(() => {
    console.log("WebSocket server closed");
    process.exit(0);
  });
});
