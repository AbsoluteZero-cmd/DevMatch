from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.message import Message
from app.services.websocket_manager import ConnectionManager

import json

router = APIRouter()


@router.websocket("/ws/chat/{room_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):

    manager = ConnectionManager()

    try:
        await manager.connect(websocket, room_id, user.id)

        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)

            # Handle different message types
            if message_data["type"] == "chat_message":
                # Save message to database
                db_message = Message(
                    room_id=room_id,
                    user_id=user.id,
                    content=message_data["content"],
                    message_type=message_data.get("message_type", "text"),
                )
                db.add(db_message)
                db.commit()
                db.refresh(db_message)

                # Broadcast to room
                await manager.broadcast_to_room(
                    room_id,
                    {
                        "message_id": db_message.id,
                        "type": "new_message",
                        "user_id": user.id,
                        "full_name": user.full_name,
                        "content": message_data["content"],
                        "timestamp": db_message.created_at.isoformat(),
                        "message_type": message_data.get("message_type", "text"),
                    },
                )

            elif message_data["type"] == "typing_start":
                await manager.broadcast_to_room(
                    room_id,
                    {
                        "type": "user_typing",
                        "user_id": user.id,
                        "full_name": user.full_name,
                        "typing": True,
                    },
                )

            elif message_data["type"] == "typing_stop":
                await manager.broadcast_to_room(
                    room_id,
                    {
                        "type": "user_typing",
                        "user_id": user.id,
                        "full_name": user.full_name,
                        "typing": False,
                    },
                )

    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id, user.id)
        await manager.broadcast_to_room(
            room_id,
            {
                "type": "user_left",
                "user_id": user.id,
                "message": f"User {user.id} left the room",
            },
        )


@router.websocket("/ws")
async def websocket_test(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Message received: {data}")
    except WebSocketDisconnect:
        # Handle the cleanup here
        print("Client disconnected")
