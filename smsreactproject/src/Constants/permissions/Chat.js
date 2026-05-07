import React from 'react';

import ChatList from 'Containers/Chat/ChatList';

const Actions = {
    chat: {
        view: {
            codenames: [],
            action_code: 'visible_chat_view',
            is_superuser_action: false,
            name: 'Chat List',
            label: 'Chat List',
            action: 'sub-menu',
            url: '/chat/view',
            old_url: '/chat/view',
            component: <ChatList />,
            permission_needed: true,
            exclude_roles:[7],
        },
        name: 'CHAT',
        type: 'chat',
        old_code: 'chat'
    },
}

export default Actions