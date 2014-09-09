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
							$.getJSON(apiURL, function(info) {
								if ('gfyItem' in info) {
									if('mp4Url' in info.gfyItem) {
										mediaData.type = 'video';
										mediaData.title = info.gfyItem.gfyName;
										mediaData.src = mediaData.link.href;
										mediaData.width = info.gfyItem.width;
										mediaData.height = info.gfyItem.height;
										mediaData.loop = true;
										mediaData.mute = true;
										mediaData.sources = [
											{
												src: info.gfyItem.webmUrl,
												type: "video/webm"
											},
											{
												src: info.gfyItem.mp4Url,
												type: "video/mp4"
											}
										];
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