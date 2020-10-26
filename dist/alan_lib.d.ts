interface AlanButtonOptions {
    key: string;
    rootEl?: HTMLElement;
    right?: number | string;
    bottom?: number | string;
    left?: number | string;
    top?: number | string;
    position?: string;
    onCommand?(commandData: object): void;
    onConnectionStatus?(status: string): void;
}

declare function alanBtn(options: AlanButtonOptions): {
    setVisualState: (visualStateData: object) => void;
    callProjectApi: (method: string, data: object, callback: (error: string, result: object) => void) => void;
    playText: (text: string) => void;
    playCommand: (command: object) => void;
    activate: () => Promise<void>;
    deactivate: () => void;
    isActive: () => boolean;
};

export default alanBtn;