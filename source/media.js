
enyo.dispatcher.listen(document, "contextmenu");

enyo.kind({
	name: "Media.Library",
	classes: "media-library enyo-fit",
	layoutKind: "FittableRowsLayout",
	components: [
		{name: "player", kind: "Media.Player", onEnded: "ended", onNext: "next", onPrev: "prev", onPlay: "playerPlay", onStopped: "playerStopped", onShuffleChange: "shuffleChange" },
		{kind: "onyx.Toolbar", layoutKind: "FittableColumnsLayout", components: [
			{kind: "onyx.InputDecorator", fit: true, noStretch: true, layoutKind: "FittableColumnsLayout", components: [
				{name: "search", kind: "onyx.Input", placeholder: "Search...", fit: true, oninput: "changedSearch", onkeydown: "searchKeyDown"},
				{kind: "Image", src: "lib/onyx/images/search-input-search.png", style: "height: 20px; width: 20px;"}
			]}
		]},
		{name: "list", kind: "List", count: 0, noSelect: true, fit: true, classes: "media-library-list",
		 onSelect: "listSelect", onSetupItem: "setupItem", oncontextmenu: "listContextMenu", components: [
			{name: "item", classes: "media-library-item enyo-border-box", onclick: "listClick", ondblclick: "listDblClick", components: [
				{name: "play", classes: "enyo-unselectable media-library-play", ontap: "playTapped"},
				{name: "index", classes: "media-library-index"},
				{name: "track", classes: "media-library-track"},
				{name: "artist", classes: "media-library-artist"},
				{name: "album", classes: "media-library-album"},
				{name: "title", classes: "media-library-title"},
				{classes:"media-library-pull-right", components:[
					{name: "genre", classes: "media-library-genre"},
					{name: "len", classes: "media-library-length"}
				]}
			]}
		]},
		{name: "itemMenu", kind: "onyx.Menu", floating: true, modal: false, components: [
			{content: "Play"}
		]},
		{kind:"enyo.Signals",onkeydown:"handleKeyDown"}
	],
	names: [],
	constructor: function() {
		this.db = {files:[], albums: [], artits: []};
		this.stopped = true;
		this.pendingDeselect = false;
		this.changedSearchTimer = false;
		this.sessionLoaded = false;
		this.listLastClickIndex = 0;
		this.inherited(arguments);
	},
	create: function() {
		this.inherited(arguments);
		this.playlist_all = new Media.Playlist.Sort({source: new Media.Playlist.All() });
		this.playlist_filter = new Media.Playlist.Filter({source: this.playlist_all});
		this.playlist = new Media.Playlist.PartyShuffle({source: this.playlist_filter, onCurrentChange: "playlistCurrentChange", onReset: "playlistReset", onCurrentItemChange: "playlistCurrentItemChange" })
		this.playlist.setDb(this.db);
		this.playlist.setOwner(this);
	},
	setupItem: function(inSender, inEvent) {
		// this is the row we're setting up
		var i = inEvent.index;
		if (i < 0 || i >= this.playlist.count) return;

		var item = this.playlist.item(i);

		this.$.item.addRemoveClass("media-library-selected", inEvent.selected);
		this.$.item.addRemoveClass("media-library-playing", this.playlist.current === i);

		this.$.index.setContent('#' + (i+1));
		this.$.track.setContent(item.track != 0 ? item.track : '');
		this.$.artist.setContent(item.artist);
		this.$.album.setContent(item.album);
		this.$.title.setContent(item.name);
		this.$.genre.setContent(item.genre);

		function fix2(i) {
			if (i < 10) return "0" + i;
			return "" + i;
		}
		var h, m, s = item.length;
		m = Math.floor(s / 60);
		h = Math.floor(m / 60);
		m = m % 60; s = s % 60;
		var t;
		if (h > 0) {
			t = h + ":" + fix2(m) + ":" + fix2(s);
		} else if (m > 0) {
			t = m + ":" + fix2(s);
		} else {
			t = s + "s";
		}

		this.$.len.setContent(t);
	},

	playlistCurrentItemChange: function(inSender, inEvent) {
		var item = inEvent.item;
		if (item) {
			this.$.player.setSource(item.url);
			document.title = item.artist + " - " + item.name;
		} else {
			this.$.player.setSource(false);
			document.title = "Media Player";
		}
		this.storeSession();
	},

	playlistCurrentChange: function(inSender, inEvent) {
		var player = this.$.player, list = this.$.list;
		player.setEnablePrevNext(this.playlist.canSeek());

		if (false !== inEvent.oldCurrent) list.renderRow(inEvent.oldCurrent);
		if (false !== inEvent.current) list.renderRow(inEvent.current);

		if (this.playlist.current !== false) {
			var selRow = [], selection = list.getSelection().getSelected(), k;
			for (k in selection) {
				if (selection.hasOwnProperty(k)) selRow.push(k >> 0);
			}
			if (0 === selRow.length) {
				this.$.list.scrollToRow(this.playlist.current);
			}
		}
	},

	playlistReset: function() {
		this.$.list.setCount(this.playlist.count);
		this.$.list.reset();
	},

	listSelect: function(inSender, inEvent) {
		if (this.stopped) {
			this.playlist.setCurrent(inEvent.key);
		}
	},

	listClick: function(inSender, inEvent) {
		var list = this.$.list, index = inEvent.index;
		this.listLastClickIndex = index;
		if (list.isSelected(index)) {
			list.deselect(index);
		} else {
			list.select(index);
		}
		return true;
	},

	listDblClick: function(inSender, inEvent) {
		var list = this.$.list, index = this.listLastClickIndex; // dblclick has index == -1, probably due to (de)select calls
		var player = this.$.player;

		list.select(index);

		player.stop();
		this.playlist.setCurrent(index);
		player.play();

		return true;
	},

	playTapped: function(inSender, inEvent) {
		this.pendingDeselect = false;
		var player = this.$.player;

		player.stop();
		this.playlist.setCurrent(inEvent.index);
		player.play();

		inEvent.preventDefault();
		return true;
	},

	refreshFilter: function() {
		this.playlist_filter.setQuery(this.$.search.getValue());
	},

	changedSearch: function() {
		if (false !== this.changedSearchTimer) {
			window.clearTimeout(this.changedSearchTimer);
		}
		this.changedSearchTimer = window.setTimeout(function() {
			this.changedSearchTimer = false;
			this.refreshFilter();
		}.bind(this), 250);
		this.storeSession();
	},
	searchKeyDown: function(sender, event) {
		if (event.keyIdentifier === "Enter") {
			if (false !== this.changedSearchTimer) {
				window.clearTimeout(this.changedSearchTimer);
			}
			this.refreshFilter();
			return true;
		}
	},

	seek: function(offset) {
		var wasStopped = this.stopped;
		var player = this.$.player;

		if (!this.playlist.seek(offset)) wasStopped = true; /* stop if seek fails */
		player.stop(); /* replay from beginning */
		if (!wasStopped) player.play();
	},

	ended: function() {
		this.stopped = false;
		this.seek(1);
	},
	next: function() {
		this.seek(1);
	},
	prev: function() {
		this.seek(-1);
	},

	shuffleChange: function(sender, event) {
		this.playlist.setShuffle(event.shuffle);
	},

	playerPlay: function() {
		this.stopped = false;
	},
	playerStopped: function() {
		this.stopped = true;
	},

	setDB: function(db) {
		this.db = db;
		this.playlist.setDb(db);
	},

	rendered: function() {
		this.inherited(arguments);
		/* recalc fitting after timeout, fixing bug in mozilla */
		window.setTimeout(function() {
			this.reflow();
		}.bind(this), 10);
	},

	handleKeyDown: function(sender, event) {
		var l;
		switch (event.keyIdentifier) {
		case "PageDown":
			l = this.$.list;
			l.setScrollTop(Math.min(l.getScrollBounds().maxTop, l.scrollTop + l.getBounds().height));
			return true;
		case "PageUp":
			l = this.$.list;
			l.setScrollTop(Math.max(0, l.scrollTop - l.getBounds().height));
			return true;
		case "Home":
			l = this.$.list;
			l.setScrollTop(0);
			return true;
		case "End":
			l = this.$.list;
			l.setScrollTop(l.getScrollBounds().maxTop);
			return true;
		}
	},

	listContextMenu: function(sender, event) {
		if (event.button === 2) {
			event.preventDefault();

			return true;
			var pos = {top: event.clientY, left: event.clientX};
			this.$.itemMenu.activatorOffset = pos;
			this.$.itemMenu.applyPosition(pos);
			this.$.itemMenu.show();
			return true;
		}
	},

	loadSession: function() {
		var session = sessionStorage.getItem("media-player");
		if (session) {
			session = JSON.parse(session);
			if (session.query) {
				this.$.search.setValue(session.query);
				this.refreshFilter();
			}
			if (session.url) {
				var i, l, s = this.playlist;
				while (s.source) s = s.source;
				for (i = 0, l = s.count; i < l; ++i) {
					if (s.item(i).url === session.url) {
						s.setCurrent(i);
						break;
					}
				}
				try {
					if (session.currentTime) {
						this.$.player.audio.setCurrentTime(session.currentTime);
						if (session.playing) this.$.player.play();
					}
				} catch (e) {
					console.log("load session warning: ", e);
				}
			}
			this.$.player.setShuffle(session.shuffle);
			if (session.history) this.playlist.history = session.history;
		}
		this.sessionLoaded = true;
		enyo.dispatcher.listen(window, "beforeunload", function() {
			this.storeSession();
		}.bind(this));
	},

	storeSession: function() {
		try {
			if (!this.sessionLoaded) return;
			var session = {};
			session.url = this.$.player.source;
			session.query = this.$.search.getValue();
			if (session.url) {
				session.playing = this.$.player.running;
				session.currentTime = this.$.player.audio.currentTime;
			}
			session.history = this.playlist.history;
			session.shuffle = this.playlist.shuffle;
			sessionStorage.setItem("media-player", JSON.stringify(session));
		} catch (e) {
			console.log("Couldn't store session: ", e);
		}
	},
});

enyo.kind({
	name: "MediaApp",
	components: [
		{name:"library", kind:"Media.Library", fit: true}
	],

	constructor: function(dburl) {
		this.dburl = dburl || 'music.json';
		this.inherited(arguments);
	},

	create: function() {
		this.inherited(arguments);
		new enyo.Ajax( { cacheBust: false, url: this.dburl } ).response( this, 'loadDB' ).go();
	},

	loadDB: function(req, db) {
		this.$.library.setDB(db);
		this.$.library.loadSession();
	},
});
