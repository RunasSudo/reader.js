//    reader.js - A lightweight EPUB reader in JavaScript with annotation support
//    Copyright © 2015  RunasSudo (Yingtong Li)
//
//    This program is free software: you can redistribute it and/or modify
//    it under the terms of the GNU Affero General Public License as published by
//    the Free Software Foundation, either version 3 of the License, or
//    (at your option) any later version.
//
//    This program is distributed in the hope that it will be useful,
//    but WITHOUT ANY WARRANTY; without even the implied warranty of
//    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//    GNU Affero General Public License for more details.
//
//    You should have received a copy of the GNU Affero General Public License
//    along with this program.  If not, see <http://www.gnu.org/licenses/>.

var book = $.url("?book") + "/";
var page = $.url("?page"); // relative to reader.html

// Helper functions and button code
function gotoPage(href, anchor) {
	window.location = "?" + $.param({book: $.url("?book"), page: traverseRelative(href)}) + (anchor ? "#" + $.param({anchor: anchor}) : "");
}

function resolveID(id) {
	return epubContent.find("item#" + id).attr("href");
}
function resolvePath(path) {
	// Deal with relative paths
	path = traverseRelative(path);
	
	if (path.startsWith(basedir(opfPath))) {
		path = path.substring(basedir(opfPath).length);
	}
	var items = epubContent.find("item[href='" + path + "']");
	return items.attr("id") || $();
}
function basedir(path) {
	return path.substring(0, path.lastIndexOf("/") + 1);
}
function traverseRelative(path) {
	return path.replace(/[^\/]*\/\.\.\//, ""); // [^/]*../
}

function gotoFront() {
	gotoPage(basedir(opfPath) + resolveID(epubContent.find("spine").children().eq(0).attr("idref")));
}
function findTOC() {
	// Make a guess
	var toc;
	if ((toc = epubContent.find("item#contents[media-type*='html']")).length > 0) {
		return toc.attr("href");
	}
	if ((toc = epubContent.find("item#toc[media-type*='html']")).length > 0) {
		return toc.attr("href");
	}
	return false;
}
function gotoTOC() {
	gotoPage(basedir(opfPath) + findTOC());
}
function getChapterIndex() {
	var id = resolvePath(page);
	var inSpine = epubContent.find("spine itemref[idref='" + id + "']");
	return epubContent.find("spine").children().index(inSpine);
}
function gotoPrev() {
	var index = getChapterIndex();
	if (index > 0) {
		gotoPage(basedir(opfPath) + resolveID(epubContent.find("spine").children().eq(index - 1).attr("idref")));
	}
}
function gotoNext() {
	var index = getChapterIndex();
	if (index < epubContent.find("spine").children().length - 1) {
		gotoPage(basedir(opfPath) + resolveID(epubContent.find("spine").children().eq(index + 1).attr("idref")));
	}
}

// The guts
var epubContent;
var opfPath;

console.log("Loading " + book + "META-INF/container.xml");
$.get(book + "META-INF/container.xml", function(container) {
	console.log("Loaded container.xml");
	
	opfPath = $(container).find("rootfile").attr("full-path");
	console.log("Loading " + book + opfPath);
	$.get(book + opfPath, function(content) {
		console.log("Loaded " + opfPath);
		
		epubContent = $(content);
		document.title = epubContent.find("dc\\:title").text();
		
		// See if we can find a table of contents
		if (!findTOC()) {
			$("#btnTOC").hide();
		}
		
		if (page) {
			console.log("Loading page " + page);
			
			$.get(book + page, function(html) {
				console.log("Loaded page " + page);
				
				renderEPUB(html);
				window.setTimeout(finishedRendering, 500); // Wait to finish rendering
			}, "html"); // Explicitly specify type for consistency, as some pages are XML
		} else {
			var firstPageID = epubContent.find("spine").children().eq(0).attr("idref");
			console.log("Loading id " + firstPageID);
			var firstPageHref = basedir(opfPath) + resolveID(firstPageID);
			console.log("Loading page " + firstPageHref);
			
			gotoPage(firstPageHref);
		}
	}, "xml");
}, "xml");

function renderEPUB(html) {
	var htmlBody = html.match(/<\s*body[^>]*>([\s\S]*)<\s*\/\s*body\s*>/)[1]; // Damn it, jQuery!
	$("#book").html(htmlBody);
	
	// Fix ePub internal links
	$("#book").find("a").click(function(event) {
		var targetPage = $(this).attr("href");
		var anchor;
		if (targetPage.contains("#")) {
			anchor = targetPage.substring(targetPage.indexOf("#") + 1);
			targetPage = targetPage.substring(0, targetPage.indexOf("#"));
		}
		
		if (resolvePath(basedir(page) + targetPage).length > 0) {
			gotoPage(basedir(page) + targetPage, anchor);
			return false;
		}
	});
	
	// Fix ePub img
	$("#book").find("img").each(function(i, e) {
		var targetLink = $(e).attr("src");
		if (resolvePath(basedir(page) + targetLink).length > 0) {
			targetLink = book + basedir(page) + targetLink;
			$(e).attr("src", targetLink);
		}
	});
	$("#book").find("image").each(function(i, e) { // images in inline SVGs
		var targetLink = $(e).attr("xlink:href");
		if (resolvePath(basedir(page) + targetLink).length > 0) {
			targetLink = book + basedir(page) + targetLink;
			$(e).attr("xlink:href", targetLink);
		}
	});
	
	// Fix ePub CSS
	var htmlLinks = html.match(/(<\s*link[^>]*>)/g);
	$(htmlLinks).each(function(i, e) {
		if ($(e).attr("rel") === "stylesheet" && $(e).attr("type") === "text/css") {
			var targetLink = $(e).attr("href");
			if (resolvePath(basedir(page) + targetLink)) {
				targetLink = book + basedir(page) + targetLink;
			}
			// Replace with a scoped CSS import
			console.log("Replacing stylesheet for " + targetLink);
			var style = $("<style></style>").attr("type", "text/css").attr("scoped", "");
			style.html('@import "' + targetLink + '";');
			$("#book").append(style);
		}
	});
}

function finishedRendering() {
	// Scroll position
	if ($.url("#anchor")) {
		// Escape CSS
		$("#" + $.url("#anchor").replace(/(:|\.|\[|\]|,)/g, "\\$1"))[0].scrollIntoView();
	} else if ($.url("#scroll")) {
		var scroll = $.url("#scroll") / 100 * ($(document).height() - $(window).height());
		$(window).scrollTop(scroll);
	}
	
	$(window).scroll(function() {
		// Delay the processing to improve performance
		if (scrollTimer) {
			window.clearTimeout(scrollTimer);
		}
		scrollTimer = window.setTimeout(handleScroll, 500);
	});
}

// Fancy scroll things
var scrollTimer = null;
function handleScroll() {
	scrollTimer = null;
	var scrollpc = $(window).scrollTop() / ($(document).height() - $(window).height()) * 100;
	history.replaceState(undefined, undefined, "#scroll=" + scrollpc);
}
