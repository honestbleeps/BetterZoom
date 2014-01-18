BZ.addModule(
  'flickr.com', 
  function (flickr, moduleID) {
    $.extend(flickr, {
      additionalDomains: [],
      apiPrefix: 'http://www.flickr.com/services/oembed/?format=json&url=',
      checkLinkForMedia: function(mediaData) {
        var promise = new RSVP.Promise(function(resolve, reject) {
          
            var href = mediaData.link.href,
                apiURL;

            if (href.indexOf('/sizes') === -1) {
              var inPosition = href.indexOf('/in/');
              var inFragment = '';
              if (inPosition !== -1) {
                inFragment = href.substring(inPosition);
                href = href.substring(0, inPosition);
              }

              href += '/sizes/c' + inFragment;
            }
            href = href.replace('/lightbox', '');
            apiURL = flickr.apiPrefix + href;

            $.getJSON(apiURL, function(info) {
              var imgRe = /\.(jpg|jpeg|gif|png)/i;
              
              if ('url' in info) {
                mediaData.imageTitle = info.title;
                if (imgRe.test(info.url)) {
                  mediaData.src = info.url;
                } else {
                  mediaData.src = info.thumbnail_url;
                }
                mediaData.credits = 'Picture by: <a href="' + info.author_url + '">' + info.author_name + '</a> @ Flickr';
                mediaData.type = 'img';
                resolve(mediaData);
              } else {
                reject("fail");
              }
            });
          });

          return promise;
        }
      }
    );
  }
);