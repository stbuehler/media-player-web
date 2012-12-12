
enyo.kind({
    name: "Media.Player",
    layoutKind: "FittableRowsLayout",
    classes: "media-player",
    components: [
        {kind: "onyx.Toolbar", layoutKind: "FittableColumnsLayout", noStretch: true, components: [
            {name: "play", kind: "onyx.Button", classes: "media-player-play onyx-affirmative", disabled: true, content: "P", ontap: "playTapped"},
            {name: "stop", kind: "onyx.Button", classes: "media-player-stop onyx-negative", disabled: true, content: "S", ontap: "stopTapped"},
            {name: "slider", kind: "onyx.Slider", classes: "media-player-slider", fit: true, lockBar: false, onChange: "sliderChange", onChanging: "sliderChanging" },
            {name: "timer", classes: "media-player-slider", content: '' },
            {name: "mute", kind: "onyx.Button", classes: "media-player-mute onyx-dark", content: "M", ontap: "muteTapped"},
            {name: "volume", kind: "onyx.Slider", classes: "media-player-volume", style: "width: 100px;", max: 1, onChange: "volumeChanging", onChanging: "volumeChanging" }
        ]}
    ],

    htmlaudio_chrome: [
        {name:'audio',kind:'Media.HTMLAudio',visible:false,attributes:{preload:'none'},
            onDurationChange: "handleDurationChange",
            onEnded: "handleEnded",
            onPlay: "handlePlay",
            onPause: "handlePause",
            onPlaying: "handlePlaying",
            onTimeUpdate: "handleTimeUpdate",
            onVolumeChange: "handleVolumeChange",
            onWaiting: "handleWaiting",
            onProgress: "handleProgress",
            onSourceChanged: "handleSourceChanged",
            onStop: "handleStop"
        },
    ],
    flashaudio_chrome: [
        {name:'audio',kind:'Media.FlashAudio',
            onDurationChange: "handleDurationChange",
            onEnded: "handleEnded",
            onPlay: "handlePlay",
            onPause: "handlePause",
            onPlaying: "handlePlaying",
            onTimeUpdate: "handleTimeUpdate",
            onVolumeChange: "handleVolumeChange",
            onWaiting: "handleWaiting",
            onProgress: "handleProgress",
            onSourceChanged: "handleSourceChanged",
            onStop: "handleStop"
        }
    ],

    published: {
        source: ''
    },

    create: function() {
        this.inherited(arguments);
        var a = document.createElement('audio');
        if (a.canPlayType('audio/mpeg') && a.canPlayType('audio/ogg')) {
            this.useHTML5 = true;
            this.createChrome(this.htmlaudio_chrome);
        } else {
            this.useHTML5 = false;
            this.createChrome(this.flashaudio_chrome);
        }
    },

    rendered: function() {
        this.inherited(arguments);

        this.handleDurationChange();
        this.handleVolumeChange();
    },
    sourceChanged: function() {
        this.$.audio.setSrc(this.source);
    },
    play: function() {
        this.$.audio.play();
    },

    playTapped: function() {
        if (this.$.audio.paused) {
            this.$.audio.play();
        } else {
            this.$.audio.pause();
        }
    },
    stopTapped: function() {
        this.$.audio.stop();
    },
    sliderChange: function() {
        this.$.audio.setCurrentTime(this.$.slider.value);
        this.setTimerText(this.$.slider.value);
    },
    sliderChanging: function() {
        this.setTimerText(this.$.slider.value);
    },
    muteTapped: function() {
        this.$.audio.setMuted(!this.$.audio.muted);
    },
    volumeChanging: function() {
        var v = this.$.volume.value;
        if (this.$.audio.muted && 0 === v) return;
        this.$.audio.setVolume(v);
        this.$.audio.setMuted(0 === v);
    },
/*    handleFlashSoundComplete: function() {
        window.setTimeout(function() {
            this.doTrackFinished();
        }.bind(this), 10);
    },
    */
    formatTimer: function(seconds) {
        seconds = Math.floor(seconds);
        var m = Math.floor(seconds / 60), h = Math.floor(m / 60);
        m = m % 60; seconds = seconds % 60;
        if (seconds < 10) seconds = "0" + seconds;
        if (h > 0) {
            if (m < 10) m = "0" + m;
            return h + ":" + m + ":" + seconds;
        }
        return m + ":" + seconds;
    },
    setTimerText: function(currentTime) {
        var t;
        if (!isNaN(this.$.audio.duration)) {
            t = this.formatTimer(currentTime);
            t = t.slice(0, this.durationMask.length - t.length) + t;
        } else {
            t = this.durationMask;
        }
        this.$.timer.setContent(t + "/" + this.durationText);
        this.$.timer.container.reflow();
    },
    handleDurationChange: function() {
        var duration = this.$.audio.duration;
        if (isNaN(duration)) {
            this.durationMask = this.durationText = '--:--';
        } else {
            this.durationText = this.formatTimer(this.$.audio.duration);
            this.durationMask = this.durationText.replace(/[0-9]/g, '0');
        }
        this.handleTimeUpdate();
    },
    handleEnded: function() {
    },
    handlePlay: function() {
        this.$.stop.setDisabled(false);
        this.$.play.addClass('active');
    },
    handlePause: function() {
        this.$.play.removeClass('active');
    },
    handlePlaying: function() {
    },
    handleTimeUpdate: function() {
        var s = this.$.slider, a = this.$.audio;
        s.setMax(a.duration);
        if (!s.tapped && !s.dragging) {
            s.animateTo(a.currentTime);
            this.setTimerText(a.currentTime);
        }
    },
    handleVolumeChange: function() {
        var s = this.$.volume, a = this.$.audio;
        if (!s.tapped && !s.dragging) s.animateTo(a.muted ? 0 : a.volume);
        this.$.mute.addRemoveClass('active', a.muted || 0 === a.volume);
    },
    handleWaiting: function() {
    },
    handleProgress: function() {
        this.$.slider.setProgress(MyTimeRanges.lastEnd(this.$.audio.buffered));
    },
    handleSourceChanged: function() {
        this.$.play.setDisabled(false);
    },
    handleStop: function() {
        this.$.stop.setDisabled(true);
    }
});
