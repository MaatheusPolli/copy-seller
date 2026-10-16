export interface Copy {
  title: string;
  shortDescription: string;
  longDescription: string;
  bullets: string[];
}

export type CopyField = keyof Copy;

export function copyText(copy: Copy): string {
  return [copy.title, copy.shortDescription, copy.longDescription, ...copy.bullets].join('\n');
}
