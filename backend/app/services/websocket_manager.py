from fastapi import WebSocket
from typing import Dict, List
import json

class ConnectionManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.user_connections: Dict[int, List[WebSocket]] = {}
        return cls._instance

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        
        if user_id not in self.user_connections:
            self.user_connections[user_id] = []
            
        self.user_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.user_connections:
            if websocket in self.user_connections[user_id]:
                self.user_connections[user_id].remove(websocket)
            
            if len(self.user_connections[user_id]) == 0:
                del self.user_connections[user_id]

    async def send_to_user(self, user_id: int, message: dict):

        if user_id in self.user_connections:
            disconnected = []
            for connection in self.user_connections[user_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception:
                    disconnected.append(connection)

            for connection in disconnected:
                self.user_connections[user_id].remove(connection)
            if len(self.user_connections[user_id]) == 0:
                del self.user_connections[user_id]

    async def broadcast_to_users(self, user_ids: List[int], message: dict):
        for user_id in user_ids:
            await self.send_to_user(user_id, message)

manager = ConnectionManager()