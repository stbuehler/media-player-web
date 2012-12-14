
enyo.kind({
    name: "Media.HTMLAudio",
    tag: 'audio',
    kind: 'enyo.Control',

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

        this._wantPlay = false;
    },

    create: function() {
        this._reset();
        this.eventsActive = true;
        this.changedSource = false;
        this.inherited(arguments);
    },

    rendered: function() {
        this.inherited(arguments);
        var a = this.hasNode();
        if (false === this.volume) {
            this.volume = a.volume;
        } else {
            a.volume = this.volume;
        }
        if (null === this.muted) {
            this.muted = a.muted;
        } else {
            a.muted = this.muted;
        }
        a.src = this.src;

        /* register events: they don't bubble, so need to do this for each node */
        var d = enyo.dispatcher, i, n;
        for (i=0; (n=Media.HTMLAudio.events[i]); ++i) {
            var f = this['handle' + n];
            if (f) d.listen(a, n, f.bind(this));
        }
    },

    srcChanged: function() {
        var a = this.node;
        if (!a.paused) {
            this.eventsActive = false;
            a.pause();
            this.eventsActive = true;
        }

        this._reset();
        this.doPlaying();
        this.doPause();
        this.doStop();
        this.doDurationChange();
        this.doTimeUpdate();
        this.doProgress();

        this.eventsActive = false;
        a.src = this.src;
        this.changedSource = true;
        this.eventsActive = true;
        this.doSourceChanged();
        this.updateState();
    },
    mutedChanged: function() {
        this.node.muted = this.muted;
        this.doVolumeChange();
    },
    volumeChanged: function() {
        this.node.volume = this.volume;
        this.doVolumeChange();
    },
    currentTimeChanged: function() {
        var a = this.node;
        a.currentTime = this.currentTime;
    },

    play: function() {
        var a = this.node;
        if (a.paused) {
            this._wantPlay = true;
            if (this.changedSource) {
                a.load();
                this.changedSource = false;
            } else {
                a.play();
            }
        }
    },
    pause: function() {
        var a = this.node;
        if (!a.paused) {
            this._wantPlay = false;
            a.pause();
        }
    },
    stop: function() {
        var a = this.node;
        if (!a.paused) {
            this._wantPlay = false;
            a.pause();
        }
        try {
            a.currentTime = 0;
        } catch (e) {}
    },


    updateState: function() {
        var a = this.node;
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
        if (!MyTimeRanges.equal(this.buffered, a.buffered)) {
            this.buffered = a.buffered;
            if (this.eventsActive) this.doProgress();
        }
        var waiting = (a.readyState < 2); /*  2 == HAVE_CURRENT_DATA */
        if (this.waiting !== waiting) {
            this.waiting = waiting;
            if (waiting) {
                if (this.eventsActive) this.doWaiting();
            } else {
                if (this.eventsActive) this.doPlaying();
            }
        }
    },

    handlecanplaythrough: function() {
        if (!this._wantPlay) return;
        var a = this.node;
        a.play();
    },
    handledurationchange: function() {
        var a = this.node;
        if (this.duration !== a.duration) {
            this.duration = a.duration;
            if (this.eventsActive) this.doDurationChange();
        }
    },
    handleended: function() {
        this._wantPlay = false;
        this.updateState();
        if (this.eventsActive) this.doEnded();
    },
    handleplay: function() {
        this._wantPlay = true;
        this.updateState();
    },
    handlepause: function() {
        this._wantPlay = false;
        this.updateState();
    },
    handleplaying: function() {
        if (this.waiting) {
            this.waiting = false;
            if (this.eventsActive) this.doPlaying();
        }
    },
    handletimeupdate: function() {
        var a = this.node;
        if (this.currentTime !== a.currentTime) {
            this.currentTime = a.currentTime;
            if (this.eventsActive) this.doTimeUpdate();
        }
    },
    handlevolumechange: function() {
        var a = this.node;
        if (this.volume !== a.volume || this.muted !== a.muted) {
            this.volume = a.volume;
            this.muted = a.muted;
            if (this.eventsActive) this.doVolumeChange();
        }
    },
    handlewaiting: function() {
        if (!this.waiting) {
            this.waiting = true;
            if (this.eventsActive) this.doWaiting();
        }
    },
    handleprogress: function() {
        var a = this.node;
        if (!MyTimeRanges.equal(this.buffered, a.buffered)) {
            this.buffered = a.buffered;
            if (this.eventsActive) this.doProgress();
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
