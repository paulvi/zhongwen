/*
        Zhongwen - A Chinese-English Popup Dictionary
        Original Work Copyright (C) 2011 Christian Schiller
        https://chrome.google.com/extensions/detail/kkmlkkjojmombglmlpbpapmhcaljjkde
        Modified work Copyright (C) 2017 Leonard Lausen
        https://github.com/leezu/zhongwen

        ---

        Originally based on Rikaikun 0.8
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
        when modifying any of the files.

*/
function reportError(error) {
  console.error(`Error: ${error}`);
}
function ignoreError(error) {}

var zhongwenMain = {

    altView: 0,

    tabIDs: {},

    loadDictionary: async function() {
      let dictData = await loadDictData();
      return new ZhongwenDictionary(...dictData);
    },

    // The callback for onActivated.
    // Just sends a message to the tab to enable itself if it hasn't already.
    onTabSelect: function(tabId) {
        zhongwenMain._onTabSelect(tabId);
    },
  _onTabSelect: function(tabId) {
    let enabledPromise = browser.storage.local.get({enabled: 0});
    enabledPromise.then((storage) => {
      if (storage.enabled == 1) {
        let optionsPromise = browser.storage.sync.get({
          options: {
            'popupcolor': "yellow",
            'tonecolors': "yes",
            'fontSize': "small",
            'skritterTLD': "com",
            'zhuyin': "no",
            'grammar': "yes"
          }
        });
        optionsPromise.then((storage) => {
          browser.tabs.sendMessage(tabId, {
            type: "enable",
            config: storage.options
          }).catch(reportError);
        });
      }
    });
  },

    enable: function(tab) {
      let optionsPromise = browser.storage.sync.get({
        options: {
          'popupcolor': "yellow",
          'tonecolors': "yes",
          'fontSize': "small",
          'skritterTLD': "com",
          'zhuyin': "no",
          'grammar': "yes"
        }
      });
      let dictionaryPromise = zhongwenMain.loadDictionary();
      let enabled = 1;
      let enablePromise = browser.storage.local.set({enabled});

      Promise.all([optionsPromise, dictionaryPromise, enablePromise]).then(
        ([storage, dictionary, enabled]) => {

        this.dict = dictionary;

        // Send message to current tab to add listeners and create stuff
        browser.tabs.sendMessage(tab.id, {
          type: "enable",
          config: storage.options
        }).catch(reportError);

        browser.tabs.sendMessage(tab.id, {
          type: "showPopup",
          isHelp: true
        }).catch(reportError);

        browser.browserAction.setBadgeBackgroundColor({
          "color": [255, 0, 0, 255]
        });

        browser.browserAction.setBadgeText({
          "text": "On"
        });
      });
    },

    disable: function(tab) {
      let enabled = 0;
      let enablePromise = browser.storage.local.set({enabled});

      Promise.all([enablePromise]).then(([storage]) => {
        // Delete dictionary object after we implement it
        delete this.dict;

        browser.browserAction.setBadgeBackgroundColor({
          "color": [0, 0, 0, 0]
        });
        browser.browserAction.setBadgeText({
          "text": ""
        });

        // Send a disable message to all browsers.
        browser.windows.getAll({
          "populate": true
        }).then((windowInfoArray) => {
          for (let windowInfo of windowInfoArray) {
            for (let tabInfo of windowInfo.tabs) {
              browser.tabs.sendMessage(tabInfo.id, {
                type: "disable"
              }).catch(ignoreError);
              // Some tabs may not have a listener as they were never activated
            }
          }
        });
      });
    },

  enableToggle: function(tab) {
    let enabledPromise = browser.storage.local.get({enabled: 0});
    enabledPromise.then((storage) => {
      if (storage.enabled == 1) {
        zhongwenMain.disable(tab);
      } else {
        zhongwenMain.enable(tab);
      }
    });
  },

    search: function(text) {

        var entry = this.dict.wordSearch(text);
        if (entry != null) {
            for (var i = 0; i < entry.data.length; i++) {
                var word = entry.data[i][1];
                if (this.dict.hasKeyword(word) && (entry.matchLen == word.length)) {
                    // the final index should be the last one with the maximum length
                    entry.grammar = { keyword: word, index: i };
                }
            }
        }

        return entry;

    }
};
