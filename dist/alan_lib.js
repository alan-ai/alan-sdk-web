;(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.alanBtn = factory();
  }
}(this, function() {
(function(ns) {
    "use strict";

    navigator.getUserMedia = (navigator.getUserMedia ||
                              navigator.webkitGetUserMedia ||
                              navigator.mozGetUserMedia ||
                              navigator.msGetUserMedia ||
                              (navigator.mediaDevices && navigator.mediaDevices.getUserMedia));

    if (!navigator.getUserMedia) {
        console.error("getUserMedia is not supported");
    }

    function isAudio(obj) {
       return obj instanceof Float32Array;
    }

    function AudioQueue() {
        this._queue = [];
    }

    AudioQueue.prototype.write = function(float32arrayOrEvent) {
        this._queue.push(float32arrayOrEvent);
    };

    AudioQueue.prototype._fetchData = function() {
        while (this._queue.length && !isAudio(this._queue[0])) {
            fireEvent('command', this._queue.shift());
        }
        return this._queue.length;
    };

    AudioQueue.prototype.read = function(samples) {
        if (!this._fetchData()) {
            return null;
        }
        if (samples === this._queue[0].length) {
            return this._queue.shift();
        }
        if (samples < this._queue[0].length) {
            var r = this._queue[0].subarray(0, samples);
            this._queue[0] = this._queue[0].subarray(samples, this._queue[0].length);
            return r;
        }
        var res = new Float32Array(samples);
        var idx = 0;
        while (idx < samples && this._queue.length > 0) {
            if (!this._fetchData()) {
                break;
            }
            var len = Math.min(samples - idx, this._queue[0].length);
            for (var i = 0; i < len; i++ ) {
                res[idx + i] = this._queue[0][i];
            }
            idx += len;
            if (len === this._queue[0].length) {
                this._queue.shift();
            } else {
                this._queue[0] = this._queue[0].subarray(len, this._queue[0].length);
            }
        }
        return res;
    };

    var PLAY_IDLE      = 'idle';
    var PLAY_ACTIVE    = 'active';

    var handlers       = {};
    var micStream      = null;
    var audioQueue     = new AudioQueue();
    var audioPlayback  = null;
    var audioPlayGain  = null;
    var audioRecorder  = null;
    var audioSource    = null;
    var frameSize      = 4096;
    var silence        = new Float32Array(frameSize);
    var playState      = PLAY_IDLE;
    var audioCtx       = null;
    var totalSamples   = 0;
    var sampleRate     = 0;
    var firstSampleTs  = 0;
    var frameCount     = 0;

    if (window.AudioContext) {
        audioCtx = new window.AudioContext();
    }

    if (window.webkitAudioContext) {
        audioCtx = new window.webkitAudioContext();
    }

    function fireEvent(event, o1, o2) {
        var h = handlers[event];
        if (h) {
            for (var i = 0; i < h.length; i++ ) {
                h[i](o1, o2);
            }
        }
    }

    function onGetUserMedia(mic) {
        console.log('got microphone');
        fireEvent('micStart', mic);
        micStream = mic;

        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        audioSource   = audioCtx.createMediaStreamSource(micStream);
        audioRecorder = audioCtx.createScriptProcessor(frameSize, 1, 1);
        audioSource.connect(audioRecorder);
        audioRecorder.onaudioprocess = function(e) {
            if (micStream === mic) {
                recordFrame(audioCtx.sampleRate, e.inputBuffer.getChannelData(0));
            }
        };
        audioRecorder.connect(audioCtx.destination);
    }

    function onGetUserMediaError(err) {
        console.error('failed to get microphone', err);
        fireEvent('micFail', err);
    }

    function recordFrame(sr, float32array) {
        if (sampleRate !== sr) {
            sampleRate = sr;
            firstSampleTs = Date.now();
            totalSamples = 0;
            frameCount = 0;
        }
        totalSamples += float32array.length;
        if (++frameCount >= 300) {
            frameCount = 0;
            var audioTime = (1000 * totalSamples) / sampleRate;
            var clockTime = Date.now() - firstSampleTs;
            console.log("audioTime: "   + audioTime +
                        ", clockTime: " + clockTime +
                        ", ratio a/c: " + audioTime / clockTime);
        }
        fireEvent('frame', sampleRate, float32array);
    }

    ns.isPlaying = function() {
        return playState === PLAY_ACTIVE;
    };

    ns.playCommand = function(event) {
        if (!audioPlayback) {
            fireEvent('command', event);
            return;
        }
        audioQueue.write(event);
    };

    ns.play = function(frames) {
        if (!audioPlayback) {
            return;
        }
        for (var i = 0; i < frames.length; i++ ) {
            audioQueue.write(frames[i]);
        }
    };

    ns.on = function(event, handler) {
        var h = handlers[event];
        if (h == null) {
            handlers[event] = [handler];
        } else {
            h.push(handler);
        }
    };

    ns.off = function(event, handler) {
        var h = handlers[event];
        if (h) {
            var index = h.indexOf(handler);
            if (index >= 0) {
                h.splice(index, 1);
            }
        }
    };

    ns.sampleRate = function() {
        return sampleRate;
    };

    ns.start = function(onStarted) {
            if (!micStream) {
                if (navigator.mediaDevices) {
                    navigator.mediaDevices.getUserMedia({audio: true}).then(onGetUserMedia, onGetUserMediaError);
                } else {
                    navigator.getUserMedia({audio: true}, onGetUserMedia, onGetUserMediaError);
                }
            }
            if (!audioPlayback) {
                audioPlayback = audioCtx.createScriptProcessor(frameSize, 1, 1);
                audioPlayback.onaudioprocess = function(e) {
                    var f = audioQueue.read(frameSize);
                    if (!f) {
                        if (playState === PLAY_ACTIVE) {
                            playState = PLAY_IDLE;
                            fireEvent('playStop');
                        }
                        f = silence;
                    } else {
                        if (playState === PLAY_IDLE) {
                            playState = PLAY_ACTIVE;
                            fireEvent('playStart');
                        }
                    }
                    if (onStarted) {
                        onStarted();
                        onStarted = null;
                    }
                    e.outputBuffer.getChannelData(0).set(f);
                };
                audioPlayGain = audioCtx.createGain();
                audioPlayback.connect(audioPlayGain);
                audioPlayGain.connect(audioCtx.destination);
            } else {
                if (onStarted) {
                    onStarted();
                    onStarted = null;
                }
            } 
    };

    ns.stop = function() {
        sampleRate = -1;
        if (micStream) {
            for (var i = 0; i < micStream.getTracks().length; i++) {
                var track = micStream.getAudioTracks()[0];
                if (track) {
                    track.stop();
                }
            }
            micStream = null;
            fireEvent('micStop');
        }
        if (audioSource) {
            audioSource.disconnect();
            audioSource = null;
        }
        if (audioRecorder) {
            audioRecorder.disconnect();
            audioRecorder = null;
        }
        if (audioPlayback) {
            audioPlayback.disconnect();
            audioPlayback = null;
        }
        if (audioPlayGain) {
            audioPlayGain.disconnect();
            audioPlayGain = null;
        }
        audioQueue = new AudioQueue();
        playState = PLAY_IDLE;
    };

})(typeof(window) !== 'undefined' ? (function() {window.alanAudio = {}; return window.alanAudio})() : exports);

(function(ns) {
    "use strict";

    var host = 'studio.alan.app';

    var config = {
        // baseURL: (window.location.protocol === "https:" ? "wss://" : "ws://") +
        baseURL: "wss://" +
            ((host.indexOf('$') === 0 || host === '') ? window.location.host : host ),
        codec: 'opus',
        version: '1.0.9',
        platform: 'web',
    };

    function ConnectionWrapper() {
        var _this = this;
        this._worker = new Worker(window.URL.createObjectURL(new Blob(["'use strict';importScripts(    'https://studio.alan.app/js/alan_frame.js',    'https://studio.alan.app/js/alan_codec.js',    'https://studio.alan.app/js/libopus.js');var ALAN_OFF       = 'off';var ALAN_SPEAKING  = 'speaking';var ALAN_LISTENING = 'listening';function ConnectionImpl(config, auth, mode) {    var _this = this;    this._config = config;    this._auth = auth;    this._mode = mode;    this._projectId = config.projectId;    this._url = config.url;    this._connected = false;    this._authorized = false;    this._dialogId = null;    this._callId = 1;    this._callSent = {};    this._callWait = [];    this._failed = false;    this._closed = false;    this._reconnectTimeout = 100;    this._cleanups = [];    this._sampleRate = -1;    this._format = null;    this._formatSent = false;    this._frameQueue = [];    this._remoteSentTs = 0;    this._remoteRecvTs = 0;    this._rtt = 25;    this._rttAlpha = 1./16;    this._alanState = ALAN_OFF;    this._sendTimer = setInterval(_this._flushQueue.bind(_this), 100);    this._visualState = {};    this._addCleanup(function() {clearInterval(_this._sendTimer);});    this._connect();    console.log('connection created: ' + this._url);}ConnectionImpl.prototype._addCleanup = function(f) {    this._cleanups.push(f);};ConnectionImpl.prototype._onConnectStatus = function(s) {    console.log('connection status: ' + s);    this._fire('connectStatus', s);};ConnectionImpl.prototype._fire = function(event, object) {    if (event === 'options') {        if (object.versions) {            object.versions['alanbase:web'] = this._config.version;        }    }    postMessage(['fireEvent', event, object]);};ConnectionImpl.prototype._connect = function() {    var _this = this;    if (this._socket) {        console.error('socket is already connected');        return;    }    console.log('connecting to ' + this._url);    this._socket = new WebSocket(this._url);    this._socket.binaryType = 'arraybuffer';    this._decoder = alanCodec.decoder('pcm', 16000);    this._socket.onopen = function(e) {        console.info('connected', e.target === _this._socket);        _this._connected = true;        _this._reconnectTimeout = 100;        _this._fire('connection', {status: 'connected'});        if (_this._auth) {            _this._fire('connection', {status: 'authorizing'});            _this._callAuth();        } else {            _this._callWait.forEach(function(c) {  _this._sendCall(c); });            _this._callWait = [];        }    };    this._socket.onmessage = function(msg) {        if (msg.data instanceof ArrayBuffer) {            var f = alanFrame.parse(msg.data);            if (f.sentTs > 0) {                _this._remoteSentTs = f.sentTs;                _this._remoteRecvTs = Date.now();            } else {                _this._remoteSentTs = null;                _this._remoteRecvTs = null;            }            var rtt = 0;            if (f.remoteTs) {                rtt = Date.now() - f.remoteTs;            }            _this._rtt = _this._rttAlpha * rtt  + (1 - _this._rttAlpha) * _this._rtt;            var frames = _this._decoder(f.audioData);            postMessage(['alanAudio', 'playFrame', frames]);        } else if (typeof(msg.data) === 'string') {            msg = JSON.parse(msg.data);            if (msg.i) {                var c = _this._callSent[msg.i];                delete _this._callSent[msg.i];                if (c && c.callback) {                    c.callback(msg.e, msg.r);                }            } else if (msg.e) {                if (msg.e === 'command') {                    postMessage(['alanAudio', 'playCommand', msg.p]);                } else if (msg.e === 'inactivity') {                    postMessage(['alanAudio', 'stop']);                } else {                    _this._fire(msg.e, msg.p);                }            }        } else {            console.error('invalid message type');        }    };    this._socket.onerror = function(evt) {        console.error('connection closed due to error: ', evt);    };    this._socket.onclose = function(evt) {        console.info('connection closed');        _this._connected = false;        _this._authorized = false;        _this._socket = null;        _this._onConnectStatus('disconnected');        if (!_this._failed && _this._reconnectTimeout && !_this._closed) {            console.log('reconnecting in %s ms.', _this._reconnectTimeout);            _this._reConnect = setTimeout(_this._connect.bind(_this), _this._reconnectTimeout);            if (_this._reconnectTimeout < 3000) {                _this._reconnectTimeout *= 2;            } else {                _this._reconnectTimeout += 500;            }            _this._reconnectTimeout = Math.min(7000, _this._reconnectTimeout);        }    };    this._addCleanup(function() {        if (this._socket) {            this._socket.close();            this._socket = null;        }    });};ConnectionImpl.prototype._callAuth = function() {    var _this = this;    var callback = function(err, r) {        if (!err && r.status === 'authorized') {            _this._authorized = true;            _this._formatSent = false;            if (r.dialogId) {                postMessage(['setDialogId', r.dialogId]);                _this._dialogId = r.dialogId;            }            _this._onAuthorized();            _this._onConnectStatus('authorized');        } else if (err === 'auth-failed') {            _this._onConnectStatus('auth-failed');            if (_this._socket) {                _this._socket.close();                _this._socket = null;                _this._failed = true;            }        } else {            _this._onConnectStatus('invalid-auth-response');            console.log('invalid auth response', err, r);        }    };    var authParam = this._auth;    authParam.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;    if (this._dialogId) {        authParam.dialogId = this._dialogId;    }    authParam.mode = this._mode;    this._sendCall({cid: this._callId++, method: '_auth_', callback: callback, param: authParam});    return this;};ConnectionImpl.prototype._sendCall = function(call) {    this._socket.send(JSON.stringify({i: call.cid, m: call.method, p: call.param}));    if (call.callback) {        this._callSent[call.cid] = call;    }};ConnectionImpl.prototype._onAuthorized = function() {    console.log('authorized');    if (this._visualState) {        this.call(null, '_visual_', this._visualState);    }    var _this = this;    this._callWait.forEach(function(c) {        _this._sendCall(c);    });    this._callWait = [];};ConnectionImpl.prototype.close = function() {    for (var i = 0; i < this._cleanups.length; i++ ) {        this._cleanups[i]();    }    this._cleanups = [];    this._closed = true;        if (this._socket && (this._socket.readyState === WebSocket.OPEN || this._socket.readyState === WebSocket.CONNECTING)) {        this._socket.close();        this._socket = null;    }    console.log('closed connection to: ' + this._url);    close();};ConnectionImpl.prototype.call = function(cid, method, param) {    var call = {cid: cid, method: method, param: param, callback: function(err, obj) {        if (cid) {            postMessage(['callback', cid, err, obj]);        }    }};    if (this._authorized || this._connected && !this._auth) {        this._sendCall(call);    } else {        this._callWait.push(call);    }};ConnectionImpl.prototype.setVisual = function(state) {    this._visualState = state;    this.call(null, '_visual_', state);};ConnectionImpl.prototype._sendFrame = function(frame) {    if (!this._socket) {        console.error('sendFrame to closed socket');        return;    }    frame.sentTs = Date.now();    if (this._remoteSentTs > 0 && this._remoteRecvTs > 0) {        frame.remoteTs = this._remoteSentTs + Date.now() - this._remoteRecvTs;    }    this._socket.send(frame.write());};ConnectionImpl.prototype._listen = function() {    var f = alanFrame.create();    f.jsonData = JSON.stringify({signal: 'listen'});    this._frameQueue.push(f);    this._alanState = ALAN_LISTENING;};ConnectionImpl.prototype._stopListen = function() {    var f = alanFrame.create();    f.jsonData = JSON.stringify({signal: 'stopListen'});    this._frameQueue.push(f);    this._alanState = ALAN_OFF;};ConnectionImpl.prototype._onMicFrame = function(sampleRate, frame) {    if (this._alanState === ALAN_SPEAKING) {        return;    }    if (this._alanState === ALAN_OFF) {        this._listen();    }    if (this._alanState !== ALAN_LISTENING) {        console.error('invalid alan state: ' + this._alanState);        return;    }    if (this._sampleRate !== sampleRate) {        this._sampleRate = sampleRate;        this._encoder = alanCodec.encoder(this._config.codec, 48000);        this._formatSent = false;        this._format = {            send: {codec: this._config.codec, sampleRate: sampleRate},            recv: {codec: 'pcm_s16le', sampleRate: 16000},            timeout: this._timeout,        };    }    var p = this._encoder(frame);    for (var i = 0; i < p.length; i++ ) {        var f = alanFrame.create();        f.audioData = p[i];        this._frameQueue.push(f);    }};ConnectionImpl.prototype._flushQueue = function() {    if (!this._socket || !this._connected) {        var d = 0;        while (this._frameQueue.length > 100 && !this._frameQueue[0].jsonData) {            this._frameQueue.shift();            d++;        }        if (d > 0) {            console.error('dropped: %s, frames', d);        }        return;    }    while (this._frameQueue.length > 0 && this._socket && this._socket.bufferedAmount < 64 * 1024) {        if (!this._formatSent && this._format) {            var frame = alanFrame.create();            frame.jsonData = JSON.stringify({format: this._format});            this._sendFrame(frame);            this._formatSent = true;        }        this._sendFrame(this._frameQueue.shift());    }};function connectProject(config, auth, mode) {    var c = new ConnectionImpl(config, auth, mode);    c.onAudioEvent = function(event, arg1, arg2) {        if (event === 'frame') {            c._onMicFrame(arg1, arg2);        } else if (event === 'micStop' || event === 'playStart') {            c._stopListen();        } else {            console.error('unknown audio event: ' + event, arg1, arg2);        }    };    return c;}var factories = {    connectProject: connectProject,};var currentConnect = null;onmessage = function(e) {    var name = e.data[0];    try {        if (!currentConnect) {            currentConnect = factories[name].apply(null, e.data.slice(1, e.data.length));        } else {            currentConnect[name].apply(currentConnect, e.data.slice(1, e.data.length));        }    } catch(e) {        console.error('error calling: ' + name, e);    }};"]),{type: 'text/javascript'}));
        this._worker.onmessage = function(e) {
            if (e.data[0] === 'fireEvent') {
                _this._fire(e.data[1], e.data[2]);
                return;
            }
            if (e.data[0] === 'alanAudio') {
                if (e.data[1] === 'playFrame') {
                    alanAudio.play(e.data[2]);
                    return;
                }
                if (e.data[1] === 'playCommand') {
                    alanAudio.playCommand(e.data[2]);
                    return;
                }
                if (e.data[1] === 'stop') {
                    alanAudio.stop();
                    return;
                }
            }
            if (e.data[0] === "callback") {
                _this._callback[e.data[1]](e.data[2], e.data[3]);
                delete _this._callback[e.data[1]];
                return;
            }
            if (e.data[0] === "setDialogId") {
                _this._dialogId = e.data[1];
                return;
            }
            console.error("invalid event", e.data);
        };
        this._worker.onerror = function(e) {
            console.error("error in worker: " + e.filename + ":" + e.lineno + " - " +  e.message);
        };
        this._handlers = {};
        this._cleanups = [];
        this._callback = {};
        this._callIds  = 1;
        this._config   = {};
    }

    ConnectionWrapper.prototype.on = function(event, handler) {
        var h = this._handlers[event];
        if (!h) {
            h = [];
            this._handlers[event] = h;
        }
        h.push(handler);
    };

    ConnectionWrapper.prototype.off = function(event, handler) {
        var h = this._handlers[event];
        if (h) {
            var index = h.indexOf(handler);
            if (index >= 0) {
                h.splice(index, 1);
            }
        }
    };

    ConnectionWrapper.prototype.getSettings = function() {
        return {
            server: config.baseURL,
            projectId: this._config.projectId,
            dialogId: this._dialogId,
        };
    };

    ConnectionWrapper.prototype.setVisual = function(state) {
        this._worker.postMessage(['setVisual', state]);
    };

    ConnectionWrapper.prototype.call = function(method, param, callback) {
        var cid = null;
        if (callback) {
            cid = this._callIds++;
            this._callback[cid] = callback;
        }
        this._worker.postMessage(['call', cid, method, param]);
    };

    ConnectionWrapper.prototype.close = function() {
        console.log('closing connection to: ' + this._url);
        this._cleanups.forEach(h=> { h();});
        this._worker.postMessage(['close']);
    };

    ConnectionWrapper.prototype._fire = function(event, object) {
        var h = this._handlers[event];
        if (h) {
            for (var i = 0; i < h.length; i++ ) {
                h[i](object);
            }
        }
    };

    ConnectionWrapper.prototype._addCleanup = function(f) {
        this._cleanups.push(f);
    };

    function fillAuth(values, ext) {
        var auth = {};
        for (var k in values) {
            auth[k] = values[k];
        }

        if (!ext || (ext && ext.platform == null)) {
            auth.platform = config.platform;
        } else {
            auth.platform = config.platform + ":" + ext.platform;
        }
        if (!ext || (ext && ext.platformVersion == null)) {
            auth.platformVersion = config.version;
        } else {
            auth.platformVersion = config.version + ":" + ext.platformVersion;
        }
        return auth;
    }
                            
    function connectProject(projectId, auth,  host, mode, ext) {
        var connect = new ConnectionWrapper();
        if (host)  {
            connect._config.baseURL = "wss://" + host;
        }
        connect._config.projectId = projectId;
        connect._config.codec     = config.codec;
        connect._config.version   = config.version;
        connect._config.url       = config.baseURL + "/ws_project/" + projectId;
        connect._worker.postMessage(["connectProject", connect._config, fillAuth(auth, ext), mode]);
        function forwardAudioEvent(name) {
            function handler(a1, a2) {
                if (name === 'frame'  && alanAudio.isPlaying()) {
                    return;
                }
                connect._worker.postMessage(['onAudioEvent', name, a1, a2]);
            }
            alanAudio.on(name, handler);
            connect._addCleanup(function() {
                alanAudio.off(name,  handler);
            });
        }
        forwardAudioEvent('frame');
        forwardAudioEvent('micStop');
        //forwardAudioEvent('playStop');
        forwardAudioEvent('playStart');
        return connect;
    }

    function connectProjectTest(projectId, auth,  host, mode, ext) {
        var connect = new ConnectionWrapper();
        if (host)  {
            connect._config.baseURL = "wss://" + host;
        }
        connect._config.projectId = projectId;
        connect._config.codec     = config.codec;
        connect._config.version   = config.version;
        connect._config.url       = config.baseURL + "/ws_project/" + projectId;
        connect._worker.postMessage(["connectProject", connect._config, fillAuth(auth, ext), mode]);
        return connect;
    }

    function connectTutor(auth, host) {
        var connect = new ConnectionWrapper();
        if (host)  {
            connect._config.baseURL = "wss://" + host;
        }
        connect._config.version = config.version;
        connect._config.url = config.baseURL + "/ws_tutor";
        connect._worker.postMessage(["connectProject", connect._config, auth]);
        return connect;
    }

    ns.alan = {
        projectTest: connectProjectTest,
        project: connectProject,
        tutor: connectTutor,
    };

})(window);

(function(ns) {
    "use strict";
function alanBtn(options) {

    options = options || {};

    var btnDisabled = false;
    var hideS2TPanel = false;

    var btnInstance = {
        // Common public API
        setVisualState: function (visualState) {
            if (btnDisabled) {
                return;
            }

            if (window.tutorProject) {
                window.tutorProject.setVisual(visualState);
            }
        },
        callProjectApi: function (funcName, data, callback) {
            var funcNamePrefix = 'script::';
            if (btnDisabled) {
                return;
            }
            if (!funcName) {
                throw 'Function name for callProjectApi must be provided';
            }

            if (window.tutorProject) {
                if (funcName.indexOf(funcNamePrefix) === 0) {
                    window.tutorProject.call(funcName, data, callback);
                } else {
                    window.tutorProject.call(funcNamePrefix + funcName, data, callback);
                }
            }
        },
        playText: function (text) {
            if (btnDisabled) {
                return;
            }

            if (window.tutorProject) {
                window.tutorProject.call('play', {
                    text: text
                });
            }
        },
        playCommand: function (command) {
            if (btnDisabled) {
                return;
            }

            alanAudio.playCommand({
                data: command
            });
        },
        activate: function () {
            return activateAlanButton();
        },
        deactivate: function () {
            if (btnDisabled) {
                return;
            }

            alanAudio.stop();
        },
        isActive: function () {
            return isAlanActive;
        },
        //deprecated
        callClientApi: function (method, data, callback) {
            if (btnDisabled) {
                return;
            }

            if (window.tutorProject) {
                window.tutorProject.call(method, data, callback);
            }
        },
        // deprecated
        setAuthData: function (data) {
            if (btnDisabled) {
                return;
            }

            if (window.tutorProject) {
                window.tutorProject.close();
                window.tutorProject = alan.project(options.key, getAuthData(data), options.host);
                window.tutorProject.on('connectStatus', onConnectStatusChange);
                window.tutorProject.on('options', onOptionsReceived);
            }
        },
        // Other methods
        setOptions: function (btnOptions) {
            applyBtnOptions(btnOptions);
        },
        setPreviewState: function (state) {
            switchState(state);
        },
        remove: function () {
            alanAudio.stop();
            window.tutorProject.close();
            rootEl.remove();
        },
        stop: function () {
            alanAudio.stop();
        },
        updateButtonState: function (state) {
            onConnectStatusChange(state);
        }
    };

    if (!isAudioSupported()) {
        return;
    }

    //Host
    var host = 'studio.alan.app';
    var baseUrl = 'https://' + ((host.indexOf('$') === 0 || host === '') ? window.location.host : host);

    if (options.host) {
        baseUrl = 'https://' + options.host;
    }

    // Btn modes
    var mode;

    if (options.mode === 'tutor') {
        mode = 'tutor';
    } else if (options.mode === 'tutor-preview') {
        mode = 'tutor-preview';
    } else if (options.mode === 'demo') {
        mode = 'demo';
    } else {
        mode = 'component';
    }

    // Btn states
    var DEFAULT = 'default';
    var LISTENING = 'listening';
    var SPEAKING = 'speaking';
    var INTERMEDIATE = 'intermediate';
    var UNDERSTOOD = 'understood';
    var DISCONNECTED = 'disconnected';
    var OFFLINE = 'offline';
    var LOW_VOLUME = 'lowVolume';
    var PERMISSION_DENIED = 'permissionDenied';

    // Error messages
    var MIC_BLOCKED_MSG = 'Access to the microphone was blocked. Please allow it to use Alan';
    var NO_VOICE_SUPPORT_IN_BROWSER_MSG = 'Your browser doesn’t support voice input. To use voice, open Alan Tutor in a Chrome, Safari, or Firefox desktop browser window.';
    var MIC_BLOCKED_CODE = 'microphone-access-blocked';
    var NO_VOICE_SUPPORT_IN_BROWSER_CODE = 'browser-does-not-support-voice-input';
    var PREVIEW_MODE_CODE = 'preview-mode';
    var BTN_IS_DISABLED_CODE = 'btn-is-disabled';
    var NO_ALAN_AUDIO_INSANCE_WAS_PROVIDED_CODE = 'no-alan-audio-instance-was-provided';

    // Set default state for btn
    var state = DISCONNECTED;
    var previousState = null;
    var isAlanSpeaking = false;
    var isAlanActive = false;

    // Set variables for hints and stt
    var hints = [];
    var hintsTimerId = null;
    var insideHintsAnimationIntervalId = null;
    var hintsRequestIntervalId = null;
    var hintAppearTimeoutId = null;
    var removeTextHintTimeoutId = null;
    var hoverShowHintTimeoutId = null;
    var hoverHideHintTimeoutId = null;
    var doNotShowHints = false;
    var hintVisible = false;
    var recognisedTextVisible = false;
    var textHolderWidth = 480;
    var hintHolderWidth = 480;
    var hintCloserRightPos;
    var isHintWasPreviously = false;
    var defaultHintLabel = 'Click and say';
    var listeningHintLabel = 'Say';
    var turnOffTimeout = 30000;
    var turnOffVoiceFn;

    function setTurnOffVoiceTimeout() {
        turnOffVoiceFn = debounce(function () {
            if (isAlanSpeaking) {
                // console.info('BTN: CONTINUE alanAudio', new Date());
                turnOffVoiceFn();
            } else {
                // console.info('BTN: STOP alanAudio', new Date());
                alanAudio.stop();
            }
        }, turnOffTimeout);
    }

    setTurnOffVoiceTimeout();

    var switchToLowVolumeStateTimer = null;

    // Css animations
    var pulsatingAnimation = '';
    var pulsatingMicAnimation = '';
    var pulsatingTriangleMicAnimation = '';
    if (!isPreviewMode()) {
        pulsatingAnimation = 'alan-pulsating 2s ease-in-out infinite';
        pulsatingMicAnimation = 'alan-mic-pulsating 1.4s ease-in-out infinite';
        pulsatingTriangleMicAnimation = 'alan-triangle-mic-pulsating 1.2s ease-in-out infinite';
    }

    var gradientAnimation = 'alan-gradient 3s ease-in-out infinite';
    var disconnectedLoaderAnimation = 'disconnected-loader-animation 2s linear infinite';
    var oval1Animation = 'oval1-animation 6s linear infinite';
    var oval2Animation = 'oval2-animation 6s linear infinite';

    // Set alanAudio
    var alanAudio = window.alanAudio;

    // Define base blocks and layers
    var rootEl = options.rootEl || document.createElement('div');
    var body = document.getElementsByTagName('body')[0];
    var btn = document.createElement('div');
    var panelOvalImg = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIHdpZHRoPSI3NThweCIgaGVpZ2h0PSIyMTdweCIgdmlld0JveD0iMCAwIDc1OCAyMTciIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+ICAgICAgICA8dGl0bGU+T3ZhbCBDb3B5IDI8L3RpdGxlPiAgICA8ZGVzYz5DcmVhdGVkIHdpdGggU2tldGNoLjwvZGVzYz4gICAgPGRlZnM+ICAgICAgICA8cmFkaWFsR3JhZGllbnQgY3g9IjUwJSIgY3k9IjQxLjA1NjE0NTIlIiBmeD0iNTAlIiBmeT0iNDEuMDU2MTQ1MiUiIHI9IjE2Ni42MjMxMDIlIiBncmFkaWVudFRyYW5zZm9ybT0idHJhbnNsYXRlKDAuNTAwMDAwLDAuNDEwNTYxKSxzY2FsZSgwLjI4NjI4MCwxLjAwMDAwMCkscm90YXRlKDE4MC4wMDAwMDApLHNjYWxlKDEuMDAwMDAwLDAuMjMyODQ2KSx0cmFuc2xhdGUoLTAuNTAwMDAwLC0wLjQxMDU2MSkiIGlkPSJyYWRpYWxHcmFkaWVudC0xIj4gICAgICAgICAgICA8c3RvcCBzdG9wLWNvbG9yPSIjRkZGRkZGIiBvZmZzZXQ9IjAlIj48L3N0b3A+ICAgICAgICAgICAgPHN0b3Agc3RvcC1jb2xvcj0iI0ZGRkZGRiIgb2Zmc2V0PSIzMy42Njc4MzM2JSI+PC9zdG9wPiAgICAgICAgICAgIDxzdG9wIHN0b3AtY29sb3I9IiNGRkZGRkYiIHN0b3Atb3BhY2l0eT0iMC4xIiBvZmZzZXQ9IjEwMCUiPjwvc3RvcD4gICAgICAgIDwvcmFkaWFsR3JhZGllbnQ+ICAgIDwvZGVmcz4gICAgPGcgaWQ9IkFsYW4tQnV0dG9uIiBzdHJva2U9Im5vbmUiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj4gICAgICAgIDxnIGlkPSJBbGFuLUJ1dHRvbi1jaGVja2luZy1kaWZmZXJlbnQtYmctYW5kLWhpbnRzLS0tbGF5ZXJzIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMjAyOS4wMDAwMDAsIC00MTguMDAwMDAwKSIgZmlsbD0idXJsKCNyYWRpYWxHcmFkaWVudC0xKSIgZmlsbC1ydWxlPSJub256ZXJvIj4gICAgICAgICAgICA8ZWxsaXBzZSBpZD0iT3ZhbC1Db3B5LTIiIGN4PSIyNDA4IiBjeT0iNTI2LjUiIHJ4PSIzNzkiIHJ5PSIxMDguNSI+PC9lbGxpcHNlPiAgICAgICAgPC9nPiAgICA8L2c+PC9zdmc+';
    var micTriangleIconImg = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iODBweCIgaGVpZ2h0PSI4MHB4IiB2aWV3Qm94PSIwIDAgODAgODAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDUyLjEgKDY3MDQ4KSAtIGh0dHA6Ly93d3cuYm9oZW1pYW5jb2RpbmcuY29tL3NrZXRjaCAtLT4KICAgIDx0aXRsZT5BbGFuIEJ1dHRvbiAvIEFuaW1hdGlvbiAvIGJ1dHRvbi1pbm5lci1zaGFwZTwvdGl0bGU+CiAgICA8ZGVzYz5DcmVhdGVkIHdpdGggU2tldGNoLjwvZGVzYz4KICAgIDxkZWZzPgogICAgICAgIDxsaW5lYXJHcmFkaWVudCB4MT0iMTAwJSIgeTE9IjMuNzQ5Mzk5NDZlLTMxJSIgeDI9IjIuODYwODIwMDklIiB5Mj0iOTcuMTM5MTc5OSUiIGlkPSJsaW5lYXJHcmFkaWVudC0xIj4KICAgICAgICAgICAgPHN0b3Agc3RvcC1jb2xvcj0iIzAwMDAwMCIgc3RvcC1vcGFjaXR5PSIwLjEyIiBvZmZzZXQ9IjAlIj48L3N0b3A+CiAgICAgICAgICAgIDxzdG9wIHN0b3AtY29sb3I9IiMwMDAwMDAiIHN0b3Atb3BhY2l0eT0iMC4wNCIgb2Zmc2V0PSIxMDAlIj48L3N0b3A+CiAgICAgICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDwvZGVmcz4KICAgIDxnIGlkPSJBbGFuLUJ1dHRvbi0vLUFuaW1hdGlvbi0vLWJ1dHRvbi1pbm5lci1zaGFwZSIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+CiAgICAgICAgPHBhdGggZD0iTTQwLjEwMDU0MjIsOSBMNDAuMTAwNTQyMiw5IEM1MC4wNzA0NzUxLDkgNTkuMTUxNjIzNSwxNC43MzM3OTM4IDYzLjQzODA5OCwyMy43MzUyMjE0IEw3MC40MjIwMjY3LDM4LjQwMTE5NyBDNzUuMTcxMDE0NSw0OC4zNzM4ODQ0IDcwLjkzNjM2OTMsNjAuMzA4MTYwMSA2MC45NjM2ODE5LDY1LjA1NzE0NzggQzU4LjI3NzU5NDksNjYuMzM2MjYwOCA1NS4zMzk5NzQ0LDY3IDUyLjM2NDg3ODksNjcgTDI3LjgzNjIwNTQsNjcgQzE2Ljc5MDUxMDQsNjcgNy44MzYyMDU0Myw1OC4wNDU2OTUgNy44MzYyMDU0Myw0NyBDNy44MzYyMDU0Myw0NC4wMjQ5MDQ1IDguNDk5OTQ0NTksNDEuMDg3Mjg0IDkuNzc5MDU3NiwzOC40MDExOTcgTDE2Ljc2Mjk4NjQsMjMuNzM1MjIxNCBDMjEuMDQ5NDYwOCwxNC43MzM3OTM4IDMwLjEzMDYwOTIsOSA0MC4xMDA1NDIyLDkgWiIgaWQ9ImlubmVyLWJnIiBmaWxsPSJ1cmwoI2xpbmVhckdyYWRpZW50LTEpIj48L3BhdGg+CiAgICA8L2c+Cjwvc3ZnPg==\n';
    var micCircleIconImg = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iODBweCIgaGVpZ2h0PSI4MHB4IiB2aWV3Qm94PSIwIDAgODAgODAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDUyLjEgKDY3MDQ4KSAtIGh0dHA6Ly93d3cuYm9oZW1pYW5jb2RpbmcuY29tL3NrZXRjaCAtLT4KICAgIDx0aXRsZT5BbGFuIEJ1dHRvbiAvIEFuaW1hdGlvbiAvIGJ1dHRvbi1pbm5lci1zaGFwZS1zcGVha2luZyBiYWNrPC90aXRsZT4KICAgIDxkZXNjPkNyZWF0ZWQgd2l0aCBTa2V0Y2guPC9kZXNjPgogICAgPGRlZnM+CiAgICAgICAgPGxpbmVhckdyYWRpZW50IHgxPSIxMDAlIiB5MT0iMy43NDkzOTk0NmUtMzElIiB4Mj0iMi44NjA4MjAwOSUiIHkyPSI5Ny4xMzkxNzk5JSIgaWQ9ImxpbmVhckdyYWRpZW50LTEiPgogICAgICAgICAgICA8c3RvcCBzdG9wLWNvbG9yPSIjMDAwMDAwIiBzdG9wLW9wYWNpdHk9IjAuMTIiIG9mZnNldD0iMCUiPjwvc3RvcD4KICAgICAgICAgICAgPHN0b3Agc3RvcC1jb2xvcj0iIzAwMDAwMCIgc3RvcC1vcGFjaXR5PSIwLjA0IiBvZmZzZXQ9IjEwMCUiPjwvc3RvcD4KICAgICAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPC9kZWZzPgogICAgPGcgaWQ9IkFsYW4tQnV0dG9uLS8tQW5pbWF0aW9uLS8tYnV0dG9uLWlubmVyLXNoYXBlLXNwZWFraW5nLWJhY2siIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPgogICAgICAgIDxjaXJjbGUgaWQ9ImlubmVyLWJnIiBmaWxsPSJ1cmwoI2xpbmVhckdyYWRpZW50LTEpIiBjeD0iNDAiIGN5PSI0MCIgcj0iMzIiPjwvY2lyY2xlPgogICAgPC9nPgo8L3N2Zz4=\n';
    var micIcon = document.createElement('div');
    var logoState1 = document.createElement('img');
    var logoState2 = document.createElement('img');
    var logoState3 = document.createElement('img');
    var logoState4 = document.createElement('img');
    var logoState5 = document.createElement('img');
    var logoState6 = document.createElement('img');
    var logoState7 = document.createElement('img');
    var logoState8 = document.createElement('img');
    var logoState9 = document.createElement('img');
    var logoState10 = document.createElement('img');
    var micTriangleIcon = document.createElement('div');
    var micCircleIcon = document.createElement('div');
    var disconnectedMicLoaderIcon = document.createElement('img');
    var lowVolumeMicIcon = document.createElement('img');
    var offlineIcon = document.createElement('img');
    var textHolder = document.createElement('div');
    var textHolderTextWrapper = document.createElement('div');
    var alanBtnDisabledMessage = document.createElement('div');
    var hintHolder = document.createElement('div');
    var hintHolderWrapper = document.createElement('div');
    var soundOnAudioDoesNotExist = false;
    var soundOffAudioDoesNotExist = false;
    var soundOnAudio = new Audio(baseUrl + '/resources/sounds/soundOn.m4a');
    soundOnAudio.onerror = function() {
        soundOnAudioDoesNotExist = true;
    };
    var soundOffAudio = new Audio(baseUrl + '/resources/sounds/soundOff.m4a');
    soundOffAudio.onerror = function() {
        soundOffAudioDoesNotExist = true;
    };

    textHolder.addEventListener("click", closeHint);

    // Specify layers for different statets to make smooth animation
    var btnBgDefault = document.createElement('div');
    var btnBgListening = document.createElement('div');
    var btnBgSpeaking = document.createElement('div');
    var btnBgIntermediate = document.createElement('div');
    var btnBgUnderstood = document.createElement('div');

    // Specify layers with ovals
    var btnOval1 = document.createElement('div');
    var btnOval2 = document.createElement('div');

    // Some variables for setting up right properties for Alan Btn
    var btnSize;
    var rightBtnPos;
    var leftBtnPos;
    var bottomBtnPos;
    var topBtnPos;
    var btnZIndex;
    var btnIconsZIndex;
    var btnTextPanelsZIndex;
    var btnBgLayerZIndex;

    // Define base properties for disable/enable button functionality
    var isLocalStorageAvailable = false;

    try {
        localStorage.getItem('test');
        isLocalStorageAvailable = true;
    } catch (e) {
        isLocalStorageAvailable = false;
    }

    //#region Listen online/offline events to manage connected/disconnected states
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    function updateOnlineStatus() {
        if (navigator.onLine) {
            switchState(DEFAULT);
        } else {
            switchState(OFFLINE);
        }
    }

    //#endregion

    //#region Define settings based on the btn mode
    // For now we have two modes: small - for tutor, and big for demo
    var btnModes = {
        "tutor": {
            btnSize: 50,
            rightPos: 0,
            leftPos: 0,
            bottomPos: 0,
            topPos: 0,
            waveVerticalPositionRatio: 0.9,
            waveCanvasWidth: 250,
            waveCanvasHeight: 100,
        },
        "tutor-preview": {
            btnSize: 64,
            rightPos: 0,
            leftPos: 0,
            bottomPos: 0,
            topPos: 0,
            waveVerticalPositionRatio: 0.9,
            waveCanvasWidth: 250,
            waveCanvasHeight: 100,
        },
        "demo": {
            btnSize: 120,
            rightPos: 40,
            leftPos: 40,
            bottomPos: 40,
            topPos: 0,
            waveVerticalPositionRatio: 0.8,
            waveCanvasWidth: 500,
            waveCanvasHeight: 200,
        },
        "component": {
            btnSize: options.size || 64,
            rightPos: 40,
            leftPos: 40,
            bottomPos: 40,
            topPos: 0,
            waveVerticalPositionRatio: 0.8,
            waveCanvasWidth: 500,
            waveCanvasHeight: 200,
        }
    };

    function isTutorMode() {
        return mode.indexOf('tutor') > -1;
    }

    function isPreviewMode() {
        return mode.indexOf('preview') > -1;
    }

    //#endregion

    //#region Set styles for base layers

    btnSize = btnModes[mode].btnSize;
    bottomBtnPos = options.bottom || (btnModes[mode].bottomPos + 'px');
    rightBtnPos = options.right || (btnModes[mode].rightPos + 'px');
    if (options.left) {
        leftBtnPos = options.left || (btnModes[mode].leftPos + 'px');
    }
    if (options.top) {
        topBtnPos = options.top || (btnModes[mode].topPos + 'px');
    }

    btnZIndex = options.zIndex || 4;
    btnIconsZIndex = btnZIndex - 2;
    btnTextPanelsZIndex = btnZIndex - 1;
    btnBgLayerZIndex = btnZIndex - 3;

    // Define styles for root element

    if (options.left) {
        rootEl.style.left = leftBtnPos;
    } else {
        rootEl.style.right = rightBtnPos;
    }

    if (options.top) {
        rootEl.style.top = topBtnPos;
    } else {
        rootEl.style.bottom = bottomBtnPos;
    }

    rootEl.style.position = isTutorMode() ? 'absolute' : 'fixed';
    if (options.zIndex !== undefined) {
        rootEl.style.zIndex =  options.zIndex;
    }
    rootEl.style.position = isTutorMode() ? 'absolute' : 'fixed';

    // Define styles for block with recognised text
    var textHolderDefaultBorderColor = '#d5eded';
    var textHolderDefaultBoxShadow = '0px 12px 50px -14px rgba(0,0,0,0.2), 0px 12px 50px -14px rgba(0,169,255,0.3)';
    textHolderTextWrapper.classList.add('alanBtn-text-holder-text-wrapper');
    textHolder.classList.add('alanBtn-text-holder');
    setInnerPositionBasedOnOptions(textHolder, options);
    if (options.left) {
        textHolderTextWrapper.style.paddingLeft = btnSize + 32 + 'px';
        textHolderTextWrapper.style.textAlign = 'left';
    } else {
        textHolderTextWrapper.style.paddingRight = btnSize + 32 + 'px';
    }
    
    textHolder.style.height = btnSize + 'px';
    textHolder.style.minHeight = btnSize + 'px';
    textHolder.style.maxHeight = btnSize + 'px';
    textHolder.style.borderRadius = btnSize + 'px';
    textHolder.style.borderRadius = btnSize + 'px';
    textHolder.style.zIndex = btnTextPanelsZIndex;
    textHolder.style.borderColor = textHolderDefaultBorderColor;
    textHolder.style.boxShadow = textHolderDefaultBoxShadow;

    // Define styles for block with hints
    hintHolderWrapper.classList.add('alanBtn-hint-holder-wrapper');
    if (options.left) {
        hintHolderWrapper.classList.add('alanBtn-hint-holder-wrapper-left');
        hintHolderWrapper.style.paddingLeft = btnSize + 32 + 'px';
    } else {
        hintHolderWrapper.classList.add('alanBtn-hint-holder-wrapper-right');
        hintHolderWrapper.style.paddingRight = btnSize + 32 + 'px';
    }
    hintHolder.classList.add('alanBtn-hint-holder');
    setInnerPositionBasedOnOptions(hintHolder, options);
    hintCloserRightPos = btnSize / 2 + 32;
    hintHolder.style.zIndex = btnTextPanelsZIndex;
    hintHolder.style.borderTopRightRadius = btnSize + 'px';
    hintHolder.style.borderBottomRightRadius = btnSize + 'px';
    hintHolder.style.minHeight = btnSize + 'px';
    hintHolder.style.borderColor = textHolderDefaultBorderColor;
    hintHolder.style.boxShadow = textHolderDefaultBoxShadow;

    // Define styles for message that informs that Alan Btn was disabled
    setInnerPositionBasedOnOptions(alanBtnDisabledMessage, options);
    alanBtnDisabledMessage.style.zIndex = btnTextPanelsZIndex;
    alanBtnDisabledMessage.style.borderRadius = '7px';
    alanBtnDisabledMessage.style.backgroundColor = '#ffffff';
    alanBtnDisabledMessage.style.boxShadow = '0 2px 50px 0 rgba(86, 98, 112, 0.1)';
    alanBtnDisabledMessage.style.position = 'absolute';
    alanBtnDisabledMessage.style.color = 'red';
    alanBtnDisabledMessage.style.width = '200px';
    alanBtnDisabledMessage.style.fontSize = '14px';
    alanBtnDisabledMessage.style.padding = '16px';
    alanBtnDisabledMessage.innerText = "This project's voice button has been disabled.";
    alanBtnDisabledMessage.classList.add("alan-btn-disabled-msg");

    function setInnerPositionBasedOnOptions(el, options) {
        if (options.top) {
            el.style.top = 0;
        } else {
            el.style.bottom = 0;
        }
        if (options.left) {
            el.style.left = 0;
        } else {
            el.style.right = 0;
        }
    }

    // Define base styles for btn
    btn.style.width = btnSize + 'px';
    btn.style.minWidth = btnSize + 'px';
    btn.style.maxWidth = btnSize + 'px';
    btn.style.minHeight = btnSize + 'px';
    btn.style.height = btnSize + 'px';
    btn.style.maxHeight = btnSize + 'px';
    btn.style.color = '#fff';
    btn.style.position = 'absolute';
    if (options.top) {
        btn.style.top = 0;
    } else {
        btn.style.bottom = 0;
    }
    if (options.left) {
        btn.style.left = 0;
    } else {
        btn.style.right = 0;
    }
    btn.style.borderRadius = '50%';
    btn.style.boxShadow = '0 8px 10px 0 rgba(0, 75, 144, 0.35)';
    btn.style.textAlign = 'center';
    btn.style.transition = 'all 0.4s ease-in-out';
    btn.style.zIndex = btnZIndex;

    // Specify tabIndex if it exists in options
    if (options && options.tabIndex) {
        btn.tabIndex = options.tabIndex;
    }

    // Specify cursor for btn
    if (isPreviewMode()) {
        btn.style.cursor = 'default';
    } else {
        btn.style.cursor = 'pointer';
    }

    // Define base styles for microphone btn
    micIcon.style.minHeight = '100%';
    micIcon.style.height = '100%';
    micIcon.style.maxHeight = '100%';
    micIcon.style.top = '0%';
    micIcon.style.left = '0%';
    micIcon.style.zIndex = btnIconsZIndex;
    micIcon.style.position = 'relative';
    micIcon.style.transition = 'all 0.4s ease-in-out';

    function setUpStylesForLogoParts(logos) {
        for (var i = 0; i < logos.length; i++) {
            var obj = logos[i];
            logos[i].style.minHeight = '100%';
            logos[i].style.height = '100%';
            logos[i].style.maxHeight = '100%';
            logos[i].style.minWidth = '100%';
            logos[i].style.width = '100%';
            logos[i].style.maxWidth = '100%';
            logos[i].style.top = '0%';
            logos[i].style.left = '0%';
            logos[i].style.position = 'absolute';
            logos[i].style.animationIterationCount = 'infinite';
            logos[i].style.animationDuration = '9s';
            logos[i].style.animationTimingFunction = 'ease-in-out';
            logos[i].style.opacity = (i == 0 ? 1 : 0);
            micIcon.appendChild(logos[i]);
        }
    }

    logoState1.src = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iODBweCIgaGVpZ2h0PSI4MHB4IiB2aWV3Qm94PSIwIDAgODAgODAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDUyLjEgKDY3MDQ4KSAtIGh0dHA6Ly93d3cuYm9oZW1pYW5jb2RpbmcuY29tL3NrZXRjaCAtLT4KICAgIDx0aXRsZT5BbGFuIEJ1dHRvbiAvIEFuaW1hdGlvbiAvIGJ1dHRvbi1sb2dvLXN0YXRlLTAxPC90aXRsZT4KICAgIDxkZXNjPkNyZWF0ZWQgd2l0aCBTa2V0Y2guPC9kZXNjPgogICAgPGcgaWQ9IkFsYW4tQnV0dG9uLS8tQW5pbWF0aW9uLS8tYnV0dG9uLWxvZ28tc3RhdGUtMDEiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPgogICAgICAgIDxnIGlkPSJsb2dvIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxNi4wMDAwMDAsIDIxLjAwMDAwMCkiIGZpbGw9IiNGRkZGRkYiPgogICAgICAgICAgICA8cGF0aCBkPSJNMTkuNjQwMDAxLDEuNDk1NDY4NSBMMjQsOS44NjY2NjY2NyBMMTguMjcxMTkyNCwyMSBMNi40NzczOTQ2NiwyMSBDNS43MDEzMTEwMSwyMS4wMDAxMDYzIDQuOTg5NjE3NzYsMjEuMjk5OTMzOSA0LjYzMDYyNzg1LDIxLjk4OTE5NDUgTDE1LjQ5OTE2NTksMS4xMjE2MDEzOCBDMTUuODQ2MDc4MSwwLjQ1NTUyOTk2NCAxNi41MjIzNTU1LDAuMDI5NDg4MzMzNSAxNy4yNjc4MTEsMC4wMDE0NzIxODExNSBDMTguMjY3Mjc3MSwwLjAzMzk5NDI4OTEgMTkuMTc1MjgxMSwwLjYwMzIwNjQyIDE5LjY0MDAwMSwxLjQ5NTQ2ODUgWiIgaWQ9InNoYXBlIiBmaWxsLW9wYWNpdHk9IjAuNSI+PC9wYXRoPgogICAgICAgICAgICA8cGF0aCBkPSJNMTguMjcxMTkyNCwyMSBMMTMuMDU2Mzg5NiwzMC44NzgzOTg2IEMxMi42OTczNTIzLDMxLjU2Nzc1MDIgMTEuOTg1NTIzOSwzMiAxMS4yMDkzMzc4LDMyIEwxLjcwNzg2NDk1LDMyIEMwLjk0MDgwMjc5NiwzMiAwLjMxODk3NjA1OSwzMS4zNzcwOTE4IDAuMzE4OTc2MDU5LDMwLjYwODY5NTcgQzAuMzE4OTc2MDU5LDMwLjM4NDU5NDggMC4zNzMwMTU2MTgsMzAuMTYzODEgMC40NzY0OTcxMDYsMjkuOTY1MTI1NiBMNC42MzA2Mjc4NSwyMS45ODkxOTQ1IEM0Ljk4OTYxNzc2LDIxLjI5OTkzMzkgNS43MDEzMTEwMSwyMS4wMDAxMDYzIDYuNDc3Mzk0NjYsMjEgTDE4LjI3MTE5MjQsMjEgWiIgaWQ9InNoYXBlIiBmaWxsLW9wYWNpdHk9IjAuMyI+PC9wYXRoPgogICAgICAgICAgICA8cGF0aCBkPSJNMTEuMjA5MzM3OCwzMiBDMTEuOTg1NTIzOSwzMiAxMi42OTczNTIzLDMxLjU2Nzc1MDIgMTMuMDU2Mzg5NiwzMC44NzgzOTg2IEwxOC4yNzExOTI0LDIwLjg2NTk3NzMgTDIzLjk1NjQ1ODIsMjAuODY1MTk4MyBDMjQuNzMwOTU2MiwyMC44NjUwOTIyIDI1LjQ0MTU4NjcsMjEuMjk1Mzg0OCAyNS44MDE0ODQ2LDIxLjk4MjM3NjcgTDI5Ljk4MTkwMTUsMjkuOTYyMTc2OSBDMzAuMzM4MzQ0LDMwLjY0MjU3MzIgMzAuMDc2Njg1MiwzMS40ODM1OTk3IDI5LjM5NzQ3MDEsMzEuODQwNjYyMSBDMjkuMTk4MzgzOCwzMS45NDUzMjE1IDI4Ljk3NjkwOTMsMzIgMjguNzUyMDczOCwzMiBMMTEuMjA5MzM3OCwzMiBaIiBpZD0ic2hhcGUiIGZpbGwtb3BhY2l0eT0iMC41Ij48L3BhdGg+CiAgICAgICAgICAgIDxwYXRoIGQ9Ik0zMC42NTM3ODIzLC0xLjIzNTcyNjVlLTE0IEMzMC42Nzk5OTUsLTEuMjM1MjQ0MTRlLTE0IDMwLjcwNjEzNDIsMC4wMDA0OTI5NzU2OTEgMzAuNzMyMTg5LDAuMDAxNDcyMTgxMTUgQzI5LjczMjcyMjksMC4wMzM5OTQyODkxIDI4LjgyNDcxODksMC42MDMyMDY0MiAyOC4zNTk5OTksMS40OTU0Njg1IEwyNCw5Ljg2NjY2NjY3IEwxOS42NDAwMDEsMS40OTU0Njg1IEMxOS4xNjEyODQ2LDAuNTc2MzMzMDYgMTguMjEyMTgsLTEuMjE3ODgzODNlLTE0IDE3LjE3NzI2NTMsLTEuNDIxMDg1NDdlLTE0IEwzMC42NTM3ODIzLC0xLjIzNTcyNjVlLTE0IFogTTI4LjM1OTk5OSwxLjQ5NTQ2ODUgQzI4LjgyNDcxODksMC42MDMyMDY0MiAyOS43MzI3MjI5LDAuMDMzOTk0Mjg5MSAzMC43MzIxODksMC4wMDE0NzIxODExNSBDMzAuNzA2MTM0MiwwLjAwMDQ5Mjk3NTY5MSAzMC42Nzk5OTUsLTEuMjM1MjQ0MTRlLTE0IDMwLjY1Mzc4MjMsLTEuMjM1NzI2NWUtMTQgTDMwLjk0NDQ0NDQsLTEuNDIxMDg1NDdlLTE0IEwzMC44MjI3MzQ3LC0xLjIzNzUxMTgzZS0xNCBDMzAuNzkyNDc2MywtMS4yMzE1ODY5M2UtMTQgMzAuNzYyMjkxMSwwLjAwMDQ5MjY3MjYzNSAzMC43MzIxODksMC4wMDE0NzIxODExNSBDMzEuNDc3NjQ0NSwwLjAyOTQ4ODMzMzUgMzIuMTUzOTIxOSwwLjQ1NTUyOTk2NCAzMi41MDA4MzQxLDEuMTIxNjAxMzggTDQ3LjUyMzUwMjksMjkuOTY1MTI1NiBDNDcuNjI2OTg0NCwzMC4xNjM4MSA0Ny42ODEwMjM5LDMwLjM4NDU5NDggNDcuNjgxMDIzOSwzMC42MDg2OTU3IEM0Ny42ODEwMjM5LDMxLjM3NzA5MTggNDcuMDU5MTk3MiwzMiA0Ni4yOTIxMzUxLDMyIEwzNi43OTA2NjIyLDMyIEMzNi4wMTQ0NzYxLDMyIDM1LjMwMjY0NzcsMzEuNTY3NzUwMiAzNC45NDM2MTA0LDMwLjg3ODM5ODYgTDI0LDkuODY2NjY2NjcgTDI4LjM1OTk5OSwxLjQ5NTQ2ODUgWiIgaWQ9InNoYXBlLTIiIGZpbGwtb3BhY2l0eT0iMC45Ij48L3BhdGg+CiAgICAgICAgPC9nPgogICAgPC9nPgo8L3N2Zz4=";
    logoState2.src = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iODBweCIgaGVpZ2h0PSI4MHB4IiB2aWV3Qm94PSIwIDAgODAgODAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDUyLjEgKDY3MDQ4KSAtIGh0dHA6Ly93d3cuYm9oZW1pYW5jb2RpbmcuY29tL3NrZXRjaCAtLT4KICAgIDx0aXRsZT5BbGFuIEJ1dHRvbiAvIEFuaW1hdGlvbiAvIGJ1dHRvbi1sb2dvLXN0YXRlLTAyPC90aXRsZT4KICAgIDxkZXNjPkNyZWF0ZWQgd2l0aCBTa2V0Y2guPC9kZXNjPgogICAgPGcgaWQ9IkFsYW4tQnV0dG9uLS8tQW5pbWF0aW9uLS8tYnV0dG9uLWxvZ28tc3RhdGUtMDIiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPgogICAgICAgIDxnIGlkPSJsb2dvIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxNi4wMDAwMDAsIDIxLjAwMDAwMCkiIGZpbGw9IiNGRkZGRkYiPgogICAgICAgICAgICA8cGF0aCBkPSJNMTguMjcxMTkyNCwyMSBMMTMuMDU2Mzg5NiwzMC44NzgzOTg2IEMxMi42OTczNTIzLDMxLjU2Nzc1MDIgMTEuOTg1NTIzOSwzMiAxMS4yMDkzMzc4LDMyIEwxLjcwNzg2NDk1LDMyIEMwLjk0MDgwMjc5NiwzMiAwLjMxODk3NjA1OSwzMS4zNzcwOTE4IDAuMzE4OTc2MDU5LDMwLjYwODY5NTcgQzAuMzE4OTc2MDU5LDMwLjM4NDU5NDggMC4zNzMwMTU2MTgsMzAuMTYzODEgMC40NzY0OTcxMDYsMjkuOTY1MTI1NiBMNC42MzA2Mjc4NSwyMS45ODkxOTQ1IEwxNS40OTkxNjU5LDEuMTIxNjAxMzggQzE1Ljg0NjA3ODEsMC40NTU1Mjk5NjQgMTYuNTIyMzU1NSwwLjAyOTQ4ODMzMzUgMTcuMjY3ODExLDAuMDAxNDcyMTgxMTUgQzE4LjI2NzI3NzEsMC4wMzM5OTQyODkxIDE5LjE3NTI4MTEsMC42MDMyMDY0MiAxOS42NDAwMDEsMS40OTU0Njg1IEwyNCw5Ljg2NjY2NjY3IEwxOC4yNzExOTI0LDIxIFoiIGlkPSJzaGFwZS0yIiBmaWxsLW9wYWNpdHk9IjAuMyI+PC9wYXRoPgogICAgICAgICAgICA8cGF0aCBkPSJNMTEuMjA5MzM3OCwzMiBDMTEuOTg1NTIzOSwzMiAxMi42OTczNTIzLDMxLjU2Nzc1MDIgMTMuMDU2Mzg5NiwzMC44NzgzOTg2IEwxOC4yNzExOTI0LDIwLjg2NTk3NzMgTDIzLjk1NjQ1ODIsMjAuODY1MTk4MyBDMjQuNzMwOTU2MiwyMC44NjUwOTIyIDI1LjQ0MTU4NjcsMjEuMjk1Mzg0OCAyNS44MDE0ODQ2LDIxLjk4MjM3NjcgTDI5Ljk4MTkwMTUsMjkuOTYyMTc2OSBDMzAuMzM4MzQ0LDMwLjY0MjU3MzIgMzAuMDc2Njg1MiwzMS40ODM1OTk3IDI5LjM5NzQ3MDEsMzEuODQwNjYyMSBDMjkuMTk4MzgzOCwzMS45NDUzMjE1IDI4Ljk3NjkwOTMsMzIgMjguNzUyMDczOCwzMiBMMTEuMjA5MzM3OCwzMiBaIiBpZD0ic2hhcGUiIGZpbGwtb3BhY2l0eT0iMC41Ij48L3BhdGg+CiAgICAgICAgICAgIDxwYXRoIGQ9Ik0yOC4zNTk5OTksMS40OTU0Njg1IEMyOC44MjQ3MTg5LDAuNjAzMjA2NDIgMjkuNzMyNzIyOSwwLjAzMzk5NDI4OTEgMzAuNzMyMTg5LDAuMDAxNDcyMTgxMTUgQzMwLjcwNjEzNDIsMC4wMDA0OTI5NzU2OTEgMzAuNjc5OTk1LDEuODU4NDEzMzFlLTE1IDMwLjY1Mzc4MjMsMS44NTM1ODk3NWUtMTUgTDMwLjk0NDQ0NDQsMCBMMzAuODIyNzM0NywxLjgzNTczNjRlLTE1IEMzMC43OTI0NzYzLDEuODk0OTg1MzllLTE1IDMwLjc2MjI5MTEsMC4wMDA0OTI2NzI2MzUgMzAuNzMyMTg5LDAuMDAxNDcyMTgxMTUgQzMxLjQ3NzY0NDUsMC4wMjk0ODgzMzM1IDMyLjE1MzkyMTksMC40NTU1Mjk5NjQgMzIuNTAwODM0MSwxLjEyMTYwMTM4IEw0Ny41MjM1MDI5LDI5Ljk2NTEyNTYgQzQ3LjYyNjk4NDQsMzAuMTYzODEgNDcuNjgxMDIzOSwzMC4zODQ1OTQ4IDQ3LjY4MTAyMzksMzAuNjA4Njk1NyBDNDcuNjgxMDIzOSwzMS4zNzcwOTE4IDQ3LjA1OTE5NzIsMzIgNDYuMjkyMTM1MSwzMiBMMzYuNzkwNjYyMiwzMiBDMzYuMDE0NDc2MSwzMiAzNS4zMDI2NDc3LDMxLjU2Nzc1MDIgMzQuOTQzNjEwNCwzMC44NzgzOTg2IEwyNCw5Ljg2NjY2NjY3IEwyOC4zNTk5OTksMS40OTU0Njg1IFoiIGlkPSJzaGFwZSIgZmlsbC1vcGFjaXR5PSIwLjkiPjwvcGF0aD4KICAgICAgICAgICAgPHBhdGggZD0iTTMwLjY1Mzc4MjMsMS44NTM1ODk3NWUtMTUgQzMwLjY3OTk5NSwxLjg1ODQxMzMxZS0xNSAzMC43MDYxMzQyLDAuMDAwNDkyOTc1NjkxIDMwLjczMjE4OSwwLjAwMTQ3MjE4MTE1IEMyOS43MzI3MjI5LDAuMDMzOTk0Mjg5MSAyOC44MjQ3MTg5LDAuNjAzMjA2NDIgMjguMzU5OTk5LDEuNDk1NDY4NSBMMjQsOS44NjY2NjY2NyBMMTkuNjQwMDAxLDEuNDk1NDY4NSBDMTkuMTYxMjg0NiwwLjU3NjMzMzA2IDE4LjIxMjE4LDIuMDMyMDE2NDNlLTE1IDE3LjE3NzI2NTMsMCBMMzAuNjUzNzgyMywxLjg1MzU4OTc1ZS0xNSBaIiBpZD0ic2hhcGUiIGZpbGwtb3BhY2l0eT0iMC41Ij48L3BhdGg+CiAgICAgICAgPC9nPgogICAgPC9nPgo8L3N2Zz4=";
    logoState3.src = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iODBweCIgaGVpZ2h0PSI4MHB4IiB2aWV3Qm94PSIwIDAgODAgODAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDUyLjEgKDY3MDQ4KSAtIGh0dHA6Ly93d3cuYm9oZW1pYW5jb2RpbmcuY29tL3NrZXRjaCAtLT4KICAgIDx0aXRsZT5BbGFuIEJ1dHRvbiAvIEFuaW1hdGlvbiAvIGJ1dHRvbi1sb2dvLXN0YXRlLTAzPC90aXRsZT4KICAgIDxkZXNjPkNyZWF0ZWQgd2l0aCBTa2V0Y2guPC9kZXNjPgogICAgPGcgaWQ9IkFsYW4tQnV0dG9uLS8tQW5pbWF0aW9uLS8tYnV0dG9uLWxvZ28tc3RhdGUtMDMiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPgogICAgICAgIDxnIGlkPSJsb2dvIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxNi4wMDAwMDAsIDIxLjAwMDAwMCkiIGZpbGw9IiNGRkZGRkYiPgogICAgICAgICAgICA8cGF0aCBkPSJNMTkuNjQwMDAxLDEuNDk1NDY4NSBMMjQsOS44NjY2NjY2NyBMMTguMjcxMTkyNCwyMSBMNi40NzczOTQ2NiwyMSBDNS43MDEzMTEwMSwyMS4wMDAxMDYzIDQuOTg5NjE3NzYsMjEuMjk5OTMzOSA0LjYzMDYyNzg1LDIxLjk4OTE5NDUgTDE1LjQ5OTE2NTksMS4xMjE2MDEzOCBDMTUuODQ2MDc4MSwwLjQ1NTUyOTk2NCAxNi41MjIzNTU1LDAuMDI5NDg4MzMzNSAxNy4yNjc4MTEsMC4wMDE0NzIxODExNSBDMTguMjY3Mjc3MSwwLjAzMzk5NDI4OTEgMTkuMTc1MjgxMSwwLjYwMzIwNjQyIDE5LjY0MDAwMSwxLjQ5NTQ2ODUgWiIgaWQ9InNoYXBlIiBmaWxsLW9wYWNpdHk9IjAuMyI+PC9wYXRoPgogICAgICAgICAgICA8cGF0aCBkPSJNMTguMjcxMTkyNCwyMSBMMTMuMDU2Mzg5NiwzMC44NzgzOTg2IEMxMi42OTczNTIzLDMxLjU2Nzc1MDIgMTEuOTg1NTIzOSwzMiAxMS4yMDkzMzc4LDMyIEwxLjcwNzg2NDk1LDMyIEMwLjk0MDgwMjc5NiwzMiAwLjMxODk3NjA1OSwzMS4zNzcwOTE4IDAuMzE4OTc2MDU5LDMwLjYwODY5NTcgQzAuMzE4OTc2MDU5LDMwLjM4NDU5NDggMC4zNzMwMTU2MTgsMzAuMTYzODEgMC40NzY0OTcxMDYsMjkuOTY1MTI1NiBMNC42MzA2Mjc4NSwyMS45ODkxOTQ1IEM0Ljk4OTYxNzc2LDIxLjI5OTkzMzkgNS43MDEzMTEwMSwyMS4wMDAxMDYzIDYuNDc3Mzk0NjYsMjEgTDE4LjI3MTE5MjQsMjEgWiIgaWQ9InNoYXBlIiBmaWxsLW9wYWNpdHk9IjAuNSI+PC9wYXRoPgogICAgICAgICAgICA8cGF0aCBkPSJNMTEuMjA5MzM3OCwzMiBDMTEuOTg1NTIzOSwzMiAxMi42OTczNTIzLDMxLjU2Nzc1MDIgMTMuMDU2Mzg5NiwzMC44NzgzOTg2IEwxOC4yNzExOTI0LDIwLjg2NTk3NzMgTDIzLjk1NjQ1ODIsMjAuODY1MTk4MyBDMjQuNzMwOTU2MiwyMC44NjUwOTIyIDI1LjQ0MTU4NjcsMjEuMjk1Mzg0OCAyNS44MDE0ODQ2LDIxLjk4MjM3NjcgTDI5Ljk4MTkwMTUsMjkuOTYyMTc2OSBDMzAuMzM4MzQ0LDMwLjY0MjU3MzIgMzAuMDc2Njg1MiwzMS40ODM1OTk3IDI5LjM5NzQ3MDEsMzEuODQwNjYyMSBDMjkuMTk4MzgzOCwzMS45NDUzMjE1IDI4Ljk3NjkwOTMsMzIgMjguNzUyMDczOCwzMiBMMTEuMjA5MzM3OCwzMiBaIiBpZD0ic2hhcGUiIGZpbGwtb3BhY2l0eT0iMC45Ij48L3BhdGg+CiAgICAgICAgICAgIDxwYXRoIGQ9Ik0yOC4zNTk5OTksMS40OTU0Njg1IEMyOC44MjQ3MTg5LDAuNjAzMjA2NDIgMjkuNzMyNzIyOSwwLjAzMzk5NDI4OTEgMzAuNzMyMTg5LDAuMDAxNDcyMTgxMTUgQzMwLjcwNjEzNDIsMC4wMDA0OTI5NzU2OTEgMzAuNjc5OTk1LC0xLjIzNTI0NDE0ZS0xNCAzMC42NTM3ODIzLC0xLjIzNTcyNjVlLTE0IEwzMC45NDQ0NDQ0LC0xLjQyMTA4NTQ3ZS0xNCBMMzAuODIyNzM0NywtMS4yMzc1MTE4M2UtMTQgQzMwLjc5MjQ3NjMsLTEuMjMxNTg2OTNlLTE0IDMwLjc2MjI5MTEsMC4wMDA0OTI2NzI2MzUgMzAuNzMyMTg5LDAuMDAxNDcyMTgxMTUgQzMxLjQ3NzY0NDUsMC4wMjk0ODgzMzM1IDMyLjE1MzkyMTksMC40NTU1Mjk5NjQgMzIuNTAwODM0MSwxLjEyMTYwMTM4IEw0Ny41MjM1MDI5LDI5Ljk2NTEyNTYgQzQ3LjYyNjk4NDQsMzAuMTYzODEgNDcuNjgxMDIzOSwzMC4zODQ1OTQ4IDQ3LjY4MTAyMzksMzAuNjA4Njk1NyBDNDcuNjgxMDIzOSwzMS4zNzcwOTE4IDQ3LjA1OTE5NzIsMzIgNDYuMjkyMTM1MSwzMiBMMzYuNzkwNjYyMiwzMiBDMzYuMDE0NDc2MSwzMiAzNS4zMDI2NDc3LDMxLjU2Nzc1MDIgMzQuOTQzNjEwNCwzMC44NzgzOTg2IEwyNCw5Ljg2NjY2NjY3IEwyOC4zNTk5OTksMS40OTU0Njg1IFoiIGlkPSJzaGFwZSIgZmlsbC1vcGFjaXR5PSIwLjkiPjwvcGF0aD4KICAgICAgICAgICAgPHBhdGggZD0iTTMwLjY1Mzc4MjMsLTEuMjM1NzI2NWUtMTQgQzMwLjY3OTk5NSwtMS4yMzUyNDQxNGUtMTQgMzAuNzA2MTM0MiwwLjAwMDQ5Mjk3NTY5MSAzMC43MzIxODksMC4wMDE0NzIxODExNSBDMjkuNzMyNzIyOSwwLjAzMzk5NDI4OTEgMjguODI0NzE4OSwwLjYwMzIwNjQyIDI4LjM1OTk5OSwxLjQ5NTQ2ODUgTDI0LDkuODY2NjY2NjcgTDE5LjY0MDAwMSwxLjQ5NTQ2ODUgQzE5LjE2MTI4NDYsMC41NzYzMzMwNiAxOC4yMTIxOCwtMS4yMTc4ODM4M2UtMTQgMTcuMTc3MjY1MywtMS40MjEwODU0N2UtMTQgTDMwLjY1Mzc4MjMsLTEuMjM1NzI2NWUtMTQgWiIgaWQ9InNoYXBlIiBmaWxsLW9wYWNpdHk9IjAuNSI+PC9wYXRoPgogICAgICAgIDwvZz4KICAgIDwvZz4KPC9zdmc+";
    logoState4.src = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iODBweCIgaGVpZ2h0PSI4MHB4IiB2aWV3Qm94PSIwIDAgODAgODAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDUyLjEgKDY3MDQ4KSAtIGh0dHA6Ly93d3cuYm9oZW1pYW5jb2RpbmcuY29tL3NrZXRjaCAtLT4KICAgIDx0aXRsZT5BbGFuIEJ1dHRvbiAvIEFuaW1hdGlvbiAvIGJ1dHRvbi1sb2dvLXN0YXRlLTA0PC90aXRsZT4KICAgIDxkZXNjPkNyZWF0ZWQgd2l0aCBTa2V0Y2guPC9kZXNjPgogICAgPGcgaWQ9IkFsYW4tQnV0dG9uLS8tQW5pbWF0aW9uLS8tYnV0dG9uLWxvZ28tc3RhdGUtMDQiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPgogICAgICAgIDxnIGlkPSJsb2dvIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxNi4wMDAwMDAsIDIxLjAwMDAwMCkiIGZpbGw9IiNGRkZGRkYiPgogICAgICAgICAgICA8cGF0aCBkPSJNMjQsOS44NjY2NjY2NyBMMTguMjcxMTkyNCwyMSBMNi40NzczOTQ2NiwyMSBDNS43MDEzMTEwMSwyMS4wMDAxMDYzIDQuOTg5NjE3NzYsMjEuMjk5OTMzOSA0LjYzMDYyNzg1LDIxLjk4OTE5NDUgTDE1LjQ5OTE2NTksMS4xMjE2MDEzOCBDMTUuODQ2MDc4MSwwLjQ1NTUyOTk2NCAxNi41MjIzNTU1LDAuMDI5NDg4MzMzNSAxNy4yNjc4MTEsMC4wMDE0NzIxODExNSBDMTcuMjM3NzA4OSwwLjAwMDQ5MjY3MjYzNSAxNy4yMDc1MjM3LDEuOTU5OTMzNjZlLTE0IDE3LjE3NzI2NTMsMS45NTM5OTI1MmUtMTQgTDMwLjY1Mzc4MjMsMi4xMzkzNTE1ZS0xNCBDMzAuNjc5OTk1LDIuMTM5ODMzODVlLTE0IDMwLjcwNjEzNDIsMC4wMDA0OTI5NzU2OTEgMzAuNzMyMTg5LDAuMDAxNDcyMTgxMTUgQzI5LjczMjcyMjksMC4wMzM5OTQyODkxIDI4LjgyNDcxODksMC42MDMyMDY0MiAyOC4zNTk5OTksMS40OTU0Njg1IEwyNCw5Ljg2NjY2NjY3IFoiIGlkPSJzaGFwZS0yIiBmaWxsLW9wYWNpdHk9IjAuMyI+PC9wYXRoPgogICAgICAgICAgICA8cGF0aCBkPSJNMTguMjcxMTkyNCwyMSBMMTMuMDU2Mzg5NiwzMC44NzgzOTg2IEMxMi42OTczNTIzLDMxLjU2Nzc1MDIgMTEuOTg1NTIzOSwzMiAxMS4yMDkzMzc4LDMyIEwxLjcwNzg2NDk1LDMyIEMwLjk0MDgwMjc5NiwzMiAwLjMxODk3NjA1OSwzMS4zNzcwOTE4IDAuMzE4OTc2MDU5LDMwLjYwODY5NTcgQzAuMzE4OTc2MDU5LDMwLjM4NDU5NDggMC4zNzMwMTU2MTgsMzAuMTYzODEgMC40NzY0OTcxMDYsMjkuOTY1MTI1NiBMNC42MzA2Mjc4NSwyMS45ODkxOTQ1IEM0Ljk4OTYxNzc2LDIxLjI5OTkzMzkgNS43MDEzMTEwMSwyMS4wMDAxMDYzIDYuNDc3Mzk0NjYsMjEgTDE4LjI3MTE5MjQsMjEgWiIgaWQ9InNoYXBlIiBmaWxsLW9wYWNpdHk9IjAuNSI+PC9wYXRoPgogICAgICAgICAgICA8cGF0aCBkPSJNMTEuMjA5MzM3OCwzMiBDMTEuOTg1NTIzOSwzMiAxMi42OTczNTIzLDMxLjU2Nzc1MDIgMTMuMDU2Mzg5NiwzMC44NzgzOTg2IEwxOC4yNzExOTI0LDIwLjg2NTk3NzMgTDIzLjk1NjQ1ODIsMjAuODY1MTk4MyBDMjQuNzMwOTU2MiwyMC44NjUwOTIyIDI1LjQ0MTU4NjcsMjEuMjk1Mzg0OCAyNS44MDE0ODQ2LDIxLjk4MjM3NjcgTDI5Ljk4MTkwMTUsMjkuOTYyMTc2OSBDMzAuMzM4MzQ0LDMwLjY0MjU3MzIgMzAuMDc2Njg1MiwzMS40ODM1OTk3IDI5LjM5NzQ3MDEsMzEuODQwNjYyMSBDMjkuMTk4MzgzOCwzMS45NDUzMjE1IDI4Ljk3NjkwOTMsMzIgMjguNzUyMDczOCwzMiBMMTEuMjA5MzM3OCwzMiBaIiBpZD0ic2hhcGUiIGZpbGwtb3BhY2l0eT0iMC45Ij48L3BhdGg+CiAgICAgICAgICAgIDxwYXRoIGQ9Ik0yOC4zNTk5OTksMS40OTU0Njg1IEMyOC44MjQ3MTg5LDAuNjAzMjA2NDIgMjkuNzMyNzIyOSwwLjAzMzk5NDI4OTEgMzAuNzMyMTg5LDAuMDAxNDcyMTgxMTUgQzMwLjcwNjEzNDIsMC4wMDA0OTI5NzU2OTEgMzAuNjc5OTk1LC0xLjIzNTI0NDE0ZS0xNCAzMC42NTM3ODIzLC0xLjIzNTcyNjVlLTE0IEwzMC45NDQ0NDQ0LC0xLjQyMTA4NTQ3ZS0xNCBMMzAuODIyNzM0NywtMS4yMzc1MTE4M2UtMTQgQzMwLjc5MjQ3NjMsLTEuMjMxNTg2OTNlLTE0IDMwLjc2MjI5MTEsMC4wMDA0OTI2NzI2MzUgMzAuNzMyMTg5LDAuMDAxNDcyMTgxMTUgQzMxLjQ3NzY0NDUsMC4wMjk0ODgzMzM1IDMyLjE1MzkyMTksMC40NTU1Mjk5NjQgMzIuNTAwODM0MSwxLjEyMTYwMTM4IEw0Ny41MjM1MDI5LDI5Ljk2NTEyNTYgQzQ3LjYyNjk4NDQsMzAuMTYzODEgNDcuNjgxMDIzOSwzMC4zODQ1OTQ4IDQ3LjY4MTAyMzksMzAuNjA4Njk1NyBDNDcuNjgxMDIzOSwzMS4zNzcwOTE4IDQ3LjA1OTE5NzIsMzIgNDYuMjkyMTM1MSwzMiBMMzYuNzkwNjYyMiwzMiBDMzYuMDE0NDc2MSwzMiAzNS4zMDI2NDc3LDMxLjU2Nzc1MDIgMzQuOTQzNjEwNCwzMC44NzgzOTg2IEwyNCw5Ljg2NjY2NjY3IEwyOC4zNTk5OTksMS40OTU0Njg1IFoiIGlkPSJzaGFwZSIgZmlsbC1vcGFjaXR5PSIwLjUiPjwvcGF0aD4KICAgICAgICA8L2c+CiAgICA8L2c+Cjwvc3ZnPg==";
    logoState5.src = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iODBweCIgaGVpZ2h0PSI4MHB4IiB2aWV3Qm94PSIwIDAgODAgODAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDUyLjEgKDY3MDQ4KSAtIGh0dHA6Ly93d3cuYm9oZW1pYW5jb2RpbmcuY29tL3NrZXRjaCAtLT4KICAgIDx0aXRsZT5BbGFuIEJ1dHRvbiAvIEFuaW1hdGlvbiAvIGJ1dHRvbi1sb2dvLXN0YXRlLTA1PC90aXRsZT4KICAgIDxkZXNjPkNyZWF0ZWQgd2l0aCBTa2V0Y2guPC9kZXNjPgogICAgPGcgaWQ9IkFsYW4tQnV0dG9uLS8tQW5pbWF0aW9uLS8tYnV0dG9uLWxvZ28tc3RhdGUtMDUiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPgogICAgICAgIDxnIGlkPSJsb2dvIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxNi4wMDAwMDAsIDIxLjAwMDAwMCkiIGZpbGw9IiNGRkZGRkYiPgogICAgICAgICAgICA8cGF0aCBkPSJNMTkuNjQwMDAxLDEuNDk1NDY4NSBMMjQsOS44NjY2NjY2NyBMMTguMjcxMTkyNCwyMSBMNi40NzczOTQ2NiwyMSBDNS43MDEzMTEwMSwyMS4wMDAxMDYzIDQuOTg5NjE3NzYsMjEuMjk5OTMzOSA0LjYzMDYyNzg1LDIxLjk4OTE5NDUgTDE1LjQ5OTE2NTksMS4xMjE2MDEzOCBDMTUuODQ2MDc4MSwwLjQ1NTUyOTk2NCAxNi41MjIzNTU1LDAuMDI5NDg4MzMzNSAxNy4yNjc4MTEsMC4wMDE0NzIxODExNSBDMTguMjY3Mjc3MSwwLjAzMzk5NDI4OTEgMTkuMTc1MjgxMSwwLjYwMzIwNjQyIDE5LjY0MDAwMSwxLjQ5NTQ2ODUgWiIgaWQ9InNoYXBlIiBmaWxsLW9wYWNpdHk9IjAuNSI+PC9wYXRoPgogICAgICAgICAgICA8cGF0aCBkPSJNMjguMzU5OTk5LDEuNDk1NDY4NSBDMjguODI0NzE4OSwwLjYwMzIwNjQyIDI5LjczMjcyMjksMC4wMzM5OTQyODkxIDMwLjczMjE4OSwwLjAwMTQ3MjE4MTE1IEMzMC43MDYxMzQyLDAuMDAwNDkyOTc1NjkxIDMwLjY3OTk5NSwtMS4yMzUyNDQxNGUtMTQgMzAuNjUzNzgyMywtMS4yMzU3MjY1ZS0xNCBMMzAuOTQ0NDQ0NCwtMS40MjEwODU0N2UtMTQgTDMwLjgyMjczNDcsLTEuMjM3NTExODNlLTE0IEMzMC43OTI0NzYzLC0xLjIzMTU4NjkzZS0xNCAzMC43NjIyOTExLDAuMDAwNDkyNjcyNjM1IDMwLjczMjE4OSwwLjAwMTQ3MjE4MTE1IEMzMS40Nzc2NDQ1LDAuMDI5NDg4MzMzNSAzMi4xNTM5MjE5LDAuNDU1NTI5OTY0IDMyLjUwMDgzNDEsMS4xMjE2MDEzOCBMNDcuNTIzNTAyOSwyOS45NjUxMjU2IEM0Ny42MjY5ODQ0LDMwLjE2MzgxIDQ3LjY4MTAyMzksMzAuMzg0NTk0OCA0Ny42ODEwMjM5LDMwLjYwODY5NTcgQzQ3LjY4MTAyMzksMzEuMzc3MDkxOCA0Ny4wNTkxOTcyLDMyIDQ2LjI5MjEzNTEsMzIgTDM2Ljc5MDY2MjIsMzIgQzM2LjAxNDQ3NjEsMzIgMzUuMzAyNjQ3NywzMS41Njc3NTAyIDM0Ljk0MzYxMDQsMzAuODc4Mzk4NiBMMjQsOS44NjY2NjY2NyBMMjguMzU5OTk5LDEuNDk1NDY4NSBaIiBpZD0ic2hhcGUiIGZpbGwtb3BhY2l0eT0iMC41Ij48L3BhdGg+CiAgICAgICAgICAgIDxwYXRoIGQ9Ik0zMC42NTM3ODIzLC0xLjIzNTcyNjVlLTE0IEMzMC42Nzk5OTUsLTEuMjM1MjQ0MTRlLTE0IDMwLjcwNjEzNDIsMC4wMDA0OTI5NzU2OTEgMzAuNzMyMTg5LDAuMDAxNDcyMTgxMTUgQzI5LjczMjcyMjksMC4wMzM5OTQyODkxIDI4LjgyNDcxODksMC42MDMyMDY0MiAyOC4zNTk5OTksMS40OTU0Njg1IEwyNCw5Ljg2NjY2NjY3IEwxOS42NDAwMDEsMS40OTU0Njg1IEMxOS4xNjEyODQ2LDAuNTc2MzMzMDYgMTguMjEyMTgsLTEuMjE3ODgzODNlLTE0IDE3LjE3NzI2NTMsLTEuNDIxMDg1NDdlLTE0IEwzMC42NTM3ODIzLC0xLjIzNTcyNjVlLTE0IFoiIGlkPSJzaGFwZSIgZmlsbC1vcGFjaXR5PSIwLjMiPjwvcGF0aD4KICAgICAgICAgICAgPHBhdGggZD0iTTE4LjI3MTE5MjQsMjEgTDIzLjk1NjQ1ODIsMjEgQzI0LjczMDk1NjIsMjAuOTk5ODkzOSAyNS40NDE1ODY3LDIxLjI5NTM4NDggMjUuODAxNDg0NiwyMS45ODIzNzY3IEwyOS45ODE5MDE1LDI5Ljk2MjE3NjkgQzMwLjMzODM0NCwzMC42NDI1NzMyIDMwLjA3NjY4NTIsMzEuNDgzNTk5NyAyOS4zOTc0NzAxLDMxLjg0MDY2MjEgQzI5LjE5ODM4MzgsMzEuOTQ1MzIxNSAyOC45NzY5MDkzLDMyIDI4Ljc1MjA3MzgsMzIgTDExLjIwOTMzNzgsMzIgTDEuNzA3ODY0OTUsMzIgQzAuOTQwODAyNzk2LDMyIDAuMzE4OTc2MDU5LDMxLjM3NzA5MTggMC4zMTg5NzYwNTksMzAuNjA4Njk1NyBDMC4zMTg5NzYwNTksMzAuMzg0NTk0OCAwLjM3MzAxNTYxOCwzMC4xNjM4MSAwLjQ3NjQ5NzEwNiwyOS45NjUxMjU2IEw0LjYzMDYyNzg1LDIxLjk4OTE5NDUgQzQuOTg5NjE3NzYsMjEuMjk5OTMzOSA1LjcwMTMxMTAxLDIxLjAwMDEwNjMgNi40NzczOTQ2NiwyMSBMMTguMjcxMTkyNCwyMSBaIiBpZD0ic2hhcGUiIGZpbGwtb3BhY2l0eT0iMC45Ij48L3BhdGg+CiAgICAgICAgPC9nPgogICAgPC9nPgo8L3N2Zz4=";
    logoState6.src = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iODBweCIgaGVpZ2h0PSI4MHB4IiB2aWV3Qm94PSIwIDAgODAgODAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDUyLjEgKDY3MDQ4KSAtIGh0dHA6Ly93d3cuYm9oZW1pYW5jb2RpbmcuY29tL3NrZXRjaCAtLT4KICAgIDx0aXRsZT5BbGFuIEJ1dHRvbiAvIEFuaW1hdGlvbiAvIGJ1dHRvbi1sb2dvLXN0YXRlLTA2PC90aXRsZT4KICAgIDxkZXNjPkNyZWF0ZWQgd2l0aCBTa2V0Y2guPC9kZXNjPgogICAgPGcgaWQ9IkFsYW4tQnV0dG9uLS8tQW5pbWF0aW9uLS8tYnV0dG9uLWxvZ28tc3RhdGUtMDYiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPgogICAgICAgIDxnIGlkPSJsb2dvIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxNi4wMDAwMDAsIDIxLjAwMDAwMCkiIGZpbGw9IiNGRkZGRkYiPgogICAgICAgICAgICA8cGF0aCBkPSJNMTkuNjQwMDAxLDEuNDk1NDY4NSBMMjQsOS44NjY2NjY2NyBMMTguMjcxMTkyNCwyMSBMNi40NzczOTQ2NiwyMSBDNS43MDEzMTEwMSwyMS4wMDAxMDYzIDQuOTg5NjE3NzYsMjEuMjk5OTMzOSA0LjYzMDYyNzg1LDIxLjk4OTE5NDUgTDE1LjQ5OTE2NTksMS4xMjE2MDEzOCBDMTUuODQ2MDc4MSwwLjQ1NTUyOTk2NCAxNi41MjIzNTU1LDAuMDI5NDg4MzMzNSAxNy4yNjc4MTEsMC4wMDE0NzIxODExNSBDMTguMjY3Mjc3MSwwLjAzMzk5NDI4OTEgMTkuMTc1MjgxMSwwLjYwMzIwNjQyIDE5LjY0MDAwMSwxLjQ5NTQ2ODUgWiIgaWQ9InNoYXBlIiBmaWxsLW9wYWNpdHk9IjAuNSI+PC9wYXRoPgogICAgICAgICAgICA8cGF0aCBkPSJNMzAuNjUzNzgyMywxLjg1MzU4OTc1ZS0xNSBMMzAuOTQ0NDQ0NCwwIEwzMC44MjI3MzQ3LDEuODM1NzM2NGUtMTUgQzMwLjc5MjQ3NjMsMS44OTQ5ODUzOWUtMTUgMzAuNzYyMjkxMSwwLjAwMDQ5MjY3MjYzNSAzMC43MzIxODksMC4wMDE0NzIxODExNSBDMzEuNDc3NjQ0NSwwLjAyOTQ4ODMzMzUgMzIuMTUzOTIxOSwwLjQ1NTUyOTk2NCAzMi41MDA4MzQxLDEuMTIxNjAxMzggTDQ3LjUyMzUwMjksMjkuOTY1MTI1NiBDNDcuNjI2OTg0NCwzMC4xNjM4MSA0Ny42ODEwMjM5LDMwLjM4NDU5NDggNDcuNjgxMDIzOSwzMC42MDg2OTU3IEM0Ny42ODEwMjM5LDMxLjM3NzA5MTggNDcuMDU5MTk3MiwzMiA0Ni4yOTIxMzUxLDMyIEwzNi43OTA2NjIyLDMyIEMzNi4wMTQ0NzYxLDMyIDM1LjMwMjY0NzcsMzEuNTY3NzUwMiAzNC45NDM2MTA0LDMwLjg3ODM5ODYgTDI0LDkuODY2NjY2NjcgTDE5LjY0MDAwMSwxLjQ5NTQ2ODUgQzE5LjE2MTI4NDYsMC41NzYzMzMwNiAxOC4yMTIxOCwyLjAzMjAxNjQzZS0xNSAxNy4xNzcyNjUzLDAgTDMwLjY1Mzc4MjMsMS44NTM1ODk3NWUtMTUgWiIgaWQ9InNoYXBlIiBmaWxsLW9wYWNpdHk9IjAuMyI+PC9wYXRoPgogICAgICAgICAgICA8cGF0aCBkPSJNMTguMjcxMTkyNCwyMSBMMTMuMDU2Mzg5NiwzMC44NzgzOTg2IEMxMi42OTczNTIzLDMxLjU2Nzc1MDIgMTEuOTg1NTIzOSwzMiAxMS4yMDkzMzc4LDMyIEwxLjcwNzg2NDk1LDMyIEMwLjk0MDgwMjc5NiwzMiAwLjMxODk3NjA1OSwzMS4zNzcwOTE4IDAuMzE4OTc2MDU5LDMwLjYwODY5NTcgQzAuMzE4OTc2MDU5LDMwLjM4NDU5NDggMC4zNzMwMTU2MTgsMzAuMTYzODEgMC40NzY0OTcxMDYsMjkuOTY1MTI1NiBMNC42MzA2Mjc4NSwyMS45ODkxOTQ1IEM0Ljk4OTYxNzc2LDIxLjI5OTkzMzkgNS43MDEzMTEwMSwyMS4wMDAxMDYzIDYuNDc3Mzk0NjYsMjEgTDE4LjI3MTE5MjQsMjEgWiIgaWQ9InNoYXBlIiBmaWxsLW9wYWNpdHk9IjAuOSI+PC9wYXRoPgogICAgICAgICAgICA8cGF0aCBkPSJNMTEuMjA5MzM3OCwzMiBDMTEuOTg1NTIzOSwzMiAxMi42OTczNTIzLDMxLjU2Nzc1MDIgMTMuMDU2Mzg5NiwzMC44NzgzOTg2IEwxOC4yNzExOTI0LDIwLjg2NTk3NzMgTDIzLjk1NjQ1ODIsMjAuODY1MTk4MyBDMjQuNzMwOTU2MiwyMC44NjUwOTIyIDI1LjQ0MTU4NjcsMjEuMjk1Mzg0OCAyNS44MDE0ODQ2LDIxLjk4MjM3NjcgTDI5Ljk4MTkwMTUsMjkuOTYyMTc2OSBDMzAuMzM4MzQ0LDMwLjY0MjU3MzIgMzAuMDc2Njg1MiwzMS40ODM1OTk3IDI5LjM5NzQ3MDEsMzEuODQwNjYyMSBDMjkuMTk4MzgzOCwzMS45NDUzMjE1IDI4Ljk3NjkwOTMsMzIgMjguNzUyMDczOCwzMiBMMTEuMjA5MzM3OCwzMiBaIiBpZD0ic2hhcGUiIGZpbGwtb3BhY2l0eT0iMC41Ij48L3BhdGg+CiAgICAgICAgPC9nPgogICAgPC9nPgo8L3N2Zz4=";
    logoState7.src = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iODBweCIgaGVpZ2h0PSI4MHB4IiB2aWV3Qm94PSIwIDAgODAgODAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDUyLjEgKDY3MDQ4KSAtIGh0dHA6Ly93d3cuYm9oZW1pYW5jb2RpbmcuY29tL3NrZXRjaCAtLT4KICAgIDx0aXRsZT5BbGFuIEJ1dHRvbiAvIEFuaW1hdGlvbiAvIGJ1dHRvbi1sb2dvLXN0YXRlLTA3PC90aXRsZT4KICAgIDxkZXNjPkNyZWF0ZWQgd2l0aCBTa2V0Y2guPC9kZXNjPgogICAgPGcgaWQ9IkFsYW4tQnV0dG9uLS8tQW5pbWF0aW9uLS8tYnV0dG9uLWxvZ28tc3RhdGUtMDciIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPgogICAgICAgIDxnIGlkPSJsb2dvIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxNi4wMDAwMDAsIDIxLjAwMDAwMCkiIGZpbGw9IiNGRkZGRkYiPgogICAgICAgICAgICA8cGF0aCBkPSJNMTguMjcxMTkyNCwyMSBMMTMuMDU2Mzg5NiwzMC44NzgzOTg2IEMxMi42OTczNTIzLDMxLjU2Nzc1MDIgMTEuOTg1NTIzOSwzMiAxMS4yMDkzMzc4LDMyIEwxLjcwNzg2NDk1LDMyIEMwLjk0MDgwMjc5NiwzMiAwLjMxODk3NjA1OSwzMS4zNzcwOTE4IDAuMzE4OTc2MDU5LDMwLjYwODY5NTcgQzAuMzE4OTc2MDU5LDMwLjM4NDU5NDggMC4zNzMwMTU2MTgsMzAuMTYzODEgMC40NzY0OTcxMDYsMjkuOTY1MTI1NiBMNC42MzA2Mjc4NSwyMS45ODkxOTQ1IEwxNS40OTkxNjU5LDEuMTIxNjAxMzggQzE1Ljg0NjA3ODEsMC40NTU1Mjk5NjQgMTYuNTIyMzU1NSwwLjAyOTQ4ODMzMzUgMTcuMjY3ODExLDAuMDAxNDcyMTgxMTUgQzE4LjI2NzI3NzEsMC4wMzM5OTQyODkxIDE5LjE3NTI4MTEsMC42MDMyMDY0MiAxOS42NDAwMDEsMS40OTU0Njg1IEwyNCw5Ljg2NjY2NjY3IEwxOC4yNzExOTI0LDIxIFoiIGlkPSJzaGFwZS0yIiBmaWxsLW9wYWNpdHk9IjAuOSI+PC9wYXRoPgogICAgICAgICAgICA8cGF0aCBkPSJNMjguMzU5OTk5LDEuNDk1NDY4NSBDMjguODI0NzE4OSwwLjYwMzIwNjQyIDI5LjczMjcyMjksMC4wMzM5OTQyODkxIDMwLjczMjE4OSwwLjAwMTQ3MjE4MTE1IEMzMC43MDYxMzQyLDAuMDAwNDkyOTc1NjkxIDMwLjY3OTk5NSwxLjg1ODQxMzMxZS0xNSAzMC42NTM3ODIzLDEuODUzNTg5NzVlLTE1IEwzMC45NDQ0NDQ0LDAgTDMwLjgyMjczNDcsMS44MzU3MzY0ZS0xNSBDMzAuNzkyNDc2MywxLjg5NDk4NTM5ZS0xNSAzMC43NjIyOTExLDAuMDAwNDkyNjcyNjM1IDMwLjczMjE4OSwwLjAwMTQ3MjE4MTE1IEMzMS40Nzc2NDQ1LDAuMDI5NDg4MzMzNSAzMi4xNTM5MjE5LDAuNDU1NTI5OTY0IDMyLjUwMDgzNDEsMS4xMjE2MDEzOCBMNDcuNTIzNTAyOSwyOS45NjUxMjU2IEM0Ny42MjY5ODQ0LDMwLjE2MzgxIDQ3LjY4MTAyMzksMzAuMzg0NTk0OCA0Ny42ODEwMjM5LDMwLjYwODY5NTcgQzQ3LjY4MTAyMzksMzEuMzc3MDkxOCA0Ny4wNTkxOTcyLDMyIDQ2LjI5MjEzNTEsMzIgTDM2Ljc5MDY2MjIsMzIgQzM2LjAxNDQ3NjEsMzIgMzUuMzAyNjQ3NywzMS41Njc3NTAyIDM0Ljk0MzYxMDQsMzAuODc4Mzk4NiBMMjQsOS44NjY2NjY2NyBMMjguMzU5OTk5LDEuNDk1NDY4NSBaIiBpZD0ic2hhcGUiIGZpbGwtb3BhY2l0eT0iMC4zIj48L3BhdGg+CiAgICAgICAgICAgIDxwYXRoIGQ9Ik0zMC42NTM3ODIzLDEuODUzNTg5NzVlLTE1IEMzMC42Nzk5OTUsMS44NTg0MTMzMWUtMTUgMzAuNzA2MTM0MiwwLjAwMDQ5Mjk3NTY5MSAzMC43MzIxODksMC4wMDE0NzIxODExNSBDMjkuNzMyNzIyOSwwLjAzMzk5NDI4OTEgMjguODI0NzE4OSwwLjYwMzIwNjQyIDI4LjM1OTk5OSwxLjQ5NTQ2ODUgTDI0LDkuODY2NjY2NjcgTDE5LjY0MDAwMSwxLjQ5NTQ2ODUgQzE5LjE2MTI4NDYsMC41NzYzMzMwNiAxOC4yMTIxOCwyLjAzMjAxNjQzZS0xNSAxNy4xNzcyNjUzLDAgTDMwLjY1Mzc4MjMsMS44NTM1ODk3NWUtMTUgWiIgaWQ9InNoYXBlIiBmaWxsLW9wYWNpdHk9IjAuNSI+PC9wYXRoPgogICAgICAgICAgICA8cGF0aCBkPSJNMTEuMjA5MzM3OCwzMiBDMTEuOTg1NTIzOSwzMiAxMi42OTczNTIzLDMxLjU2Nzc1MDIgMTMuMDU2Mzg5NiwzMC44NzgzOTg2IEwxOC4yNzExOTI0LDIwLjg2NTk3NzMgTDIzLjk1NjQ1ODIsMjAuODY1MTk4MyBDMjQuNzMwOTU2MiwyMC44NjUwOTIyIDI1LjQ0MTU4NjcsMjEuMjk1Mzg0OCAyNS44MDE0ODQ2LDIxLjk4MjM3NjcgTDI5Ljk4MTkwMTUsMjkuOTYyMTc2OSBDMzAuMzM4MzQ0LDMwLjY0MjU3MzIgMzAuMDc2Njg1MiwzMS40ODM1OTk3IDI5LjM5NzQ3MDEsMzEuODQwNjYyMSBDMjkuMTk4MzgzOCwzMS45NDUzMjE1IDI4Ljk3NjkwOTMsMzIgMjguNzUyMDczOCwzMiBMMTEuMjA5MzM3OCwzMiBaIiBpZD0ic2hhcGUiIGZpbGwtb3BhY2l0eT0iMC41Ij48L3BhdGg+CiAgICAgICAgPC9nPgogICAgPC9nPgo8L3N2Zz4=";
    logoState8.src = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iODBweCIgaGVpZ2h0PSI4MHB4IiB2aWV3Qm94PSIwIDAgODAgODAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDUyLjEgKDY3MDQ4KSAtIGh0dHA6Ly93d3cuYm9oZW1pYW5jb2RpbmcuY29tL3NrZXRjaCAtLT4KICAgIDx0aXRsZT5BbGFuIEJ1dHRvbiAvIEFuaW1hdGlvbiAvIGJ1dHRvbi1sb2dvLXN0YXRlLTA4PC90aXRsZT4KICAgIDxkZXNjPkNyZWF0ZWQgd2l0aCBTa2V0Y2guPC9kZXNjPgogICAgPGcgaWQ9IkFsYW4tQnV0dG9uLS8tQW5pbWF0aW9uLS8tYnV0dG9uLWxvZ28tc3RhdGUtMDgiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPgogICAgICAgIDxnIGlkPSJsb2dvIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxNi4wMDAwMDAsIDIxLjAwMDAwMCkiIGZpbGw9IiNGRkZGRkYiPgogICAgICAgICAgICA8cGF0aCBkPSJNMTkuNjQwMDAxLDEuNDk1NDY4NSBMMjQsOS44NjY2NjY2NyBMMTguMjcxMTkyNCwyMSBMNi40NzczOTQ2NiwyMSBDNS43MDEzMTEwMSwyMS4wMDAxMDYzIDQuOTg5NjE3NzYsMjEuMjk5OTMzOSA0LjYzMDYyNzg1LDIxLjk4OTE5NDUgTDE1LjQ5OTE2NTksMS4xMjE2MDEzOCBDMTUuODQ2MDc4MSwwLjQ1NTUyOTk2NCAxNi41MjIzNTU1LDAuMDI5NDg4MzMzNSAxNy4yNjc4MTEsMC4wMDE0NzIxODExNSBDMTguMjY3Mjc3MSwwLjAzMzk5NDI4OTEgMTkuMTc1MjgxMSwwLjYwMzIwNjQyIDE5LjY0MDAwMSwxLjQ5NTQ2ODUgWiIgaWQ9InNoYXBlIiBmaWxsLW9wYWNpdHk9IjAuOSI+PC9wYXRoPgogICAgICAgICAgICA8cGF0aCBkPSJNMTguMjcxMTkyNCwyMSBMMTMuMDU2Mzg5NiwzMC44NzgzOTg2IEMxMi42OTczNTIzLDMxLjU2Nzc1MDIgMTEuOTg1NTIzOSwzMiAxMS4yMDkzMzc4LDMyIEwxLjcwNzg2NDk1LDMyIEMwLjk0MDgwMjc5NiwzMiAwLjMxODk3NjA1OSwzMS4zNzcwOTE4IDAuMzE4OTc2MDU5LDMwLjYwODY5NTcgQzAuMzE4OTc2MDU5LDMwLjM4NDU5NDggMC4zNzMwMTU2MTgsMzAuMTYzODEgMC40NzY0OTcxMDYsMjkuOTY1MTI1NiBMNC42MzA2Mjc4NSwyMS45ODkxOTQ1IEM0Ljk4OTYxNzc2LDIxLjI5OTkzMzkgNS43MDEzMTEwMSwyMS4wMDAxMDYzIDYuNDc3Mzk0NjYsMjEgTDE4LjI3MTE5MjQsMjEgWiIgaWQ9InNoYXBlIiBmaWxsLW9wYWNpdHk9IjAuNSI+PC9wYXRoPgogICAgICAgICAgICA8cGF0aCBkPSJNMTEuMjA5MzM3OCwzMiBDMTEuOTg1NTIzOSwzMiAxMi42OTczNTIzLDMxLjU2Nzc1MDIgMTMuMDU2Mzg5NiwzMC44NzgzOTg2IEwxOC4yNzExOTI0LDIwLjg2NTk3NzMgTDIzLjk1NjQ1ODIsMjAuODY1MTk4MyBDMjQuNzMwOTU2MiwyMC44NjUwOTIyIDI1LjQ0MTU4NjcsMjEuMjk1Mzg0OCAyNS44MDE0ODQ2LDIxLjk4MjM3NjcgTDI5Ljk4MTkwMTUsMjkuOTYyMTc2OSBDMzAuMzM4MzQ0LDMwLjY0MjU3MzIgMzAuMDc2Njg1MiwzMS40ODM1OTk3IDI5LjM5NzQ3MDEsMzEuODQwNjYyMSBDMjkuMTk4MzgzOCwzMS45NDUzMjE1IDI4Ljk3NjkwOTMsMzIgMjguNzUyMDczOCwzMiBMMTEuMjA5MzM3OCwzMiBaIiBpZD0ic2hhcGUiIGZpbGwtb3BhY2l0eT0iMC4zIj48L3BhdGg+CiAgICAgICAgICAgIDxwYXRoIGQ9Ik0yOC4zNTk5OTksMS40OTU0Njg1IEMyOC44MjQ3MTg5LDAuNjAzMjA2NDIgMjkuNzMyNzIyOSwwLjAzMzk5NDI4OTEgMzAuNzMyMTg5LDAuMDAxNDcyMTgxMTUgQzMwLjcwNjEzNDIsMC4wMDA0OTI5NzU2OTEgMzAuNjc5OTk1LC0xLjIzNTI0NDE0ZS0xNCAzMC42NTM3ODIzLC0xLjIzNTcyNjVlLTE0IEwzMC45NDQ0NDQ0LC0xLjQyMTA4NTQ3ZS0xNCBMMzAuODIyNzM0NywtMS4yMzc1MTE4M2UtMTQgQzMwLjc5MjQ3NjMsLTEuMjMxNTg2OTNlLTE0IDMwLjc2MjI5MTEsMC4wMDA0OTI2NzI2MzUgMzAuNzMyMTg5LDAuMDAxNDcyMTgxMTUgQzMxLjQ3NzY0NDUsMC4wMjk0ODgzMzM1IDMyLjE1MzkyMTksMC40NTU1Mjk5NjQgMzIuNTAwODM0MSwxLjEyMTYwMTM4IEw0Ny41MjM1MDI5LDI5Ljk2NTEyNTYgQzQ3LjYyNjk4NDQsMzAuMTYzODEgNDcuNjgxMDIzOSwzMC4zODQ1OTQ4IDQ3LjY4MTAyMzksMzAuNjA4Njk1NyBDNDcuNjgxMDIzOSwzMS4zNzcwOTE4IDQ3LjA1OTE5NzIsMzIgNDYuMjkyMTM1MSwzMiBMMzYuNzkwNjYyMiwzMiBDMzYuMDE0NDc2MSwzMiAzNS4zMDI2NDc3LDMxLjU2Nzc1MDIgMzQuOTQzNjEwNCwzMC44NzgzOTg2IEwyNCw5Ljg2NjY2NjY3IEwyOC4zNTk5OTksMS40OTU0Njg1IFoiIGlkPSJzaGFwZSIgZmlsbC1vcGFjaXR5PSIwLjMiPjwvcGF0aD4KICAgICAgICAgICAgPHBhdGggZD0iTTMwLjY1Mzc4MjMsLTEuMjM1NzI2NWUtMTQgQzMwLjY3OTk5NSwtMS4yMzUyNDQxNGUtMTQgMzAuNzA2MTM0MiwwLjAwMDQ5Mjk3NTY5MSAzMC43MzIxODksMC4wMDE0NzIxODExNSBDMjkuNzMyNzIyOSwwLjAzMzk5NDI4OTEgMjguODI0NzE4OSwwLjYwMzIwNjQyIDI4LjM1OTk5OSwxLjQ5NTQ2ODUgTDI0LDkuODY2NjY2NjcgTDE5LjY0MDAwMSwxLjQ5NTQ2ODUgQzE5LjE2MTI4NDYsMC41NzYzMzMwNiAxOC4yMTIxOCwtMS4yMTc4ODM4M2UtMTQgMTcuMTc3MjY1MywtMS40MjEwODU0N2UtMTQgTDMwLjY1Mzc4MjMsLTEuMjM1NzI2NWUtMTQgWiIgaWQ9InNoYXBlIiBmaWxsLW9wYWNpdHk9IjAuNSI+PC9wYXRoPgogICAgICAgIDwvZz4KICAgIDwvZz4KPC9zdmc+";
    logoState9.src = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iODBweCIgaGVpZ2h0PSI4MHB4IiB2aWV3Qm94PSIwIDAgODAgODAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDUyLjEgKDY3MDQ4KSAtIGh0dHA6Ly93d3cuYm9oZW1pYW5jb2RpbmcuY29tL3NrZXRjaCAtLT4KICAgIDx0aXRsZT5BbGFuIEJ1dHRvbiAvIEFuaW1hdGlvbiAvIGJ1dHRvbi1sb2dvLXN0YXRlLTA5PC90aXRsZT4KICAgIDxkZXNjPkNyZWF0ZWQgd2l0aCBTa2V0Y2guPC9kZXNjPgogICAgPGcgaWQ9IkFsYW4tQnV0dG9uLS8tQW5pbWF0aW9uLS8tYnV0dG9uLWxvZ28tc3RhdGUtMDkiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPgogICAgICAgIDxnIGlkPSJsb2dvIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxNi4wMDAwMDAsIDIxLjAwMDAwMCkiIGZpbGw9IiNGRkZGRkYiPgogICAgICAgICAgICA8cGF0aCBkPSJNMjQsOS44NjY2NjY2NyBMMTguMjcxMTkyNCwyMSBMNi40NzczOTQ2NiwyMSBDNS43MDEzMTEwMSwyMS4wMDAxMDYzIDQuOTg5NjE3NzYsMjEuMjk5OTMzOSA0LjYzMDYyNzg1LDIxLjk4OTE5NDUgTDE1LjQ5OTE2NTksMS4xMjE2MDEzOCBDMTUuODQ2MDc4MSwwLjQ1NTUyOTk2NCAxNi41MjIzNTU1LDAuMDI5NDg4MzMzNSAxNy4yNjc4MTEsMC4wMDE0NzIxODExNSBDMTcuMjM3NzA4OSwwLjAwMDQ5MjY3MjYzNSAxNy4yMDc1MjM3LDEuOTU5OTMzNjZlLTE0IDE3LjE3NzI2NTMsMS45NTM5OTI1MmUtMTQgTDMwLjY1Mzc4MjMsMi4xMzkzNTE1ZS0xNCBDMzAuNjc5OTk1LDIuMTM5ODMzODVlLTE0IDMwLjcwNjEzNDIsMC4wMDA0OTI5NzU2OTEgMzAuNzMyMTg5LDAuMDAxNDcyMTgxMTUgQzI5LjczMjcyMjksMC4wMzM5OTQyODkxIDI4LjgyNDcxODksMC42MDMyMDY0MiAyOC4zNTk5OTksMS40OTU0Njg1IEwyNCw5Ljg2NjY2NjY3IFoiIGlkPSJzaGFwZS0yIiBmaWxsLW9wYWNpdHk9IjAuOSI+PC9wYXRoPgogICAgICAgICAgICA8cGF0aCBkPSJNMTguMjcxMTkyNCwyMSBMMTMuMDU2Mzg5NiwzMC44NzgzOTg2IEMxMi42OTczNTIzLDMxLjU2Nzc1MDIgMTEuOTg1NTIzOSwzMiAxMS4yMDkzMzc4LDMyIEwxLjcwNzg2NDk1LDMyIEMwLjk0MDgwMjc5NiwzMiAwLjMxODk3NjA1OSwzMS4zNzcwOTE4IDAuMzE4OTc2MDU5LDMwLjYwODY5NTcgQzAuMzE4OTc2MDU5LDMwLjM4NDU5NDggMC4zNzMwMTU2MTgsMzAuMTYzODEgMC40NzY0OTcxMDYsMjkuOTY1MTI1NiBMNC42MzA2Mjc4NSwyMS45ODkxOTQ1IEM0Ljk4OTYxNzc2LDIxLjI5OTkzMzkgNS43MDEzMTEwMSwyMS4wMDAxMDYzIDYuNDc3Mzk0NjYsMjEgTDE4LjI3MTE5MjQsMjEgWiIgaWQ9InNoYXBlIiBmaWxsLW9wYWNpdHk9IjAuNSI+PC9wYXRoPgogICAgICAgICAgICA8cGF0aCBkPSJNMTEuMjA5MzM3OCwzMiBDMTEuOTg1NTIzOSwzMiAxMi42OTczNTIzLDMxLjU2Nzc1MDIgMTMuMDU2Mzg5NiwzMC44NzgzOTg2IEwxOC4yNzExOTI0LDIwLjg2NTk3NzMgTDIzLjk1NjQ1ODIsMjAuODY1MTk4MyBDMjQuNzMwOTU2MiwyMC44NjUwOTIyIDI1LjQ0MTU4NjcsMjEuMjk1Mzg0OCAyNS44MDE0ODQ2LDIxLjk4MjM3NjcgTDI5Ljk4MTkwMTUsMjkuOTYyMTc2OSBDMzAuMzM4MzQ0LDMwLjY0MjU3MzIgMzAuMDc2Njg1MiwzMS40ODM1OTk3IDI5LjM5NzQ3MDEsMzEuODQwNjYyMSBDMjkuMTk4MzgzOCwzMS45NDUzMjE1IDI4Ljk3NjkwOTMsMzIgMjguNzUyMDczOCwzMiBMMTEuMjA5MzM3OCwzMiBaIiBpZD0ic2hhcGUiIGZpbGwtb3BhY2l0eT0iMC4zIj48L3BhdGg+CiAgICAgICAgICAgIDxwYXRoIGQ9Ik0yOC4zNTk5OTksMS40OTU0Njg1IEMyOC44MjQ3MTg5LDAuNjAzMjA2NDIgMjkuNzMyNzIyOSwwLjAzMzk5NDI4OTEgMzAuNzMyMTg5LDAuMDAxNDcyMTgxMTUgQzMwLjcwNjEzNDIsMC4wMDA0OTI5NzU2OTEgMzAuNjc5OTk1LC0xLjIzNTI0NDE0ZS0xNCAzMC42NTM3ODIzLC0xLjIzNTcyNjVlLTE0IEwzMC45NDQ0NDQ0LC0xLjQyMTA4NTQ3ZS0xNCBMMzAuODIyNzM0NywtMS4yMzc1MTE4M2UtMTQgQzMwLjc5MjQ3NjMsLTEuMjMxNTg2OTNlLTE0IDMwLjc2MjI5MTEsMC4wMDA0OTI2NzI2MzUgMzAuNzMyMTg5LDAuMDAxNDcyMTgxMTUgQzMxLjQ3NzY0NDUsMC4wMjk0ODgzMzM1IDMyLjE1MzkyMTksMC40NTU1Mjk5NjQgMzIuNTAwODM0MSwxLjEyMTYwMTM4IEw0Ny41MjM1MDI5LDI5Ljk2NTEyNTYgQzQ3LjYyNjk4NDQsMzAuMTYzODEgNDcuNjgxMDIzOSwzMC4zODQ1OTQ4IDQ3LjY4MTAyMzksMzAuNjA4Njk1NyBDNDcuNjgxMDIzOSwzMS4zNzcwOTE4IDQ3LjA1OTE5NzIsMzIgNDYuMjkyMTM1MSwzMiBMMzYuNzkwNjYyMiwzMiBDMzYuMDE0NDc2MSwzMiAzNS4zMDI2NDc3LDMxLjU2Nzc1MDIgMzQuOTQzNjEwNCwzMC44NzgzOTg2IEwyNCw5Ljg2NjY2NjY3IEwyOC4zNTk5OTksMS40OTU0Njg1IFoiIGlkPSJzaGFwZSIgZmlsbC1vcGFjaXR5PSIwLjUiPjwvcGF0aD4KICAgICAgICA8L2c+CiAgICA8L2c+Cjwvc3ZnPg==";
    logoState10.src = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iODBweCIgaGVpZ2h0PSI4MHB4IiB2aWV3Qm94PSIwIDAgODAgODAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDUyLjEgKDY3MDQ4KSAtIGh0dHA6Ly93d3cuYm9oZW1pYW5jb2RpbmcuY29tL3NrZXRjaCAtLT4KICAgIDx0aXRsZT5BbGFuIEJ1dHRvbiAvIEFuaW1hdGlvbiAvIGJ1dHRvbi1sb2dvLXN0YXRlLTEwPC90aXRsZT4KICAgIDxkZXNjPkNyZWF0ZWQgd2l0aCBTa2V0Y2guPC9kZXNjPgogICAgPGcgaWQ9IkFsYW4tQnV0dG9uLS8tQW5pbWF0aW9uLS8tYnV0dG9uLWxvZ28tc3RhdGUtMTAiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPgogICAgICAgIDxnIGlkPSJsb2dvIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxNi4wMDAwMDAsIDIxLjAwMDAwMCkiIGZpbGw9IiNGRkZGRkYiPgogICAgICAgICAgICA8cGF0aCBkPSJNMTkuNjQwMDAxLDEuNDk1NDY4NSBMMjQsOS44NjY2NjY2NyBMMTguMjcxMTkyNCwyMSBMNi40NzczOTQ2NiwyMSBDNS43MDEzMTEwMSwyMS4wMDAxMDYzIDQuOTg5NjE3NzYsMjEuMjk5OTMzOSA0LjYzMDYyNzg1LDIxLjk4OTE5NDUgTDE1LjQ5OTE2NTksMS4xMjE2MDEzOCBDMTUuODQ2MDc4MSwwLjQ1NTUyOTk2NCAxNi41MjIzNTU1LDAuMDI5NDg4MzMzNSAxNy4yNjc4MTEsMC4wMDE0NzIxODExNSBDMTguMjY3Mjc3MSwwLjAzMzk5NDI4OTEgMTkuMTc1MjgxMSwwLjYwMzIwNjQyIDE5LjY0MDAwMSwxLjQ5NTQ2ODUgWiIgaWQ9InNoYXBlIiBmaWxsLW9wYWNpdHk9IjAuNSI+PC9wYXRoPgogICAgICAgICAgICA8cGF0aCBkPSJNMTEuMjA5MzM3OCwzMiBMMS43MDc4NjQ5NSwzMiBDMC45NDA4MDI3OTYsMzIgMC4zMTg5NzYwNTksMzEuMzc3MDkxOCAwLjMxODk3NjA1OSwzMC42MDg2OTU3IEMwLjMxODk3NjA1OSwzMC4zODQ1OTQ4IDAuMzczMDE1NjE4LDMwLjE2MzgxIDAuNDc2NDk3MTA2LDI5Ljk2NTEyNTYgTDQuNjMwNjI3ODUsMjEuOTg5MTk0NSBDNC45ODk2MTc3NiwyMS4yOTk5MzM5IDUuNzAxMzExMDEsMjEuMDAwMTA2MyA2LjQ3NzM5NDY2LDIxIEwxOC4yMDEzODg5LDIxIEwxOC4yNzExOTI0LDIwLjg2NTk3NzMgTDIzLjk1NjQ1ODIsMjAuODY1MTk4MyBDMjQuNzMwOTU2MiwyMC44NjUwOTIyIDI1LjQ0MTU4NjcsMjEuMjk1Mzg0OCAyNS44MDE0ODQ2LDIxLjk4MjM3NjcgTDI5Ljk4MTkwMTUsMjkuOTYyMTc2OSBDMzAuMzM4MzQ0LDMwLjY0MjU3MzIgMzAuMDc2Njg1MiwzMS40ODM1OTk3IDI5LjM5NzQ3MDEsMzEuODQwNjYyMSBDMjkuMTk4MzgzOCwzMS45NDUzMjE1IDI4Ljk3NjkwOTMsMzIgMjguNzUyMDczOCwzMiBMMTEuMjA5MzM3OCwzMiBaIiBpZD0ic2hhcGUtMiIgZmlsbC1vcGFjaXR5PSIwLjMiPjwvcGF0aD4KICAgICAgICAgICAgPHBhdGggZD0iTTI4LjM1OTk5OSwxLjQ5NTQ2ODUgQzI4LjgyNDcxODksMC42MDMyMDY0MiAyOS43MzI3MjI5LDAuMDMzOTk0Mjg5MSAzMC43MzIxODksMC4wMDE0NzIxODExNSBDMzAuNzA2MTM0MiwwLjAwMDQ5Mjk3NTY5MSAzMC42Nzk5OTUsLTEuMjM1MjQ0MTRlLTE0IDMwLjY1Mzc4MjMsLTEuMjM1NzI2NWUtMTQgTDMwLjk0NDQ0NDQsLTEuNDIxMDg1NDdlLTE0IEwzMC44MjI3MzQ3LC0xLjIzNzUxMTgzZS0xNCBDMzAuNzkyNDc2MywtMS4yMzE1ODY5M2UtMTQgMzAuNzYyMjkxMSwwLjAwMDQ5MjY3MjYzNSAzMC43MzIxODksMC4wMDE0NzIxODExNSBDMzEuNDc3NjQ0NSwwLjAyOTQ4ODMzMzUgMzIuMTUzOTIxOSwwLjQ1NTUyOTk2NCAzMi41MDA4MzQxLDEuMTIxNjAxMzggTDQ3LjUyMzUwMjksMjkuOTY1MTI1NiBDNDcuNjI2OTg0NCwzMC4xNjM4MSA0Ny42ODEwMjM5LDMwLjM4NDU5NDggNDcuNjgxMDIzOSwzMC42MDg2OTU3IEM0Ny42ODEwMjM5LDMxLjM3NzA5MTggNDcuMDU5MTk3MiwzMiA0Ni4yOTIxMzUxLDMyIEwzNi43OTA2NjIyLDMyIEMzNi4wMTQ0NzYxLDMyIDM1LjMwMjY0NzcsMzEuNTY3NzUwMiAzNC45NDM2MTA0LDMwLjg3ODM5ODYgTDI0LDkuODY2NjY2NjcgTDI4LjM1OTk5OSwxLjQ5NTQ2ODUgWiIgaWQ9InNoYXBlIiBmaWxsLW9wYWNpdHk9IjAuNSI+PC9wYXRoPgogICAgICAgICAgICA8cGF0aCBkPSJNMzAuNjUzNzgyMywtMS4yMzU3MjY1ZS0xNCBDMzAuNjc5OTk1LC0xLjIzNTI0NDE0ZS0xNCAzMC43MDYxMzQyLDAuMDAwNDkyOTc1NjkxIDMwLjczMjE4OSwwLjAwMTQ3MjE4MTE1IEMyOS43MzI3MjI5LDAuMDMzOTk0Mjg5MSAyOC44MjQ3MTg5LDAuNjAzMjA2NDIgMjguMzU5OTk5LDEuNDk1NDY4NSBMMjQsOS44NjY2NjY2NyBMMTkuNjQwMDAxLDEuNDk1NDY4NSBDMTkuMTYxMjg0NiwwLjU3NjMzMzA2IDE4LjIxMjE4LC0xLjIxNzg4MzgzZS0xNCAxNy4xNzcyNjUzLC0xLjQyMTA4NTQ3ZS0xNCBMMzAuNjUzNzgyMywtMS4yMzU3MjY1ZS0xNCBaIiBpZD0ic2hhcGUiIGZpbGwtb3BhY2l0eT0iMC45Ij48L3BhdGg+CiAgICAgICAgPC9nPgogICAgPC9nPgo8L3N2Zz4=";

    setUpStylesForLogoParts([
        logoState1,
        logoState2,
        logoState3,
        logoState4,
        logoState5,
        logoState6,
        logoState7,
        logoState8,
        logoState9,
        logoState10,
    ]);

    // Define base styles for triangle bellow the microphone btn
    micTriangleIcon.style.minHeight = '100%';
    micTriangleIcon.style.height = '100%';
    micTriangleIcon.style.maxHeight = '100%';
    micTriangleIcon.style.minWidth = '100%';
    micTriangleIcon.style.width = '100%';
    micTriangleIcon.style.maxWidth = '100%';
    micTriangleIcon.style.top = '0%';
    micTriangleIcon.style.left = '0%';
    micTriangleIcon.style.zIndex = btnIconsZIndex;
    micTriangleIcon.style.position = 'absolute';
    micTriangleIcon.style.opacity = 0;
    micTriangleIcon.style.transition = 'all 0.4s ease-in-out';
    micTriangleIcon.style.overflow = 'hidden';
    micTriangleIcon.style.borderRadius = '50%';
    micTriangleIcon.style.backgroundSize = '100% 100%';
    micTriangleIcon.style.backgroundPosition = 'center center';
    micTriangleIcon.style.backgroundRepeat = 'no-repeat';
    micTriangleIcon.classList.add('triangleMicIconBg');
    micTriangleIcon.classList.add('triangleMicIconBg-default');

    micCircleIcon.style.minHeight = '100%';
    micCircleIcon.style.height = '100%';
    micCircleIcon.style.maxHeight = '100%';
    micCircleIcon.style.minWidth = '100%';
    micCircleIcon.style.width = '100%';
    micCircleIcon.style.maxWidth = '100%';
    micCircleIcon.style.top = '0%';
    micCircleIcon.style.left = '0%';
    micCircleIcon.style.zIndex = btnIconsZIndex;
    micCircleIcon.style.position = 'absolute';
    micCircleIcon.style.opacity = 0;
    micCircleIcon.style.transition = 'all 0.4s ease-in-out';
    micCircleIcon.style.overflow = 'hidden';
    micCircleIcon.style.borderRadius = '50%';
    micCircleIcon.style.backgroundSize = '0% 0%';
    micCircleIcon.style.backgroundPosition = 'center center';
    micCircleIcon.style.backgroundRepeat = 'no-repeat';
    micCircleIcon.classList.add('circleMicIconBg');

    // Define base styles for loader mic icon in disconnected state
    disconnectedMicLoaderIcon.style.minHeight = '100%';
    disconnectedMicLoaderIcon.style.height = '100%';
    disconnectedMicLoaderIcon.style.maxHeight = '100%';
    disconnectedMicLoaderIcon.style.top = '0%';
    disconnectedMicLoaderIcon.style.left = '0%';
    disconnectedMicLoaderIcon.style.zIndex = btnIconsZIndex;
    disconnectedMicLoaderIcon.style.position = 'absolute';
    disconnectedMicLoaderIcon.style.transition = 'all 0.4s ease-in-out';
    disconnectedMicLoaderIcon.style.opacity = '0';
    disconnectedMicLoaderIcon.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiB2aWV3Qm94PSIwIDAgMTkyIDE5MiI+CiAgICA8ZyBmaWxsPSIjRkZGIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPgogICAgICAgIDxwYXRoIGZpbGwtcnVsZT0ibm9uemVybyIgZD0iTTk2IDBjNTMuMDIgMCA5NiA0Mi45OCA5NiA5NnMtNDIuOTggOTYtOTYgOTZTMCAxNDkuMDIgMCA5NiA0Mi45OCAwIDk2IDB6IiBvcGFjaXR5PSIuMDIiLz4KICAgICAgICA8cGF0aCBkPSJNMTMxLjk2NiAxOS4wOTJjLTMwLTE0LTY1LjI4NC05Ljg0OS05MS4xNDIgMTIuNTc1QzE0Ljk2NiA1NC4wOTIgNi44NSA4My44MSAxMi45MDggMTEzLjk1YzYuMDU4IDMwLjE0MiAzMC4zMDIgNTYuMTkgNjAuMDU4IDY0LjE0MiAzNS4xODMgOS40MDYgNzMtNCA5My0zNC0xNy45MjQgMjMuOTE2LTUyLjM2NiAzOC4yOTMtODMgMzMtMzAuMTY4LTUuMjEtNTcuMTA0LTMxLjExLTY0LTYxLTcuMzQ3LTMxLjgzNS43NzktNTYgMjctODBzODAtMjYgMTA5IDljNS41MzYgNi42ODEgMTMgMTkgMTUgMzQgMSA2IDEgNyAyIDEyIDAgMiAyIDQgNCA0IDMgMCA1LjM3NC0yLjI1NiA1LTYtMy0zMC0yMS41NTYtNTcuMTkzLTQ5LTcweiIgb3BhY2l0eT0iLjQiLz4KICAgIDwvZz4KPC9zdmc+Cg==";
    disconnectedMicLoaderIcon.style.animation = disconnectedLoaderAnimation;

    // Define base styles for mic icon in low valume state
    lowVolumeMicIcon.style.minHeight = '100%';
    lowVolumeMicIcon.style.height = '100%';
    lowVolumeMicIcon.style.maxHeight = '100%';
    lowVolumeMicIcon.style.top = '0%';
    lowVolumeMicIcon.style.left = '0%';
    lowVolumeMicIcon.style.zIndex = btnIconsZIndex;
    lowVolumeMicIcon.style.position = 'absolute';
    lowVolumeMicIcon.style.transition = 'all 0.4s ease-in-out';
    lowVolumeMicIcon.style.opacity = '0';
    lowVolumeMicIcon.src = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iODBweCIgaGVpZ2h0PSI4MHB4IiB2aWV3Qm94PSIwIDAgODAgODAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDUyLjEgKDY3MDQ4KSAtIGh0dHA6Ly93d3cuYm9oZW1pYW5jb2RpbmcuY29tL3NrZXRjaCAtLT4KICAgIDx0aXRsZT5BbGFuIEJ1dHRvbiAvIEFuaW1hdGlvbiAvIGJ1dHRvbi1uby1taWM8L3RpdGxlPgogICAgPGRlc2M+Q3JlYXRlZCB3aXRoIFNrZXRjaC48L2Rlc2M+CiAgICA8ZyBpZD0iQWxhbi1CdXR0b24tLy1BbmltYXRpb24tLy1idXR0b24tbm8tbWljIiBzdHJva2U9Im5vbmUiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj4KICAgICAgICA8ZyBpZD0iaWNvbiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjIuMDAwMDAwLCAxOS4wMDAwMDApIiBmaWxsPSIjRkZGRkZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iPgogICAgICAgICAgICA8cGF0aCBkPSJNMzIsMTguNDczNjg0MiBDMzIsMjUuNzE5NDczNyAyNi43OCwzMS42OTI2MzE2IDIwLDMyLjY5ODQyMTEgTDIwLDQwIEMyMCw0MS4xMDQ1Njk1IDE5LjEwNDU2OTUsNDIgMTgsNDIgQzE2Ljg5NTQzMDUsNDIgMTYsNDEuMTA0NTY5NSAxNiw0MCBMMTYsMzIuNjk4NDIxMSBDOS4yMiwzMS42OTI2MzE2IDQsMjUuNzE5NDczNyA0LDE4LjQ3MzY4NDIgTDQsMTggQzQsMTYuODk1NDMwNSA0Ljg5NTQzMDUsMTYgNiwxNiBDNy4xMDQ1Njk1LDE2IDgsMTYuODk1NDMwNSA4LDE4IEw4LDE4LjQ3MzY4NDIgQzgsMjQuMTQxODY5OCAxMi40NzcxNTI1LDI4LjczNjg0MjEgMTgsMjguNzM2ODQyMSBDMjMuNTIyODQ3NSwyOC43MzY4NDIxIDI4LDI0LjE0MTg2OTggMjgsMTguNDczNjg0MiBMMjgsMTggQzI4LDE2Ljg5NTQzMDUgMjguODk1NDMwNSwxNiAzMCwxNiBDMzEuMTA0NTY5NSwxNiAzMiwxNi44OTU0MzA1IDMyLDE4IEwzMiwxOC40NzM2ODQyIFoiIGlkPSJTaGFwZSIgZmlsbC1vcGFjaXR5PSIwLjgiPjwvcGF0aD4KICAgICAgICAgICAgPHBhdGggZD0iTTE4LC00LjUyNzM3MjYzZS0xNCBDMjEuMzEzNzA4NSwtNC42MTg1Mjc3OGUtMTQgMjQsMi43NTY5ODMzOCAyNCw2LjE1Nzg5NDc0IEwyNCwxOC40NzM2ODQyIEMyNCwyMS44NzQ1OTU2IDIxLjMxMzcwODUsMjQuNjMxNTc4OSAxOCwyNC42MzE1Nzg5IEMxNC42ODYyOTE1LDI0LjYzMTU3ODkgMTIsMjEuODc0NTk1NiAxMiwxOC40NzM2ODQyIEwxMiw2LjE1Nzg5NDc0IEMxMiwyLjc1Njk4MzM4IDE0LjY4NjI5MTUsLTQuNTI3MzcyNjNlLTE0IDE4LC00LjYxODUyNzc4ZS0xNCBaIiBpZD0iU2hhcGUiIGZpbGwtb3BhY2l0eT0iMC42Ij48L3BhdGg+CiAgICAgICAgICAgIDxwYXRoIGQ9Ik0zLjgxLDMuMjcgTDM0LjczLDM0LjE5IEMzNS40MzE0MDE2LDM0Ljg5MTQwMTYgMzUuNDMxNDAxNiwzNi4wMjg1OTg0IDM0LjczLDM2LjczIEMzNC4wMjg1OTg0LDM3LjQzMTQwMTYgMzIuODkxNDAxNiwzNy40MzE0MDE2IDMyLjE5LDM2LjczIEwxLjI3LDUuODEgQzAuNTY4NTk4MzY4LDUuMTA4NTk4MzcgMC41Njg1OTgzNjgsMy45NzE0MDE2MyAxLjI3LDMuMjcgQzEuOTcxNDAxNjMsMi41Njg1OTgzNyAzLjEwODU5ODM3LDIuNTY4NTk4MzcgMy44MSwzLjI3IFoiIGlkPSJQYXRoIj48L3BhdGg+CiAgICAgICAgPC9nPgogICAgPC9nPgo8L3N2Zz4=\n";

    // Define base st`yles for ovals
    var ovalCoefficient = 2;
    var defaultBtnColorOptions = {
        "idle": {
            "background": {
                "color": [
                    'rgb(34, 203, 255)',
                    'rgb(25, 149, 255)'
                ]
            },
            "hover": {
                "color": [
                    'rgba(0, 70, 255, 0.95)',
                    'rgba(0, 156,  255, 0.95)'
                ]
            }
        },
        "listen": {
            "background": {
                "color": [
                    'rgba(0, 70, 255, 0.95)',
                    'rgba(0, 156,  255, 0.95)'
                ]
            },
            "hover": {
                "color": ['rgba(0, 70, 255, 0.95)',
                    'rgb(0, 70, 255)']
            },
        },
        "process": {
            "background": {
                "color": [
                    'rgba(0, 255, 205, 0.95)',
                    'rgba(0, 115, 255, 0.95)'
                ]

            },
            "hover": {
                "color": [
                    'rgb(0, 115, 255)',
                    'rgba(0, 115, 255, 0.95)'
                ]
            }
        },

        "reply": {
            "background": {
                "color": [
                    'rgba(122, 40, 255, 0.95)',
                    'rgba(61, 122, 255, 0.95)'
                ]
            },
            "hover": {
                "color": [
                    'rgba(122, 40, 255, 0.95)',
                    'rgb(122, 40, 255)'
                ]
            },
        }
    };
    btnOval1.style.minHeight = btnSize / ovalCoefficient + 'px';
    btnOval1.style.height = btnSize / ovalCoefficient + 'px';
    btnOval1.style.maxHeight = btnSize / ovalCoefficient + 'px';
    btnOval1.style.minWidth = btnSize + 'px';
    btnOval1.style.width = btnSize + 'px';
    btnOval1.style.maxWidth = btnSize + 'px';
    btnOval1.style.top = 'calc(100%/2 - ' + btnSize / ovalCoefficient / 2 + 'px)';
    btnOval1.style.left = 0;
    btnOval1.style.zIndex = btnBgLayerZIndex;
    btnOval1.style.position = 'absolute';
    btnOval1.style.transition = 'all 0.4s ease-in-out';
    btnOval1.style.opacity = '.5';
    btnOval1.style.borderRadius = '100px';
    btnOval1.style.transform = 'rotate(-315deg)';
    btnOval1.style.filter = 'blur(' + btnSize / 10 + 'px)';
    btnOval1.style.animation = oval1Animation;
    btnOval1.style.animationPlayState = 'paused';
    btnOval1.classList.add('alanBtn-oval-bg-default');


    btnOval2.style.minHeight = btnSize / ovalCoefficient + 'px';
    btnOval2.style.height = btnSize / ovalCoefficient + 'px';
    btnOval2.style.maxHeight = btnSize / ovalCoefficient + 'px';
    btnOval2.style.minWidth = btnSize + 'px';
    btnOval2.style.width = btnSize + 'px';
    btnOval2.style.maxWidth = btnSize + 'px';
    btnOval2.style.top = 'calc(100%/2 - ' + btnSize / ovalCoefficient / 2 + 'px)';
    btnOval2.style.left = 0;
    btnOval2.style.zIndex = btnBgLayerZIndex;
    btnOval2.style.position = 'absolute';
    btnOval2.style.transition = 'all 0.4s ease-in-out';
    btnOval2.style.opacity = '.5';
    btnOval2.style.borderRadius = '100px';
    btnOval2.style.transform = 'rotate(-45deg)';
    btnOval2.style.filter = 'blur(' + btnSize / 10 + 'px)';
    btnOval2.style.animation = oval2Animation;
    btnOval2.style.animationPlayState = 'paused';
    btnOval2.classList.add('alanBtn-oval-bg-default');

    // Define base styles for mic icon in offline state
    offlineIcon.style.minHeight = '100%';
    offlineIcon.style.height = '100%';
    offlineIcon.style.maxHeight = '100%';
    offlineIcon.style.top = '0%';
    offlineIcon.style.left = '0%';
    offlineIcon.style.zIndex = btnIconsZIndex;
    offlineIcon.style.position = 'absolute';
    offlineIcon.style.transition = 'all 0.4s ease-in-out';
    offlineIcon.style.opacity = '0';
    offlineIcon.src = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iODBweCIgaGVpZ2h0PSI4MHB4IiB2aWV3Qm94PSIwIDAgODAgODAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDUyLjEgKDY3MDQ4KSAtIGh0dHA6Ly93d3cuYm9oZW1pYW5jb2RpbmcuY29tL3NrZXRjaCAtLT4KICAgIDx0aXRsZT5BbGFuIEJ1dHRvbiAvIEFuaW1hdGlvbiAvIGJ1dHRvbi1uby1uZXR3b3JrPC90aXRsZT4KICAgIDxkZXNjPkNyZWF0ZWQgd2l0aCBTa2V0Y2guPC9kZXNjPgogICAgPGcgaWQ9IkFsYW4tQnV0dG9uLS8tQW5pbWF0aW9uLS8tYnV0dG9uLW5vLW5ldHdvcmsiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPgogICAgICAgIDxnIGlkPSJpY29uIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyMS4wMDAwMDAsIDIyLjAwMDAwMCkiIGZpbGw9IiNGRkZGRkYiPgogICAgICAgICAgICA8cGF0aCBkPSJNMzMsMiBDMzQuNjU2ODU0MiwyIDM2LDMuMzQzMTQ1NzUgMzYsNSBMMzYsMjkgQzM2LDMwLjY1Njg1NDIgMzQuNjU2ODU0MiwzMiAzMywzMiBDMzEuMzQzMTQ1OCwzMiAzMCwzMC42NTY4NTQyIDMwLDI5IEwzMCw1IEMzMCwzLjM0MzE0NTc1IDMxLjM0MzE0NTgsMiAzMywyIFoiIGlkPSJTaGFwZSIgZmlsbC1vcGFjaXR5PSIwLjQiPjwvcGF0aD4KICAgICAgICAgICAgPHBhdGggZD0iTTIzLDggQzI0LjY1Njg1NDIsOCAyNiw5LjM0MzE0NTc1IDI2LDExIEwyNiwyOSBDMjYsMzAuNjU2ODU0MiAyNC42NTY4NTQyLDMyIDIzLDMyIEMyMS4zNDMxNDU4LDMyIDIwLDMwLjY1Njg1NDIgMjAsMjkgTDIwLDExIEMyMCw5LjM0MzE0NTc1IDIxLjM0MzE0NTgsOCAyMyw4IFoiIGlkPSJTaGFwZSIgZmlsbC1vcGFjaXR5PSIwLjYiPjwvcGF0aD4KICAgICAgICAgICAgPHBhdGggZD0iTTEzLDE2IEMxNC42NTY4NTQyLDE2IDE2LDE3LjM0MzE0NTggMTYsMTkgTDE2LDI5IEMxNiwzMC42NTY4NTQyIDE0LjY1Njg1NDIsMzIgMTMsMzIgQzExLjM0MzE0NTgsMzIgMTAsMzAuNjU2ODU0MiAxMCwyOSBMMTAsMTkgQzEwLDE3LjM0MzE0NTggMTEuMzQzMTQ1OCwxNiAxMywxNiBaIiBpZD0iU2hhcGUiIGZpbGwtb3BhY2l0eT0iMC44Ij48L3BhdGg+CiAgICAgICAgICAgIDxwYXRoIGQ9Ik0zLDIyIEM0LjY1Njg1NDI1LDIyIDYsMjMuMzQzMTQ1OCA2LDI1IEw2LDI5IEM2LDMwLjY1Njg1NDIgNC42NTY4NTQyNSwzMiAzLDMyIEMxLjM0MzE0NTc1LDMyIDIuMDI5MDYxMjVlLTE2LDMwLjY1Njg1NDIgMCwyOSBMMCwyNSBDLTIuMDI5MDYxMjVlLTE2LDIzLjM0MzE0NTggMS4zNDMxNDU3NSwyMiAzLDIyIFoiIGlkPSJTaGFwZSI+PC9wYXRoPgogICAgICAgICAgICA8cGF0aCBkPSJNNS44MSwxLjI3IEwzNi43MywzMi4xOSBDMzcuNDMxNDAxNiwzMi44OTE0MDE2IDM3LjQzMTQwMTYsMzQuMDI4NTk4NCAzNi43MywzNC43MyBDMzYuMDI4NTk4NCwzNS40MzE0MDE2IDM0Ljg5MTQwMTYsMzUuNDMxNDAxNiAzNC4xOSwzNC43MyBMMy4yNywzLjgxIEMyLjU2ODU5ODM3LDMuMTA4NTk4MzcgMi41Njg1OTgzNywxLjk3MTQwMTYzIDMuMjcsMS4yNyBDMy45NzE0MDE2MywwLjU2ODU5ODM2OCA1LjEwODU5ODM3LDAuNTY4NTk4MzY4IDUuODEsMS4yNyBaIiBpZD0iUGF0aCIgZmlsbC1ydWxlPSJub256ZXJvIj48L3BhdGg+CiAgICAgICAgPC9nPgogICAgPC9nPgo8L3N2Zz4=\n";

    btnBgDefault.classList.add('alanBtn-bg-default');
    btnBgListening.classList.add('alanBtn-bg-listening');
    btnBgSpeaking.classList.add('alanBtn-bg-speaking');
    btnBgIntermediate.classList.add('alanBtn-bg-intermediate');
    btnBgUnderstood.classList.add('alanBtn-bg-understood');

    applyBgStyles(btnBgDefault);
    applyBgStyles(btnBgListening);
    applyBgStyles(btnBgSpeaking);
    applyBgStyles(btnBgIntermediate);
    applyBgStyles(btnBgUnderstood);

    var onOpacity = 1;
    var offOpacity = 0;


    btnBgDefault.style.opacity = onOpacity;

    var allIcons = [
        micCircleIcon,
        micTriangleIcon,
        micIcon,
        offlineIcon,
        lowVolumeMicIcon,
        logoState1,
        logoState2,
        logoState3,
        logoState4,
        logoState5,
        logoState6,
        logoState7,
        logoState8,
        logoState9,
        logoState10,
    ];

    for (var i = 0; i < allIcons.length; i++) {
        allIcons[i].setAttribute('draggable', 'false');
    }

    hideLayers([
        btnBgListening,
        btnBgSpeaking,
        btnBgIntermediate,
        btnBgUnderstood,
    ]);

    btn.appendChild(btnOval1);
    btn.appendChild(btnOval2);
    btn.appendChild(btnBgDefault);
    btn.appendChild(btnBgListening);
    btn.appendChild(btnBgSpeaking);
    btn.appendChild(btnBgIntermediate);
    btn.appendChild(btnBgUnderstood);
    btn.appendChild(micIcon);
    btn.appendChild(micTriangleIcon);
    btn.appendChild(micCircleIcon);
    btn.appendChild(disconnectedMicLoaderIcon);
    btn.appendChild(lowVolumeMicIcon);
    btn.appendChild(offlineIcon);
    btn.classList.add("alanBtn");

    //#endregion

    //#region Add needed styles to the page
    createAlanStyleSheet();

    function getStyleSheetMarker(andFlag) {
        return '.alan-' + getProjectId() + (andFlag ? '' : ' ');
    }

    function createAlanStyleSheet(btnOptions) {
        var style;
        var keyFrames = '';
        var projectId = getProjectId();

        var existingStyleSheet;

        if (options.shadowDOM) {
            existingStyleSheet = options.shadowDOM.getElementById('alan-stylesheet-' + projectId);
        } else {
            existingStyleSheet = document.getElementById('alan-stylesheet-' + projectId);
        }

        if (existingStyleSheet) {
            existingStyleSheet.disabled = true;
            existingStyleSheet.parentNode.removeChild(existingStyleSheet);
        }

        style = document.createElement('style');
        style.setAttribute('id', 'alan-stylesheet-' + projectId);
        style.type = 'text/css';

        keyFrames += '.alanBtn-root * {  box-sizing: border-box; font-family: \'Lato\', sans-serif; }';

        keyFrames += getStyleSheetMarker() + '.alanBtn{transform: scale(1);transition:all 0.4s ease-in-out;}.alanBtn:hover{transform: scale(1.11111);transition:all 0.4s ease-in-out;}.alanBtn:focus {transform: scale(1);transition:all 0.4s ease-in-out;  border: solid 3px #50e3c2;  outline: none;  }';

        keyFrames += getStyleSheetMarker() + '.alanBtn-text-holder {overflow:hidden;font-family: \'Lato\', sans-serif; font-size: 20px;line-height: 1.2;   max-width: 0px;  min-height: 40px;  color: #000; position: absolute; text-align: center; font-weight: normal; background-color: rgba(245, 252, 252, 0.8);border-radius:32px 0 0 32px; display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:horizontal;-webkit-box-direction:normal;-ms-flex-direction:row;flex-direction:row;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack: activate;-ms-flex-pack: start;justify-content: start; background-image: url(' + panelOvalImg + ');background-position: -190px -70px; }';
        keyFrames += getStyleSheetMarker() + '.alanBtn-text-holder-text-wrapper {padding: 12px 8px; text-align: right; width: 100%;min-width:440px;font-size: 20px!important;line-height: 1.2!important;  animation: alan-text-fade-in .4s ease-in-out forwards;}';

        keyFrames += getStyleSheetMarker() + '.alanBtn-hint-holder {position:relative;font-style: italic; overflow:hidden;font-family: \'Lato\', sans-serif;   width: 0px;  min-width: 0px;  max-width: 0px;  min-height: 40px;  color: #000; position: absolute; font-weight: normal;  background-color: rgba(245, 252, 252, 0.8); display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:horizontal;-webkit-box-direction:normal;-ms-flex-direction:row;flex-direction:row;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack: center;-ms-flex-pack: center;justify-content: center;border-radius:32px 0 0 32px;  background-image: url(' + panelOvalImg + ');background-position: -190px -70px; }';

        keyFrames += getStyleSheetMarker() + '.alanBtn-hint-holder-close {position: absolute;top: 1px;right: ' + (hintCloserRightPos - 10) + 'px;color: #0079e8;font-size: 13px;font-style: normal;font-weight: 500;line-height: 1.54;opacity: 0;transition: opacity 300ms ease-in-out;}';

        keyFrames += getStyleSheetMarker() + '.alanBtn-hint-holder-close:hover {color: #ff8800;cursor:pointer;}';

        keyFrames += getStyleSheetMarker() + '.alanBtn-hint-holder-close:active {color: #ff6426;}';

        keyFrames += getStyleSheetMarker() + '.alanBtn-text-holder:hover .alanBtn-hint-holder-close {opacity: 1;transition: opacity 300ms ease-in-out;}';

        keyFrames += getStyleSheetMarker() + '.alanBtn-hint-holder-wrapper {width: 100%;height:100%;min-width:440px; display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:horizontal;-webkit-box-direction:normal;-ms-flex-direction:row;flex-direction:row;-webkit-box-align:center;-ms-flex-align:center;align-items:center;justify-content: start;text-align:left;}';

        keyFrames += getStyleSheetMarker() + '.alanBtn-hint-holder-wrapper .alanBtn-hint-list {padding-top:2px;font-size: 18px;line-height: 1.22; margin-top:0px;font-style:italic;margin-bottom:0px;display:inline-block;vertical-align:middle;width:220px;max-width:220px;min-width:220px;text-align:left;animation: alan-text-fade-in .4s ease-in-out forwards; }';

        keyFrames += getStyleSheetMarker() + '.alanBtn-hint-holder-wrapper .alanBtn-hint-list.hints-long {font-size: 16px;line-height: 1.38;}';

        keyFrames += getStyleSheetMarker() + '.alanBtn-hint-holder-wrapper .alanBtn-hint-list.hints-super-long {font-size: 14px;line-height: 1.36;}';

        keyFrames += getStyleSheetMarker() + '.alanBtn-hint-holder-wrapper .alanBtn-hint-list div {margin-bottom:6px; }';

        keyFrames += getStyleSheetMarker() + '.alanBtn-hint-header {white-space:nowrap;font-size: 14px;font-weight: 400;font-style: italic;font-stretch: normal;line-height: 1.36;letter-spacing: normal;color: rgba(0, 0, 0, 0.6);display:inline-block;vertical-align:middle;padding-right:12px;padding-left:12px;min-width:112px;text-align:center;animation: alan-text-fade-in .4s ease-in-out forwards;}';

        keyFrames += getStyleSheetMarker() + '.alanBtn-text-holder-long .alanBtn-text-holder-text-wrapper { font-size: 19px!important;line-height: 1.4!important;}  ';
        keyFrames += getStyleSheetMarker() + '.alanBtn-text-holder-super-long .alanBtn-text-holder-text-wrapper { font-size: 14px!important;line-height: 1.4!important;}  ';
        keyFrames += getStyleSheetMarker() + '.alanBtn-text-appearing {  animation: text-holder-appear 800ms ease-in-out forwards;  }';
        keyFrames += getStyleSheetMarker() + '.alanBtn-text-disappearing {  animation: text-holder-disappear 800ms ease-in-out forwards;    }';

        keyFrames += getStyleSheetMarker() + '.alanBtn-hint-appearing {  animation: hint-holder-appear 800ms ease-in-out forwards;    }';
        keyFrames += getStyleSheetMarker() + '.alanBtn-hint-disappearing {  animation: hint-holder-disappear 800ms ease-in-out forwards;    }';

        keyFrames += getStyleSheetMarker() + '.alan-btn-disabled {  pointer-events: none;  opacity: .5;  transition: all .2s ease-in-out;  }';
        keyFrames += getStyleSheetMarker() + '.shadow-appear {  opacity: 1 !important;  }\n';
        keyFrames += getStyleSheetMarker() + '.shadow-disappear {  opacity: 0 !important;  transition: all .1s linear !important;  }';

        keyFrames += getStyleSheetMarker(true) + '.alan-btn-offline .alanBtn-bg-default {  background-image: linear-gradient(122deg,rgb(78,98,126),rgb(91,116,145));}';

        keyFrames += getStyleSheetMarker(true) + '.alan-btn-permission-denied .alanBtn .alanBtn-bg-default {  background-image: linear-gradient(122deg,rgb(78,98,126),rgb(91,116,145));}';

        keyFrames += getStyleSheetMarker() + '.alan-btn-low-volume canvas {  opacity: .0 !important;  }';

        keyFrames += getStyleSheetMarker() + ".alan-btn-disabled-msg:after {content: '';  position: absolute;  bottom: 2px;  right: 0px;  height: 30px;  width: 90px;  background-size: 100% auto;  background-repeat: no-repeat;  background-position: center center;}";


        keyFrames += getStyleSheetMarker() + '.triangleMicIconBg {background-image:url(' + micTriangleIconImg + ');}';
        keyFrames += getStyleSheetMarker() + '.circleMicIconBg {background-image:url(' + micCircleIconImg + ');}';
        keyFrames += getStyleSheetMarker() + ':hover .triangleMicIconBg-default {opacity:0!important;}';


        keyFrames += getStyleSheetMarker() + generateKeyFrame('alan-gradient', '0%{backgroundPosition: 0 0;}50%{backgroundPosition: -100% 0;}100%{backgroundPosition: 0 0;}');
        keyFrames += getStyleSheetMarker() + generateKeyFrame('alan-pulsating', '0%{transform: scale(1.11111);}50%{transform: scale(1.0);}100%{transform: scale(1.11111);}');
        keyFrames += getStyleSheetMarker() + generateKeyFrame('alan-mic-pulsating', '0%{transform: scale(0.91);}50%{transform: scale(1.0);}100%{transform: scale(0.91);}');
        keyFrames += getStyleSheetMarker() + generateKeyFrame('alan-triangle-mic-pulsating', '0%{transform: scale(0.94);}50%{transform: scale(1.0);}100%{transform: scale(0.94);}');
        keyFrames += getStyleSheetMarker() + generateKeyFrame('alan-fade-in', '0%{opacity: 0;}100%{opacity:1;}');
        keyFrames += getStyleSheetMarker() + generateKeyFrame('alan-fade-out', '0%{opacity: 1;}100%{opacity:0;}');

        keyFrames += getStyleSheetMarker() + generateKeyFrame('text-holder-appear',
            '0%{' +
            'color:transparent; ' +
            'background-image: none;' +
            ' background-color:rgba(245, 252, 252, 0.0);' +
            'border: solid 1px transparent; ' +
            'max-width: 0px;' +
            'min-width: 0px;' +
            'width: 0px;' +
            'right: ' + (btnSize / 2 + rightBtnPos) + 'px;' +
            '}' +
            '100%{' +
            'color:#000;' +
            'background-color:rgba(245, 252, 252, 0.8);' +
            'background-image: url(' + panelOvalImg + ');' +
            ' max-width: ' + textHolderWidth + 'px;' +
            'width:' + textHolderWidth + 'px;' +
            'min-width:' + textHolderWidth + 'px;' +
            'right: ' + rightBtnPos + 'px;' +
            '}');

        keyFrames += getStyleSheetMarker() + generateKeyFrame('text-holder-disappear',
            '0%{' +
            'color:#000;' +
            'background-image: url(' + panelOvalImg + ');' +
            'background-color:rgba(245, 252, 252, 0.8);  ' +
            'max-width: ' + textHolderWidth + 'px;' +
            'right: ' + rightBtnPos + 'px;' +
            '}' +
            '100%{' +
            'color:transparent;' +
            'background-color:rgba(245, 252, 252, 0.0);' +
            'max-width: 0px;' +
            'border: solid 1px transparent;' +
            'background-image:none;' +
            'right: ' + (btnSize / 2 + rightBtnPos) + 'px;' +
            '}');

        keyFrames += getStyleSheetMarker() + generateKeyFrame('hint-holder-appear', '0%{ width: 0px;min-width: 0px;max-width: 0px;border: solid 1px transparent;}100%{border: solid 1px #d5e2ed;width: ' + hintHolderWidth + 'px;min-width: ' + hintHolderWidth + 'px;max-width: ' + hintHolderWidth + 'px;}');
        keyFrames += getStyleSheetMarker() + generateKeyFrame('hint-holder-disappear', '0%{border: solid 1px #d5e2ed; width: ' + hintHolderWidth + 'px;min-width: ' + hintHolderWidth + 'px;max-width: ' + hintHolderWidth + 'px;}100%{width: 0px;min-width: 0px;max-width: 0px;border: solid 1px transparent;}');

        keyFrames += getStyleSheetMarker() + generateKeyFrame('logo-state-1-animation',
            '0% {  opacity: 1;  } ' +
            '10% {  opacity: 0;  } ' +
            '20% {  opacity: 0;  } ' +
            '30% {  opacity: 0;  } ' +
            '40% {  opacity: 0;  } ' +
            '50% {  opacity: 0;  } ' +
            '60% {  opacity: 0;  } ' +
            '70% {  opacity: 0;  } ' +
            '80% {  opacity: 0;  } ' +
            '90% {  opacity: 0;  } ' +
            '100% {  opacity: 1;  }');

        keyFrames += getStyleSheetMarker() + generateKeyFrame('logo-state-2-animation',
            '0% {  opacity: 0;  } ' +
            '10% {  opacity: 1;  } ' +
            '20% {  opacity: 0;  } ' +
            '30% {  opacity: 0;  } ' +
            '40% {  opacity: 0;  } ' +
            '50% {  opacity: 0;  } ' +
            '60% {  opacity: 0;  } ' +
            '70% {  opacity: 0;  } ' +
            '80% {  opacity: 0;  } ' +
            '90% {  opacity: 0;  } ' +
            '100% {  opacity: 0;  }');

        keyFrames += getStyleSheetMarker() + generateKeyFrame('logo-state-3-animation',
            '0% {  opacity: 0;  } ' +
            '10% {  opacity: 0;  } ' +
            '20% {  opacity: 1;  } ' +
            '30% {  opacity: 0;  } ' +
            '40% {  opacity: 0;  } ' +
            '50% {  opacity: 0;  } ' +
            '60% {  opacity: 0;  } ' +
            '70% {  opacity: 0;  } ' +
            '80% {  opacity: 0;  } ' +
            '90% {  opacity: 0;  } ' +
            '100% {  opacity: 0;  }');

        keyFrames += getStyleSheetMarker() + generateKeyFrame('logo-state-4-animation',
            '0% {  opacity: 0;  } ' +
            '10% {  opacity: 0;  } ' +
            '20% {  opacity: 0;  } ' +
            '30% {  opacity: 1;  } ' +
            '40% {  opacity: 0;  } ' +
            '50% {  opacity: 0;  } ' +
            '60% {  opacity: 0;  } ' +
            '70% {  opacity: 0;  } ' +
            '80% {  opacity: 0;  } ' +
            '90% {  opacity: 0;  } ' +
            '100% {  opacity: 0;  }');

        keyFrames += getStyleSheetMarker() + generateKeyFrame('logo-state-5-animation',
            '0% {  opacity: 0;  } ' +
            '10% {  opacity: 0;  } ' +
            '20% {  opacity: 0;  } ' +
            '30% {  opacity: 0;  } ' +
            '40% {  opacity: 1;  } ' +
            '50% {  opacity: 0;  } ' +
            '60% {  opacity: 0;  } ' +
            '70% {  opacity: 0;  } ' +
            '80% {  opacity: 0;  } ' +
            '90% {  opacity: 0;  } ' +
            '100% {  opacity: 0;  }');

        keyFrames += getStyleSheetMarker() + generateKeyFrame('logo-state-6-animation',
            '0% {  opacity: 0;  } ' +
            '10% {  opacity: 0;  } ' +
            '20% {  opacity: 0;  } ' +
            '30% {  opacity: 0;  } ' +
            '40% {  opacity: 0;  } ' +
            '50% {  opacity: 1;  } ' +
            '60% {  opacity: 0;  } ' +
            '70% {  opacity: 0;  } ' +
            '80% {  opacity: 0;  } ' +
            '90% {  opacity: 0;  } ' +
            '100% {  opacity: 0;  }');

        keyFrames += getStyleSheetMarker() + generateKeyFrame('logo-state-7-animation',
            '0% {  opacity: 0;  } ' +
            '10% {  opacity: 0;  } ' +
            '20% {  opacity: 0;  } ' +
            '30% {  opacity: 0;  } ' +
            '40% {  opacity: 0;  } ' +
            '50% {  opacity: 0;  } ' +
            '60% {  opacity: 1;  } ' +
            '70% {  opacity: 0;  } ' +
            '80% {  opacity: 0;  } ' +
            '90% {  opacity: 0;  } ' +
            '100% {  opacity: 0;  }');

        keyFrames += getStyleSheetMarker() + generateKeyFrame('logo-state-8-animation',
            '0% {  opacity: 0;  } ' +
            '10% {  opacity: 0;  } ' +
            '20% {  opacity: 0;  } ' +
            '30% {  opacity: 0;  } ' +
            '40% {  opacity: 0;  } ' +
            '50% {  opacity: 0;  } ' +
            '60% {  opacity: 0;  } ' +
            '70% {  opacity: 1;  } ' +
            '80% {  opacity: 0;  } ' +
            '90% {  opacity: 0;  } ' +
            '100% {  opacity: 0;  }');

        keyFrames += getStyleSheetMarker() + generateKeyFrame('logo-state-9-animation',
            '0% {  opacity: 0;  } ' +
            '10% {  opacity: 0;  } ' +
            '20% {  opacity: 0;  } ' +
            '30% {  opacity: 0;  } ' +
            '40% {  opacity: 0;  } ' +
            '50% {  opacity: 0;  } ' +
            '60% {  opacity: 0;  } ' +
            '70% {  opacity: 0;  } ' +
            '80% {  opacity: 1;  } ' +
            '90% {  opacity: 0;  } ' +
            '100% {  opacity: 0;  }');

        keyFrames += getStyleSheetMarker() + generateKeyFrame('logo-state-10-animation',
            '0% {  opacity: 0;  } ' +
            '10% {  opacity: 0;  } ' +
            '20% {  opacity: 0;  } ' +
            '30% {  opacity: 0;  } ' +
            '40% {  opacity: 0;  } ' +
            '50% {  opacity: 0;  } ' +
            '60% {  opacity: 0;  } ' +
            '70% {  opacity: 0;  } ' +
            '80% {  opacity: 0;  } ' +
            '90% {  opacity: 1;  } ' +
            '100% {  opacity: 0;  }');

        keyFrames += getStyleSheetMarker() + generateKeyFrame('disconnected-loader-animation', '0%{  transform: rotate(0deg);  } 100%{  transform: rotate(360deg);  }');

        keyFrames += getStyleSheetMarker() + generateKeyFrame('oval1-animation', '0%{  transform: rotate(-315deg);  } 50%{  transform: rotate(-495deg);  } 100%{  transform: rotate(-315deg);  }');

        keyFrames += getStyleSheetMarker() + generateKeyFrame('oval2-animation', '0%{  transform: rotate(-45deg);  } 50%{  transform: rotate(-215deg);  } 100%{  transform: rotate(-45deg);  }');


        keyFrames += getStyleSheetMarker() + generateKeyFrame('alan-text-fade-in', '0%{  opacity: 0;  } 100%{   opacity: 1;  }');

        keyFrames += getStyleSheetMarker() + '.alanBtn-bg-default.super-hidden{opacity:0!important;display:none;}';

        var predefinedBtnColorOptions = defaultBtnColorOptions;

        if (btnOptions) {
            if (btnOptions.btnLayerOptions) { //old settings
                predefinedBtnColorOptions = defaultBtnColorOptions;
            } else {
                predefinedBtnColorOptions = btnOptions || defaultBtnColorOptions;
            }
        }

        var btnBackgroundOptionKeys = Object.keys(predefinedBtnColorOptions);
        var tempLayer;
        var stateName;
        var stateMapping = {
            idle: ['default'],
            listen: ['listening'],
            process: ['intermediate', 'understood'],
            reply: ['speaking'],
        };
        var stateNameClasses,stateNameClass;
        var states = Object.keys(stateMapping);
        for (i = 0; i < states.length; i++) {
            stateName = states[i];
            stateNameClasses = stateMapping[stateName];
            tempLayer = predefinedBtnColorOptions[stateName];
            for(var j = 0; j < stateNameClasses.length; j++){
                stateNameClass = stateNameClasses[j];
            if(tempLayer.background){
                keyFrames += getStyleSheetMarker() + '.alanBtn-bg-' + stateNameClass + ' {';
                keyFrames += 'background-image: linear-gradient(122deg,'+tempLayer.background.color[0]+','+tempLayer.background.color[1]+');';
                keyFrames += '}';
                keyFrames += getStyleSheetMarker() + '.alanBtn-oval-bg-' + stateNameClass + ' {';
                keyFrames += 'background-image: linear-gradient(122deg,'+tempLayer.background.color[0]+','+tempLayer.background.color[1]+');';
                keyFrames += '}';
            }

            if(tempLayer.hover){
                keyFrames += getStyleSheetMarker() + '.alanBtn:hover .alanBtn-bg-' + stateNameClass + ':not(.super-hidden) {';
                keyFrames += 'background-image: linear-gradient(122deg,'+tempLayer.hover.color[0]+','+tempLayer.hover.color[1]+');';
                keyFrames += '}';
                keyFrames += getStyleSheetMarker() + '.alanBtn:active .alanBtn-bg-' + stateNameClass + ':not(.super-hidden) {';
                keyFrames += 'background-image: linear-gradient(122deg,'+tempLayer.hover.color[0]+','+tempLayer.hover.color[1]+');';
                keyFrames += '}';

                keyFrames += getStyleSheetMarker() + '.alanBtn:hover .alanBtn-oval-bg-' + stateNameClass + ':not(.super-hidden) {';
                keyFrames += 'background-image: linear-gradient(122deg,'+tempLayer.hover.color[0]+','+tempLayer.hover.color[1]+');';
                keyFrames += '}';
                keyFrames += getStyleSheetMarker() + '.alanBtn:active .alanBtn-oval-bg-' + stateNameClass + ':not(.super-hidden) {';
                keyFrames += 'background-image: linear-gradient(122deg,'+tempLayer.hover.color[0]+','+tempLayer.hover.color[1]+');';
                keyFrames += '}';
            }
        }

            
        }

        style.innerHTML = keyFrames;

        if (options.shadowDOM) {
            options.shadowDOM.prepend(style);
        } else {
            document.getElementsByTagName('head')[0].appendChild(style);
        }
    }

    function generateKeyFrame(name, rule) {
        var prefixes = ['@-webkit-keyframes', '@keyframes'];
        var r = '';
        for (var i = 0; i < prefixes.length; i++) {
            r += prefixes[i] + ' ' + name + '{' + rule + '} ';
        }
        return r;
    }

    //#endregion

    //region Connect to the project and add listeners
    if (options) {
        if (options.alanAudio) {
            alanAudio = options.alanAudio;
        }
        if (options.key) {
            tryReadSettingsFromLocalStorage();
            switchState(DISCONNECTED);

            window.tutorProject = alan.project(options.key, getAuthData(options.authData), options.host);
            window.tutorProject.on('connectStatus', onConnectStatusChange);
            window.tutorProject.on('options', onOptionsReceived);

            // console.info('BTN: tutorProject', options.key);
        } else {
            switchState(DEFAULT);
        }
    }

    function guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                       .toString(16)
                       .substring(1);
        }
    
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }

    function getAuthData(data) {
        var authData = data || {};
        var curUuid, uuidKey;

        if (isLocalStorageAvailable && authData) {
            uuidKey = 'alan-btn-uuid-' + getProjectId();
            curUuid = localStorage.getItem(uuidKey);
            if (curUuid) {
                authData.uuid = curUuid;
            } else {
                authData.uuid = guid();
                localStorage.setItem(uuidKey, authData.uuid);
            }
        } else {
            authData.uuid = guid();
        }

        return authData;
    }

    function getProjectId() {
        var key;
        if (options.key) {
            key = options.key;
            return key.substr(0, key.indexOf('/'));
        }

        return mode;
    }

    function debounce(func, wait) {
        var timeout;
        var delay = wait || 100;
        return function (args) {
            clearTimeout(timeout);
            timeout = setTimeout(function () {
                func.apply(this, args);
            }, delay);
        };
    }

    function _activateAlanButton(resolve) {
        playSoundOn();
        if (options.onBeforeMicStart) {
            options.onBeforeMicStart();
        }
        alanAudio.on('micStart', onMicStart);
        alanAudio.on('micStop', onMicStop);
        alanAudio.on('micFail', onMicFail);
        alanAudio.on('playStart', onPlayStart);
        alanAudio.on('playStop', onPlayStop);
        alanAudio.on('command', onCommandCbInMicBtn);
        alanAudio.start(resolve);
        if (options.onMicStarted) {
            options.onMicStarted();
        }
    }

    function activateAlanButton() {
        var activatePromise = new Promise(function (resolve, reject) {
            
            if (btnDisabled) {
                reject({err: BTN_IS_DISABLED_CODE});
                return;
            }

            if (isPreviewMode()) {
                reject({err: PREVIEW_MODE_CODE});
                return;
            }

            function waitForConnectionForActivateCall(res) {
                if (res === 'authorized') {
                    window.tutorProject.off('connectStatus', waitForConnectionForActivateCall);
                    _activateAlanButton(resolve);
                }
            }

            if (alanAudio) {
                switch (state) {
                    case DEFAULT:
                        try {
                            _activateAlanButton(resolve);
                        } catch (e) {
                            alert(NO_VOICE_SUPPORT_IN_BROWSER_MSG);
                            reject({ err: NO_VOICE_SUPPORT_IN_BROWSER_CODE });
                        }
                        break;
                    case DISCONNECTED:
                    case OFFLINE:
                        window.tutorProject.on('connectStatus', waitForConnectionForActivateCall);
                        break;
                    case PERMISSION_DENIED:
                        reject({ err: MIC_BLOCKED_CODE });
                        break;

                    case LISTENING:
                    case SPEAKING:
                    case INTERMEDIATE:
                    case UNDERSTOOD:
                        resolve();
                        break;
                    default:
                }
            } else {
                reject({ err: NO_ALAN_AUDIO_INSANCE_WAS_PROVIDED_CODE });
            }
        });

        return activatePromise;
    }

    btn.addEventListener('click', function (e) {
        if (alanAudio) {
            if (state === 'default') {
                activateAlanButton();
            } else {
                alanAudio.stop();
            }
        } else {
            throw 'No alan audio instance was provided';
        }
        //remove focus state from the btn after click
        this.blur();
    });

    btn.addEventListener("mouseenter", onBtnMouseEnter);
    btn.addEventListener("mouseleave", onBtnMouseLeave);

    function onBtnMouseEnter() {
        if (state === DEFAULT) {
            hoverShowHintTimeoutId = setTimeout(function () {
                showHints();
            }, 500);
        } else if(state === PERMISSION_DENIED){
            showInfo(MIC_BLOCKED_MSG);
        }
    }

    function onBtnMouseLeave() {
        if (state === DEFAULT) {
            clearTimeout(hoverShowHintTimeoutId);
            hoverHideHintTimeoutId = setTimeout(function () {
                hideHints();
            }, 600);
        } else if(state === PERMISSION_DENIED){
            hideInfo();
        }
    }

    function showRecognisedText(e, text) {
        // console.info('showRecognisedText');
        var recognisedText = '';

        if (isMobile()) {
            return;
        }

        if (hideS2TPanel) {
            return;
        }

        recognisedTextVisible = true;
        if (!options.hideRecognizedText) {
            if (textHolder.classList.value.indexOf('alanBtn-text-appearing') === -1) {
                textHolder.classList.add('alanBtn-text-appearing');
                textHolder.classList.remove('alanBtn-text-disappearing');
            }

            if (text) {
                recognisedText = text;
                textHolderTextWrapper.innerHTML = text;
            } else {
                recognisedText = e.text;
                if (recognisedText.length > 200) {
                    recognisedText = recognisedText.substr(0, 200);
                }
                textHolderTextWrapper.innerHTML = recognisedText;
            }

            if (recognisedText.length > 60 && recognisedText.length <= 80) {
                textHolder.classList.add('alanBtn-text-holder-long');
            } else if (recognisedText.length > 80) {
                textHolder.classList.add('alanBtn-text-holder-super-long');
            } else {
                textHolder.classList.remove('alanBtn-text-holder-long');
                textHolder.classList.remove('alanBtn-text-holder-super-long');
            }
            if (text) {
                textHolder.appendChild(textHolderTextWrapper);
                isHintWasPreviously = true;
            } else {
                if (isHintWasPreviously) {
                    isHintWasPreviously = false;
                    textHolder.appendChild(textHolderTextWrapper);
                } else {
                    replaceRecognisedText(recognisedText);
                }
            }
        }
    }

    function replaceRecognisedText(recognisedText) {
        if (isMobile()) {
            return;
        }
        if (!options.hideRecognizedText) {
            textHolderTextWrapper.innerText = recognisedText;
        }
    }

    function hideRecognisedText(delay) {
        // console.info('hideRecognisedText');

        if (isMobile()) {
            return;
        }

        if (!options.hideRecognizedText && recognisedTextVisible) {
            textHolder.classList.add('alanBtn-text-disappearing');
            textHolder.classList.remove('alanBtn-text-appearing');

            recognisedTextVisible = false;

            setTimeout(function () {
                textHolderTextWrapper.innerHTML = '';
                textHolder.classList.remove('alanBtn-text-holder-long');
                textHolder.classList.remove('alanBtn-text-holder-super-long');
            }, delay || 810);
        }
    }

    function showHints() {
        var hintId;

        if (isMobile()) {
            return;
        }

        if (hints.length === 0 || doNotShowHints) {
            return;
        }

        clearTimeout(removeTextHintTimeoutId);
        clearTimeout(hoverHideHintTimeoutId);

        clearInterval(insideHintsAnimationIntervalId);
        clearInterval(hintsRequestIntervalId);

        insideHintsAnimationIntervalId = setInterval(function () {
            var hintList = document.getElementById('hintList');
            if (hintList) {
                hintList.outerHTML = getHintList();
            }
        }, 6000);

        hintsRequestIntervalId = setInterval(function () {
            requestHints();
        }, 4000);

        // console.info('showHints');

        hintId = document.getElementById('hint-id');

        if (hintId && hintId.className.indexOf(DEFAULT) > -1) {
            hintId.outerHTML = getHintHeader(listeningHintLabel);
        } else {
            showRecognisedText(null, getHintsHtml());
        }
    }

    function hideHints() {
        if (isMobile()) {
            return;
        }

        if (hints.length === 0) {
            return;
        }

        hideRecognisedText();
    }

    function showInfo(text) {
        showRecognisedText(null, text);
    }

    function hideInfo() {
        hideRecognisedText(200);
    }

    function closeHint(event) {
        var clickedEl = event.target;

        if (clickedEl.classList.value.indexOf('alanBtn-hint-holder-close') > -1) {
            doNotShowHints = true;
            hideHints();
        }
    }

    function shuffle(array) {
        var currentIndex = array.length,
            temporaryValue, randomIndex;

        while (0 !== currentIndex) {

            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }

        return array;
    }

    function getHintHeader(label) {
        return '<div id="hint-id" class="alanBtn-hint-header ' + state + '">' + label + '</div>';
    }

    function getHintList() {
        var hintsHtml = '';
        var hintItems = '';
        var hintsLength = 0;
        var shuffledHints = shuffle(hints);
        var hintsClass = 'alanBtn-hint-list';

        for (var i = 0; i < 2; i++) {
            if (shuffledHints[i]) {
                hintsLength += hints[i].length;
                hintItems += '<div>' + hints[i] + '</div>';
            }
        }

        if (hintsLength > 70 && hintsLength <= 100) {
            hintsClass += ' hints-long';
        }
        if (hintsLength > 100) {
            hintsClass += ' hints-super-long';
        }

        hintsHtml = '<div id="hintList" class="' + hintsClass + '">';
        hintsHtml += hintItems;
        hintsHtml += '</div>';
        return hintsHtml;
    }

    function getHintsHtml() {
        var hintsHtml = '';
        var shuffledHints = [];
        var hintClass = '';
        var label;

        if (state === DEFAULT) {
            label = defaultHintLabel;
        } else {
            label = listeningHintLabel;
        }

        hintsHtml += '<div class="alanBtn-hint-holder-wrapper">';
        hintsHtml += getHintHeader(label);
        hintsHtml += getHintList();
        hintsHtml += '</div>';

        return hintsHtml;
    }

    function onOptionsReceived(data) {
        if (data && data.web && data.web.hidden === true) {
            hideAlanBtn();
        } else {
            showAlanBtn();
        }

        if (data && data.web && data.web.hideS2TPanel === true) {
            hideSpeach2TextPanel();
        } else {
            showSpeach2TextPanel();
        }

        if (data && data.web && data.web.timeout ) {
            turnOffTimeout = data.web.timeout;
            setTurnOffVoiceTimeout();
        }

        if (data && data.web && data.web.btnOptions) {
            console.info('OPTIONS',data.web.btnOptions);
            applyBtnOptions(data.web.btnOptions);
        }

        if (isLocalStorageAvailable && data) {
            localStorage.setItem(getStorageKey(), JSON.stringify(data));
        }
    }

    function onConnectStatusChange(res) {
        // console.info('BTN: connectStatus', res);

        if (options.onConnectionStatus) {
            options.onConnectionStatus(res);
        }

        if (res === 'disconnected') {
            switchState(DISCONNECTED);
        } else if (res === 'authorized') {
            if (previousState) {
                switchState(previousState);
            } else {
                switchState(DEFAULT);
            }
            requestHints();
        }
    }

    function requestHints() {
        window.tutorProject.call('visualHints', {}, function (err, res) {
            if (res) {
                setUpHints(res);
            }
        });
    }

    function onMicStart() {
        // console.log('BTN: mic. started', new Date());
        switchState(LISTENING);
        isAlanActive = true;

        if (window.tutorProject) {
            window.tutorProject.on('text', onTextCbInMicBtn);
            window.tutorProject.on('parsed', onParsedCbInMicBtn);
            window.tutorProject.on('recognized', onRecognizedCbInMicBtn);
            window.tutorProject.on('connectStatus', onConnectStatusChange);
            window.tutorProject.on('options', onOptionsReceived);
        }
    }

    function onMicStop() {
        // console.log('BTN: mic. stopped');
        playSoundOff();
        isAlanSpeaking = false;

        alanAudio.off('micStart', onMicStart);
        alanAudio.off('micStop', onMicStop);
        alanAudio.off('micFail', onMicFail);
        alanAudio.off('playStart', onPlayStart);
        alanAudio.off('playStop', onPlayStop);
        alanAudio.off('command', onCommandCbInMicBtn);
        hideRecognisedText();

        switchState(DEFAULT);

        isAlanActive = false;

        if (window.tutorProject) {
            window.tutorProject.off('text', onTextCbInMicBtn);
            window.tutorProject.off('parsed', onParsedCbInMicBtn);
            window.tutorProject.off('recognized', onRecognizedCbInMicBtn);
            window.tutorProject.off('connectStatus', onConnectStatusChange);
            window.tutorProject.off('options', onOptionsReceived);
        }

        if (options.onMicStopped) {
            options.onMicStopped();
        }
    }

    function onMicFail() {
        // console.log('BTN: mic. failed');
        onMicStop();
        switchState(PERMISSION_DENIED);
    }

    function onPlayStart(e) {
        // console.log('BTN: play start');
        isAlanSpeaking = true;
        switchState(SPEAKING);
        turnOffVoiceFn();
    }

    function onPlayStop(e) {
        // console.log('BTN: play stop');
        isAlanSpeaking = false;
        switchState(LISTENING);
        turnOffVoiceFn();
    }

    function onTextCbInMicBtn(e) {
        // console.info('BTN: onTextCb', e, new Date());
        turnOffVoiceFn();
    }

    function onParsedCbInMicBtn(e) {
        // console.info('BTN: onParsedCb', e, new Date());
        turnOffVoiceFn();
        showRecognisedText(e);
    }

    function onRecognizedCbInMicBtn(e) {
        // console.info('BTN: onRecognizedTextCb', e, new Date());
        if (options.onReceiveRecognisedText) {
            options.onReceiveRecognisedText(e);
        }

        if (e.final === true) {
            switchState(UNDERSTOOD);
        } else {
            switchState(INTERMEDIATE);
        }

        showRecognisedText(e);
        turnOffVoiceFn();
    }

    function onCommandCbInMicBtn(e) {
        // console.info('BTN: onCommandCbInMicBtn', e, new Date());
        if (options.onCommand) {
            options.onCommand(e.data);
        }
        switchState(LISTENING);
        turnOffVoiceFn();
    }

    function playSoundOn() {
        if (!soundOnAudioDoesNotExist) {
            soundOnAudio.play().catch(() => {
                console.log("No activation sound, because the user didn't interact with the button");
            });
        }
    }

    function playSoundOff() {
        if (!soundOffAudioDoesNotExist) {
            soundOffAudio.play().catch(() => {
                console.log("No deactivation sound, because the user didn't interact with the button");
            });
        }
    }

    window.switchState = switchState;

    function switchState(newState) {
        var tempLogoParts = [],
            i = 0;

        if (newState !== DISCONNECTED) {
            previousState = newState;
        }

        if (newState === LISTENING) {
            hintAppearTimeoutId = setTimeout(function () {
                showHints();
            }, 300);
        }

        if (newState === DEFAULT) {
            btn.style.animation = '';
            micIcon.style.animation = '';
            micTriangleIcon.style.animation = '';

            btnBgDefault.classList.remove('super-hidden');
            btnBgDefault.style.opacity = onOpacity;
            btnOval1.style.animation = '';
            btnOval2.style.animation = '';
            btnOval1.style.opacity = 0;
            btnOval2.style.opacity = 0;
            changeBgColors(DEFAULT);

            micIcon.style.opacity = 1;
            micTriangleIcon.style.opacity = 0;

            hideLayers([
                btnBgListening,
                btnBgSpeaking,
                btnBgIntermediate,
                btnBgUnderstood,
            ]);
        } else if (newState === LISTENING) {
            btn.style.animation = pulsatingAnimation;
            micIcon.style.animation = pulsatingMicAnimation;
            micTriangleIcon.style.animation = pulsatingTriangleMicAnimation;

            btnBgListening.classList.remove('super-hidden');
            btnBgListening.style.opacity = onOpacity;

            btnOval1.style.animation = oval1Animation;
            btnOval2.style.animation = oval2Animation;
            btnOval1.style.opacity = 1;
            btnOval2.style.opacity = 1;

            changeBgColors(LISTENING);

            micIcon.style.opacity = 1;
            micTriangleIcon.style.opacity = 1;

            hideLayers([
                // btnBgDefault,
                btnBgSpeaking,
                btnBgIntermediate,
                btnBgUnderstood,
            ]);
        } else if (newState === SPEAKING) {
            hideRecognisedText();
            btn.style.animation = pulsatingAnimation;

            btnBgSpeaking.classList.remove('super-hidden');
            btnBgSpeaking.style.opacity = onOpacity;
            btnOval1.style.animation = oval1Animation;
            btnOval2.style.animation = oval2Animation;
            btnOval1.style.opacity = 1;
            btnOval2.style.opacity = 1;
            changeBgColors(SPEAKING);

            hideLayers([
                btnBgDefault,
                btnBgListening,
                btnBgIntermediate,
                btnBgUnderstood,
            ]);
        } else if (newState === INTERMEDIATE) {
            btn.style.animation = pulsatingAnimation;

            btnBgIntermediate.classList.remove('super-hidden');
            btnBgIntermediate.style.opacity = onOpacity;
            btnOval1.style.animation = oval1Animation;
            btnOval2.style.animation = oval2Animation;
            btnOval1.style.opacity = 1;
            btnOval2.style.opacity = 1;
            changeBgColors(INTERMEDIATE);
            micIcon.style.opacity = 1;
            micTriangleIcon.style.opacity = 1;

            hideLayers([
                btnBgDefault,
                btnBgListening,
                btnBgSpeaking,
                btnBgUnderstood,

            ]);
        } else if (newState === UNDERSTOOD) {
            btn.style.animation = pulsatingAnimation;

            btnBgUnderstood.classList.remove('super-hidden');
            btnBgUnderstood.style.opacity = onOpacity;
            btnOval1.style.animation = oval1Animation;
            btnOval2.style.animation = oval2Animation;
            btnOval1.style.opacity = 1;
            btnOval2.style.opacity = 1;
            changeBgColors(UNDERSTOOD);

            micIcon.style.opacity = 1;
            micTriangleIcon.style.opacity = 1;

            hideLayers([
                btnBgDefault,
                btnBgListening,
                btnBgSpeaking,
                btnBgIntermediate,

            ]);
        }

        if (newState === SPEAKING) {
            micTriangleIcon.style.opacity = 0;
            micCircleIcon.style.opacity = 1;
            micTriangleIcon.style.backgroundSize = '0% 0%';
            micCircleIcon.style.backgroundSize = '100% 100%';
        } else  {
            micCircleIcon.style.opacity = 0;
            micCircleIcon.style.backgroundSize = '0% 0%';
            micTriangleIcon.style.backgroundSize = '100% 100%';
        }

        if (newState === DEFAULT) {
            micTriangleIcon.classList.add('triangleMicIconBg-default');
        } else {
            micTriangleIcon.classList.remove('triangleMicIconBg-default');
        }

        tempLogoParts = [
            logoState1,
            logoState2,
            logoState3,
            logoState4,
            logoState5,
            logoState6,
            logoState7,
            logoState8,
            logoState9,
            logoState10
        ];

        if (newState === LISTENING ||
            newState === INTERMEDIATE ||
            newState === SPEAKING ||
            newState === UNDERSTOOD) {

            if (logoState1.style.animationName === '') {
                for (i = 0; i < tempLogoParts.length; i++) {
                    if (i === 0) {
                        tempLogoParts[i].style.opacity = 1;
                    } else {
                        tempLogoParts[i].style.opacity = 0;
                    }
                    tempLogoParts[i].style.animationName = 'logo-state-' + (i + 1) + '-animation';
                }
            }
        } else {
            for (i = 0; i < tempLogoParts.length; i++) {
                if (i === 0) {
                    tempLogoParts[i].style.opacity = 1;
                } else {
                    tempLogoParts[i].style.opacity = 0;
                }
                tempLogoParts[i].style.animationName = '';
            }
        }

        if (newState === LOW_VOLUME || newState === PERMISSION_DENIED) {
            if (newState === LOW_VOLUME) {
                rootEl.classList.add("alan-btn-low-volume");
            }
            if (newState === PERMISSION_DENIED) {
                rootEl.classList.add("alan-btn-permission-denied");
                showInfo(MIC_BLOCKED_MSG);
            }
            micIcon.style.opacity = 0;
            micTriangleIcon.style.opacity = 0;
            disconnectedMicLoaderIcon.style.opacity = 0;
            offlineIcon.style.opacity = 0;
            lowVolumeMicIcon.style.opacity = 1;
            btnOval1.style.animation = '';
            btnOval2.style.animation = '';
            btnOval1.style.opacity = 0;
            btnOval2.style.opacity = 0;
        } else if (newState === DISCONNECTED || newState === OFFLINE ) {
            if (newState === DISCONNECTED) {
                rootEl.classList.add("alan-btn-disconnected");
            }
            if (newState === OFFLINE) {
                rootEl.classList.add("alan-btn-offline");
            }
            micTriangleIcon.style.opacity = 0;
            lowVolumeMicIcon.style.opacity = 0;
            btnOval1.style.animation = '';
            btnOval2.style.animation = '';
            btnOval1.style.opacity = 0;
            btnOval2.style.opacity = 0;

            if (newState === DISCONNECTED) {
                micIcon.style.opacity = .4;
                disconnectedMicLoaderIcon.style.opacity = 1;
            } else {
                micIcon.style.opacity = 0;
                disconnectedMicLoaderIcon.style.opacity = 0;
                offlineIcon.style.opacity = 1;
            }
        } else {
            lowVolumeMicIcon.style.opacity = 0;
            offlineIcon.style.opacity = 0;
            disconnectedMicLoaderIcon.style.opacity = 0;
            rootEl.classList.remove("alan-btn-low-volume");
            rootEl.classList.remove("alan-btn-permission-denied");
            rootEl.classList.remove("alan-btn-disconnected");
            rootEl.classList.remove("alan-btn-offline");
        }

        state = newState;

        // console.info('BTN: state', newState);
    }

    //#endregions

    //#region Helpers
    function applyBgStyles(el, backgroundImage) {
        el.style.transition = 'all 0.4s linear';
        el.style.position = 'absolute';
        el.style.top = '0px';
        el.style.left = '0px';
        el.style.width = '100%';
        el.style.height = '100%';
        el.style.borderRadius = '50%';
        el.style.zIndex = btnBgLayerZIndex;
        el.style.backgroundPosition = '0 0';
        el.style.opacity = 0;
        el.style.opacity = 0;
        el.style.transition = 'opacity 300ms ease-in-out';
        el.style.animation = gradientAnimation;
    }

    function hideLayers(layers) {
        for (var i = 0; i < layers.length; i++) {
            layers[i].style.opacity = offOpacity;
            layers[i].classList.add('super-hidden');
        }
    }

    function changeBgColors(state) {
        var tempBgLayers = [btnOval1, btnOval2];
        var newStateName = state || DEFAULT;
        var tempBgLayerClasses = [
            'alanBtn-oval-bg-' + DEFAULT,
            'alanBtn-oval-bg-' + LISTENING,
            'alanBtn-oval-bg-' + INTERMEDIATE,
            'alanBtn-oval-bg-' + UNDERSTOOD,
            'alanBtn-oval-bg-' + SPEAKING,
        ];

        for (var i = 0; i < tempBgLayers.length; i++) {
            for (var j = 0; j < tempBgLayerClasses.length; j++) {
                tempBgLayers[i].classList.remove(tempBgLayerClasses[j]);
            }
            tempBgLayers[i].classList.add('alanBtn-oval-bg-' + newStateName);
        }
    }

    function getStorageKey() {
        var key = '';
        if (options && options.key) {
            key = options.key;
        }
        return 'alan-btn-options-' + key;
    }

    function isMobile() {
        if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            return true;
        }
        return false;
    }

    function isAudioSupported() {
        var available = false,
            fakeGetUserMedia,
            fakeContext,
            isAllowed = false;

        if (window.location.protocol === 'https:') {
            isAllowed = true;
        }

        if (window.location.protocol === 'file:') {
            isAllowed = true;
        }

        if (window.location.protocol === 'http:' && window.location.hostname === 'localhost') {
            isAllowed = true;
        }

        if (!isAllowed) {
            return false;
        }

        fakeGetUserMedia = (navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.msGetUserMedia);

        fakeContext = window.AudioContext ||
            window.webkitAudioContext ||
            window.mozAudioContext;

        if (fakeGetUserMedia && fakeContext) {
            available = true;
        }

        return available;
    }

    //#endregion

    //#region Append layers to the rootEl
    function showAlanBtn() {
        rootEl.innerHTML = '';

        textHolder.appendChild(textHolderTextWrapper);

        if (!isTutorMode()) {
            hintHolder.appendChild(hintHolderWrapper);
            rootEl.appendChild(hintHolder);
        }

        rootEl.appendChild(textHolder);
        rootEl.appendChild(btn);
        btnDisabled = false;
    }

    function hideAlanBtn() {
        if (!isTutorMode()) {
            alanAudio.stop();
            rootEl.innerHTML = '';
            if (mode === 'demo') {
                rootEl.appendChild(alanBtnDisabledMessage);
            }
            btnDisabled = true;
        }
    }

    function showSpeach2TextPanel() {
        hideS2TPanel = false;
    }

    function hideSpeach2TextPanel() {
        hideS2TPanel = true;
        hideRecognisedText();
    }

    function setUpHints(newHints) {
        hints = newHints;
    }

    function applyBtnOptions(btnOptions) {
        if (btnOptions) {
            createAlanStyleSheet(btnOptions);
        }
    }

    rootEl.classList.add("alanBtn-root");
    rootEl.classList.add("alan-" + getProjectId());

    var alanBtnSavedOptions = null;

    if (isTutorMode()) {
        showAlanBtn();
    } else {
        if (isLocalStorageAvailable) {
            try {
                tryReadSettingsFromLocalStorage();
            } catch (e) {
                showAlanBtn();
            }
        } else {
            showAlanBtn();
        }
    }

    function tryReadSettingsFromLocalStorage() {
        if (isLocalStorageAvailable) {
            try {
                alanBtnSavedOptions = JSON.parse(localStorage.getItem(getStorageKey()));

                if (alanBtnSavedOptions && alanBtnSavedOptions.web) {

                    if (alanBtnSavedOptions.web.btnOptions) {
                        applyBtnOptions(alanBtnSavedOptions.web.btnOptions);
                    }

                    if (alanBtnSavedOptions.web.hidden !== true) {
                        showAlanBtn();
                    } else {
                        hideAlanBtn();
                    }

                }
            } catch (e) {

            }
        }
    }

    if (!options.rootEl) {
        body.appendChild(rootEl);
    }
    // showRecognisedText({})
    return btnInstance;

    //#endregion
}
ns.alanBtn = alanBtn;

})(window);
return alanBtn;
}));
