export interface IUser {
  userId: string;
  rooms: string[];
  ws: WebSocket;
}