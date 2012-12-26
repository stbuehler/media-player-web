
/* Playlists:
 *
 * .current: index of currentItem() or null, if currentItem() is not part of the playlist
 *    .current may change anytime (new query in filter and so on)
 *    changes trigger onCurrentChange
 * .count: number of items in current playlist
 * .currentItem(): only changes after .setCurrent() or .seek() on the playlist.
 *    changes trigger onCurrentItemChange()
 *    .seek() always triggers the event, whether it changed or nor
 */


enyo.kind({
	name: "Media.Playlist.Abstract",
	kind: "enyo.Component",

	published: {
		current: null,
		db: null,
		source: null, /* only used by some "meta" playlists */
	},

	events: {
		onCurrentChange: "",
		onCurrentItemChange: "",
		onReset: "", /* reset is always followed by currentChange */
	},

	count: 0,

	create: function() {
		this.inherited(arguments);
		this._curItem = null;
		this.item = this.item.bind(this);
		if (this.db && this.dbChanged) this.dbChanged(null);
		if (this.current && this.currentChanged) this.currentChanged(null);
	},

	setCurrent: function(value) {
		value = (value === null || value === undefined || value === false) ? null : value >> 0;
		if (value !== null && (value < 0 || value >= this.count)) value = null;
		if (this.current !== value) {
			var oldValue = this.current;
			this.current = value;
			if (this.currentChanged) this.currentChanged(oldValue);
			if (this.current !== oldValue) {
				this.doCurrentChange({oldCurrent: oldValue, current: this.current});
			}
		}
		this._setCurrentItem(this.item(this.current));
	},

	/* @protected */
	_setCurrentItem: function(item, forcevent) {
		if (this._curItem !== item) {
			this._curItem = item;
			this.doCurrentItemChange({item: item});
		} else if (forcevent) {
			this.doCurrentItemChange({item: item});
		}
	},

	seek: function(offset) {
		var len = this.count, c = this.current, oldCurItem = this._curItem;
		if (null === c || !len) return false;
		this.doSeek(offset);
		if (this._curItem === oldCurItem) this.doCurrentItemChange({item: this._curItem}); // force event
		return true;
	},

	peek: function(offset) {
		var len = this.count, c = this.current, info, index;
		if (null === c || !len) return null;
		index = this.doPeek(offset);
		return { index: index, item: this.item(index) };
	},

	canSeek: function() {
		return (null !== this.current) || (this.source && this.source.canSeek());
	},

	/* @protected */
	doPeek: function(offset) {
		var len = this.count, c = this.current;
		return ((c + offset) % len + len) % len;
	},

	/* @protected */
	doSeek: function(offset) {
		this.setCurrent(this.doPeek(offset));
	},

	/* overwrite */
	item: function(ndx) {
		throw Error("abstract item() not implemented");
	},

	currentItem: function() {
		return this._curItem;
	},

	setDb: function(db) {
		if (this.db === db) return;
		var oldDb = this.db;
		this.db = db;

		if (this.dbChanged) this.dbChanged(oldDb);
	},
});

