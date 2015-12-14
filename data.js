'use strict';

/*

	Rikaikun
	Copyright (C) 2010 Erek Speed
	http://code.google.com/p/rikaikun/

	---

	Originally based on Rikaichan 1.07
	by Jonathan Zarate
	http://www.polarcloud.com/

	---

	Originally based on RikaiXUL 0.4 by Todd Rudick
	http://www.rikai.com/
	http://rikaixul.mozdev.org/

	---

	This program is free software; you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation; either version 2 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program; if not, write to the Free Software
	Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA

	---

	Please do not change or remove any of the copyrights or links to web pages
	when modifying any of the files. - Jon

*/

function rcxDict(loadNames) {
	this.loadDictionary();
	if (loadNames) this.loadNames();
	this.loadDIF();
}

var difRules;

rcxDict.prototype = {
	config: {},

	setConfig: function(c) {
		this.config = c;
	},

	//

	fileRead: function(url, charset) {
		var req = new XMLHttpRequest();
		req.open("GET", url, false);
		req.send(null);
		return req.responseText;
	},

	fileReadArray: function(name, charset) {
		var a = this.fileRead(name, charset).split('\n');
		// Is this just in case there is blank shit in the file.  It was writtin by Jon though.
		// I suppose this is more robust
		while ((a.length > 0) && (a[a.length - 1].length == 0)) {
			a.pop();
		}
		return a;
	},

	find: function(data, text) {
		const tlen = text.length;
		var beg = 0;
		var end = data.length - 1;
		var i;
		var mi;
		var mis;

		while (beg < end) {
			mi = (beg + end) >> 1;
			i = data.lastIndexOf('\n', mi) + 1;

			mis = data.substr(i, tlen);
			if (text < mis) {
				end = i - 1;
			} else if (text > mis) {
				beg = data.indexOf('\n', mi + 1) + 1;
			} else {
				return data.substring(i, data.indexOf('\n', mi + 1));
			}
		}
		return null;
	},

	//

	loadNames: function() {
		if ((this.nameDict) && (this.nameIndex)) return;
		/*this.nameDict = this.fileRead(rcxNamesDict.datURI, rcxNamesDict.datCharset);
		this.nameIndex = this.fileRead(rcxNamesDict.idxURI, rcxNamesDict.idxCharset);*/
		this.nameDict = this.fileRead(chrome.extension.getURL("data/names.dat"));
		this.nameIndex = this.fileRead(chrome.extension.getURL("data/names.idx"));
	},

	//	Note: These are mostly flat text files; loaded as one continous string to reduce memory use
	loadDictionary: function() {
		/* this.wordDict = this.fileRead(rcxWordDict.datURI, rcxWordDict.datCharset);
		this.wordIndex = this.fileRead(rcxWordDict.idxURI, rcxWordDict.idxCharset); */
		this.wordDict = this.fileRead(chrome.extension.getURL("data/dict.dat"));
		this.wordIndex = this.fileRead(chrome.extension.getURL("data/dict.idx"));
		this.kanjiData = this.fileRead(chrome.extension.getURL("data/kanji.dat"), 'UTF-8');
		this.radData = this.fileReadArray(chrome.extension.getURL("data/radicals.dat"), 'UTF-8');
	},

	loadDIF: function() {
		var difReasons = [];
		difRules = [];

		var lines = this.fileReadArray(chrome.extension.getURL("data/deinflect.dat"), 'UTF-8');
		var prevLen = -1;
		var g, o;

		// i = 1: skip header
		for (var i = 1; i < lines.length; ++i) {
			var f = lines[i].split('\t');

			if (f.length == 1) {
				difReasons.push(f[0]);
			}
			else if (f.length == 4) {
				if (prevLen != f[0].length) {
					prevLen = f[0].length;
					g = {
						flen: prevLen,
						from: [],
						to: [],
						type: [],
						reason: [],
						length: 0
					};
					difRules.push(g);
				}
				g.from.push(f[0]);
				g.to.push(f[1]);
				g.type.push(f[2] >> 8);
				g.reason.push(difReasons[f[3]]);
				g.length++;
			}
		}
	},

	deinflect: function(word) {
		var o = {
			word: word,
			type: 0xFF,
			reason: ''
		};
		var r = [o];
		var have = {};
		have[word] = 0;

		var i, j, k;
		i = 0;

		do {
			word = r[i].word;
			var wordLen = word.length;
			var type = r[i].type;

			for (j = 0; j < difRules.length; ++j) {
				var g = difRules[j];
				if (g.flen <= wordLen) {
					var end = word.substr(-g.flen);
					var rtype = g.type;
					var rfrom = g.from;
					for (k = 0; k < g.length; ++k) {
						if ((type & rtype[k]) && (end == g.from[k])) {
							var newWord = word.substr(0, word.length - rfrom[k].length) + g.to[k];
							if (newWord.length <= 1) {
								continue;
							}
							o = {};
							if (have[newWord] != undefined) {
								o = r[have[newWord]];
								o.type |= rtype[k];
								continue;
							}
							have[newWord] = r.length;
							if (r[i].reason.length) {
								o.reason = g.reason[k] + ' &lt; ' + r[i].reason;
							} else {
								o.reason = g.reason[k];
							}

							o.type = rtype[k];
							o.word = newWord;
							r.push(o);
						}
					}
				}
			}

		} while (++i < r.length);

		return r;
	},



	// katakana -> hiragana conversion tables
	ch:[0x3092,0x3041,0x3043,0x3045,0x3047,0x3049,0x3083,0x3085,0x3087,0x3063,0x30FC,0x3042,0x3044,0x3046,
	    0x3048,0x304A,0x304B,0x304D,0x304F,0x3051,0x3053,0x3055,0x3057,0x3059,0x305B,0x305D,0x305F,0x3061,
	    0x3064,0x3066,0x3068,0x306A,0x306B,0x306C,0x306D,0x306E,0x306F,0x3072,0x3075,0x3078,0x307B,0x307E,
	    0x307F,0x3080,0x3081,0x3082,0x3084,0x3086,0x3088,0x3089,0x308A,0x308B,0x308C,0x308D,0x308F,0x3093],
	cv:[0x30F4,0xFF74,0xFF75,0x304C,0x304E,0x3050,0x3052,0x3054,0x3056,0x3058,0x305A,0x305C,0x305E,0x3060,
	    0x3062,0x3065,0x3067,0x3069,0xFF85,0xFF86,0xFF87,0xFF88,0xFF89,0x3070,0x3073,0x3076,0x3079,0x307C],
	cs:[0x3071,0x3074,0x3077,0x307A,0x307D],

	wordSearch: function(word, doNames, max) {
		var i, u, v, r, p;
		var trueLen = [0];
		var entry = { };

		// half & full-width katakana to hiragana conversion
		// note: katakana vu is never converted to hiragana

		p = 0;
		r = '';
		for (i = 0; i < word.length; ++i) {
			u = v = word.charCodeAt(i);

			if (u <= 0x3000) break;

			// full-width katakana to hiragana
			if ((u >= 0x30A1) && (u <= 0x30F3)) {
				u -= 0x60;
			}
			// half-width katakana to hiragana
			else if ((u >= 0xFF66) && (u <= 0xFF9D)) {
				u = this.ch[u - 0xFF66];
			}
			// voiced (used in half-width katakana) to hiragana
			else if (u == 0xFF9E) {
				if ((p >= 0xFF73) && (p <= 0xFF8E)) {
					r = r.substr(0, r.length - 1);
					u = this.cv[p - 0xFF73];
				}
			}
			// semi-voiced (used in half-width katakana) to hiragana
			else if (u == 0xFF9F) {
				if ((p >= 0xFF8A) && (p <= 0xFF8E)) {
					r = r.substr(0, r.length - 1);
					u = this.cs[p - 0xFF8A];
				}
			}
			// ignore J~
			else if (u == 0xFF5E) {
				p = 0;
				continue;
			}

			r += String.fromCharCode(u);
			trueLen[r.length] = i + 1;	// need to keep real length because of the half-width semi/voiced conversion
			p = v;
		}
		word = r;


		var dict;
		var index;
		var maxTrim;
		var have = [];
		var count = 0;
		var maxLen = 0;

		if (doNames) {
			this.loadNames();
			dict = this.nameDict;
			index = this.nameIndex;
			maxTrim = 20; //this.config.namax;
			entry.names = 1;
		}
		else {
			dict = this.wordDict;
			index = this.wordIndex;
			maxTrim = 7; //this.config.wmax;
		}

		if (max != null) maxTrim = max;

		entry.data = [];

		while (word.length > 0) {
			var showInf = (count != 0);
			var trys = doNames ? [{'word': word, 'type': 0xFF, 'reason': null}] : this.deinflect(word);

			for (i = 0; i < trys.length; i++) {
				u = trys[i];

				var ix = this.find(index, u.word + ',');
				if (!ix) {
					continue;
				}
				ix = ix.split(',');

				for (let j = 1; j < ix.length; ++j) {
					var ofs = ix[j];
					if (have[ofs]) continue;

					var dentry = dict.substring(ofs, dict.indexOf('\n', ofs));

					var ok = true;
					if (i > 0) {
						// > 0 a de-inflected word

						// ex:
						// /(io) (v5r) to finish/to close/
						// /(v5r) to finish/to close/(P)/
						// /(aux-v,v1) to begin to/(P)/
						// /(adj-na,exp,int) thank you/many thanks/
						// /(adj-i) shrill/

						var w;
						var x = dentry.split(',');
						var y = u.type;
						var z = x.length - 1;
						if (z > 10) z = 10;
						for (; z >= 0; --z) {
							w = x[z];
							if ((y & 1) && (w == 'v1')) break;
							if ((y & 4) && (w == 'adj-i')) break;
							if ((y & 2) && (w.substr(0, 2) == 'v5')) break;
							if ((y & 16) && (w.substr(0, 3) == 'vs-')) break;
							if ((y & 8) && (w == 'vk')) break;
						}
						ok = (z != -1);
					}
					if (ok) {
						if (count >= maxTrim) {
							entry.more = 1;
							break;
						}

						have[ofs] = 1;
						++count;
						if (maxLen == 0) maxLen = trueLen[word.length];

						if (trys[i].reason) {
							if (showInf) r = '&lt; ' + trys[i].reason + ' &lt; ' + word;
							else r = '&lt; ' + trys[i].reason;
						}
						else {
							r = null;
						}

						entry.data.push([dentry, r]);
					}
				}	// for j < ix.length
				if (count >= maxTrim) break;
			}	// for i < trys.length
			if (count >= maxTrim) break;
			word = word.substr(0, word.length - 1);
		}	// while word.length > 0

		if (entry.data.length == 0) return null;

		entry.matchLen = maxLen;
		return entry;
	},

	translate: function(text) {
		var e, o;
		var skip;

		o = {};
		o.data = [];
		o.textLen = text.length;

		while (text.length > 0) {
			e = this.wordSearch(text, false, 1);
			if (e != null) {
				if (o.data.length >= 7/* this.config.wmax */) {
					o.more = 1;
					break;
				}
				o.data.push(e.data[0]);
				skip = e.matchLen;
			}
			else {
				skip = 1;
			}
			text = text.substr(skip, text.length - skip);
		}

		if (o.data.length == 0) {
			return null;
		}

		o.textLen -= text.length;
		return o;
	},

	bruteSearch: function(text, doNames) {
		var r, e, d, i, j;
		var wb, we;
		var max;

		r = 1;
		if (text.charAt(0) == ':') {
			text = text.substr(1, text.length - 1);
			if (text.charAt(0) != ':') r = 0;
		}
		if (r) {
			if (text.search(/[\u3000-\uFFFF]/) != -1) {
				wb = we = '[\\s\\[\\]]';
			}
			else {
				wb = '[\\)/]\\s*';
				we = '\\s*[/\\(]';
			}
			if (text.charAt(0) == '*') {
				text = text.substr(1, text.length - 1);
				wb = '';
			}
			if (text.charAt(text.length - 1) == '*') {
				text = text.substr(0, text.length - 1);
				we = '';
			}
			text = wb + text.replace(/[\[\\\^\$\.\|\?\*\+\(\)]/g, function(c) { return '\\' + c; }) + we;
		}

		e = { data: [], reason: [], kanji: 0, more: 0 };

		if (doNames) {
			e.names = 1;
			max = 20;//this.config.namax;
			this.loadNames();
			d = this.nameDict;
		}
		else {
			e.names = 0;
			max = 7;//this.config.wmax;
			d = this.wordDict;
		}

		r = new RegExp(text, 'igm');
		while (r.test(d)) {
			if (e.data.length >= max) {
				e.more = 1;
				break;
			}
			j = d.indexOf('\n', r.lastIndex);
			e.data.push([d.substring(d.lastIndexOf('\n', r.lastIndex - 1) + 1, j), null]);
			r.lastIndex = j + 1;
		}

		return e.data.length ? e : null;
	},

	kanjiSearch: function(kanji) {
		const hex = '0123456789ABCDEF';
		var kde;
		var entry;
		var a, b;
		var i;

		i = kanji.charCodeAt(0);
		if (i < 0x3000) return null;

		kde = this.find(this.kanjiData, kanji);
		if (!kde) {
			return null;
		}

		a = kde.split('|');
		if (a.length != 6) {
			return null;
		}

		entry = {};
		entry.kanji = a[0];

		entry.misc = {};
		entry.misc['U'] = hex[(i >>> 12) & 15] + hex[(i >>> 8) & 15] + hex[(i >>> 4) & 15] + hex[i & 15];

		b = a[1].split(' ');
		for (i = 0; i < b.length; ++i) {
			if (b[i].match(/^([A-Z]+)(.*)/)) {
				if (!entry.misc[RegExp.$1]) entry.misc[RegExp.$1] = RegExp.$2;
					else entry.misc[RegExp.$1] += ' ' + RegExp.$2;
			}
		}

		entry.onkun = a[2].replace(/\s+/g, '\u3001 ');
		entry.nanori = a[3].replace(/\s+/g, '\u3001 ');
		entry.bushumei = a[4].replace(/\s+/g, '\u3001 ');
		entry.eigo = a[5];

		return entry;
	},

	numList: [
/*
		'C', 	'Classical Radical',
		'DR',	'Father Joseph De Roo Index',
		'DO',	'P.G. O\'Neill Index',
		'O', 	'P.G. O\'Neill Japanese Names Index',
		'Q', 	'Four Corner Code',
		'MN',	'Morohashi Daikanwajiten Index',
		'MP',	'Morohashi Daikanwajiten Volume/Page',
		'K',	'Gakken Kanji Dictionary Index',
		'W',	'Korean Reading',
*/
		'H',	'Halpern',
		'L',	'Heisig',
		'E',	'Henshall',
		'DK',	'Kanji Learners Dictionary',
		'N',	'Nelson',
		'V',	'New Nelson',
		'Y',	'PinYin',
		'P',	'Skip Pattern',
		'IN',	'Tuttle Kanji &amp; Kana',
		'I',	'Tuttle Kanji Dictionary',
		'U',	'Unicode'
	],

	makeText: function(entry, max) {
		var e;
		var b;
		var i, j;
		var t;

		if (entry == null) return '';

		b = '';

		if (entry.kanji) {
			b += entry.kanji + '\n';
			b += (entry.eigo || '-') + '\n';

			b += entry.onkun.replace(/\.([^\u3001]+)/g, '\uFF08$1\uFF09') + '\n';
			if (entry.nanori.length) {
				b += `\u540D\u4E57\u308A\t${entry.nanori}\n`;
			}
			if (entry.bushumei.length) {
				b += `\u90E8\u9996\u540D\t${entry.bushumei}\n`;
			}

			for (i = 0; i < this.numList.length; i += 2) {
				e = this.numList[i];
				if (/* this.config.kdisp[e] */1 == 1) {
					j = entry.misc[e];
					b += this.numList[i + 1].replace('&amp;', '&') + `\t${j || '-'}\n`;
				}
			}
		}
		else {
			if (max > entry.data.length) max = entry.data.length;
			for (i = 0; i < max; ++i) {
				e = entry.data[i][0].match(/^(.+?)\s+(?:\[(.*?)\])?\s*\/(.+)\//);
				if (!e) continue;

				if (e[2]) {
					b += `${e[1]}\t${e[2]}`;
				}
				else {
					b += e[1];
				}

				t = e[3].replace(/\//g, '; ');
				if (false/* !this.config.wpos */) t = t.replace(/^\([^)]+\)\s*/, '');
				if (false/* !this.config.wpop */) t = t.replace('; (P)', '');
				b += `\t${t}\n`;
			}
		}
		return b;
	}
};
