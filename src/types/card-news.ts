export type SlideType = 'cover' | 'body' | 'outro';

export interface Slide {
  id: string;
  type: SlideType;
  headline: string;
  body: string;
  imageUrl: string | null;
  imagePlaceholder: string;
}

export interface CardNewsData {
  slides: Slide[];
  template: string;
  colorTheme: string;
  font: string;
  ratio: '1:1' | '9:16';
}
