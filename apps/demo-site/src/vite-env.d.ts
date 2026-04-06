/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
    readonly VITE_CLIENT_ID?: string;
    readonly VITE_LAUNCHER_LABEL?: string;
    readonly VITE_MODAL_TITLE?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
