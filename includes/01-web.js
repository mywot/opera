/* This is a generated file. Do not edit. */

// ==UserScript==
// @include http://www.mywot.com/*
// @include https://www.mywot.com/*
// ==/UserScript==

/*
	wot.js
	Copyright © 2009 - 2012  WOT Services Oy <info@mywot.com>

	This file is part of WOT.

	WOT is free software: you can redistribute it and/or modify it
	under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	WOT is distributed in the hope that it will be useful, but WITHOUT
	ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
	or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
	License for more details.

	You should have received a copy of the GNU General Public License
	along with WOT. If not, see <http://www.gnu.org/licenses/>.
*/

var wot = {
	version: 20120227,
	platform: "opera",
	language: "en",		/* default */
	debug: false,
	default_component: 0,

	components: [
		{ name: 0 },
		{ name: 1 },
		{ name: 2 },
		{ name: 4 }
	],

	reputationlevels: [
		{ name: "rx", min: -2 },
		{ name: "r0", min: -1 },
		{ name: "r1", min:  0 },
		{ name: "r2", min: 20 },
		{ name: "r3", min: 40 },
		{ name: "r4", min: 60 },
		{ name: "r5", min: 80 }
	],

	confidencelevels: [
		{ name: "cx", min: -2 },
		{ name: "c0", min: -1 },
		{ name: "c1", min:  6 },
		{ name: "c2", min: 12 },
		{ name: "c3", min: 23 },
		{ name: "c4", min: 34 },
		{ name: "c5", min: 45 }
	],

	searchtypes: {
		optimized: 0,
		worst: 1,
		trustworthiness: 2
	},

	warningtypes: { /* bigger value = more severe warning */
		none: 0,
		notification: 1,
		overlay: 2,
		block: 3
	},

	warningreasons: { /* bigger value = more important reason */
		none: 0,
		unknown: 1,
		rating: 2,
		reputation: 3
	},

	urls: {
		base:		"http://www.mywot.com/",
		scorecard:	"http://www.mywot.com/scorecard/",
		settings:	"http://www.mywot.com/settings",
		setcookies:	"http://www.mywot.com/setcookies.php",
		update:		"http://www.mywot.com/update",

		contexts: {
			rwlogo:     "rw-logo",
			rwsettings: "rw-settings",
			rwguide:    "rw-guide",
			rwviewsc:   "rw-viewsc",
			rwprofile:  "rw-profile",
			rwmsg:      "rw-msg",
			warnviewsc: "warn-viewsc",
			warnrate:   "warn-rate",
			popupviewsc: "popup",
			popupdonuts: "popup-donuts"
	    }
	},

	firstrunupdate: 1, /* increase to show a page after an update */

	cachestatus: {
		error:	0,
		ok:		1,
		busy:	2,
		retry:	3,
		link:	4
	},

	/* logging */

	log: function(s, force)
	{
		if (wot.debug || force) {
			opera.postError("extension: " + s);
		}
	},

	/* events */

	events: {},

	trigger: function(name, params, once)
	{
		if (this.events[name]) {
			this.log("trigger: event " + name + ", once = " + once);

			this.events[name].forEach(function(obj) {
				try {
					obj.func.apply(null, [].concat(params).concat(obj.params));
				} catch (e) {
					wot.log("trigger: event " + name + " failed with " +
						e, true);
				}
			});

			if (once) { /* these events happen only once per bind */
				delete(this.events[name]);
			}
		}
	},

	bind: function(name, func, params)
	{
		if (typeof(func) == "function") {
			this.events[name] = this.events[name] || [];
			this.events[name].push({ func: func, params: params || [] });

			this.trigger("bind:" + name);
		}
	},

	addready: function(name, obj, func)
	{
		obj.ready = function(setready)
		{
			if (typeof(func) == "function") {
				this.isready = setready || func.apply(this);
			} else {
				this.isready = setready || this.isready;
			}
			if (this.isready) {
				wot.trigger(name + ":ready", [], true);
			}
		};

		obj.isready = false;

		this.bind("bind:" + name + ":ready", function() {
			obj.ready();
		});
	},

	/* messaging */

	haslistener: false,

	ports: {},

	messagehandler: function(e)
	{
		var name = e.data.message.slice(0, e.data.message.indexOf(":"));

		if (wot.ports[name]) {
			wot.trigger("message:" + e.data.message, [ {
				name: name,
				tab: e.source,
				post: function(message, data) {
					wot.post(this.name, message, data, e.source);
				}
			}, e.data ]);
		}
	},

	listen: function(names)
	{
		if (typeof(names) == "string") {
			names = [ names ];
		}

		names.forEach(function(name) {
			wot.ports[name] = true;
		});

		if (this.haslistener) {
			return;
		}

		this.haslistener = true;

		opera.extension.addEventListener("message",
				this.messagehandler, false);
	},

	connect: function(name)
	{
		this.listen(name);
		return name;
	},

	post: function(name, message, data, target)
	{
		this.connect(name);

		data = data || {};
		data.message = name + ":" + message;

		this.log("post: posting " + data.message);

		if (target) {
			target.postMessage(data);
		} else if (opera.extension.postMessage) {
			opera.extension.postMessage(data);
		}
	},

	/* i18n */

	alllocales: {},

	i18n: function(category, id, shorter, language)
	{
		language = language || this.language;

		var locale = this.alllocales[language] || {};

		var msg = category;

		if (shorter) {
			msg += "__short";
		}

		if (id != null) {
			msg += "_" + id;
		}

		var result = (locale[msg] || {}).message;

		if (result != null) {
			return result;
		}

		if (language != "en") {
			return this.i18n(category, id, shorter, "en");
		}

		return (this.debug ? "!?" : "");
	},

	/* helpers */

	getuniques: function(list)
	{
		var seen = {};

		return list.filter(function(item) {
					if (seen[item]) {
						return false;
					} else {
						seen[item] = true;
						return true;
					}
				});
	},

	/* rules */

	matchruleurl: function(rule, url)
	{
		try {
			return (RegExp(rule.url).test(url) &&
						(!rule.urlign || !RegExp(rule.urlign).test(url)));
		} catch (e) {
			wot.log("matchurl: failed with " + e, true);
		}

		return false;
	},

	/* reputation and confidence */

	getlevel: function(levels, n)
	{
		for (var i = levels.length - 1; i >= 0; --i) {
			if (n >= levels[i].min) {
				return levels[i];
			}
		}

		return levels[1];
	},

	getwarningtypeforcomponent: function(comp, data, prefs)
	{
		var type = prefs["warning_type_" + comp] || this.warningtypes.none;

		if (!prefs["show_application_" + comp] ||
				type == this.warningtypes.none) {
			return null;
		}

		var r = -1, c = -1, t = -1;

		if (data[comp]) {
			r = data[comp].r;
			c = data[comp].c;
			t = data[comp].t;
		}

		var warninglevel = prefs["warning_level_" + comp] || 0;
		var minconfidence = prefs["min_confidence_level"] || 0;
		var forunknown = prefs["warning_unknown_" + comp];

		var rr = (r < -1) ? 0 : r;
		var cc = (c < -1) ? warninglevel : c;

		if (((rr >= 0 && rr <= warninglevel && /* poor reputation */
			  			/* and sufficient confidence */
						(cc >= minconfidence || forunknown)) ||
			 		/* or no reputation and warnings for unknown sites */
					(rr < 0 && forunknown)) &&
				/* and no rating that overrides the reputation */
				(t < 0 || t <= warninglevel)) {
			if (r < 0) {
				return {
					type: type,
					reason: this.warningreasons.unknown
				};
			} else {
				return {
					type: type,
					reason: this.warningreasons.reputation
				};
			}
		}

		/* or if the user has rated the site poorly */
		if (t >= 0 && t <= warninglevel) {
			return {
				type: type,
				reason: this.warningreasons.rating
			};
		}

		return null;
	},

	getwarningtype: function(data, prefs)
	{
		var warning = {
			type: this.warningtypes.none,
			reason: this.warningreasons.none
		};

		this.components.forEach(function(item) {
			var comp = wot.getwarningtypeforcomponent(item.name, data, prefs);

			if (comp) {
				warning.type   = Math.max(warning.type, comp.type);
				warning.reason = Math.max(warning.reason, comp.reason);
			}
		});

		return warning;
	},

	/* paths */

	getlocalepath: function(file)
	{
		return "_locales/" + this.i18n("locale") + "/" + file;
	},


	getincludepath: function(file)
	{
		return "skin/include/" + file;
	},

	geticon: function(r, size, accessible, plain)
	{
		var name = "/";
		
		if (typeof(r) == "number") {
			name += this.getlevel(this.reputationlevels, r).name;
		} else {
			name += r;
		}

		if (plain) {
			name = "/plain" + name;
		}

		var path = "skin/fusion/";

		if ((typeof(r) != "number" || r >= -1) && accessible) {
			path += "accessible/";
		}

		return path + size + "_" + size + name + ".png";
	},

	contextedurl: function(url, context)
	{
		var newurl = url;
		context = "addon-" + context;
		if(url.indexOf("?") > 0) {
			newurl += "&src=" + context;
		} else {
			newurl += "?src=" + context;
		}
		return newurl;
	}
};

