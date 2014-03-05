  BZ.addModule(
    'wikipedia.org', 
    function (wikipedia, moduleID) {
      $.extend(wikipedia, {
        domains: ['en.wikipedia.org'],
        apiPrefix: 'http://en.wikipedia.org/w/api.php',
        hashRe: /^((http(s)?:\/\/)?.*\.)?wikipedia.org\/wiki\/File:([A-Za-z0-9_\-]*)?.(png|gif|jpg|jpeg)$/i,
        calls: {},
        checkLinkForMedia: function(mediaData) {
          var href = mediaData.link.href.split('?')[0];
          var promise = new RSVP.Promise(function(resolve, reject) {
            if(wikipedia.hashRe.exec(href)){
             console.log('make call wikipedia',href);
             $.ajax({
              method: 'GET',
              dataType: "html",
              url: href,
              success: function(response) {
                var result = $(response);
                var link = "http://"+result.find(".fullImageLink").find("a").attr('href').replace("//","");
                console.log("Direct link:",link);
                mediaData.src = link;
                resolve(mediaData);
              },
              error: function(response) {
                reject();
              }
            });
           }else{
            reject();
          }
        });
          return promise;
        }
      }); 
    }
  );