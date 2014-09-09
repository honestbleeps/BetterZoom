BZ.addModule(
	'gfycat.com',
	function(gfycat, moduleID) {
		$.extend(gfycat, {
			domains: ['gfycat.com'],
			apiPrefix: 'https://gfycat.com/cajax/get/',
			calls: {},
			checkLinkForMedia: function(mediaData) {
				var promise = new RSVP.Promise(function(resolve, reject) {
					var href = mediaData.link.href;
					var index = href.indexOf(gfycat.domains[0]);
					if (index !== -1) {
						var name = href.substring(gfycat.domains[0].length + index + 1);
						if(name.length > 0) {
							var apiURL = gfycat.apiPrefix + name;
							console.log(apiURL);
							$.getJSON(apiURL, function(info) {
								if ('gfyItem' in info) {
									if('mp4Url' in info.gfyItem) {
										mediaData.src = info.gfyItem.webmUrl;
										mediaData.type = 'video';
										resolve(mediaData);
									} else {
										reject();
									}
								} else {
									reject();
								}
							});
						} else {
							reject();
						}
					} else {
						reject();
					}
				});
				return promise;
			}
		});
	}
);