/*
	content/common.js
	Copyright © 2009, 2010, 2011  WOT Services Oy <info@mywot.com>

	This file is part of WOT.

	WOT is free software: you can redistribute it and/or modify it
	under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	WOT is distributed in the hope that it will be useful, but WITHOUT
	ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
	or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
	License for more details.

	You should have received a copy of the GNU General Public License
	along with WOT. If not, see <http://www.gnu.org/licenses/>.
*/

wot.locale = {
	onload: function()
	{
		wot.addready("locale", this);

		wot.bind("message:locale:put", function(port, data) {
			wot.alllocales[data.language] = data.locale || {};
			wot.language = data.language;
			wot.locale.ready(true);
		});

		wot.post("locale", "get");
	}
};

wot.locale.onload();

wot.cache = {
	get: function(target, onget)
	{
		wot.bind("cache:put:" + target, onget);
		wot.post("cache", "get", { target: target });
	},

	clear: function(target)
	{
		wot.post("cache", "clear", { target: target });
	},

	onload: function()
	{
		wot.bind("message:cache:put", function(port, data) {
			wot.trigger("cache:put:" + data.target,
				[ data.target, data.data ], true);
		});
	}
};

wot.cache.onload();

wot.prefs = {
	disallowed: {
		"witness_key": true
	},
	pending: {},

	get: function(name, onget)
	{
		wot.bind("prefs:put:" + name, onget);

		if (this.disallowed[name]) {
			wot.trigger("prefs:put:" + name, [ name, null ], true);
		} else {
			this.pending[name] = true;
			wot.post("prefs", "get", { name: name });
		}
	},

	load: function(list, onget, onready)
	{
		var toget = [];

		list.forEach(function(item) {
			wot.bind("prefs:put:" + item, onget);

			if (wot.prefs.disallowed[item]) {
				wot.trigger("prefs:put:" + item, [ item, null ], true);
			} else {
				wot.prefs.pending[item] = true;
				toget.push(item);
			}
		});

		wot.post("prefs", "getm", { names: toget });
		wot.bind("prefs:ready", onready);
	},

	set: function(name, value)
	{
		wot.post("prefs", "set", { name: name, value: value });
	},

	clear: function(name)
	{
		wot.post("prefs", "clear", { name: name });
	},

	onload: function()
	{
		wot.addready("prefs", this, function() {
			for (var i in this.pending) {
				return false;
			}
			return true;
		});

		wot.bind("message:prefs:putm", function(port, data) {
			for (var i in data.values) {
				delete(wot.prefs.pending[i]);
				wot.trigger("prefs:put:" + i, [ i, data.values[i] ], true);
			}

			wot.prefs.ready();
		});

		wot.bind("message:prefs:put", function(port, data) {
			delete(wot.prefs.pending[data.name]);

			wot.trigger("prefs:put:" + data.name, [ data.name, data.value ],
				true);
			wot.prefs.ready();
		});
	}
};

