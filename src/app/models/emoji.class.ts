import { increment } from "firebase/firestore";

export class Emoji {
  id: string;
  path: string;
  uids: string[] = [];
  count: number = 0;

  constructor(id: string, path: string, uid: string) {
    this.uids.push(uid);
    this.id = id;
    this.path = path;
  }

  incrementCount() {
    this.count++;
  }

  decrementCount() {
    if (this.count > 0)
      this.count--;
  }
}