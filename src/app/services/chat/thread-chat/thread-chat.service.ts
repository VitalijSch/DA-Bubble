import { inject, Injectable, signal } from '@angular/core';
import { Message } from '../../../models/message.class';
import { Chat } from '../../../models/chat.class';
import { FirebaseService } from '../../firebase/firebase.service';
import { collection, doc, getCountFromServer, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { FirebaseChannelService } from '../../firebase-channel/firebase-channel.service';
import { User } from '../../../interfaces/user';

@Injectable({
  providedIn: 'root'
})
export class ThreadChatService {
  openSideThread = signal(false);
  message!: Message;
  chat: Chat | undefined = undefined;
  signalThreadChat = signal<Chat | undefined>(this.chat);
  firebase = inject(FirebaseService);
  messages: Message[] = [];
  unsubMessages: Unsubscribe | undefined;
  channelService = inject(FirebaseChannelService);
  loading = false;
  users: User[] = [];


  openThreadChat(message: Message, chat: Chat) {
    this.loading = true;
    this.message = message;
    if (this.channelService.isChannelSet()) {
      this.chat = undefined;
      this.users = this.channelService.usersFromChannel;
    } else {
      this.chat = chat;
      for (let uid of this.chat.uids) {
        this.users.push(this.firebase.getUser(uid)!);
      }
    }
    this.getMessages();
    this.openSideThread.set(true);
    this.signalThreadChat.set(this.chat);
    this.loading = false;
  }

  setThreadChat(message: Message, chat: Chat) {
    this.message = message;
    this.chat = chat;
  }

  exitThread() {
    this.chat = undefined;
    this.messages = [];
    this.openSideThread.set(false);
    this.signalThreadChat.set(this.chat);
  }

  getMessages() {
    let ref;
    if (!this.channelService.isChannelSet()) {
      ref = collection(doc(this.firebase.getDirectChatMessagesRef(this.chat?.cid!), this.message.mid), 'thread');
    } else {
      ref = this.channelService.getChannelThreadForMessage(this.message.mid);
    }
      if (this.unsubMessages) this.unsubMessages();
      this.unsubMessages = onSnapshot(ref, (collection) => {
        this.messages = [];
        collection.forEach((doc) => {
          this.messages.push(doc.data() as Message);
        });
        this.messages = this.messages.sort((a, b) => a.timestamp - b.timestamp);
      })
    
  }

  async getAnswerCount(mid: string, cid: string) {
    let ref;
    if (this.channelService.isChannelSet()) {
      ref = collection(this.channelService.getCurrentChannelRef(), 'thread');
    } else
      ref = collection(doc(this.firebase.getDirectChatMessagesRef(cid), mid), 'thread');
    const snapshot = await getCountFromServer(ref);
    return snapshot.data().count;
  }

  async editMessage(message: Message, cid: string) {
    if (message) {
      if (this.channelService.isChannelSet()) {
        const ref = doc(this.channelService.getChannelThreadForMessage(message.mid), message.tid);
        await this.firebase.updateRefMessage(ref, message);
      }
      else if (this.chat) {
        const ref = doc(collection(doc(this.firebase.getDirectChatMessagesRef(cid), message.mid), 'thread'), message.tid);
        const result = await this.firebase.updateRefMessage(ref, message);
        
      }
    } else console.log('no message to edit');
  }

  onNgDestroy() {
    if (this.unsubMessages) this.unsubMessages();
  }
}