wot.prefs.onload();

/*
	content/my.js
	Copyright © 2009, 2011  WOT Services Oy <info@mywot.com>

	This file is part of WOT.

	WOT is free software: you can redistribute it and/or modify it
	under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	WOT is distributed in the hope that it will be useful, but WITHOUT
	ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
	or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
	License for more details.

	You should have received a copy of the GNU General Public License
	along with WOT. If not, see <http://www.gnu.org/licenses/>.
*/

wot.my = {
	oncontentloaded: function()
	{
		try {
			var clear = document.getElementById("wotsaverating");

			if (clear) {
				clear.addEventListener("click", function() {
					var target = clear.getAttribute("target");
					if (target) {
						wot.cache.clear(target);
					}
				});
			}
		} catch (e) {
			wot.log("my.oncontentloaded: failed with " + e + "\n");
		}
	},

	onload: function()
	{
		try {
			wot.addready("my", this);

			wot.bind("message:my:setcookies", function(port, data) {
				data.cookies.forEach(function(item) {
					document.cookie = item;
					wot.log("my: set cookie: " + item + "\n");
				});

				wot.my.ready(true);
			});

			wot.post("my", "update", { cookies: document.cookie });

			document.addEventListener("DOMContentLoaded", function() {
					wot.my.oncontentloaded();
				}, false);

			if (document.readyState == "complete") {
				wot.my.oncontentloaded();
			}
		} catch (e) {
			wot.log("my.onload: failed with " + e + "\n");
		}
	}
};

