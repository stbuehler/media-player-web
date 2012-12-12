
import flash.external.ExternalInterface;

class MiniMP3 {
	private var _objectID:String = ''; /* dom node id for ExternalalInteface */

	private var _sound:Sound;
	private var _source:String = "";
	private var _playing:Boolean = false;
	private var _nextPosition:Number = 0;
	private var _volume:Number = 100;

	private function MiniMP3() {
		super();
		this._source = "";
		this._sound = new Sound();
		setupExternalInterface();
	}

	public static function delegate(ctx:Object, func:Function):Function {
		return function():Object {
			return func.apply(ctx);
		};
	}

	/* javascript API */

	/* js API: delayed actions */
	public function setSrc(url:String) {
		this._source = url;
		this._sound.stop();
		this._sound = new Sound();
		this._sound.onSoundComplete = delegate(this, function():Void {
			this.jsEvent("ended");
			this._playing = false;
			this._nextPosition = 0;
		});
		this._sound.setVolume(this._volume);
		if (this._source !== '' && this._source !== null) {
			this._sound.loadSound(this._source, true);
		}
		this._playing = false;
		this._nextPosition = 0;
	}
	public function setVolume(vol:Number) {
		vol = Math.round(100 * Math.max(0, Math.min(1, vol)));
		if (vol !== this._volume) {
			this._volume = vol;
			this._sound.setVolume(this._volume);
			this.jsEvent('volumechange');
		}
	}
	public function setCurrentTime(pos:Number) {
		this._nextPosition = Math.round(1000*pos);
		if (this._playing) {
			this._sound.stop();
			this._sound.start(this._nextPosition/1000);
		}
		this.jsEvent("timeupdate");
	}
	public function play() {
		if (!this._playing && this._sound) {
			this._playing = true;
			this._sound.start(this._nextPosition/1000);
			this.jsEvent("play");
		}
	}
	public function pause() {
		if (this._playing) {
			this._playing = false;
			this._nextPosition = this._sound.position;
			this._sound.stop();
			this.jsEvent("pause");
		}
	}
	public function stop() {
		this._nextPosition = 0;
		if (this._playing) {
			this._playing = false;
			this._sound.stop();
		}
		this.jsEvent("pause");
	}

	/* js API: getters */
	public function getSrc():String {
		return (null === this._source || '' === this._source) ? null : this._source;
	}
	public function getVolume():Number {
		return this._volume / 100;
	}
	public function getCurrentTime():Number {
		return (this._playing ? this._sound.position : this._nextPosition)/ 1000;
	}
	public function getPaused():Boolean {
		return !this._playing;
	}
	public function getDuration():Number {
		return this._sound.duration / 1000;
	}
	public function getLoaded():Number {
		return this.getDuration() * this._sound.getBytesLoaded() / this._sound.getBytesTotal();
	}

	public function getAll():Object {
		return {
			src: this.getSrc(),
			volume: this.getVolume(),
			currentTime: this.getCurrentTime(),
			paused: this.getPaused(),
			duration: this.getDuration(),
			loaded: this.getLoaded()
		}
	}


	private function registerPublicMethods():Void {
		this.addDelayedCallback("setSrc", this, this.setSrc);
		this.addDelayedCallback("setVolume", this, this.setVolume);
		this.addDelayedCallback("setCurrentTime", this, this.setCurrentTime);
		this.addDelayedCallback("play", this, this.play);
		this.addDelayedCallback("pause", this, this.pause);
		this.addDelayedCallback("stop", this, this.stop);

		ExternalInterface.addCallback("getSrc", this, this.getSrc);
		ExternalInterface.addCallback("getVolume", this, this.getVolume);
		ExternalInterface.addCallback("getCurrentTime", this, this.getCurrentTime);
		ExternalInterface.addCallback("getPaused", this, this.getPaused);
		ExternalInterface.addCallback("getDuration", this, this.getDuration);
		ExternalInterface.addCallback("getLoaded", this, this.getLoaded);
		ExternalInterface.addCallback("getAll", this, this.getAll);
	}

	/* ExternalalInteface stuff */

	private function addDelayedCallback(name:String, ctx:Object, f:Function):Void {
		ExternalInterface.addCallback(name, null, function():Void {
			var args:Array = [];
			args.push.apply(args, arguments);
			setTimeout(function():Void {
				f.apply(ctx, args);
			}, 1);
		});
	}

	private function setupExternalInterface():Void {
		System.security.allowDomain('*');
		this.addDelayedCallback("setObjectID", this, setObjectID);
		this.registerPublicMethods();
		ExternalInterface.call("registerFlashElements");
	}

	private function setObjectID(objid:String):Void {
		if (this._objectID != objid) {
			this._objectID = objid;
			this.jsEvent("registered");
		}
	}

	private function jsEvent(evtype:String):Void {
		var args:Array = [];
		args.push.apply(args, arguments);
		args.shift();
		ExternalInterface.call("handleFlashEvent", this._objectID, evtype, args);
	}

	/* main */
	static function main():Void {
		_root.player = new MiniMP3();
	}
}
