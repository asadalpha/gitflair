declare module 'react-syntax-highlighter' {
    import React from 'react';
    export const Prism: React.ComponentType<Record<string, unknown>>;
    export const Light: React.ComponentType<Record<string, unknown>>;
    export default Prism;
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
    export const atomDark: Record<string, unknown>;
    export const vscDarkPlus: Record<string, unknown>;
    export const oneDark: Record<string, unknown>;
}
