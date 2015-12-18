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

var epubContent;

var book = $.url("?book") + "/";
var page = $.url("?page");

// Helper functions and button code
function gotoPage(href) {
	window.location = "?" + $.param({book: $.url("?book"), page: href});
}

function resolveID(id) {
	return epubContent.find("item#" + id).attr("href");
}

function gotoFront() {
	gotoPage(resolveID(epubContent.find("spine").children().eq(0).attr("idref")));
}
function getChapterIndex() {
	var id = epubContent.find("item[href='" + page + "']").attr("id");
	var inSpine = epubContent.find("spine itemref[idref='" + id + "']");
	return epubContent.find("spine").children().index(inSpine);
}
function gotoPrev() {
	var index = getChapterIndex();
	if (index > 0) {
		gotoPage(resolveID(epubContent.find("spine").children().eq(index - 1).attr("idref")));
	}
}
function gotoNext() {
	var index = getChapterIndex();
	if (index < epubContent.find("spine").children().length - 1) {
		gotoPage(resolveID(epubContent.find("spine").children().eq(index + 1).attr("idref")));
	}
}

// The guts
console.log("Loading " + book + "META-INF/container.xml");
$.get(book + "META-INF/container.xml", function(container) {
	console.log("Loaded container.xml");
	
	console.log("Loading " + book + $(container).find("rootfile").attr("full-path"));
	$.get(book + $(container).find("rootfile").attr("full-path"), function(content) {
		console.log("Loaded content.opf");
		
		epubContent = $(content);
		document.title = epubContent.find("dc\\:title").text();
		
		if (page) {
			console.log("Loading page " + page);
			
			$.get(book + page, function(html) {
				console.log("Loaded page " + page);
				
				renderEPUB(html);
				window.setTimeout(finishedRendering, 500); // Wait to finish rendering
			});
		} else {
			var firstPageID = epubContent.find("spine").children().eq(0).attr("idref");
			console.log("Loading id " + firstPageID);
			var firstPageHref = resolveID(firstPageID);
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
		var targetPage = $(event.target).attr("href");
		if (epubContent.find("item[href='" + targetPage + "']").length > 0) {
			gotoPage(targetPage);
			return false;
		}
	});
	
	// Fix ePub CSS
	var htmlLinks = html.match(/(<\s*link[^>]*>)/g);
	$(htmlLinks).each(function(i, e) {
		if ($(e).attr("rel") === "stylesheet") {
			var targetLink = $(e).attr("href");
			if (epubContent.find("item[href='" + targetLink + "']")) {
				targetLink = book + targetLink;
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
	if ($.url("#scroll")) {
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
	window.location = "#scroll=" + scrollpc;
}
