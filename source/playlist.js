
enyo.kind({
	name: "Media.Playlist.Abstract",
	kind: "enyo.Component",

	published: {
		current: false,
		db: undefined,
		source: undefined, /* only used by some "meta" playlists */
	},

	events: {
		onCurrentChange: "",
		onReset: "", /* reset is always followed by currentChange */
	},

	count: 0,

	create: function() {
		this.inherited(arguments);
		this.item = this.item.bind(this);
		if (this.source && this.sourceChanged) {
			this.source.setOwner(this);
			this.sourceChanged(undefined);
		}
		if (this.db && this.dbChanged) this.dbChanged(undefined);
		if (this.current && this.currentChanged) this.currentChanged(false);
	},

	setCurrent: function(value) {
		value = (value === false) ? false : value >> 0;
		if (value !== false && (value < 0 || value >= this.count)) value = false;
		if (this.current !== value) {
			var oldValue = this.current;
			this.current = value;
			if (this.currentChanged) this.currentChanged(oldValue);
			if (this.current !== oldValue) {
				this.doCurrentChange({oldCurrent: oldValue, current: this.current});
			}
		}
	},

	seek: function(offset) {
		var len = this.count, c = this.current;
		if (false === c && this.source) return this.source.seek(offset);
		if (!len) return false;
		this.setCurrent(((c + offset) % len + len) % len);
		return true;
	},

	/* overwrite */
	item: function(ndx) {
		return undefined;
	},

	setDb: function(db) {
		if (this.db === db) return;
		var oldDb = this.db;
		this.db = db;

		if (this.source) this.source.setDb(this.db);
		if (this.dbChanged) this.dbChanged(oldDb);
	},

	setSource: function(value) {
		var oldSource = this.source;
		if (oldSource === value) return;
		this.source = value;

		if (oldSource && oldSource.owner === this) {
			oldSource.setOwner(undefined);
		}
		if (this.source) {
			this.source.setOwner(this);
		}

		if (this.sourceChanged) this.sourceChanged(oldSource);
	},

	removeComponent: function(inComponent) {
		if (this.source === inComponent) {
			this.setSource(undefined);
		}
	},

	canSeek: function() {
		return (false !== this.current) || (this.source && this.source.canSeek());
	},
});

enyo.kind({
	name: "Media.Playlist.All",
	kind: "Media.Playlist.Abstract",

	dbChanged: function() {
		this.count = this.db.files.length;
		this.current = false;
		this.doReset();
		this.doCurrentChange();
	},

	item: function(ndx) {
		return this.db.files[ndx];
	},
});


enyo.kind({
	name: "Media.Playlist.NestedAbstract",
	kind: "Media.Playlist.Abstract",

	handlers: {
		onCurrentChange: "handleCurrentChange",
		onReset: "handleReset",
	},

	create: function() {
		this.index = [];
		this.revIndex = [];
		this.inherited(arguments);
	},

	item: function(ndx) {
		if (ndx < 0 || ndx >= this.count) return undefined;
		return this.source.item(this.index[ndx]);
	},

	sourceChanged: function() {
		if (!this.source) {
			this.index = [];
			this.revIndex = [];
			this.count = 0;
			var oldcurrent = this.current;
			this.current = false;
			this.doReset();
			this.doCurrentChange({oldCurrent: false, current: this.current});
		} else {
			this.source.current = false;
			this.runUpdate();
		}
	},

	currentChanged: function() {
		if (this.source) {
			if (this.current !== false) this.source.setCurrent(this.index[this.current]);
		} else {
			this.current = false;
		}
	},

	handleCurrentChange: function(inSender, inEvent) {
		if (inSender === this) return false; /* don't handle our own events */
		if (this.current === false) {
			var sc = this.source.current, c;
			if (sc !== false) {
				c = this.revIndex[sc];
				if (undefined !== c) this.setCurrent(c);
			}
		}
		return true;
	},

	handleReset: function(inSender, inEvent) {
		if (inSender === this) return false; /* don't handle our own events */
		if (this.source) this.runUpdate();
		return true;
	},

	runUpdate: function() {
		this.current = false;

		this.buildIndex();

		var i, l, index = this.index, revIndex;
		this.count = l = index.length;
		this.revIndex = revIndex = [];

		for (i = 0; i < l; ++i) {
			revIndex[index[i]] = i;
		}

		var newCurrent = false;
		var sc = this.source.current, c;
		if (sc !== false) {
			c = revIndex[sc];
			if (undefined !== c) {
				newCurrent = c;
			}
		}

		this.doReset();
		this.current = newCurrent;
		this.doCurrentChange({oldCurrent: false, current: newCurrent});
	},

	/* overwrite */
	buildIndex: function() {
		this.index = [];
	},
});

enyo.kind({
	name: "Media.Playlist.Sort",
	kind: "Media.Playlist.NestedAbstract",

	buildIndex: function() {
		var i, l = this.source.count, index;
		this.index = index = [];
		for (i = 0; i < l; ++i) index.push(i);
		index.sort(Media.Playlist.Sort.sortfun.bind(undefined, this.db, this.source.item))
	},

	statics: {
		sortfun: (function() {
			function mystr_sort(m, n) {
				var a = m.toUpperCase(), b = n.toUpperCase(), r;
				if (a == b) return 0;
				if (a == '') return 1;
				if (b == '') return -1;
				if (0 != (r = a.localeCompare(b))) return r;
				if (0 != (r = m.localeCompare(n))) return r;
				return 0;
			}

			function library_default_sort(db, getter, i, j) {
				var a = getter(i), b = getter(j);
				var r;
				if (0 != (r = mystr_sort(db.artists[a.artist].name, db.artists[b.artist].name))) return r;
				if (0 != (r = mystr_sort(db.albums[a.album].name, db.albums[b.album].name))) return r;
				if (a.track != b.track) return a.track - b.track;
				if (0 != (r = mystr_sort(a.name, b.name))) return r;
				if (0 != (r = mystr_sort(a.url, b.url))) return r;
				return 0;
			}
			return library_default_sort;
		})(),
	}
});

enyo.kind({
	name: "Media.Playlist.Filter",
	kind: "Media.Playlist.NestedAbstract",

	published: {
		query: "",
	},

	queryChanged: function() {
		this.runUpdate();
	},

	buildIndex: function() {
		var i, l = this.source.count, index;
		var filter = Media.Playlist.Filter.filterfun.bind(undefined, this.db, this.source.item, this.query.toUpperCase());
		this.index = index = [];
		for (i = 0; i < l; ++i) {
			if (filter(i)) index.push(i);
		}
	},

	statics: {
		filterfun: (function() {
			function string_contains(haystack, needle) {
				if (!haystack) return false;
				return -1 != haystack.toUpperCase().indexOf(needle);
			}

			function library_search(db, getter, q, i) {
				if (!q) return true;
				var a = getter(i);
				if (string_contains(a.name, q)) return true;
				if (string_contains(db.artists[a.artist].name, q)) return true;
				if (string_contains(db.albums[a.album].name, q)) return true;
				return false;
			}
			return library_search;
		})(),
	}
});
