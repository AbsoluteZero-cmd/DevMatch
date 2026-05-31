'use client';

import {
	createContext,
	useContext,
	useState,
	useCallback,
	useEffect,
	type ReactNode,
} from 'react';
import { useAuth } from '@/contexts/auth-context';
import { API_URL } from '@/lib/api';

interface UnreadContextValue {
	unreadCount: number;
	increment: () => void;
	clear: () => void;
}

const UnreadContext = createContext<UnreadContextValue>({
	unreadCount: 0,
	increment: () => {},
	clear: () => {},
});

export function UnreadProvider({ children }: { children: ReactNode }) {
	const { accessToken, user } = useAuth();
	const [count, setCount] = useState(0);

	const increment = useCallback(() => setCount((c) => c + 1), []);
	const clear = useCallback(() => setCount(0), []);

	useEffect(() => {
		if (!accessToken) return;

		const wsBaseUrl = API_URL.replace(/^http/, 'ws').replace(
			/\/api\/v1\/?$/,
			'',
		);
		let ws: WebSocket;
		try {
			ws = new WebSocket(`${wsBaseUrl}/ws/inbox?token=${accessToken}`);
		} catch {
			return;
		}

		const myId = user ? Number(user.id) : null;
		ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				if (data.type === 'new_message') {
					if (myId !== null && data.user_id === myId) return;
					setCount((c) => c + 1);
				} else if (data.type === 'new_offer' || data.type === 'inbox_invite') {
					setCount((c) => c + 1);
				}
			} catch {}
		};

		return () => {
			ws.close();
		};
	}, [accessToken, user]);

	return (
		<UnreadContext.Provider value={{ unreadCount: count, increment, clear }}>
			{children}
		</UnreadContext.Provider>
	);
}

export function useUnread() {
	return useContext(UnreadContext);
}
