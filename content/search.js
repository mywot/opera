/*
	content/search.js
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

wot.search = {
	added: {},
	pendingcounter: 1,
	pending: {},

	getattrname: function(name)
	{
		return "wotsearch" + name.replace(/[^a-z0-9]/g, "");
	},

	getname: function(name)
	{
		return "wotsearch" + name;
	},

	matchregexp: function(spec, data)
	{
		try {
			/* Custom flags:
				- n = negative match
				*/
			var flags = spec.flags || "";
			var rv = RegExp(spec.re, flags.replace("n", "")).test(data);

			return (flags.indexOf("n") < 0) ? rv : !rv;
		} catch (e) {
			wot.log("search.matchregexp: failed with " + e, true);
		}

		return false;
	},

	matchelement: function(match, elem)
	{
		try {
			/* match by attributes */
			if (match.attribute && match.attribute.length) {
				for (var i = 0; i < match.attribute.length; ++i) {
					if (!match.attribute[i].name || !match.attribute[i].re) {
						continue;
					}

					if (!elem.hasAttribute(match.attribute[i].name) ||
							!this.matchregexp(match.attribute[i],
								elem.getAttribute(match.attribute[i].name))) {
						return false;
					}
				}
			}

			/* match by content */
			if (match.value && match.value.length) {
				if (!elem.innerHTML) {
					return false;
				}

				for (var i = 0; i < match.value.length; ++i) {
					if (!match.value[i].re) {
						continue;
					}

					if (!this.matchregexp(match.value[i], elem.innerHTML)) {
						return false;
					}
				}
			}

			return true;
		} catch (e) {
			wot.log("search.matchelement: failed with " + e, true);
		}

		return false;
	},

	findmatchingelement: function(match, frame)
	{
		try {
			var set = [];

			if (match.element == "$frame") {
				set.push(frame.frameElement);
			} else {
				var docelem = frame.document;

				if (match.document == "$parent" && frame.parent) {
					docelem = frame.parent.document;
				}

				if (!docelem) {
					return null;
				}

				if (/^#/.test(match.element)) {
					set.push(docelem.getElementById(
						match.element.replace(/^#/, "")));
				} else {
					set = docelem.getElementsByTagName(match.element);
				}
			}

			if (set && set.length) {
				/* One matching element is enough */
				for (var i = 0; i < set.length; ++i) {
					if (set[i] && this.matchelement(match, set[i])) {
						return set[i];
					}
				}
			}
		} catch (e) {
			wot.log("search.findmatchingelement: failed with " + e, true);
		}

		return null;
	},

	matchcontent: function(match, frame)
	{
		try {
			/* process conditional rules */
			if (match.condition && match.match) {
				for (var i = 0; i < match.match.length; ++i) {
					var rv = this.matchcontent(match.match[i], frame);

					if (match.condition == "or" && rv) {
						return true;
					} else if (match.condition == "and" && !rv) {
						return false;
					}
				}

				return (match.match.length == 0 || match.condition == "and");
			}

			/* see if there's a matching element */
			if (match.element &&
					this.findmatchingelement(match, frame)) {
				return true;
			}
		} catch (e) {
			wot.log("search.matchcontent: failed with " + e, true);
		}

		return false;
	},

	matchrule: function(rule, frame)
	{
		try {
			if (!frame) {
				return false;
			}

			var url = frame.location.href;

			if (url == "about:blank" && frame.frameElement) {
				url = frame.frameElement.baseURI;
			}

			if (!wot.matchruleurl(rule, url)) {
				return false;
			}

			if (rule.match &&
					!this.matchcontent(rule.match[0], frame)) {
				return false;
			}

			return true;
		} catch (e) {
			wot.log("search.matchrule: failed with " + e, true);
		}

		return false;
	},

	processrule: function(rule, link, ontarget)
	{

		try {
			var url = link.href;

			if (rule.pre) {
				var matchfound = false;

				rule.pre.forEach(function(pre) {
					if (matchfound || !pre.re) {
						return;
					}

					var m = RegExp(pre.re).exec(url);

					if (m && m[pre.match]) {
						url = decodeURIComponent(m[pre.match]);
						matchfound = !!url;
					}
				});
			}

			if (rule.ign && RegExp(rule.ign).test(url)) {
				return;
			}

			wot.url.gethostname(url, function(target) {
				if (!target || (rule.target &&
						!wot.search.matchelement(rule.target, link))) {
					return;
				}

				ontarget(link, target);
			});

		} catch (e) {
			wot.log("search.processrule: failed with " + e, true);
		}
	},

	addrating: function(target, link, frame)
	{
		try {
			var elem = frame.document.createElement("div");

			if (elem) {
				elem.setAttribute(this.getattrname("target"), target);

				elem.setAttribute("style",
					"display: inline-block; " +
					"cursor: pointer; " +
					"width: 16px; " +
					"height: 16px;");

				elem.addEventListener("click", this.onclickrating, false);

				if (link.nextSibling) {
					elem = link.parentNode.insertBefore(elem, link.nextSibling);
				} else {
					elem = link.parentNode.appendChild(elem);
				}

				elem.innerHTML = "&nbsp;";
			}
		} catch (e) {
			wot.log("search.addrating: failed with " + e, true);
		}
	},

	addstyle: function(css, frame, id)
	{
		try {
			if (id && frame.document.getElementById(id)) {
				return;
			}

			var style = frame.document.createElement("style");

			style.setAttribute("type", "text/css");

			if (id) {
				style.setAttribute("id", id);
			}

			style.innerText = css;

			var insertpoint =
				frame.document.getElementsByTagName("head") ||
				frame.document.getElementsByTagName("body");

			if (insertpoint && insertpoint.length) {
				insertpoint[0].appendChild(style);
			}
		} catch (e) {
			wot.log("search.addstyle: failed with " + e, true);
		}
	},

	formatcss: function(css)
	{
		return css.replace(/ATTR/g, this.getattrname("target"));
	},

	getreputation: function(data)
	{
		try {
			var def_comp = data[wot.default_component];

			var r = (def_comp && def_comp.r != null) ? def_comp.r : -1;

			if (this.settings.search_type == wot.searchtypes.trustworthiness) {
				return r;
			}

			wot.components.forEach(function(item) {
				if (!wot.search.settings["show_application_" + item.name] ||
						wot.search.settings["search_ignore_" + item.name]) {
					return;
				}

				var comp_obj = data[item.name];

				switch (wot.search.settings.search_type) {
					case wot.searchtypes.optimized:
						var type = wot.getwarningtypeforcomponent(item.name, data,
										wot.search.settings);

						if (type && comp_obj && r > comp_obj.r) {
							r = comp_obj.r;
						}
						break;
					case wot.searchtypes.worst:
						if (comp_obj && comp_obj.r >= 0 && r > comp_obj.r) {
							r = comp_obj.r;
						}
						break;
					default:
						wot.log("search.getreputation: unknown search type: " +
							wot.search.settings.search_type);
						return;
				}
			});

			return r;
		} catch (e) {
			wot.log("search.getreputation: failed with " + e, true);
		}

		return -1;
	},

	getcss: function(rule, obj)
	{
		var css = "";

		if (rule.style && !this.added[obj.target]) {
			this.added[obj.target] = true;

			var r = this.getreputation(obj);

			if (this.settings.use_search_level &&
					r >= this.settings.search_level) {
				return css;
			}

			css = this.formatcss(rule.style)
					.replace(/NAME/g, obj.target)
					.replace(/IMAGE/g,
						wot.files[wot.geticon(r, 16,
								this.settings.accessible, true)]);
		}

		return css;
	},

	processframe: function(rule, frame, oncomplete)
	{
		try {
			var targets = [];

			for (var i = 0; i < frame.document.links.length; ++i) {
				var link = frame.document.links[i];

				if (!link.parentNode || !link.href ||
						link.getAttribute(this.getattrname("processed"))) {
					continue;
				}

				link.setAttribute(this.getattrname("processed"), true);

				this.processrule(rule, link, function(elem, target) {
					wot.search.addrating(target, elem, frame);
					targets.push(target);
				});
			}

			wot.bind("url:ready", function() {
				targets = wot.getuniques(targets);

				if (targets.length) {
					oncomplete(targets);
				}
			});
		} catch (e) {
			wot.log("search.processframe: failed with " + e, true);
		}
	},

	loadsettings: function(ondone)
	{
		var prefs = [
			"accessible",
			"min_confidence_level",
			"popup_hide_delay",
			"popup_show_delay",
			"search_level",
			"search_type",
			"show_search_popup",
			"use_search_level"
		];

		wot.components.forEach(function(item) {
			prefs.push("show_application_" + item.name);
			prefs.push("search_ignore_" + item.name);
			prefs.push("warning_level_" + item.name);
			prefs.push("warning_type_" + item.name);
			prefs.push("warning_unknown_" + item.name);
		});

		this.settings = this.settings || {};

		wot.prefs.load(prefs, function(name, value) {
				wot.search.settings[name] = value;
			}, ondone);
	},

	onprocess: function(data, frame)
	{
		wot.log("search.onprocess: " + data.url);

		if (this.matchrule(data.rule, frame)) {
			this.processframe(data.rule, frame, function(targets) {
				/* add common styles */
				if (data.rule.prestyle) {
					wot.search.addstyle(
						wot.search.formatcss(data.rule.prestyle), frame,
						wot.search.getname("prestyle"));
				}

				if (data.rule.popup && data.rule.popup.match &&
						data.rule.popup.match.length) {
					var elem = wot.search.findmatchingelement(
									rule.popup.match[0], frame);

					if (elem) {
						wot.popup.add(frame, elem);
					}
				} else {
					wot.popup.add(frame);
				}

				/* TODO: content scripts? */

				/* load ratings */
				var id = wot.search.pendingcounter++;
				wot.search.pending[id] = frame;
				delete(wot.search.pending[id - 10]); /* clean up older gets */
				
				wot.post("search", "get",
					{ id: id, rule: data.rule, targets: targets });
			});
		}

		if (data.rule.dynamic || frame.frameElement) {
			var handler = {
				handleEvent: function() {
					/* remove event handler while processing */
					try {
						frame.document.removeEventListener("DOMNodeInserted", this,
							false);
					} catch (e) {
						// come on Opera...
					}

					/* let the document settle before reprocessing */
					window.setTimeout(function() {
							wot.search.onprocess(data, frame);
						}, 500);
				}
			};

			/* watch for changes */
			// This timeout is a Workaround for VKontakte's bug / issue 554
			window.setTimeout(function(){
				try {
					frame.document.addEventListener("DOMNodeInserted", handler, false);
				} catch(e) {
					// hard life with Opera and cross-domains frames here...
				}

			}, 500);
			// seems like my computer very fast so we need delay about 500ms
		}

		/* opera: scripts aren't being injected to all frames. this checks
			the frames for the same search rule, which should be enough */
		for (var i = 0; i < frame.frames.length; ++i) {
			try {
				this.onprocess({
					url: frame.frames[i].location.href,
					rule: data.rule
				}, frame.frames[i]);

			} catch(e) {
				// just fu*k off these Opera's insane complains about frames.
			}
		}
	},

	onupdate: function(data, frame)
	{
		if (!frame) {
			return;
		}

		/* add rating styles */
		var style = "";

		for (var i in data.ratings) {
			style += this.getcss(data.rule, data.ratings[i]);
		}

		if (style.length) {
			this.addstyle(style, frame);
		}
	},

	onclickrating: function(event)
	{
		try {
			var target =
				event.target.getAttribute(wot.search.getattrname("target"));

			if (target) {

				wot.post("search", "openscorecard", {
					target: target,
					ctx: wot.urls.contexts.popupdonuts
				});

				event.stopPropagation();
			}
		} catch (e) {
			wot.log("search.onclickrating: failed with " + e, true);
		}
	},

	onload: function()
	{
		try {
			wot.bind("message:search:process", function(port, data) {
				/* load the necessary settings before starting */
				wot.search.loadsettings(function() {
					wot.search.onprocess(data, window);
				});
			});

			wot.bind("message:search:update", function(port, data) {
				wot.search.onupdate(data, wot.search.pending[data.id]);
			});

			document.addEventListener("DOMContentLoaded", function(e) {
					var url = e.target.location.href;
					if (url) {
						wot.post("search", "hello", { url: url });
					}
				}, false);

			/* opera: Wake up the background process immediately when
				the page changes, because there's no event that fires... */
			wot.post("update", "status");

			if (document.readyState == "complete") {
				var url = window.location.href;
				if (url) {
					wot.post("search", "hello", { url: url });
				}
			}
		} catch (e) {
			console.log("search.onload: failed with " + e);
		}
	}
};

wot.search.onload();
