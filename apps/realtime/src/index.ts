import { createServer } from "node:http";
import { Server } from "socket.io";

const port = Number(process.env.PORT ?? 3001);
const corsOrigin = process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()) ?? [
  "http://localhost:3000",
];

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("english-platform realtime");
});

const io = new Server(httpServer, {
  cors: { origin: corsOrigin, methods: ["GET", "POST"] },
});

io.use((socket, next) => {
  const userId = socket.handshake.auth.userId as string | undefined;
  if (userId) {
    socket.join(`user:${userId}`);
  }
  next();
});

io.on("connection", (socket) => {
  const userId = socket.handshake.auth.userId as string | undefined;

  socket.on(
    "chat:send",
    (payload: {
      threadId: string;
      recipientId: string;
      body: string;
      senderId?: string;
    }) => {
      if (!payload?.body?.trim()) return;
      const sender = payload.senderId ?? userId;
      if (!sender) return;
      io.to(`user:${payload.recipientId}`).emit("chat:message", {
        threadId: payload.threadId,
        senderId: sender,
        body: payload.body,
        createdAt: new Date().toISOString(),
      });
      socket.emit("chat:sent", { threadId: payload.threadId });
    },
  );

  socket.on("notify:ping", () => {
    socket.emit("notify:pong", { at: new Date().toISOString() });
  });
});

httpServer.listen(port, () => {
  console.info(`realtime listening on ${port}`);
});
