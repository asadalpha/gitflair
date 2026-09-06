declare module 'react-syntax-highlighter' {
    import React from 'react';
    export const Prism: React.ComponentType<any>;
    export const Light: React.ComponentType<any>;
    export default Prism;
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
    export const atomDark: any;
    export const vscDarkPlus: any;
    export const oneDark: any;
}
