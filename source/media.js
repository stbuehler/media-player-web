
enyo.dispatcher.listen(document, "contextmenu");

function mystr_sort(m, n) {
	var a = m.toUpperCase(), b = n.toUpperCase(), r;
	if (a == b) return 0;
	if (a == '') return 1;
	if (b == '') return -1;
	if (0 != (r = a.localeCompare(b))) return r;
	if (0 != (r = m.localeCompare(n))) return r;
	return 0;
}

function library_default_sort(db, i, j) {
	var a = db.files[i], b = db.files[j];
	var r;
	if (0 != (r = mystr_sort(db.artists[a.artist].name, db.artists[b.artist].name))) return r;
	if (0 != (r = mystr_sort(db.albums[a.album].name, db.albums[b.album].name))) return r;
	if (a.track != b.track) return a.track - b.track;
	if (0 != (r = mystr_sort(a.name, b.name))) return r;
	if (0 != (r = mystr_sort(a.url, b.url))) return r;
	return 0;
}

function string_contains(haystack, needle) {
	if (!haystack) return false;
	return -1 != haystack.toUpperCase().indexOf(needle);
}

function library_search(db, i, q) {
	if (!q) return true;
	var a = db.files[i];
	if (string_contains(a.title, q)) return true;
	if (string_contains(db.artists[a.artist].name, q)) return true;
	if (string_contains(db.albums[a.album].name, q)) return true;
	return false;
}

function fix2(i) {
	if (i < 10) return "0" + i;
	return "" + i;
}

enyo.kind({
	name: "Media.Library",
	classes: "media-library enyo-fit",
	layoutKind: "FittableRowsLayout",
	components: [
		{name: "player", kind: "Media.Player", onEnded: "ended", onNext: "next", onPrev: "prev", onPlay: "playerPlay", onStopped: "playerStopped" },
		{kind: "onyx.Toolbar", layoutKind: "FittableColumnsLayout", components: [
			{kind: "onyx.InputDecorator", fit: true, noStretch: true, layoutKind: "FittableColumnsLayout", components: [
				{name: "search", kind: "onyx.Input", placeholder: "Search...", fit: true, oninput: "changedSearch", onkeydown: "searchKeyDown"},
				{kind: "Image", src: "lib/onyx/images/search-input-search.png", style: "height: 20px; width: 20px;"}
			]}
		]},
		{name: "list", kind: "List", count: 0, multiSelect: false, fit: true, classes: "media-library-list",
		 onSelect: "listSelect", onSetupItem: "setupItem", oncontextmenu: "listContextMenu", components: [
			{name: "item", classes: "media-library-item enyo-border-box", ondblclick: "playTapped", components: [
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
		this.sorted = [];
		this.filtered = [];
		this.playSelectedFile = false;
		this.playSelectedFiltered = false;
		this.stopped = true;
		this.changedSearchTimer = false;
		this.inherited(arguments);
	},
	setupItem: function(inSender, inEvent) {
		// this is the row we're setting up
		var i = inEvent.index;
		if (i >= this.filtered.length) return;

		var item = this.db.files[this.filtered[i]];

		this.$.item.addRemoveClass("media-library-selected", inSender.isSelected(i));
		this.$.item.addRemoveClass("media-library-playing", this.playSelectedFiltered === i);

		this.$.index.setContent('#' + i);
		this.$.track.setContent(item.track != 0 ? item.track : '');
		this.$.artist.setContent(this.db.artists[item.artist].name);
		this.$.album.setContent(this.db.albums[item.album].name);
		this.$.title.setContent(item.name);
		this.$.genre.setContent(item.genre);

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

	listSelect: function(inSender, inEvent) {
		if (this.stopped) {
			var player = this.$.player, oldSelected = this.playSelectedFiltered;
			this.playSelectedFiltered = inEvent.key;
			this.playSelectedFile = this.filtered[this.playSelectedFiltered];
			player.setSource(this.db.files[this.playSelectedFile].url);
			this.$.player.setEnablePrevNext(true);
			this.$.list.renderRow(oldSelected);
			this.$.list.renderRow(inEvent.key);
		}
	},

	playTapped: function(inSender, inEvent) {
		var list = this.$.list, oldSelected = this.playSelectedFiltered;

		var player = this.$.player;
		this.playSelectedFiltered = inEvent.rowIndex;
		this.$.player.setEnablePrevNext(true);
		this.playSelectedFile = this.filtered[this.playSelectedFiltered];
		player.stop();
		player.setSource(this.db.files[this.playSelectedFile].url);
		player.play();

		list.renderRow(oldSelected);
		list.renderRow(this.playSelectedFiltered);
	},

	refreshFilter: function() {
		var i, l, sorted = this.sorted, files = this.db.files, q = this.$.search.getValue().toUpperCase();
		this.filtered = [];
		this.playSelectedFiltered = false;
		for (i = 0, l = sorted.length; i < l; ++i) {
			f = sorted[i];
			files[f].filterNdx = i;
			if (library_search(this.db, f, q)) {
				if (this.playSelectedFile !== false && this.playSelectedFile === f) {
					this.playSelectedFiltered = this.filtered.length;
				}
				this.filtered.push(f);
			}
		}
		this.$.player.setEnablePrevNext(false !== this.playSelectedFiltered);
		this.$.list.setCount(this.filtered.length);
		this.$.list.reset();
	},

	refreshSort: function() {
		var files = this.db.files, i, l = files.length, sorted;
		this.sorted = sorted = [];
		for (i = 0; i < l; ++i) sorted.push(i);
		sorted.sort(library_default_sort.bind(null, this.db));
		for (i = 0; i < l; ++i) {
			files[sorted[i]].sortedNdx = i;
		}
		this.refreshFilter();
	},

	changedSearch: function() {
		if (false !== this.changedSearchTimer) {
			window.clearTimeout(this.changedSearchTimer);
		}
		this.changedSearchTimer = window.setTimeout(function() {
			this.changedSearchTimer = false;
			this.refreshFilter();
		}.bind(this), 250);
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
		var list = this.$.list, oldSelected = this.playSelectedFiltered, l = this.filtered.length, wasStopped = this.stopped;
		this.playSelectedFile = false;
		if (false === this.playSelectedFiltered) return;
		this.playSelectedFiltered = (((this.playSelectedFiltered + offset) % l) + l) % l;

		var player = this.$.player;
		this.playSelectedFile = this.filtered[this.playSelectedFiltered];
		player.setSource(this.db.files[this.playSelectedFile].url);
		player.stop(); /* replay from beginning */
		if (!wasStopped) player.play();

		list.renderRow(oldSelected);
		list.renderRow(this.playSelectedFiltered);
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

	playerPlay: function() {
		this.stopped = false;
	},
	playerStopped: function() {
		this.stopped = true;
	},

	setDB: function(db) {
		this.db = db;
		this.refreshSort();
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
	}
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
	},
});