enyo.kind({
	name: "Media.Playlist.All",
	kind: "Media.Playlist.Abstract",

	dbChanged: function() {
		if (this.db) {
			var i, l, f;
			var files = this.db.files, albums = this.db.albums, artists = this.db.artists;
			l = this.count = files.length;
			for (i = 0; i < l; ++i) {
				f = files[i];
				if (!f.album) f.album = albums[f.album_id].name;
				if (!f.artist) f.artist = artists[f.artist_id].name;
			}
		} else {
			this.count = 0;
		}
		this.current = null;
		this._curItem = null;
		this.doReset();
		if (null === this.current) this.doCurrentChange({oldCurrent: null, current: null});
		if (null === this._curItem) this.doCurrentItemChange({item: null});
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
		onCurrentItemChange: "handleCurrentItemChange",
		onReset: "handleReset",
	},

	create: function() {
		var s = this.source;
		this.inherited(arguments);
		if (s && s === this.source) {
			this.source.setOwner(this);
			if (this.sourceChanged) this.sourceChanged(null);
		}
	},

	seek: function(offset) {
		var c = this.current;
		if (null === c && this.source) {
			var oldCurItem = this._curItem;
			if (!this.source.seek(offset)) return false;
			if (oldCurItem === this._curItem) this.doCurrentItemChange({item: this._curItem}); // force event
			return true;
		}
		return this.inherited(arguments);
	},

	peek: function(offset) {
		var len = this.count, c = this.current, info, index;
		if (null === c && this.source) {
			if (null === (info = this.source.peek(offset))) return null;
			info.index = this.revIndex(info.index);
			return info;
		}
		return this.inherited(arguments);
	},

	canSeek: function() {
		return this.inherited(arguments) || (this.source && this.source.canSeek());
	},

	item: function(ndx) {
		if (ndx < 0 || ndx >= this.count) return null;
		return this.source.item(this.subIndex(ndx));
	},

	setSource: function(value) {
		var oldSource = this.source;
		if (oldSource === value) return;

		if (value) {
			value.setOwner(undefined);
			value.setCurrent(null);
		}
		this.source = value;

		if (oldSource && oldSource.owner === this) {
			oldSource.setOwner(undefined);
			oldSource.setCurrent(null);
		}
		if (this.source) {
			this.source.setOwner(this);
			this.source.setDb(this.db);
		}

		if (this.sourceChanged) this.sourceChanged(oldSource);
	},

	sourceChanged: function() {
		if (!this.source) {
			this.count = 0;
			this.current = null;
			this.doReset();
			if (null === this.current) this.doCurrentChange({oldCurrent: null, current: null});
		} else {
			this.update();
		}
	},

	removeComponent: function(inComponent) {
		if (this.source === inComponent) {
			this.setSource(undefined);
		}
	},

	dbChanged: function() {
		if (this.source) this.source.setDb(this.db);
	},

	currentChanged: function() {
		if (this.source) {
			this.source.setCurrent(this.subIndex(this.current));
		}
	},

	handleCurrentItemChange: function(inSender, inEvent) {
		if (inSender === this) return false; /* don't handle our own events */
		/* we check for current item changes in setCurrent and seek manually, so ignore this */
		return true;
	},

	handleCurrentChange: function(inSender, inEvent) {
		if (inSender === this) return false; /* don't handle our own events */
		var c = this.revIndex(inEvent.current);
		if (c !== null) this.setCurrent(c);
		return true;
	},

	handleReset: function(inSender, inEvent) {
		if (inSender === this) return false; /* don't handle our own events */
		if (this.source) this.update();
		return true;
	},

	update: function() {
		this.current = null;

		this.runUpdate();

		this.doReset();
		if (this.current === null) {
			this.current = this.revIndex(this.source.current);
			this.doCurrentChange({oldCurrent: null, current: this.current});
		}
	},

	/* overwrite */
	runUpdate: function() {
		throw Error("abstract runUpdate() not implemented");
	},

	/* overwrite */
	subIndex: function(ndx) {
		throw Error("abstract subIndex() not implemented");
	},

	/* overwrite */
	revIndex: function(ndx) {
		throw Error("abstract revIndex() not implemented");
	},
});

enyo.kind({
	name: "Media.Playlist.IndexedNestedAbstract",
	kind: "Media.Playlist.NestedAbstract",

	create: function() {
		this._index = [];
		this._revIndex = [];
		this.inherited(arguments);
	},

	subIndex: function(ndx) {
		var i = this._index[ndx];
		return (i === undefined) ? null : i;
	},

	revIndex: function(ndx) {
		var i = this._revIndex[ndx];
		return (i === undefined) ? null : i;
	},

	runUpdate: function() {
		this.buildIndex();

		var i, l, index = this._index, revIndex;
		this.count = l = index.length;
		this._revIndex = revIndex = [];

		for (i = 0; i < l; ++i) {
			revIndex[index[i]] = i;
		}
	},

	/* overwrite */
	buildIndex: function() {
		this._index = [];
		throw Error("abstract buildIndex() not implemented");
	},
});

