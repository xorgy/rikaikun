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
(function (window, chrome) {
	'use strict';
	var state;

	var altView = 0;

	var forceKanji = 0;
	var defaultDict = 2;

	var sameDict = 0;
	var nextDict = 3;

	var lastFound = null;

	var mDown = false;

	var keysDown = [];

	// Hack because SelEnd can't be sent in messages
	var lastSelEnd =  [];
	// Hack because ro was coming out always 0 for some reason.
	var lastRo = 0;

	var contentType = getContentType(window.document);

	var radData;

	var numList = [
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
	];

	function enableTab() {
		if (!state) {
			state = {};
			window.addEventListener('mousemove', onMouseMove, false);
			window.addEventListener('keydown', onKeyDown, true);
			window.addEventListener('keyup', onKeyUp, true);
			window.addEventListener('mousedown', onMouseDown, false);
			window.addEventListener('mouseup', onMouseUp, false);
		}
	}

	function disableTab() {
		if (state) {
			var e;
			window.removeEventListener('mousemove', onMouseMove, false);
			window.removeEventListener('keydown', onKeyDown, true);
			window.removeEventListener('keyup', onKeyUp, true);
			window.removeEventListener('mosuedown', onMouseDown, false);
			window.removeEventListener('mouseup', onMouseUp, false);

			e = document.getElementById('rikaichan-css');
			if (e) {
				e.parentNode.removeChild(e);
			}

			e = document.getElementById('rikaichan-window');
			if (e) {
				e.parentNode.removeChild(e);
			}

			clearHi();
			state = undefined;
		}
	}

	function onMouseDown(ev) {
		if (ev.button !== 0) {
			return;
		}

		if (isVisible()) {
			clearHi();
		}
		mDown = true;

		// If we click outside of a text box then we set
		// oldCaret to -1 as an indicator not to restore position
		// Otherwise, we switch our saved textarea to whereever
		// we just clicked
		if (!('form' in ev.target)) {
			state.oldCaret =  -1;
		} else {
			state.oldTA = ev.target;
		}
	}

	function onMouseUp(ev) {
		if (ev.button !== 0) {
			return;
		}
		mDown = false;
	}

	function onKeyUp(ev) {
		if (keysDown[ev.keyCode]) {
			keysDown[ev.keyCode] = 0;
		}
	}

	function processEntry(e) {
		var ro = lastRo;
		var selEndList = lastSelEnd;

		if (!e) {
			hidePopup();
			clearHi();
			return -1;
		}
		lastFound = [e];

		if (!e.matchLen) {
			e.matchLen = 1;
		}
		state.uofsNext = e.matchLen;
		state.uofs = (ro - state.prevRangeOfs);

		var rp = state.prevRangeNode;
		// don't try to highlight form elements
		if ((rp) && ((state.config.highlight === 'true' && !mDown && !('form' in state.prevTarget))  ||
			     (('form' in state.prevTarget) && state.config.textboxhl === 'true'))) {
			var doc = rp.ownerDocument;
			if (!doc) {
				clearHi();
				hidePopup();
				return 0;
			}
			highlightMatch(doc, rp, ro, e.matchLen, selEndList, state);
			state.prevSelView = doc.defaultView;
		}

		processHtml(makeHtml(e));
	}

	function highlightMatch(doc, rp, ro, matchLen, selEndList, state) {
		var sel = doc.defaultView.getSelection();

		// If selEndList is empty then we're dealing with a textarea/input situation
		if (selEndList.length === 0) {
			if (rp.nodeName === 'TEXTAREA' ||
			    rp.nodeName === 'INPUT') {
				// If there is already a selected region not caused by
				// rikaikun, leave it alone
				if ((sel.toString()) && (state.selText !== sel.toString())) {
					return;
				}

				// If there is no selected region and the saved
				// textbox is the same as teh current one
				// then save the current cursor position
				// The second half of the condition let's us place the
				// cursor in another text box without having it jump back
				if (!sel.toString() && state.oldTA === rp) {
					state.oldCaret = rp.selectionStart;
					state.oldTA = rp;
				}
				rp.selectionStart = ro;
				rp.selectionEnd = matchLen + ro;

				state.selText = rp.value.substring(ro, matchLen+ro);
			}
			return;
		}

		// Special case for leaving a text box to an outside japanese
		// Even if we're not currently in a text area we should save
		// the last one we were in.
		if (state.oldTA && !sel.toString() && state.oldCaret >= 0) {
			state.oldCaret = state.oldTA.selectionStart;
		}
		var selEnd;
		var offset = matchLen + ro;

		for (var i = 0, len = selEndList.length; i < len; i++) {
			selEnd = selEndList[i];
			if (offset <= selEnd.offset) {
				break;
			}
			offset -= selEnd.offset;
		}

		var range = doc.createRange();
		range.setStart(rp, Math.min(rp.length, ro));
		range.setEnd(selEnd.node, offset);

		if ((sel.toString()) && (state.selText !== sel.toString())) {
			return;
		}
		sel.removeAllRanges();
		sel.addRange(range);
		state.selText = sel.toString();
	}

	//Event Listeners
	chrome.runtime.onMessage.addListener(
		function dispatchMessage(request, sender, sendResponse) {
			switch(request.type) {
			case 'enable':
				enableTab();
				console.log(request);
				state.config = request.config;
				radData = request.radData;
				break;
			case 'disable':
				disableTab();
				break;
			case 'showPopup':
				showPopup(request.text);
				break;
			default:
				break;
			}
		}
	);

	// When a page first loads, checks to see if it should enable script
	chrome.extension.sendMessage({'type':'enable?'});

	function onMouseMove(ev) {
		if (!state) {
			return;
		}

		var fake;
		if (ev.target.nodeName === 'TEXTAREA' || ev.target.nodeName === 'INPUT') {
			fake = makeFake(ev.target);
			document.body.appendChild(fake);
			fake.scrollTop = ev.target.scrollTop;
			fake.scrollLeft = ev.target.scrollLeft;
		}

		var range = document.caretRangeFromPoint(ev.clientX, ev.clientY);
		if (range === null) {
			return;
		}
		var rp = range.startContainer;
		var ro = Math.min(range.startOffset, rp.length);

		if (fake) {
			// At the end of a line, don't do anything or you just get beginning of next line
			if ((rp.data) && rp.data.length === ro) {
				document.body.removeChild(fake);
				return;
			}
			fake.style.display = 'none';
			ro = getTotalOffset(rp.parentNode, rp, ro);
		}

		if (state.timer) {
			clearTimeout(state.timer);
			state.timer = null;
		}

		// This is to account for bugs in caretRangeFromPoint
		// It includes the fact that it returns text nodes over non text nodes
		// and also the fact that it miss the first character of inline nodes.

		// If the range offset is equal to the node data length
		// Then we have the second case and need to correct.
		if ((rp.data) && ro === rp.data.length) {
			// A special exception is the WBR tag which is inline but doesn't
			// contain text.
			if ((rp.nextSibling) && (rp.nextSibling.nodeName === 'WBR')) {
				rp = rp.nextSibling.nextSibling;
				ro = 0;
			} else if (isInline(ev.target))	{
				// If we're to the right of an inline character we can use the target.
				// However, if we're just in a blank spot don't do anything.
				if (!(rp.parentNode === ev.target ||
				      (fake && rp.parentNode.innerText === ev.target.value))) {
					rp = ev.target.firstChild;
					ro = 0;
				}
			} else {
				// Otherwise we're on the right and can take the next sibling of the
				// inline element.
				rp = rp.parentNode.nextSibling;
				ro = 0;
			}
		}
		// The case where the before div is empty so the false spot is in the parent
		// But we should be able to take the target.
		// The 1 seems random but it actually represents the preceding empty tag
		// also we don't want it to mess up with our fake div
		// Also, form elements don't seem to fall into this case either.
		if (!(fake) && !('form' in ev.target) && rp && rp.parentNode !== ev.target && ro === 1) {
			rp = getFirstTextChild(ev.target);
			ro=0;
		} else if (!(fake) && (!(rp) || ((rp.parentNode !== ev.target)))) {
			// Otherwise, we're off in nowhere land and we should go home.
			// offset should be 0 or max in this case.
			rp = null;
			ro = -1;
		}

		// For text nodes do special stuff
		// we make rp the text area and keep the offset the same
		// we give the text area data so it can act normal
		if (fake) {
			rp = ev.target;
			rp.data = rp.value;
		}

		if (ev.target === state.prevTarget && isVisible() &&
		    (state.title || ((rp === state.prevRangeNode) && (ro === state.prevRangeOfs)))) {
			if (fake) {
				document.body.removeChild(fake);
			}
			return;
		}

		if (fake) {
			document.body.removeChild(fake);
		}

		state.prevTarget = ev.target;
		state.prevRangeNode = rp;
		state.prevRangeOfs = ro;
		state.title = '';
		state.uofs = 0;
		state.uofsNext = 1;

		if ((rp) && (rp.data) && (ro < rp.data.length)) {
			forceKanji = ev.shiftKey ? 1 : 0;
			state.popX = ev.clientX;
			state.popY = ev.clientY;
			show(state, forceKanji || defaultDict);
			return;
		}

		if (state.config.title === 'true') {
			if ((typeof(ev.target.title) === 'string') && (ev.target.title.length)) {
				state.title = ev.target.title;
			} else if ((typeof(ev.target.alt) === 'string') && (ev.target.alt.length)) {
				state.title = ev.target.alt;
			}
		}

		if (ev.target.nodeName === 'OPTION') {
			state.title = ev.target.text;
		} else if (ev.target.nodeName === 'SELECT') {
			state.title = ev.target.options[ev.target.selectedIndex].text;
		}

		if (state.title) {
			state.popX = ev.clientX;
			state.popY = ev.clientY;
			state.timer = setTimeout(showTitle, /* cfg.popdelay */ 1, state);
		} else {
			// Only close the popup if we've moved more than 4 pixels from a valid target
			var dx = state.popX - ev.clientX;
			var dy = state.popY - ev.clientY;
			var distance = Math.sqrt(dx * dx + dy * dy);
			if (distance > 4) {
				clearHi();
				hidePopup();
			}
		}
	}

	function onKeyDown(ev) {
		if (((ev.altKey) || (ev.metaKey) || (ev.ctrlKey)) ||
		    ((ev.shiftKey) && (ev.keyCode !== 16)) ||
		    keysDown[ev.keyCode] || !isVisible() ||
		    (state.config.disablekeys === 'true' && ev.keyCode !== 16)) {
			return;
		}

		var i;

		switch (ev.keyCode) {
		case 16:	// shift
		case 13:	// enter
			show(ev.currentTarget.rikaichan, nextDict);
			break;
		case 27:	// esc
			hidePopup();
			clearHi();
			break;
		case 65:	// a
			altView = (altView + 1) % 3;
			show(ev.currentTarget.rikaichan, sameDict);
			break;
		case 67:	// c
			chrome.extension.sendMessage({'type': 'copyToClip', 'entry': lastFound});
			break;
		case 66:	// b
			var ofs = ev.currentTarget.rikaichan.uofs;
			for (i = 50; i > 0; --i) {
				ev.currentTarget.rikaichan.uofs = --ofs;
				if (show(ev.currentTarget.rikaichan, defaultDict) >= 0 &&
				    ofs >= ev.currentTarget.rikaichan.uofs) {
					break;	// ! change later
				}
			}
			break;
		case 68:	// d
			chrome.extension.sendMessage({'type':'switchOnlyReading'});
			show(ev.currentTarget.rikaichan, sameDict);
			break;
		case 77:	// m
			ev.currentTarget.rikaichan.uofsNext = 1;
			break;
		case 78:	// n
			for (i = 50; i > 0; --i) {
				ev.currentTarget.rikaichan.uofs += ev.currentTarget.rikaichan.uofsNext;
				if (show(ev.currentTarget.rikaichan, defaultDict) >= 0) {
					break;
				}
			}
			break;
		case 89:	// y
			altView = 0;
			ev.currentTarget.rikaichan.popY += 20;
			show(ev.currentTarget.rikaichan, sameDict);
			break;
		default:
			return;
		}

		keysDown[ev.keyCode] = 1;

		// Don't eat shift if in this mode
		if (state.config.disablekeys !== 'true') {
			ev.preventDefault();
		}
	}

	function processTitle(e) {
		if (!e) {
			hidePopup();
			return;
		}

		e.title = state.title.substr(0, e.textLen).replace(/[\x00-\xff]/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; } );
		if (state.title.length > e.textLen) {
			e.title += '…';
		}

		lastFound = [e];

		processHtml(makeHtml(e));
	}

	function processHtml(html) {
		showPopup(html, state.prevTarget, state.popX, state.popY, false);
		return 1;
	}

	function getContentType(tDoc) {
		var m = tDoc.getElementsByTagName('meta');
		for(var i in m) {
			if (m[i].httpEquiv === 'Content-Type') {
				var con = m[i].content;
				con = con.split(';');
				return con[0];
			}
		}
		return null;
	}

	function showPopup(text, elem, x, y, looseWidth) {
		var topdoc = window.document;

		if ((isNaN(x)) || (isNaN(y))) {
			x = y = 0;
		}

		var popup = topdoc.getElementById('rikaichan-window');
		if (!popup) {
			var css = topdoc.createElementNS('http://www.w3.org/1999/xhtml', 'link');
			css.setAttribute('rel', 'stylesheet');
			css.setAttribute('type', 'text/css');
			var cssdoc = state.config.css;
			css.setAttribute('href', chrome.extension.getURL('css/popup-' +
									 cssdoc + '.css'));
			css.setAttribute('id', 'rikaichan-css');
			topdoc.getElementsByTagName('head')[0].appendChild(css);

			popup = topdoc.createElementNS('http://www.w3.org/1999/xhtml', 'div');
			popup.setAttribute('id', 'rikaichan-window');
			topdoc.documentElement.appendChild(popup);

			popup.addEventListener('dblclick',
					       function (ev) {
						       hidePopup();
						       ev.stopPropagation();
					       }, true);
		}

		popup.style.width = 'auto';
		popup.style.height = 'auto';
		popup.style.maxWidth = (looseWidth ? '' : '600px');

		if (contentType === 'text/plain') {
			var df = document.createDocumentFragment();
			df.appendChild(document.createElementNS('http://www.w3.org/1999/xhtml', 'span'));
			df.firstChild.innerHTML = text;

			while (popup.firstChild) {
				popup.removeChild(popup.firstChild);
			}
			popup.appendChild(df.firstChild);
		} else {
			popup.innerHTML = text;
		}

		if (elem) {
			popup.style.top = '-1000px';
			popup.style.left = '0px';
			popup.style.display = '';

			var bbo = window;
			var pW = popup.offsetWidth;
			var pH = popup.offsetHeight;

			// guess!
			if (pW <= 0) {
				pW = 200;
			}
			if (pH <= 0) {
				pH = 0;
				var j = 0;
				while ((j = text.indexOf('<br/>', j)) !== -1) {
					j += 5;
					pH += 22;
				}
				pH += 25;
			}

			if (altView === 1) {
				x = window.scrollX;
				y = window.scrollY;
			} else if (altView === 2) {
				x = (window.innerWidth - (pW + 20)) + window.scrollX;
				y = (window.innerHeight - (pH + 20)) + window.scrollY;
			} else {
				// go left if necessary
				if ((x + pW) > (window.innerWidth - 20)) {
					x = (window.innerWidth - pW) - 20;
					if (x < 0) {
						x = 0;
					}
				}

				// below the mouse
				var v = 25;

				// under the popup title
				if ((elem.title) && (elem.title !== '')) {
					v += 20;
				}

				// go up if necessary
				if ((y + v + pH) > window.innerHeight) {
					var t = y - pH - 30;
					if (t >= 0) {
						y = t;
					} else {
						// if can't go up, still go down to prevent blocking cursor
						y += v;
					}
				}

				x += window.scrollX;
				y += window.scrollY;
			}
		} else {
			x += window.scrollX;
			y += window.scrollY;
		}

		popup.style.left = x + 'px';
		popup.style.top = y + 'px';
		popup.style.display = '';
	}

	function showTitle(state) {
		chrome.extension.sendMessage({'type':'translate', 'title': state.title},
					     processTitle);
	}

	function show(state, dictOption) {
		var rp = state.prevRangeNode;
		var ro = state.prevRangeOfs + state.uofs;
		var u;

		state.uofsNext = 1;

		if (!rp) {
			clearHi();
			hidePopup();
			return 0;
		}

		if ((ro < 0) || (ro >= rp.data.length)) {
			clearHi();
			hidePopup();
			return 0;
		}

		// if we have '   XYZ', where whitespace is compressed, X never seems to get selected
		while (((u = rp.data.charCodeAt(ro)) === 32) || (u === 9) || (u === 10)) {
			++ro;
			if (ro >= rp.data.length) {
				clearHi();
				hidePopup();
				return 0;
			}
		}

		//
		if ((isNaN(u)) ||
		    ((u !== 0x25CB) &&
		     ((u < 0x3001) || (u > 0x30FF)) &&
		     ((u < 0x3400) || (u > 0x9FFF)) &&
		     ((u < 0xF900) || (u > 0xFAFF)) &&
		     ((u < 0xFF10) || (u > 0xFF9D)))) {
			clearHi();
			hidePopup();
			return -2;
		}

		//selection end data
		var selEndList = [];
		var text = getTextFromRange(rp, ro, selEndList, 13 /*maxlength*/);

		lastSelEnd = selEndList;
		lastRo = ro;
		chrome.extension.sendMessage({'type':'search', 'text':text, 'dictOption': String(dictOption) },
					     processEntry);

		return 1;

	}

	function hidePopup() {
		var popup = document.getElementById('rikaichan-window');
		if (popup) {
			popup.style.display = 'none';
			popup.innerHTML = '';
		}
		state.title = '';
	}

	function clearHi() {
		if ((!state) || (!state.prevSelView)) {
			return;
		}
		if (state.prevSelView.closed) {
			state.prevSelView = null;
			return;
		}

		var sel = state.prevSelView.getSelection();
		// If there is an empty selection or the selection was done by
		// rikaikun then we'll clear it
		if ((!sel.toString()) || (state.selText === sel.toString())) {
			// In the case of no selection we clear the oldTA
			// The reason for this is becasue if there's no selection
			// we probably clicked somewhere else and we don't want to
			// bounce back.
			if (!sel.toString()) {
				state.oldTA = null;
			}

			// clear all selections
			sel.removeAllRanges();
			//Text area stuff
			// If oldTA is still around that means we had a highlighted region
			// which we just cleared and now we're going to jump back to where we were
			// the cursor was before our lookup
			// if oldCaret is less than 0 it means we clicked outside the box and shouldn't
			// come back
			if (state.oldTA && state.oldCaret >= 0) {
				state.oldTA.selectionStart = state.oldTA.selectionEnd = state.oldCaret;
			}

		}
		state.prevSelView = null;
		state.kanjiChar = null;
		state.selText = null;
	}

	function getTotalOffset(parent, tNode, offset) {
		var fChild = parent.firstChild;
		var realO = offset;
		if (fChild === tNode) {
			return offset;
		}
		do {
			var val = 0;
			if (fChild.nodeName === 'BR') {
				val = 1;
			} else {
				val = (fChild.data ? fChild.data.length : 0);
			}
			realO += val;
		}
		while ((fChild = fChild.nextSibling) !== tNode);

		return realO;

	}

	function getFirstTextChild(node) {
		return document.evaluate('descendant::text()[not(parent::rp) and not(ancestor::rt)]',
					 node, null, XPathResult.ANY_TYPE, null).iterateNext();
	}

	function makeFake(real) {
		var fake = document.createElement('div');
		var realRect = real.getBoundingClientRect();
		fake.innerText = real.value;
		fake.style.cssText = document.defaultView.getComputedStyle(real, '').cssText;
		fake.scrollTop = real.scrollTop;
		fake.scrollLeft = real.scrollLeft;
		fake.style.position = 'absolute';
		fake.style.zIndex = 7777;
		fake.style.top = realRect.top + 'px';
		fake.style.left = realRect.left + 'px';

		return fake;

	}

	function isInline(node) {
		var inlineNames = {
			// text node
			'#text': true,

			// font style
			'FONT': true,
			'TT': true,
			'I' : true,
			'B' : true,
			'BIG' : true,
			'SMALL' : true,
			//deprecated
			'STRIKE': true,
			'S': true,
			'U': true,

			// phrase
			'EM': true,
			'STRONG': true,
			'DFN': true,
			'CODE': true,
			'SAMP': true,
			'KBD': true,
			'VAR': true,
			'CITE': true,
			'ABBR': true,
			'ACRONYM': true,

			// special, not included IMG, OBJECT, BR, SCRIPT, MAP, BDO
			'A': true,
			'Q': true,
			'SUB': true,
			'SUP': true,
			'SPAN': true,
			'WBR': true,

			// ruby
			'RUBY': true,
			'RBC': true,
			'RTC': true,
			'RB': true,
			'RT': true,
			'RP': true
		};
		return inlineNames.hasOwnProperty(node.nodeName) ||
			// only check styles for elements
			// comments do not have getComputedStyle method
			(document.nodeType === Node.ELEMENT_NODE &&
			 (document.defaultView.getComputedStyle(node,null).getPropertyValue('display') === 'inline' ||
			  document.defaultView.getComputedStyle(node,null).getPropertyValue('display') === 'inline-block'));
	}

	// Gets text from a node
	// returns a string
	// node: a node
	// selEnd: the selection end object will be changed as a side effect
	// maxLength: the maximum length of returned string
	// xpathExpr: an XPath expression, which evaluates to text nodes, will be evaluated
	// relative to 'node' argument
	function getInlineText(node, selEndList, maxLength, xpathExpr) {
		var text = '';
		var endIndex;

		if (node.nodeName === '#text') {
			endIndex = Math.min(maxLength, node.data.length);
			selEndList.push({node: node, offset: endIndex});
			return node.data.substring(0, endIndex);
		}

		var result = xpathExpr.evaluate(node, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);

		while ((text.length < maxLength) && (node = result.iterateNext())) {
			endIndex = Math.min(node.data.length, maxLength - text.length);
			text += node.data.substring(0, endIndex);
			selEndList.push( {node: node, offset: endIndex} );
		}

		return text;
	}

	// given a node which must not be null,
	// returns either the next sibling or next sibling of the father or
	// next sibling of the fathers father and so on or null
	function getNext(node) {
		var nextNode;

		if ((nextNode = node.nextSibling) !== null) {
			return nextNode;
		}
		if (((nextNode = node.parentNode) !== null) && isInline(nextNode)) {
			return getNext(nextNode);
		}
		return null;
	}

	function getTextFromRange(rangeParent, offset, selEndList, maxLength) {
		// XPath expression which evaluates to text nodes
		// tells rikaichan which text to translate
		// expression to get all text nodes that are not in (RP or RT) elements
		var textNodeExpr = 'descendant-or-self::text()[not(parent::rp) and not(ancestor::rt)]';

		// XPath expression which evaluates to a boolean. If it evaluates to true
		// then rikaichan will not start looking for text in this text node
		// ignore text in RT elements
		var startElementExpr = 'boolean(parent::rp or ancestor::rt)';

		var endIndex;

		if (rangeParent.nodeName === 'TEXTAREA' || rangeParent.nodeName === 'INPUT') {
			endIndex = Math.min(rangeParent.data.length, offset + maxLength);
			return rangeParent.value.substring(offset, endIndex);
		}

		var text = '';

		var xpathExpr = rangeParent.ownerDocument.createExpression(textNodeExpr, null);

		if (rangeParent.ownerDocument.evaluate(startElementExpr, rangeParent, null, XPathResult.BOOLEAN_TYPE, null).booleanValue ||
		    rangeParent.nodeType !== Node.TEXT_NODE) {
			return '';
		}

		endIndex = Math.min(rangeParent.data.length, offset + maxLength);
		text += rangeParent.data.substring(offset, endIndex);
		selEndList.push( {node: rangeParent, offset: endIndex} );

		var nextNode = rangeParent;
		while (((nextNode = getNext(nextNode)) !== null) && (isInline(nextNode)) && (text.length < maxLength)) {
			text += getInlineText(nextNode, selEndList, maxLength - text.length, xpathExpr);
		}

		return text;
	}

	function isVisible() {
		var popup = document.getElementById('rikaichan-window');
		return popup && (popup.style.display !== 'none');
	}

	function makeHtml(entry) {
		var e;
		var b;
		var c, s, t;
		var i, j, n;

		var k;

		if (entry == null) return '';

		b = '';

		if (entry.kanji) {
			var yomi;
			var box;
			var bn;
			var nums;

			yomi = entry.onkun.replace(/\.([^\u3001]+)/g, '<span class="k-yomi-hi">$1</span>');
			if (entry.nanori.length) {
				yomi += '<br/><span class="k-yomi-ti">\u540D\u4E57\u308A</span> ' + entry.nanori;
			}
			if (entry.bushumei.length) {
				yomi += '<br/><span class="k-yomi-ti">\u90E8\u9996\u540D</span> ' + entry.bushumei;
			}

			bn = entry.misc.B - 1;
			k = entry.misc.G;
			switch (k) {
			case 8:
				k = 'general<br/>use';
				break;
			case 9:
				k = 'name<br/>use';
				break;
			default:
				k = isNaN(k) ? '-' : ('grade<br/>' + k);
				break;
			}
			box = '<table class="k-abox-tb"><tr>' +
				`<td class="k-abox-r">radical<br/>${radData[bn].charAt(0)} ${bn + 1}</td>` +
				`<td class="k-abox-g">${k}</td>` +
				'</tr><tr>' +
				`<td class="k-abox-f">freq<br/>${entry.misc['F'] || '-'}</td>` +
				`<td class="k-abox-s">strokes<br/>${entry.misc['S']}</td>` +
				'</tr></table>';
			if (state.config.kanjicomponents == 'true') {
				k = radData[bn].split('\t');
				box += '<table class="k-bbox-tb">' +
					`<tr><td class="k-bbox-1a">${k[0]}</td>` +
					`<td class="k-bbox-1b">${k[2]}</td>` +
					`<td class="k-bbox-1b">${k[3]}</td></tr>`;
				j = 1;
				for (i = 0; i < radData.length; ++i) {
					s = radData[i];
					if ((bn != i) && (s.indexOf(entry.kanji) != -1)) {
						k = s.split('\t');
						c = ' class="k-bbox-' + (j ^= 1);
						box += `<tr><td${c}a">${k[0]}</td>` +
							`<td${c}b">${k[2]}</td>` +
							`<td${c}b">${k[3]}</td></tr>`;
					}
				}
				box += '</table>';
			}

			nums = '';
			j = 0;

			let kanjiinfo = state.config.kanjiinfo;
			for (i = 0; i*2 < numList.length; i++) {
				c = numList[i*2];
				if (kanjiinfo[i] === 'true') {
					s = entry.misc[c];
					c = ` class="k-mix-td${j ^= 1}"`;
					nums += `<tr><td${c}>${numList[i * 2 + 1]}</td><td${c}>${s ||'-'}</td></tr>`;
				}
			}
			if (nums.length) nums = `<table class="k-mix-tb">${nums}</table>`;

			b += '<table class="k-main-tb"><tr><td valign="top">';
			b += box;
			b += `<span class="k-kanji">${entry.kanji}</span><br/>`;
			b += `<div class="k-eigo">${entry.eigo}</div>`;
			b += `<div class="k-yomi">${yomi}</div>`;
			b += `</td></tr><tr><td>${nums}</td></tr></table>`;
			return b;
		}

		s = t = '';

		if (entry.names) {
			c = [];

			b += '<div class="w-title">Names Dictionary</div><table class="w-na-tb"><tr><td>';
			for (i = 0; i < entry.data.length; ++i) {
				e = entry.data[i][0].match(/^(.+?)\s+(?:\[(.*?)\])?\s*\/(.+)\//);
				if (!e) {
					continue;
				}

				// the next two lines re-process the entries that contain separate search key and spelling due to mixed hiragana/katakana spelling
				var e3m = e[3].match(/^(.+?)\s+(?:\[(.*?)\])?\s*\/(.+)\//);
				if (e3m) {
					e = e3m;
				}

				if (s != e[3]) {
					c.push(t);
					t = '';
				}

				if (e[2]) {
					c.push(`<span class="w-kanji">${e[1]}</span> &#32; <span class="w-kana">${e[2]}</span><br/> `);
				} else {
					c.push(`<span class="w-kana">${e[1]}</span><br/> `);
				}

				s = e[3];
				t = `<span class="w-def">${s.replace(/\//g, '; ')}</span><br/>`;
			}
			c.push(t);
			if (c.length > 4) {
				n = (c.length >> 1) + 1;
				b += c.slice(0, n + 1).join('');

				t = c[n];
				c = c.slice(n, c.length);
				for (i = 0; i < c.length; ++i) {
					if (c[i].indexOf('w-def') != -1) {
						if (t != c[i]) {
							b += c[i];
						}
						if (i == 0) {
							c.shift();
						}
						break;
					}
				}

				b += '</td><td>';
				b += c.join('');
			}
			else {
				b += c.join('');
			}
			if (entry.more) {
				b += '...<br/>';
			}
			b += '</td></tr></table>';
		} else {
			if (entry.title) {
				b += `<div class="w-title">${entry.title}</div>`;
			}

			var pK = '';

			for (i = 0; i < entry.data.length; ++i) {
				e = entry.data[i][0].match(/^(.+?)\s+(?:\[(.*?)\])?\s*\/(.+)\//);
				if (!e) continue;

				/*
					e[1] = kanji/kana
					e[2] = kana
					e[3] = definition
				*/

				if (s != e[3]) {
					b += t;
					pK = k = '';
				}
				else {
					k = t.length ? '<br/>' : '';
				}

				if (e[2]) {
					if (pK == e[1]) {
						k = `\u3001 <span class="w-kana">${e[2]}</span>`;
					} else {
						k += `<span class="w-kanji">${e[1]}</span> &#32; <span class="w-kana">${e[2]}</span>`;
					}
					pK = e[1];
				}
				else {
					k += `<span class="w-kana">${e[1]}</span>`;
					pK = '';
				}
				b += k;

				if (entry.data[i][1]) b += ` <span class="w-conj">(${entry.data[i][1]})</span>`;

				s = e[3];
				t = s.replace(/\//g, '; ');
				if (/* !this.config.wpos */false) t = t.replace(/^\([^)]+\)\s*/, '');
				if (/* !this.config.wpop */false) t = t.replace('; (P)', '');
				if (state.config.onlyreading == 'false') {
					t = `<br/><span class="w-def">${t}</span><br/>`;
				}
				else {
					t = '<br/>';
				}
			}
			b += t;
			if (entry.more) b += '...<br/>';
		}

		return b;
	}
})(window, chrome);
