import { Component, ElementRef, Input, Pipe, PipeTransform, SecurityContext, ViewChild, ViewEncapsulation, inject, input } from '@angular/core';
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
import { ThreadChatService } from '../../../../services/chat/thread-chat/thread-chat.service';
import { EditUserProfileService } from '../../../../services/edit-user-profile/edit-user-profile.service';
import { EditUserProfileComponent } from '../../../edit-user-profile/edit-user-profile.component';
import { FirebaseChannelService } from '../../../../services/firebase-channel/firebase-channel.service';
import { ToggleDNoneService } from '../../../../services/toggle-d-none/toggle-d-none.service';
import { DomSanitizer } from '@angular/platform-browser';

@Pipe({
  name: 'safeHtml',
  standalone: true
})
export class SafeHtmlPipe implements PipeTransform {
  sanitizer = inject(DomSanitizer);
  transform(text: string, isOwn: boolean) {
    text = this.sanitizer.sanitize(SecurityContext.HTML, text)!;
    if (text.includes('@')) {
      const dom = (new DOMParser()).parseFromString(text, "text/html");
      dom.querySelectorAll('span').forEach((span) => {
        if (span.textContent?.includes('@')) {
          if (!isOwn) span.style.color = '#535AF1';
          else span.style.color = '#ECEEFE';
        }
      });
      return this.sanitizer.bypassSecurityTrustHtml(dom.documentElement.outerHTML);
    } return text;
  }
}

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [
    ReactionBarComponent,
    CommonModule,
    EditableMessageComponent,
    EmojiCounterComponent,
    EmojiPickerButtonComponent,
    SvgButtonComponent,
    EditUserProfileComponent,
    SafeHtmlPipe
  ],
  templateUrl: './message.component.html',
  styleUrl: './message.component.scss',
  // encapsulation: ViewEncapsulation.None
})
export class MessageComponent {
  @Input() message!: Message;
  @Input() chat: Chat | undefined;

  user!: User;
  partner: User | undefined = undefined;
  isEditing: boolean = false;
  public showProfileService: ShowProfileService = inject(ShowProfileService);
  public editUserProfileService: EditUserProfileService = inject(EditUserProfileService);
  public toggleDNone: ToggleDNoneService = inject(ToggleDNoneService);
  chatService = inject(ChatService);
  userService = inject(UserService);
  threadService = inject(ThreadChatService);
  cid!: string;
  @ViewChild('messageItem') messageItem!: ElementRef;
  oldMessage: string = '';
  firebase = inject(FirebaseService);
  channelService = inject(FirebaseChannelService);
  

  constructor() {
    this.user = this.firebase.currentUser;
    if (this.message)
    this.partner = this.firebase.users.find(user => user.uid === this.message.uid);
  }

  ngOnChanges() {
    this.user = this.firebase.currentUser;
    if (this.chat) {
      this.cid = this.chat.cid;
      const rest = this.chat.uids.filter(uid => uid !== this.firebase.currentUser.uid);
      if (rest.length === 0) {
        this.partner = this.firebase.currentUser;
      } else {
        this.partner = this.firebase.users.find(user => user.uid === rest[0]);
      }
    }
    if (this.channelService.isChannelSet() && this.message) {
      this.partner = this.firebase.users.find(user => user.uid === this.message.uid);
    }
  }

  async editMessage(message: Message) {
    if (message) {
      if (message.isAnswer) {
        await this.threadService.editMessage(message, this.cid);
      } else if (this.channelService.isChannelSet()) {
        await this.channelService.editMessage(message);
      } else
        await this.chatService.editMessage(this.cid, message);
    }
    else {
      this.isEditing = true;
      this.oldMessage = this.message.text;
    }
  }


  async closeEdit(message: Message) {
    this.isEditing = false;
    if (message)
      if (message.isAnswer)
        await this.threadService.editMessage(message, this.cid);
      else if (this.channelService.isChannelSet()) {
        await this.channelService.editMessage(message);
      } else
        await this.chatService.editMessage(this.cid, message);
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
        if (!this.message.emojis[index].uids.includes(this.firebase.currentUser.uid!)) {
          this.message.emojis[index].count++;
          this.message.emojis[index].uids.push(this.firebase.currentUser.uid!);
        }
      } else {
        const emoji = new Emoji(id, this.userService.emojis[indexUser].path, this.firebase.currentUser.uid!);
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
    return uid === this.firebase.currentUser.uid;
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


  async areAnswers() {
    const count = await this.threadService.getAnswerCount(this.message.mid, this.chat?.cid!);
    return count;
  }

  openThread() {
    this.threadService.openThreadChat(this.message, this.chatService.chat!);
    this.toggleDNone.toggleIsThreadActive();
  }

  getAnswerText() {
    return this.message.answerCount + ' ' + (this.message.answerCount > 1 ? 'Antworten' : 'Antwort');
  }

}
