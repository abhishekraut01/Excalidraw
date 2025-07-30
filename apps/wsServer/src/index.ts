import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';

const wss = new WebSocketServer({ port: 8080 });

const checkLogin = (token: string): jwt.JwtPayload | false => {
  if (!token) {
    return false;
  }
  const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string) as jwt.JwtPayload;
  if (!decoded.userId) {
    return false;
  }
  return decoded;
};

wss.on('connection', function connection(ws, req) {
  ws.on('error', console.error);

  const token = req.headers.cookie;
  if (!token) {
    ws.close();
    return;
  }

  const decoded = checkLogin(token);
  if (!decoded) {
    ws.close();
    return;
  } 

  ws.on('message', function message(data) {
    console.log('received: %s', data);
  });

  ws.send('something');
});