function MyTimeRanges(ranges) {
    this._ranges = (ranges || []).slice();
    this.length = this._ranges.length;
}
MyTimeRanges.prototype.start = function FakeTimeRanges_start(index) {
    if (index < 0 || index >= this.length) throw new IndexSizeError(index + " out of range");
    return this._ranges[index];
};
MyTimeRanges.prototype.end = function FakeTimeRanges_end(index) {
    if (index < 0 || index >= this.length) throw new IndexSizeError(index + " out of range");
    return this._ranges[index];
};

MyTimeRanges.equal = function MyTimeRanges_equal(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0, l = a.length; i < l; ++i) {
        if (a.start(i) !== b.start(i) || a.end(i) !== b.end(i)) return false;
    }
    return true;
};

MyTimeRanges.lastEnd = function MyTimeRanges_lastEnd(ranges) {
    var last = 0;
    for (var i = 0, l = ranges.length; i < l; ++i) {
        last = Math.max(last, ranges.end(i));
    }
    return last;
};
