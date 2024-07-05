import { Component, ElementRef, Input, ViewChild, inject, input } from '@angular/core';
import { Message } from '../../../../models/message.class';
import { ReactionBarComponent } from './reaction-bar/reaction-bar.component';
import { ShowProfileService } from '../../../../services/show-profile/show-profile.service';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../../../services/chat/chat.service';
import { User } from '../../../../interfaces/user';
import { EditableMessageComponent } from './editable-message/editable-message.component';
import { Chat } from '../../../../models/chat.class';
import { EmojiCounterComponent } from './emoji-counter/emoji-counter.component';
import { EmojiPickerButtonComponent } from './emoji-picker-button/emoji-picker-button.component';
import { UserService } from '../../../../services/user/user.service';
import { Emoji } from '../../../../models/emoji.class';
import { SvgButtonComponent } from '../../../svg-button/svg-button.component';
import { FirebaseService } from '../../../../services/firebase/firebase.service';

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [
    ReactionBarComponent, 
    CommonModule, 
    EditableMessageComponent, 
    EmojiCounterComponent, 
    EmojiPickerButtonComponent, 
    SvgButtonComponent],
  templateUrl: './message.component.html',
  styleUrl: './message.component.scss'
})
export class MessageComponent {
  @Input() message!: Message;
  @Input() chat: Chat | undefined;

  user!: User ;
  partner: User | undefined;
  isEditing: boolean = false;
  public showProfileService: ShowProfileService = inject(ShowProfileService);
  chatService = inject(ChatService);
  userService = inject(UserService);
  cid!: string;
  @ViewChild('messageItem') messageItem!: ElementRef;
  isEmojiPickerOpen = false;
  oldMessage: string = '';
  firebase = inject(FirebaseService);

  constructor() { 
    this.user = this.firebase.currentUser;    
  }

  ngOnInit(): void {
    this.user = this.firebase.currentUser;    
    if (this.chat) {
      this.cid = this.chat.cid;
      this.chat.uids.forEach(uid => {
        if (uid !== this.firebase.currentUser.uid) {
          this.partner =  this.firebase.getUser(uid);
          console.log('PARTNER: ',this.partner?.avatar);	
          
        } 
      });
    }
  }

  ngOnChanges() {
    console.log('Changes');
    console.log('chat: ', this.chat);
    
    this.user = this.firebase.currentUser;
    if (this.chat) {
      this.cid = this.chat.cid;
      this.chat.uids.forEach(uid => {
        if (uid !== this.firebase.currentUser.uid) {
          this.partner =  this.firebase.getUser(uid);
          console.log();
          
          console.log('PARTNER: ',this.partner?.avatar);	
          
        } 
      });
    }
  }

  editMessage(message: Message) {
    if (message) {
      this.chatService.editMessage(this.cid, message);
    }
    else{
      this.isEditing = true;
      this.oldMessage = this.message.text;
    }
  }


  closeEdit(message: Message) {
    this.isEditing = false;
    if (message)
      this.chatService.editMessage(this.cid, message);
    else {
      this.message.text = this.oldMessage;
    }
  }

  scrollIntoView() {
    this.messageItem.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  addReaction(id: string) {
    const indexUser = this.userService.emojis.findIndex(e => e.id === id);
    if (indexUser != -1) {
      this.userService.emojis[indexUser].count++;
      const index = this.message.emojis.findIndex(e => e.id === id);
      if (index != -1) {
        if (!this.message.emojis[index].uids.includes(this.userService.firebase.currentUser.uid!))
        this.message.emojis[index].count++;
        this.message.emojis[index].uids.push(this.userService.firebase.currentUser.uid!);
      } else {
        const emoji = new Emoji(id,this.userService.emojis[indexUser].path, this.userService.firebase.currentUser.uid!);
        emoji.count = 1;
        this.message.emojis.push(emoji);
      }
      this.userService.sortEmojis();
      this.editMessage(this.message);
    } else {
      console.log('no emoji found in user service');
    }
  }

  isCurrentUser(uid: string) {
    return uid === this.userService.firebase.currentUser.uid;
  }

  areAnyEmojis() {
    let result = false;
    for (let emoji of this.message.emojis) {
      if (emoji.count > 0) {
        result = true;
        break;
      }
    }
    return result;
  } 

  toggleEmojiPicker() {
    this.isEmojiPickerOpen = !this.isEmojiPickerOpen;
  }
}
