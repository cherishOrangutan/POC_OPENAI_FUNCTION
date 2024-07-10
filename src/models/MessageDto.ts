export class MessageDto {
  isUser: boolean;
  content: string;
  images: string[];

  constructor(isUser: boolean, content: string, images: string[] = []) {
    this.isUser = isUser;
    this.content = content;
    this.images = images;
  }
}
