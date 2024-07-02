import { Component, Input, inject } from '@angular/core';
import { Emoji } from '../../../../models/emoji.class';
import { Message } from '../../../../models/message.class';
import { User } from '../../../../interfaces/user';
import { ChatService } from '../../../../services/chat/chat.service';
import { SvgButtonComponent } from '../../../svg-button/svg-button.component';
import { EmojiPickerButtonComponent } from '../../chat-body/message/emoji-picker-button/emoji-picker-button.component';

@Component({
  selector: 'app-emoji-counter',
  standalone: true,
  imports: [],
  templateUrl: './emoji-counter.component.html',
  styleUrl: './emoji-counter.component.scss'
})
export class EmojiCounterComponent {
  @Input({ required: true }) emoji!: Emoji;
  @Input({ required: true }) message!: Message;
  @Input({ required: true }) cid!: string;
  @Input({ required: true }) user!: User;
  chatService = inject(ChatService);

  incrementEmoji(id: string) {
    if (this.message.emojis) {
      const index = this.message.emojis.findIndex(e => e.id === id);
      if (index != -1) {
        if (!this.message.emojis[index].uids.includes(this.user.uid!)) {
          this.message.emojis[index].count++;
          this.message.emojis[index].uids.push(this.user.uid!);
        }
        else {
          this.message.emojis[index].count--;
          this.message.emojis[index].uids = this.message.emojis[index].uids.filter(uid => uid !== this.user.uid!);
        }
        this.chatService.editMessage(this.cid, this.message);
      }
    } else {
      console.log('no emojis');
    }

  }

  getDetailsText(): string {
    if (this.emoji.uids.length === 1) {
      const name = this.getNameFromId(this.emoji.uids[0]);
      if (name === 'Du') return 'Du hast reagiert.'
      return this.getNameFromId(this.emoji.uids[0]) + ' hat reagiert.'
    } else
    if (this.emoji.uids.length === 2) {
      return this.getNameFromId(this.emoji.uids[0]) + ' und ' + this.getNameFromId(this.emoji.uids[1]) + ' haben reagiert.'
    } else

    if (this.emoji.uids.length === 3) {
      return this.getNameFromId(this.emoji.uids[0]) + ', ' + this.getNameFromId(this.emoji.uids[1]) + ' und ' + this.getNameFromId(this.emoji.uids[2]) + ' haben reagiert.'
    } else
    if (this.emoji.uids.length > 3) {
      return this.getNameFromId(this.emoji.uids[0]) + ', ' + this.getNameFromId(this.emoji.uids[1]) + ' und ' + (this.emoji.uids.length - 2) + "<span class='more' (click)='openMore()'> weitere</span> haben reagiert."
    }
    return '';
  }


  getNameFromId(id: string): string {
    if (id === this.chatService.firebase.currentUser.uid!) {
      return 'Du';
    } else {
      return this.chatService.firebase.getUser(id)?.name ?? 'unbekannter Benutzer';
    }

  }
}