wot.my.onload();

/*
	content/settings.js
	Copyright © 2009 - 2012  WOT Services Oy <info@mywot.com>

	This file is part of WOT.

	WOT is free software: you can redistribute it and/or modify it
	under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	WOT is distributed in the hope that it will be useful, but WITHOUT
	ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
	or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
	License for more details.

	You should have received a copy of the GNU General Public License
	along with WOT. If not, see <http://www.gnu.org/licenses/>.
*/

wot.settings = {
	trigger: /^http(s)?\:\/\/(www\.)?mywot\.com\/([^\/]{2}(-[^\/]+)?\/)?settings\/.+/,
	forward: /^http(s)?\:\/\/(www\.)?mywot\.com\/([^\/]{2}(-[^\/]+)?\/)?settings(\/([^\/]+))?\/?(\?.+)?$/,
	match: 6,

	addscript: function(js)
	{
		try {
			var script = document.createElement("script");

			script.setAttribute("type", "text/javascript");
			script.innerText = js;

			var body = document.getElementsByTagName("body");

			if (body && body.length > 0) {
				body[0].appendChild(script);
			}
		} catch (e) {
			wot.log("settings.addscript: failed with " + e);
		}
	},

	savesearch: function()
	{
		var state = {};

		var inputs = document.getElementsByClassName("wotsearchpref");

		for (var i = 0; i < inputs.length; ++i) {
			var attrs = {};

			[ "id", "type" ].forEach(function(item) {
				attrs[item] = inputs[i].getAttribute(item);
			});

			if (!/^wotsearch-/.test(attrs.id) || attrs.type != "checkbox" ||
					inputs[i].checked) {
				continue;
			}

			var m = /^wotsearch-(.+)$/.exec(attrs.id);

			if (m && m[1]) {
				state[m[1]] = true;
				wot.log("settings.savesearch: disabled: " + attrs.id);
			}
		}

		wot.prefs.set("search:state", state);
	},

	savesetting: function(elem)
	{
		var attrs = {};

		[ "wotpref", "id", "type", "value" ].forEach(function(item) {
			attrs[item] = elem.getAttribute(item);
		});

		if (!attrs.wotpref || !attrs.id || !attrs.type ||
				/^wotsearch-/.test(attrs.id)) {
			return;
		}

		if (attrs.type == "checkbox" || attrs.type == "radio") {
			if (attrs.wotpref == "bool") {
				wot.prefs.set(attrs.id, !!elem.checked);
			} else {
				wot.log("settings.savesetting: " + attrs.type +
					" cannot be " + attrs.wotpref);
			}
		} else {
			if (attrs.value == null) {
				if (attrs.wotpref == "string") {
					attrs.value = "";
				} else {
					wot.log("settings.savesetting: missing value for " +
						attrs.id);
					return;
				}
			}

			switch (attrs.wotpref) {
			case "string":
				wot.prefs.set(attrs.id, attrs.value.toString());
				break;
			case "bool":
				wot.prefs.set(attrs.id, (attrs.value == "true"));
				break;
			case "int":
				wot.prefs.set(attrs.id, Number(attrs.value));
				break;
			default:
				wot.log("settings.savesetting: unknown type " +
					attrs.wotpref);
				break;
			}
		}
	},

	saveinputs: function()
	{
		var inputs = document.getElementsByTagName("input");

		for (var i = 0; i < inputs.length; ++i) {
			this.savesetting(inputs[i]);
		}
	},

	save: function()
	{
		try {
			var save = document.getElementById("wotsave");

			if (save) {
				var saveclass = save.getAttribute("class");

				if (saveclass && saveclass.indexOf("disabled") >= 0) {
					return;
				}
			}

			this.saveinputs();
			this.savesearch();

			this.addscript("wotsettings_saved();");
		} catch (e) {
			wot.log("settings.save: failed with " + e);
			this.addscript("wotsettings_failed();");
		}
	},

	loadsearch: function()
	{
		var elem = document.getElementById("wotsearch");

		if (!elem) {
			return;
		}

		var preftype = elem.getAttribute("wotpref");

		if (preftype != "input") {
			return;
		}

		wot.prefs.get("search:state", function(name, state) {
			state = state || {};

			wot.prefs.get("update:state", function(name, update) {
				update = update || { search: [] };

				/* sort by display name */
				update.search.sort(function(a, b) {
					if (a.display < b.display) {
						return -1;
					}
					if (a.display > b.display) {
						return 1;
					}
					return 0;
				});

				update.search.forEach(function(item) {
					if (!item.display) {
						return;
					}

					var id = "wotsearch-" + item.name;

					var input = document.createElement("input");
					var label = document.createElement("label");

					input.setAttribute("id", id);
					input.setAttribute("class", "wotsearchpref");
					input.setAttribute("type", "checkbox");
					input.setAttribute("wotpref", "bool");
					input.checked = !state[item.name];

					label.setAttribute("for", id);
					label.innerText = item.display;

					elem.appendChild(input);
					elem.appendChild(label);
					elem.appendChild(document.createElement("br"));

					wot.log("settings.loadsearch: added " + id);
				});
			});
		});
	},

	loadsetting: function(elem)
	{
		var attrs = {};

		[ "wotpref", "id", "type" ].forEach(function(item) {
			attrs[item] = elem.getAttribute(item);
		});

		if (!attrs.wotpref || !attrs.id || !attrs.type) {
			return;
		}

		wot.prefs.get(attrs.id, function(name, value) {
			if (value == null) {
				wot.log("settings.loadsetting: " + attrs.id + " missing");
			} else if (attrs.type == "checkbox" || attrs.type == "radio") {
				wot.log("settings.loadsetting: " + attrs.id + " = " + !!value);
				elem.checked = !!value;
			} else {
				elem.setAttribute("value", value.toString());
			}
		});
	},

	loadinputs: function()
	{
		var inputs = document.getElementsByTagName("input");

		for (var i = 0; i < inputs.length; ++i) {
			this.loadsetting(inputs[i]);
		}
	},

	load: function()
	{
		try {
			this.loadinputs();
			this.loadsearch();

			[ "wotsave", "wotnext" ].forEach(function(id) {
				var elem = document.getElementById(id);

				if (elem) {
					elem.addEventListener("click", function() {
							wot.settings.save();
						}, false);
				}
			});

			/* TODO: levels */

			wot.bind("prefs:ready", function() {
				wot.settings.addscript("wotsettings_ready();");
				wot.log("settings.load: done");
			});
		} catch (e) {
			wot.log("settings.load: failed with " + e);
		}
	},

	onload: function()
	{
		if (window != window.top) {
			return; /* ignore the settings page if it's in a frame */
		}

		var match = window.location.href.match(this.forward);

		if (match) {
			/* redirect to the correct settings language and version */
			var section = match[this.match];

			wot.bind("locale:ready", function() {
				/* make sure we have set up authentication cookies */
				wot.bind("my:ready", function() {
					window.location.href = wot.urls.settings + "/" +
						wot.i18n("lang") + "/" + wot.platform + "/" + wot.version +
					((section) ? "/" + section : "");
				});
			});
		} else if (this.trigger.test(window.location.href)) {
			/* load settings for this page */
			document.addEventListener("DOMContentLoaded", function() {
					wot.settings.load();
				}, false);

			if (document.readyState == "complete") {
				wot.settings.load();
			}
		}
	}
};

wot.settings.onload();

