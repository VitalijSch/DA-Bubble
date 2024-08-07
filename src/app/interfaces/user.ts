export interface User {
    uid?: string;
    name: string;
    email: string;
    avatar?: string;
    online?: boolean;
    channelIds?: string[];
    directChatIds?: string[];
}
