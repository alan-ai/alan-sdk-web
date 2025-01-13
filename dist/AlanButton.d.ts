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
    theme: {
        setTheme: (theme: 'light' | 'dark') => void;
        getTheme: () => string,
    };
    textChat: {
        setAudioOutputEnabled: (value: boolean) => void,
        isAudioOutputEnabled: () => boolean,
        setFullScreenMode: (value: boolean) => void,
        close: () => void,
        clear: () => void,
    };
}