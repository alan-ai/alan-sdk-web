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
    userInfo: {
        setId: (userId: string) => void;
        getId: () => string,
    };
    textChat: {
        setAudioOutputEnabled: (value: boolean) => void,
        isAudioOutputEnabled: () => boolean,
        setFullScreenMode: (value: boolean) => void,
        close: () => void,
        minimize: () => void,
        open: () => void,
        clear: () => void,
    };
}