export interface AlanButtonOptions {
    key: string;
    rootEl?: HTMLElement;
    right?: number | string;
    bottom?: number | string;
    left?: number | string;
    top?: number | string;
    position?: string;
    pinned?: boolean;
    keepDialogSession?: boolean;
    showOverlayOnMicPermissionPrompt?: boolean;
    zIndex?: number;
    onCommand?: (commandData: object) => void;
    onEvent?: (event: object) => void;
    onButtonState?: (state: string) => void;
    onConnectionStatus?: (status: string) => void;
}