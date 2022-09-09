export interface AlanButton {
    setVisualState: (visualStateData: object) => void;
    callProjectApi: (method: string, data: object, callback: (error: string, result: object) => void) => void;
    playText: (text: string) => void;
    playCommand: (command: object) => void;
    activate: () => Promise<void>;
    deactivate: () => void;
    isActive: () => boolean;
    remove: () => void;
    sendText: (text: string) => void;
}