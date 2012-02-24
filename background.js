/*
	background.js
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

$.extend(wot, { core: {
	usermessage: {},
	usercontent: [],
	lastshown: {},

	loadratings: function(hosts, onupdate)
	{
		if (typeof(hosts) == "string") {
			var target = wot.url.gethostname(hosts);

			if (target) {
				return wot.api.query(target, onupdate);
			}
		} else if (typeof(hosts) == "object" && hosts.length > 0) {
			return wot.api.link(hosts, onupdate);
		}

		(onupdate || function() {})([]);
		return false;
	},

	update: function(popup)
	{
		try {
			this.updatetab(opera.extension.tabs.getFocused(), popup);
		} catch (e) {
			wot.log("core.update: failed with " + e, true);
		}
	},

	updatetab: function(tab, popup)
	{
		var url = (tab && tab.url) ? tab.url : "";

		wot.log("core.updatetab: " + url);

		if (wot.api.isregistered()) {
			wot.core.loadratings(url, function(hosts) {
				wot.core.updatetabstate(tab, {
					target: hosts[0],
					decodedtarget: wot.url.decodehostname(hosts[0]),
					cached: wot.cache.get(hosts[0]) || { value: {} }
				}, popup);
			});
		} else {
			wot.core.updatetabstate(tab, { status: "notready" }, popup);
		}
	},

	geticon: function(data)
	{
		try {
			if (data.status == "notready") {
				return "loading";
			}

			var cached = data.cached || {};
		
			if (cached.status == wot.cachestatus.ok) {
				/* reputation */
				var def_comp = cached.value[wot.default_component];

				var result = wot.getlevel(wot.reputationlevels,
								(def_comp && def_comp.r != null) ?
									def_comp.r : -1).name;

				/* additional classes */
				if (result != "rx") {
					if (this.unseenmessage()) {
						result = "message_" + result;
					} else if (result != "r0" &&
								!wot.components.some(function(item) {
									return (cached.value[item.name] &&
											cached.value[item.name].t >= 0);
								})) {
						result = "new_" + result;
					}
				}

				return result;
			} else if (cached.status == wot.cachestatus.busy) {
				return "loading";
			} else if (cached.status == wot.cachestatus.error) {
				return "error";
			}
			
			return "default";
		} catch (e) {
			wot.log("core.geticon: failed with " + e, true);
		}

		return "error";
	},

	seticon: function(data)
	{
		try {
			this.button.icon = wot.geticon(this.geticon(data), 19,
									wot.prefs.get("accessible"));
		} catch (e) {
			wot.log("core.seticon: failed with " + e, true);
		}
	},

	updatetabstate: function(tab, data, popup)
	{
		try {
			if (!tab || tab.focused) {
				/* update the toolbar button */
				this.seticon(data);
			}

			if (popup == tab) {
				popup = null;
			}

			[ tab, popup ].forEach(function(target) {
				if (target) {
					wot.post("status", "update", {
							data: data,
							usercontent: {
								message: wot.core.usermessage,
								content: wot.core.usercontent
							}
						}, target);
				}
			});
			
			this.updatetabwarning(tab, data);
		} catch (e) {
			wot.log("core.updatetabstate: failed with " + e, true);
		}
	},

	updatetabwarning: function(tab, data)
	{
		try {
			if (data.cached.status != wot.cachestatus.ok ||
					data.cached.flags.warned) {
				return; /* don't change the current status */
			}
			
			var prefs = [
				"accessible",
				"min_confidence_level",
				"warning_opacity"
			];

			wot.components.forEach(function(item) {
				prefs.push("show_application_" + item.name);
				prefs.push("warning_level_" + item.name);
				prefs.push("warning_type_" + item.name);
				prefs.push("warning_unknown_" + item.name);
			});

			var settings = {};

			prefs.forEach(function(item) {
				settings[item] = wot.prefs.get(item);
			});

			var type = wot.getwarningtype(data.cached.value, settings);

			if (type && type.type == wot.warningtypes.overlay) {
				wot.post("warning", "show", {
						data: data,
						type: type,
						settings: settings
					}, tab);
			}
		} catch (e) {
			wot.log("core.updatetabwarning: failed with " + e);
		}
	},

	setusermessage: function(data)
	{
		try {
			this.usermessage = {};

			var elems = data.getElementsByTagName("message");

			for (var i = 0; elems && i < elems.length; ++i) {
				var elem = $(elems[i]);

				var obj = {
					text: elem.text()
				};

				[ "id", "type", "url", "target", "version", "than" ]
					.forEach(function(name) {
						obj[name] = elem.attr(name);
					});

				if (obj.id && obj.type &&
						(obj.target == "all" || obj.target == wot.platform) &&
						(!obj.version || !obj.than ||
						 	(obj.version == "eq" && wot.version == obj.than) ||
							(obj.version == "le" && wot.version <= obj.than) ||
							(obj.version == "ge" && wot.version >= obj.than))) {
					this.usermessage = obj;
					break;
				}
			}
		} catch (e) {
			wot.log("core.setusermessage: failed with " + e, true);
		}
	},

	unseenmessage: function()
	{
		return (this.usermessage.text &&
					this.usermessage.id &&
					this.usermessage.id != wot.prefs.get("last_message") &&
					this.usermessage.id != "downtime");
	},

	setusercontent: function(data)
	{
		try {
			this.usercontent = [];

			var elems = data.getElementsByTagName("user");

			for (var i = 0; elems && i < elems.length &&
					this.usercontent.length < 4; ++i) {
				var elem = $(elems[i]);
				var obj = {};

				[ "icon", "bar", "length", "label", "url", "text", "notice" ]
					.forEach(function(name) {
						obj[name] = elem.attr(name);
					});

				if (obj.text && (!obj.bar ||
						(obj.length != null && obj.label))) {
					this.usercontent.push(obj);
				}
			}
		} catch (e) {
			wot.log("core.setusercontent: failed with " + e, true);
		}
	},

	setuserlevel: function(data)
	{
		try {
			var elems = data.getElementsByTagName("status");

			if (elems && elems.length > 0) {
				wot.prefs.set("status_level", $(elems[0]).attr("level") || "");
			} else {
				wot.prefs.clear("status_level");
			}
		} catch (e) {
			wot.log("core.setuserlevel: failed with " + e, true);
		}
	},

	processrules: function(url, onmatch)
	{
		onmatch = onmatch || function() {};

		if (!wot.api.state || !wot.api.state.search) {
			return false;
		}

		var state = wot.prefs.get("search:state") || {};

		for (var i = 0; i < wot.api.state.search.length; ++i) {
			var rule = wot.api.state.search[i];

			if (state[rule.name]) {
				continue; /* disabled */
			}

			if (wot.matchruleurl(rule, url)) {
				onmatch(rule);
				return true;
			}
		}

		return false;
	},

	onload: function()
	{
		try {
			/* messages */

			wot.bind("message:search:hello", function(port, data) {
				wot.core.processrules(data.url, function(rule) {
					port.post("process", { url: data.url, rule: rule });
				});
			});

			wot.bind("message:search:get", function(port, data) {
				wot.core.loadratings(data.targets, function(hosts) {
					var ratings = {};

					hosts.forEach(function(target) {
						var obj = wot.cache.get(target) || {};

						if (obj.status == wot.cachestatus.ok ||
							obj.status == wot.cachestatus.link) {
							ratings[target] = obj.value;
						}
					});

					port.post("update", {
						id: data.id,
						rule: data.rule,
						ratings: ratings
					});
				});
			});

			wot.bind("message:search:openscorecard", function(port, data) {
				var url = wot.contextedurl(wot.urls.scorecard +
					encodeURIComponent(data.target), data.ctx);

				opera.extension.tabs.create({
					url: url,
					focused: true
				});
			});

			wot.bind("message:my:update", function(port, data) {
				port.post("setcookies", {
					cookies: wot.api.processcookies(data.cookies) || []
				});
			});

			wot.bind("message:update:status", function(port, data) {
				wot.core.update(port.tab);
			});

			wot.bind("message:rating:resizepopup", function(port, data) {
				if (data.width) {
					var width = data.width + "px";
					if (wot.core.button.popup.width != width) {
						wot.core.button.popup.width = width;
					}
				}
				if (data.height) {
					var height = data.height + "px";
					if (wot.core.button.popup.height != height) {
						wot.core.button.popup.height = height;
					}
				}
			});

			wot.bind("message:rating:finishstate", function(port, data) {
				/* message was shown */
				if (wot.core.unseenmessage()) {
					wot.prefs.set("last_message", wot.core.usermessage.id);
				}

				/* check for rating changes */
				if (wot.cache.cacheratingstate(data.state.target,
							data.state)) {
					/* submit new ratings */
					var params = {};

					wot.components.forEach(function(item) {
						if (data.state[item.name]) {
							params["testimony_" + item.name] =
								data.state[item.name].t;
						}
					});

					wot.api.submit(data.state.target, params);
				}

				/* update all views */
				wot.core.update(port.tab);
			});

			wot.bind("message:rating:navigate", function(port, data) {
				opera.extension.tabs.create({
					url: data.url,
					focused: true
				});
			});

			wot.bind("message:rating:openscorecard", function(port, data) {
				var tab = opera.extension.tabs.getFocused();
				if (tab && tab.url) {
					var host = wot.url.gethostname(tab.url);
					
					if (host) {
						opera.extension.tabs.create({
							url: wot.urls.scorecard + encodeURIComponent(host),
							focused: true
						});
					}
				}
			});

			wot.listen([ "search", "my", "update", "rating" ]);

			/* event handlers */

			opera.extension.tabs.addEventListener("create", function(e) {
				wot.core.update();
			}, false);

			opera.extension.tabs.addEventListener("close", function(e) {
				wot.core.update();
			}, false);

			opera.extension.tabs.addEventListener("blur", function(e) {
				wot.core.update();
			}, false);

			opera.extension.tabs.addEventListener("focus", function(e) {
				wot.core.update();
			}, false);

			if (wot.debug) {
				wot.prefs.clear("update:state");

				wot.bind("cache:set", function(name, value) {
					wot.log("cache.set: " + name + " = " +
						JSON.stringify(value));
				});

				wot.bind("prefs:set", function(name, value) {
					wot.log("prefs.set: " + name + " = " +
						JSON.stringify(value));
				});
			}

			/* toolbar button */

			this.button = opera.contexts.toolbar.createItem({
								disabled: false,
								title: "WOT",
								icon: "skin/fusion/19_19/default.png",
								popup: {
									href: "ratingwindow.html",
									width: "332px",
									height: "492px"
								}
							});

			opera.contexts.toolbar.addItem(this.button);

			/* initialize */

			wot.api.register(function() {
				wot.core.update();

				if (wot.api.isregistered()) {
					wot.api.setcookies();
					wot.api.update();
					wot.api.processpending();
				}
			});

			wot.cache.purge();
		} catch (e) {
			wot.log("core.onload: failed with " + e, true);
		}
	}
}});

wot.core.onload();
