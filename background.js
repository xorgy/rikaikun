'use strict';

chrome.browserAction.onClicked.addListener(rcxMain.inlineToggle);
chrome.tabs.onSelectionChanged.addListener(rcxMain.onTabSelect);
chrome.runtime.onMessage.addListener(
	function(request, sender, response) {
		switch(request.type) {
		case 'enable?':
			rcxMain.onTabSelect(sender.tab.id);
			break;
		case 'search':
			response(rcxMain.search(request.text, request.dictOption));
			break;
		case 'nextDict':
			rcxMain.nextDict();
			break;
		case 'resetDict':
			rcxMain.resetDict();
			break;
		case 'translate':
			response(rcxMain.dict.translate(request.title));
			break;
		case 'makehtml':
			response(rcxMain.dict.makeHtml(request.entry));
			break;
		case 'switchOnlyReading':
			rcxMain.config.onlyreading = rcxMain.config.onlyreading === 'true';
			localStorage['onlyreading'] = rcxMain.config.onlyreading;
			break;
		case 'copyToClip':
			rcxMain.copyToClip(sender.tab, request.entry);
			break;
		default:
			break;
		}
	});

if(initStorage("v0.8.10", true)) {
	// v0.7
	initStorage("popupcolor", "blue");
	initStorage("highlight", true);

	// v0.8
	// No changes to options

	// V0.8.5
	initStorage("textboxhl", false);

	// v0.8.6
	initStorage("onlyreading", false);
	// v0.8.8
	if (localStorage['highlight'] == "yes")
		localStorage['highlight'] = "true";
	if (localStorage['highlight'] == "no")
		localStorage['highlight'] = "false";
	if (localStorage['textboxhl'] == "yes")
		localStorage['textboxhl'] = "true";
	if (localStorage['textboxhl'] == "no")
		localStorage['textboxhl'] = "false";
	if (localStorage['onlyreading'] == "yes")
		localStorage['onlyreading'] = "true";
	if (localStorage['onlyreading'] == "no")
		localStorage['onlyreading'] = "false";
	initStorage("copySeparator", "tab");
	initStorage("maxClipCopyEntries", "7");
	initStorage("lineEnding", "n");
	initStorage("minihelp", "true");
	initStorage("disablekeys", "false");
	initStorage("kanjicomponents", "true");

	// V0.8.10
  	initStorage("title", "true");

	for (let i = 0; i * 2 < rcxDict.prototype.numList.length; i++) {
		initStorage(rcxDict.prototype.numList[i*2], "true");
	}
}

/**
* Initializes the localStorage for the given key.
* If the given key is already initialized, nothing happens.
*
* @author Teo (GD API Guru)
* @param key The key for which to initialize
* @param initialValue Initial value of localStorage on the given key
* @return true if a value is assigned or false if nothing happens
*/
function initStorage(key, initialValue) {
  var currentValue = localStorage[key];
  if (!currentValue) {
	localStorage[key] = initialValue;
	return true;
  }
  return false;
}

rcxMain.config = {};
rcxMain.config.css = localStorage["popupcolor"];
rcxMain.config.highlight = localStorage["highlight"];
rcxMain.config.textboxhl = localStorage["textboxhl"];
rcxMain.config.onlyreading = localStorage["onlyreading"];
rcxMain.config.copySeparator = localStorage["copySeparator"];
rcxMain.config.maxClipCopyEntries = localStorage["maxClipCopyEntries"];
rcxMain.config.lineEnding = localStorage["lineEnding"];
rcxMain.config.minihelp = localStorage["minihelp"];
rcxMain.config.title = localStorage["title"];
rcxMain.config.disablekeys = localStorage["disablekeys"];
rcxMain.config.kanjicomponents = localStorage["kanjicomponents"];
rcxMain.config.kanjiinfo = new Array(rcxDict.prototype.numList.length / 2);

for (let i = 0; i * 2 < rcxDict.prototype.numList.length; i++) {
	rcxMain.config.kanjiinfo[i] = localStorage[rcxDict.prototype.numList[i * 2]];
}
