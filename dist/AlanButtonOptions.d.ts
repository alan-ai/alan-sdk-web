export interface AlanButtonOptions {
    key: string;
    rootEl?: HTMLElement;
    right?: number | string;
    bottom?: number | string;
    left?: number | string;
    top?: number | string;
    position?: string;
    pinned?: boolean;
    zIndex?: number;
    onCommand?(commandData: object): void;
    onConnectionStatus?(status: string): void;
}