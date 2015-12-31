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

var bookBody = $("#bookOuter");
bookBody.annotator();

bookBody.annotator("addPlugin", "Auth", {
	tokenUrl: "http://annotateit.org/api/token"
});
bookBody.annotator("addPlugin", "Store", {
	prefix: "http://annotateit.org/api",
	annotationData: {
		uri: window.location.href.split(/#/).shift()
	},
	loadFromSearch: {
		uri: window.location.href.split(/#/).shift()
	}
});
bookBody.annotator("addPlugin", "Tags");
bookBody.annotator("addPlugin", "Markdown");
