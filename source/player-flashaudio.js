
window.registerFlashElements = function registerFlashElements() {
    var liveobjs = document.getElementsByTagName('object'), objs = [], i, l;
    for (var i = 0; i < liveobjs.length; ++i) {
        objs.push(liveobjs[i]);
    }
    for (var i = 0, l = objs.length; i < l; ++i) {
        try {
            objs[i].setObjectID(objs[i].id);
        } catch (e) {
        }
    }
};

window.handleFlashEvent = function handleFlashEvent(objid, evtype, args) {
    var o = enyo.$[objid];
    while (o && !o.handleFlashEvent) {
        o = o.owner;
    }
    if (o && o.handleFlashEvent) return o.handleFlashEvent(evtype, args);
    console.log("Couldn't find enyo control for ", objid, arguments);
};


enyo.kind({
    name: "Media.FlashAudio",
    kind: 'enyo.Control',
    classes: 'flash-container',
    components: [{components:[
            {content: "Loading flash plugin, as your browser doesn't support HTML5 audio with mp3 and ogg."},
            {name:'flash'}
        ]}
    ],

    published: {
        src: "",
        muted: null,
        volume: false,
        currentTime: 0
    },

    events: {
        /* html5 media style events */
        onDurationChange: "",
        onEnded: "",
        onPlay: "",
        onPause: "",
        onPlaying: "",
        onTimeUpdate: "",
        onVolumeChange: "",
        onWaiting: "",

        /* html5 progress */
        onProgress: "",

        /* special events */
        onSourceChanged: "",
        onStop: ""
    },

    _reset: function() {
        this.duration = NaN;
        this.currentTime = 0;
        this.paused = true;
        this.stopped = true;
        this.waiting = false;
        this.buffered = new MyTimeRanges();
        this.loaded = 0;

        this._wantPlay = false;
    },

    create: function() {
        this._reset();
        this.eventsActive = true;
        this._flEvents = {};
        this.inherited(arguments);
    },

    rendered: function() {
        this.inherited(arguments);

        swfobject.embedSWF("assets/mini-mp3.swf",
            this.$.flash.hasNode().id, "32", "32", "9.0.0", "",
            { },
            { },
            { },
            function() {
                this.flash = this.$.flash.findNodeById();
            }.bind(this)
        );
    },

    handleFlashEvent: function(evt, args) {
        var cb = this._flEvents[evt];
        if (!cb) {
            cb = this['handle' + evt];
            cb = cb ? cb : enyo.nop;
            this._flEvents[evt] = cb;
        }
        // console.log("handleFlashEvent", evt, this.flash.getAll());
        cb.apply(this, args);
    },

    srcChanged: function() {
        var a = this.flash;

        this._reset();
        this.doPlaying();
        this.doPause();
        this.doStop();
        this.doDurationChange();
        this.doTimeUpdate();
        this.doProgress();

        this.eventsActive = false;
        a.setSrc(this.src);
        this.eventsActive = true;
        this.doSourceChanged();
        this.updateState();
    },
    mutedChanged: function() {
        this.flash.setVolume(this.muted ? 0 : this.volume);
        if (this.eventsActive) this.doVolumeChange();
    },
    volumeChanged: function() {
        this.flash.setVolume(this.muted ? 0 : this.volume);
        if (this.eventsActive) this.doVolumeChange();
    },
    currentTimeChanged: function() {
        var a = this.flash;
        a.setCurrentTime(this.currentTime);
    },

    play: function() {
        this.flash.play();
    },
    pause: function() {
        this.flash.pause();
    },
    stop: function() {
        this.flash.stop();
    },

    startPoll: function() {
        window.setTimeout(this.pollState.bind(this), 500);
    },

    pollState: function() {
        var a = this.flash.getAll();
        if (this.duration !== a.duration) {
            this.duration = a.duration;
            if (this.eventsActive) this.doDurationChange();
        }
        if (this.currentTime !== a.currentTime) {
            this.currentTime = a.currentTime;
            if (this.eventsActive) this.doTimeUpdate();
        }
        if (this.loaded !== a.loaded) {
            this.buffered = new MyTimeRanges(a.loaded > 0 ? [0, a.loaded] : []);
            if (this.eventsActive) this.doProgress();
        }
        if (!this.paused) {
            window.setTimeout(this.pollState.bind(this), 500);
        }
    },

    updateState: function() {
        var a = this.flash.getAll();
        if (this.duration !== a.duration) {
            this.duration = a.duration;
            if (this.eventsActive) this.doDurationChange();
        }
        if (this.currentTime !== a.currentTime) {
            this.currentTime = a.currentTime;
            if (this.eventsActive) this.doTimeUpdate();
        }
        if (this.paused !== a.paused) {
            this.paused = a.paused;
            if (this.paused) {
                if (this.eventsActive) this.doPause();
            } else {
                if (this.eventsActive) this.doPlay();
            }
        }
        var stopped = this.paused && (0 === this.currentTime);
        if (this.stopped !== stopped) {
            this.stopped = stopped;
            if (this.eventsActive && stopped) this.doStop();
        }
        if (this.loaded !== a.loaded) {
            this.buffered = new MyTimeRanges(a.loaded > 0 ? [0, a.loaded] : []);
            if (this.eventsActive) this.doProgress();
        }
        if (!this.muted && this.volume !== a.volume) {
            if (this.volume === 0) {
                this.muted = true;
            } else {
                this.volume = a.volume;
            }
            if (this.eventsActive) this.doVolumeChange();
        }
    },

    handleregistered: function() {
        this.hide();
        var a = this.flash;
        if (false === this.volume) {
            this.volume = a.getVolume();
        } else {
            a.setVolume(this.volume);
        }
        if (null === this.muted) {
            this.muted = (this.volume === 0);
        } else {
            a.setMuted(this.muted);
        }
        if (this.eventsActive) this.doVolumeChange();
        if (this.src) a.setSrc(this.src);
    },

    handledurationchange: function() {
        this.updateState();
    },
    handleended: function() {
        this.updateState();
        if (this.eventsActive) this.doEnded();
    },
    handleplay: function() {
        this.updateState();
        this.startPoll();
    },
    handlepause: function() {
        this.updateState();
    },
    handleplaying: function() {
        if (this.waiting) {
            this.waiting = false;
            if (this.eventsActive) this.doPlaying();
        }
    },
    handletimeupdate: function() {
        var ctime = this.flash.getCurrentTime();
        if (this.currentTime !== ctime) {
            this.currentTime = ctime;
            if (this.eventsActive) this.doTimeUpdate();
        }
    },
    handlevolumechange: function() {
        this.updateState();
    },
    handlewaiting: function() {
        if (!this.waiting) {
            this.waiting = true;
            if (this.eventsActive) this.doWaiting();
        }
    },

    statics: {
        events: [
            /* media */
            "suspend", "emptied", "stalled", "loadedmetadata", "loadeddata", "canplay", "canplaythrough", "playing",
            "waiting", "seeking", "seeked", "ended", "durationchange", "timeupdate", "play", "pause", "ratechange", "volumechange",

            /* progress */
            "progress"
        ]
    }
});