enyo.kind({
	name: "Media.Playlist.Sort",
	kind: "Media.Playlist.IndexedNestedAbstract",

	buildIndex: function() {
		var i, l = this.source.count, index;
		this._index = index = [];
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
				if (0 != (r = mystr_sort(a.artist, b.artist))) return r;
				if (0 != (r = mystr_sort(a.album, b.album))) return r;
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
	kind: "Media.Playlist.IndexedNestedAbstract",

	published: {
		query: "",
	},

	queryChanged: function() {
		if (this.source) this.update();
	},

	buildIndex: function() {
		var i, l = this.source.count, index;
		var filter = Media.Playlist.Filter.filterfun.bind(undefined, this.db, this.source.item, this.query.toUpperCase());
		this._index = index = [];
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
				if (string_contains(a.artist, q)) return true;
				if (string_contains(a.album, q)) return true;
				return false;
			}
			return library_search;
		})(),
	}
});

enyo.kind({
	name: "Media.Playlist.PartyShuffle",
	kind: "Media.Playlist.NestedAbstract",

	published: {
		shuffle: false,
	},

	create: function() {
		this.prg = PRG();
		this.history = [];
		this.inherited(arguments);
	},

	setCurrent: function(value) {
		this.inherited(arguments);

		if (this._curItem && this.history[0] !== this._curItem) {
			this.history.unshift(this._curItem);
			this.history.splice(10);
		}
	},

	subIndex: function(ndx) {
		return ndx;
	},

	revIndex: function(ndx) {
		return ndx;
	},

	runUpdate: function() {
		this.count = this.source.count;
	},

	nextPrg: function(prg, history) {
		if (this.count > 100) {
			var ndx = prg.range(this.count - 1);
			if (ndx >= this.current) ++ndx;
		} else {
			var urls = {}, i, l;
			for (i = 0, l = Math.min(history.length, this.count >> 1); i < l; ++i) {
				urls[history[i].url] = true;
			}

			var ndxlist = [];
			for (i = 0, l = this.count; i < l; ++i) {
				if (urls[this.item(i).url]) ndxlist.push(i);
			}

			/* unique, ascending */
			ndxlist = ndxlist.sort().filter(function(el,i,a){if(i==a.indexOf(el))return 1;return 0});

			var ndx = prg.range(this.count - ndxlist.length);
			for (i = 0, l = ndxlist.length; i < l; ++i) {
				if (ndx >= ndxlist[i]) ++ndx;
			}
		}
		return ndx;
	},

	/* @protected */
	doPeek: function(offset) {
		if (this.count < 2 || !this.shuffle) return this.inherited(arguments);

		if (offset < 0 && this.history.length + offset >= 0) {
			var item = this.history[-1-offset];
			for (i = 0, l = this.count; i < l; ++i) {
				if (this.item(i) === item) return i;
			}

			return this.nextPrg(this.prg.clone(), []);
		}

		return this.nextPrg(this.prg.clone(), this.history);
	},

	/* @protected */
	doSeek: function(offset) {
		if (this.count < 2 || !this.shuffle) return this.inherited(arguments);

		if (offset < 0) {
			var go = -offset;
			if (go < this.history.length) {
				var item = this.history[go];
				for (i = 0, l = this.count; i < l; ++i) {
					if (this.item(i) === item) {
						this.history.splice(0, go + 1);
						this.setCurrent(i);
						return;
					}
				}
			}

			this.history = [];
		}

		this.setCurrent(this.nextPrg(this.prg, this.history));
	},
});
