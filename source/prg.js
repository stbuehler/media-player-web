
function PRG() {
	function rndkey(keylen) {
		var key = [], i;
		for (i = 0; i < keylen; ++i) key[i] = (Math.random()*256) >> 0;
		return key;
	}

	function init(key) {
		var seed = [], i, j, l = key.length, t;
		for (i = 0; i < 256; ++i) seed[i] = i;
		for (i = j = 0; i < 256; ++i) {
			j = (j + seed[i] + key[i % l]) % 256;
			t = seed[i]; seed[i] = seed[j]; seed[j] = t;
		}
		return seed;
	}

	function obj(seed, i, j) {
		function clone() {
			return obj(seed.slice(0), i, j);
		}
		function next() {
			var m, n;
			i = (i+1) % 256;
			j = (j + (m = seed[i])) % 256;
			n = seed[j];
			seed[i] = n; seed[j] = m;
			return (m+n) % 256;
		}
		function bytes(c) {
			var r = next(), i;
			for (i = 1; i < c; ++i) {
				r = (r << 8) + next();
			}
			return r;
		}
		function range(n) {
			var count = 1, top = 256;
			while (n > top) {
				top = top << 8;
				++count;
			}

			var rem = top % n;
			var n2 = top - rem;

			var k = 0, l = 0, r;
			for (var i = 0; i < 20; ++i) { // limits loops
				r = bytes(count);
				if (r < n2) return r % n;
				k = (k + (r - n2)) % n;
				l = (l + rem) % n;
				if (0 == l) return k; // "perfect"
			}
			return k;
		}
		return {
			clone: clone,
			next: next,
			range: range
		};
	}

	return obj(init(rndkey(8)), 0, 0);
}
