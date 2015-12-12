function fillVals () {
	var store = localStorage['popupcolor'];
	for (var i = 0; i < document.optform.popupcolor.length; ++i) {
		if (document.optform.popupcolor[i].value === store) {
			document.optform.popupcolor[i].selected = true;
			break;
		}
	}

	document.optform.highlighttext.checked = localStorage['highlight'] === 'true';
	document.optform.textboxhl.checked = localStorage['textboxhl'] === 'true';
	document.optform.onlyreading.checked = localStorage['onlyreading'] === 'true';
	document.optform.minihelp.checked = localStorage['minihelp'] === 'true';
	document.optform.title.checked = localStorage['title'] === 'true';
	document.optform.disablekeys.checked = localStorage['disablekeys'] === 'true';
	document.optform.kanjicomponents.checked = localStorage['kanjicomponents'] === 'true';

	var numList = chrome.extension.getBackgroundPage().rcxDict.prototype.numList;

	for (i = 0; i * 2 < numList.length; i++) {
		document.getElementById(numList[i * 2]).checked = localStorage[numList[i * 2]] === 'true';
	}

	store = localStorage['lineEnding'];
	for (; i < document.optform.lineEnding.length; ++i) {
		if (document.optform.lineEnding[i].value === store) {
			document.optform.lineEnding[i].selected = true;
			break;
		}
	}

	store = localStorage['copySeparator'];
	for (; i < document.optform.copySeparator.length; ++i) {
		if (document.optform.copySeparator[i].value === store) {
			document.optform.copySeparator[i].selected = true;
			break;
		}
	}

	document.optform.maxClipCopyEntries.value = parseInt(localStorage['maxClipCopyEntries']);

}

function getVals () {
	localStorage['popupcolor'] = document.optform.popupcolor.value;
	localStorage['highlight'] = document.optform.highlighttext.checked;
	localStorage['textboxhl'] = document.optform.textboxhl.checked;
	localStorage['onlyreading'] = document.optform.onlyreading.checked;
	localStorage['minihelp'] = document.optform.minihelp.checked;
	localStorage['title'] = document.optform.title.checked;
	localStorage['disablekeys'] = document.optform.disablekeys.checked;
	localStorage['kanjicomponents'] = document.optform.kanjicomponents.checked;

	var kanjiinfoarray = new Array(chrome.extension.getBackgroundPage().rcxDict.prototype.numList.length / 2);
	var numList = chrome.extension.getBackgroundPage().rcxDict.prototype.numList;
	for (var i = 0; i * 2 < numList.length; i++) {
		localStorage[numList[i * 2]] = document.getElementById(numList[i * 2]).checked;
		kanjiinfoarray[i] = localStorage[numList[i * 2]];
	}

	localStorage['lineEnding'] = document.optform.lineEnding.value;
	localStorage['copySeparator'] = document.optform.copySeparator.value;
	localStorage['maxClipCopyEntries'] = document.optform.maxClipCopyEntries.value;

	chrome.extension.getBackgroundPage().rcxMain.config.css = localStorage['popupcolor'];
	chrome.extension.getBackgroundPage().rcxMain.config.highlight = localStorage['highlight'];
	chrome.extension.getBackgroundPage().rcxMain.config.textboxhl = localStorage['textboxhl'];
	chrome.extension.getBackgroundPage().rcxMain.config.onlyreading = localStorage['onlyreading'];
	chrome.extension.getBackgroundPage().rcxMain.config.minihelp = localStorage['minihelp'];
	chrome.extension.getBackgroundPage().rcxMain.config.disablekeys = localStorage['disablekeys'];
	chrome.extension.getBackgroundPage().rcxMain.config.kanjicomponents = localStorage['kanjicomponents'];
	chrome.extension.getBackgroundPage().rcxMain.config.kanjiinfo = kanjiinfoarray;
	chrome.extension.getBackgroundPage().rcxMain.config.lineEnding = localStorage['lineEnding'];
	chrome.extension.getBackgroundPage().rcxMain.config.copySeparator = localStorage['copySeparator'];
	chrome.extension.getBackgroundPage().rcxMain.config.maxClipCopyEntries = localStorage['maxClipCopyEntries'];
}

window.onload = fillVals;

document.querySelector('#submit').addEventListener('click', getVals);
