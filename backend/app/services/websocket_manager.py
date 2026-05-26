from fastapi import WebSocket
from typing import Dict, List
import json


class ConnectionManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.active_connections: Dict[int, List[WebSocket]] = {}
            cls._instance.user_rooms: Dict[int, int] = {}
        return cls._instance

    async def connect(self, websocket: WebSocket, room_id: int, user_id: int):
        await websocket.accept()

        if room_id not in self.active_connections:
            self.active_connections[room_id] = []

        self.active_connections[room_id].append(websocket)
        self.user_rooms[user_id] = room_id

        await self.broadcast_to_room(
            room_id,
            {
                "type": "user_joined",
                "user_id": user_id,
                "message": f"User {user_id} joined the room",
            },
        )

    def disconnect(self, websocket: WebSocket, room_id: int, user_id: int):
        if room_id in self.active_connections:
            if websocket in self.active_connections[room_id]:
                self.active_connections[room_id].remove(websocket)
            if len(self.active_connections[room_id]) == 0:
                del self.active_connections[room_id]

        if user_id in self.user_rooms:
            del self.user_rooms[user_id]

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast_to_room(self, room_id: int, message: dict):
        if room_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[room_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception:
                    disconnected.append(connection)

            for connection in disconnected:
                self.active_connections[room_id].remove(connection)

    async def send_to_user(self, user_id: int, message: dict):
        room_id = self.user_rooms.get(user_id)
        if room_id is None:
            return
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception:
                    pass


manager = ConnectionManager()
