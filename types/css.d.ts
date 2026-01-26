// src/types/css.d.ts
declare module '*.css' {
  const content: string;
  export default content;
}

// Pentru import-uri pure side-effect (cel mai frecvent în Next.js)
declare module '*.css';