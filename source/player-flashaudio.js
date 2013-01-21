
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
        onStopped: ""
    },

    _reset: function() {
        this.duration = NaN;
        this.currentTime = 0;
        this._seekTime = false;
        this.paused = true;
        this.stopped = true;
        this.waiting = false;
        this.buffered = new MyTimeRanges();
        this.loaded = 0;
    },

    create: function() {
        this._reset();
        this.eventsActive = true;
        this._flEvents = {};
        this.registered = false;
        this._pollTimer = undefined;
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
        this.doWaiting();
        this.doPause();
        this.doStopped();
        this.doDurationChange();
        this.doTimeUpdate();
        this.doProgress();

        this.eventsActive = false;
        if (this.registered) {
            a.setSrc(this.src);
        }
        this.eventsActive = true;
        this.doSourceChanged();
        this.updateState();
    },
    mutedChanged: function() {
        if (this.registered) {
            this.flash.setVolume(this.muted ? 0 : this.volume);
        }
        if (this.eventsActive) this.doVolumeChange();
    },
    volumeChanged: function() {
        if (this.registered) {
            this.flash.setVolume(this.muted ? 0 : this.volume);
        }
        if (this.eventsActive) this.doVolumeChange();
    },
    currentTimeChanged: function() {
        if (this.registered) {
            var a = this.flash;
            a.setCurrentTime(this.currentTime);
        } else {
            this._seekTime = this.currentTime;
            this.doTimeUpdate();
        }
    },

    play: function() {
        if (this.registered) {
            this.flash.play();
        } else {
            if (this.paused) {
                this.paused = this.stopped = false;
                this.doPlay();
            }
        }
    },
    pause: function() {
        if (this.registered) {
            this.flash.pause();
        } else {
            if (!this.paused) {
                this.paused = true;
                this.stopped = (this.currentTime === 0);
                this.doPause();
                if (this.stopped) this.doStopped();
            }
        }
    },
    stop: function() {
        if (this.registered) {
            this.flash.stop();
        } else {
            if (!this.stopped) {
                this.stopped = true;
                this.currentTime = 0;
                if (!this.paused) {
                    this.paused = true;
                    this.doPause();
                }
                this.doStopped();
                this.doTimeUpdate();
            }
        }
    },

    startPoll: function() {
        if (undefined === this._pollTimer && this.registered) {
            if (!this.paused || (this.src && (isNaN(this.duration) || 0 === this.duration))) {
                this._pollTimer = window.setTimeout(this.pollState.bind(this), 500);
            }
        }
    },

    pollState: function() {
        this._pollTimer = undefined;
        this.updateState();
    },

    updateState: function() {
        if (this.registered) {
            var a = this.flash.getAll();
            if (this.currentTime !== a.currentTime) {
                this.currentTime = a.currentTime;
                if (this.eventsActive) this.doTimeUpdate();
            }
            if (this.duration !== a.duration) {
                this.duration = a.duration;
                if (this.eventsActive) this.doDurationChange();
                if (this._seekTime !== false && this._seekTime < this.duration) {
                    var s = this._seekTime; this._seekTime = false;
                    this.setCurrentTime(s);
                }
            }
            if (this.loaded !== a.loaded) {
                this.buffered = new MyTimeRanges(a.loaded > 0 ? [0, a.loaded] : []);
                if (this.eventsActive) this.doProgress();
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
                if (this.eventsActive && stopped) this.doStopped();
            }
            if (!this.muted && this.volume !== a.volume) {
                if (this.volume === 0) {
                    this.muted = true;
                } else {
                    this.volume = a.volume;
                }
                if (this.eventsActive) this.doVolumeChange();
            }
            this.startPoll();
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
        if (this.src) {
            a.setSrc(this.src);
            if (!this.paused) {
                a.play();
            }
            // console.log("a.setCurrentTime(this.currentTime);", this.currentTime);
            a.setCurrentTime(this.currentTime);
        }
        this.registered = true;
        this.updateState();
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
