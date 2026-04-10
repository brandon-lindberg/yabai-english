import { createServer } from "node:http";
import { Server } from "socket.io";

const port = Number(process.env.PORT ?? 3001);
const corsOrigin = process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()) ?? [
  "http://localhost:3000",
];
const serverEmitSecret = process.env.SERVER_EMIT_SECRET;

const httpServer = createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/emit") {
    if (serverEmitSecret) {
      const provided = req.headers["x-realtime-secret"];
      if (provided !== serverEmitSecret) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized" }));
        return;
      }
    }

    let raw = "";
    for await (const chunk of req) {
      raw += String(chunk);
    }
    try {
      const body = JSON.parse(raw) as {
        userId: string;
        event: string;
        payload?: unknown;
      };
      if (!body?.userId || !body?.event) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid body" }));
        return;
      }
      io.to(`user:${body.userId}`).emit(body.event, body.payload ?? {});
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }
  }

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
