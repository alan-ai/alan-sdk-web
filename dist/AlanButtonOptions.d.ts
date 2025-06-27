export interface AlanButtonOptions {
    key: string;
    rootEl?: HTMLElement | undefined;
    chatEl?: HTMLElement | undefined;
    right?: number | string;
    bottom?: number | string;
    left?: number | string;
    top?: number | string;
    position?: string;
    pinned?: boolean;
    keepDialogSession?: boolean;
    showOverlayOnMicPermissionPrompt?: boolean;
    zIndex?: number;
    host?: string;
    mode?: 'inlined' | undefined;
    onCommand?: (commandData: object) => void;
    onEvent?: (event: object) => void;
    onButtonState?: (state: string) => void;
    onConnectionStatus?: (status: string) => void;
    textChat?: {
        closeDelay?: number;
        showBtnIfChatOpen?: boolean;
        openByDefault?: boolean;
        onClose?: () => void;
        onMinimize?: () => void;
        onOpen?: () => void;
        headerElement?: HTMLDivElement;
        footerInfoElement?: HTMLDivElement;
    }
}