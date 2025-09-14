export type TFunction = {
  (key: string, ...args: any[]): string;
  rich: (key: string, ...args: any[]) => React.ReactNode;
  markup: (key: string, ...args: any[]) => string;
};
