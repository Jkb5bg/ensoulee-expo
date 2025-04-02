export default interface MessageType {
  content: string;
  senderId: string;
  timestamp: number;
  pending?: boolean;
  read?: boolean;
  id?: string;
}