/**
 * BetterZoom (c) 2013 Steve Sobel / honestbleeps
 * 
 * BetterZoom is a HoverZoom replacement extension built with BabelExt,
 * because HoverZoom has repeatedly broken the trust of its users.
 *
 * LICENSE: I am investigating choosing a specific license for this software.
 * Suggestions are greatly appreciated as I'd like to choose a license soon.
 * My goal in choosing a license: I do not want such a permissive license
 * that someone can simply repackage this code, add in their shady tracking,
 * malware or whatever else without my having the ability to get their software
 * taken down due to a breach of license.
 *
 */

/**
 * TODOS:
 *
 * - add album support
 * 
 * - add tools to the 'header' section, such as +/- to increase/decrease size
 *   of the image, << / >> buttons for albums once we add album support, etc.
 *   Also, a "save" button might be nice. Keyboard commands for browsing albums,
 *   zooming, etc would be good. Maybe a 'fullscreen' button that maxes out the
 *   size and temporarily pauses mouseout/mouseover events, lightboxing the image.
 *
 * - consider a plugin system allowing separate files for "site modules", perhaps
 *   in the vein of how HoverZoom handles it.
 * 
 * - add more sites that require API calls besides Flickr/imgur - code can be
 *   stolen from RES's 'viewImages' module and converted to work here. See
 *   https://github.com/honestbleeps/Reddit-Enhancement-Suite/ for more info
 *
 * - probably lots of tweaking could be made to the getOptimalImagePosition method.
 *
 * - add user preferences/settings. Because this extension needs to be cross
 *   browser compatible, these will probably use BabelExt.storage and not each
 *   browser's proprietary settings APIs.  This means building a console similar
 *   to that of RES.
 *
 * - add VIDEO and AUDIO tag support. Scaffolding is already there. Shouldn't
 *   be too hard!
 *
 * 
 */

var BetterZoom = {
  screenPadding: 20, // padding on screen
  init: function() {
    this.container = $('<div class="BetterZoom-container"></div>');
    // the callout is a triangle that will connect with the image container
    this.callout = $('<div class="BetterZoom-callout"></div>');
    this.header = $('<div class="BetterZoom-header"><span>BetterZoom</span></div>');
    this.mediaContainer = $('<div class="BetterZoom-media">');
    this.loader = $('<div class="BetterZoom-loader"></div>');

    $(this.container)
      .append(this.header, this.mediaContainer)
      .mouseleave(BetterZoom.handleMouseOut)
      .mouseover(BetterZoom.cancelHideTimer);
    
    this.img = new Image();
    $(this.img)
      .on('load', BetterZoom.handleImageLoad);
    this.video = $('<video>');
    this.audio = $('<audio>');

    // this.getMediaLinks();
    $(document.body)
      .on('mouseover', 'a, img', {}, BetterZoom.handleMouseOver)
      .on('mouseout', 'a, img', {}, BetterZoom.handleMouseOut)
      .append(this.container, this.callout);

    $(window).on('mousemove', 'body', BetterZoom.setMouseXY);
  },
  setMouseXY: function(e) {
    e = e || window.event;
    var cursor = {
      x: 0,
      y: 0
    };
    if (e.pageX || e.pageY) {
      cursor.x = e.pageX;
      cursor.y = e.pageY;
    } else {
      cursor.x = e.clientX +
        (document.documentElement.scrollLeft ||
        document.body.scrollLeft) -
        document.documentElement.clientLeft;
      cursor.y = e.clientY +
        (document.documentElement.scrollTop ||
        document.body.scrollTop) -
        document.documentElement.clientTop;
    }
    BetterZoom.mouse = {
      x: cursor.x,
      y: cursor.y
    };
  },
  /**
   * Get media links from the specified element. Utilizes getLinks, then filters through looking for image links.
   * @param  {DOM element} ele - element to scan - if not specified, document.body is used.
   * @return {array} - array of DOM elements
   */
  getMediaLinks: function(ele) {
    ele = ele || document.body;
    var allLinks = this.getLinks(ele),
        mediaLinks = [];

    // filter through list to find image links
    for (var i = 0, len = allLinks.length; i < len; i++) {
      if (this.checkLinkForMedia(allLinks[i])) {
        mediaLinks.push(allLinks[i]);
      }
    }
  },
  /**
   * Get all links from the specified element.
   * @param  {DOM element} ele - element to scan - if not specified, document.body is used.
   * @return {array} - array of DOM elements
   */
  getLinks: function(ele) {
    ele = ele || document.body;

    return $(ele).find('a');
  },
  handleMouseOver: function(event) {
    this.showTimer = setTimeout(function() {
      BetterZoom.processLink(event.target);
    }, 400);
  },
  processLink: function(ele) {
    BetterZoom.checkLinkForGenericMedia(ele)
      .then(function(mediaData) {
        return BetterZoom.checkLinkForMedia(mediaData);
      }).then(function(mediaData) {
        return BetterZoom.showMedia(mediaData);
      });
  },
  handleMouseOverError: function(error) {
    console.log(error);
  },
  handleMouseOut: function(event) {
    if (BetterZoom.showTimer) {
      clearTimeout(BetterZoom.showTimer);
    }
    BetterZoom.hideTimer = setTimeout(BetterZoom.hideMedia, 500);
  },
  handleImageLoad: function(event) {
    var pos = BetterZoom.getOptimalImagePosition();
    $(BetterZoom.img).css(pos.size);

    $(BetterZoom.container)
      .css(
        pos.position
      )
      .show();

    BetterZoom.showImageElement();
  },
  showImageElement: function() {
    $(BetterZoom.loader).hide();
    $(BetterZoom.img).show();
  },
  cancelHideTimer: function() {
    if (BetterZoom.hideTimer) {
      clearTimeout(BetterZoom.hideTimer);
    }
  },
  cancelShowTimer: function() {
    if (BetterZoom.showTimer) {
      clearTimeout(BetterZoom.showTimer);
    }
  },
  /**
   * get max width and height the image should be given the available
   * screen real estate to the right or left of the mouse as well as above
   * and below, as well as the proper position for the image.
   * 
   * @return {Object} - object containing maxWidth and maxHeight in integer values
   */
  getOptimalImagePosition: function() {
    var maxWidth, maxHeight, top, left,
        offsetX = 30, // how far away horizintally from the mouse, in pixels?
        offsetY = 0, // how far away vertically from the mouse, in pixels?
        headerHeight = 60,
        screenWidth = $(window).width(),
        screenHeight = $(window).height(),
        screenTop = $(window).scrollTop(),
        screenBottom = screenTop + screenHeight,
        screenCenterX = $(window).scrollLeft() + (screenWidth / 2),
        screenCenterY = $(window).scrollTop() + (screenHeight / 2);

    if (BetterZoom.mouse.x < screenCenterX) {
      // if left of center:
      // - show image to right of the mouse
      // - maxWidth should be distance from mouse to right of screen minus offsetX minus screen padding (don't go all the way to edge of screen)
      left = BetterZoom.mouse.x + offsetX;
      maxWidth = screenWidth - BetterZoom.mouse.x - offsetX - BetterZoom.screenPadding;
    } else {
      // if right of center:
      // - show image to left of mouse, starting at 0
      // - maxWidth should be distance from left of screen to mouse, minus offsetX minus screen padding (don't go all the way to edge of screen)
      left = $(window).scrollLeft();
      maxWidth = BetterZoom.mouse.x - offsetX - BetterZoom.screenPadding;
    }
  
    top = screenTop + BetterZoom.screenPadding;

    // if the bottom of the image isn't low enough to be next to the callout,
    // fix that by adding more padding to the top.
    if (top + BetterZoom.img.height < BetterZoom.mouse.y) {
      top = BetterZoom.mouse.y - BetterZoom.img.height;
    }

    maxHeight = screenHeight - BetterZoom.screenPadding - headerHeight;  
/*
    if (BetterZoom.mouse.y < screenCenterY) {
      // if above center:
      // - show image below mouse
      // - maxHeight should be distance from mouse to bottom of visible screen, minus offsetY minus screen padding (don't go all the way to edge of screen)
      top = BetterZoom.mouse.y + offsetY;
      maxHeight = screenBottom - (BetterZoom.mouse.y + offsetY) - BetterZoom.screenPadding;
    } else {
      // if below center:
      // - show image above mouse
      // - maxHeight should be distance from mouse to top of visible screen, minus offsetY  minus screen padding (don't go all the way to edge of screen)
      top = $(window).scrollTop();
      maxHeight = screenTop - BetterZoom.mouse.y - offsetY - BetterZoom.screenPadding;
    }
*/
    return {
      position: {
        top: top,
        left: left
      },
      size: {
        maxWidth: maxWidth,
        maxHeight: maxHeight
      }
    };
  },
  showMedia: function(mediaData) {
    // if we didn't get back mediaData, do nothing.
    if (!mediaData.type) {
      return;
    }
    var screenTop = $(window).scrollTop();
    
    // cancel any pending hide timer
    this.cancelHideTimer();

    // show the callout arrow right next to the mouse.
    $(this.callout)
      .css({
        top: Math.max(BetterZoom.mouse.y, screenTop + BetterZoom.screenPadding),
        left: BetterZoom.mouse.x + 10 // add a bit of padding to allow clicks to still work.
      })
      .show();

    if (mediaData.type === 'img') {
      // if we've found an image:
      // 1) replace contents of mediaContainer with loader+img (as it might be .video, .audio etc)
      // 2) show the loader
      // 3) update the src of our betterzoom image to that URL
      // 4) upon load, calculate optimal screen position and size
      //    note: this is triggered by the 'load' event on the image

      // empty out the mediaContainer and place in our loader and image.
      $(BetterZoom.mediaContainer)
        .empty()
        .append(BetterZoom.loader)
        .append(BetterZoom.img);

      // hide img and change src to new URL we just received.
      $(BetterZoom.img)
        .hide()
        .attr('src',mediaData.src);

      // show container, which contains loader...
      $(BetterZoom.container)
        .css({
          top: BetterZoom.mouse.y,
          left: BetterZoom.mouse.x // width of callout + padding
        })
        .show();

      // if the image was cached, the onload event won't trigger, so let's
      // trigger it manually if we have an image with a width.
      if (BetterZoom.img.width > 0) {
        BetterZoom.handleImageLoad();
      } else {
        // show loader only if we need to load a new image
        $(BetterZoom.loader)
          .show();
      }

    }
    return true;
  },
  hideMedia: function() {
    $(BetterZoom.container).hide();
    $(BetterZoom.callout).hide();
  },
  /**
   * Check for a media link using our generic check (URL ends in media type)
   * 
   * @param  {DOM element} link - the link to scan
   * @return {promise}
   */
  checkLinkForGenericMedia: function(link) {
    var promise = new RSVP.Promise(function(resolve, reject) {

      // first, always check if there's a static image match.
      var mediaData = BetterZoom.staticImage.checkLink(link);
      resolve(mediaData);
    });
    return promise;
  },
  checkLinkForMedia: function(mediaData) {
    var promise = new RSVP.Promise(function(resolve, reject) {
      // first, always check if there's a static image match.
      var link = mediaData.link,
          siteModule;

      mediaData = BetterZoom.staticImage.checkLink(link);
      
      // look up which siteModule to use based on the hostname of this link
      siteModule = BetterZoom.getSiteModule(link.hostname);
      
      // if a siteModule is found, its checkLinkForMedia function will "trump"
      // our generic one, just in case this does sketchy things like serve up
      // an HTML page even though the URL ends in .jpg
      if (siteModule) {
        siteModule.checkLinkForMedia(mediaData)
          .then(function(mediaData) {
            resolve(mediaData);
          });
      } else {
        // no siteModule found, just send back what we got.
        resolve(mediaData);
      }
    });

    return promise;
  },
  /**
   * staticImage is a special siteModule for static images. It's going to
   * be called every single time regardless, but we're still going to call
   * a siteModule just in case, because some websites are bogus, and return
   * HTML even when a URL ends in .jpg, for example.
   * 
   */
  staticImage: {
    checkLink: function(link) {
      var data = {
        link: link
      };
      if ((/\.(jpg|jpeg|png|apng|gif)$/ig).test(link.href)) {
        data.type = 'img';
        data.src = link.href;
      }
      if ((/(.mp4)$/ig).test(link.href)) {
        data.type = 'video';
        data.src = link.href;
      }
      if ((/(.mp3)$/ig).test(link.href)) {
        data.type = 'audio';
        data.src = link.href;
      }

      return data;
    }
  },
  getSiteModule: function (host) {
    var module, mapping;

    host = host.replace('www.','');

    module = this.siteModules[host];
    mapping = this.domainToSiteModule[host];

    if (!module && mapping) {
      module = this.siteModules[mapping];
    }

    return module;
  },
  domainToSiteModule: {
    'i.imgur.com': 'imgur.com'
  },
  siteModules: {
    'flickr.com': {
      apiPrefix: 'http://www.flickr.com/services/oembed/?format=json&url=',
      checkLinkForMedia: function(mediaData) {
        var siteMod = this,
            promise = new RSVP.Promise(function(resolve, reject) {
          
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
          apiURL = siteMod.apiPrefix + href;

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
    },
    'imgur.com': {
      apiPrefix: 'http://api.imgur.com/v2/',
      hashRe: /^https?:\/\/(?:i\.|m\.|edge\.|www\.)*imgur\.com\/(?!gallery)(?!removalrequest)(?!random)(?!memegen)([A-Za-z0-9]{5}|[A-Za-z0-9]{7})[sbtmlh]?(\.(?:jpe?g|gif|png))?(\?.*)?$/i,
      albumHashRe: /^https?:\/\/(?:i\.|m\.)?imgur\.com\/(?:a|gallery)\/([\w]+)(\..+)?(?:\/)?(?:#\w*)?$/i,
      checkLinkForMedia: function(mediaData) {
        var siteMod = this,
            promise = new RSVP.Promise(function(resolve, reject) {
              var href = mediaData.link.href.split('?')[0],
                  groups = siteMod.hashRe.exec(href);

              // imgur direct links are safe. trust them and just resolve.
              if (mediaData.src) {
                resolve(mediaData);
              } else if (groups && !groups[2]) {
                if (groups[1].search(/[&,]/) > -1) {
                  // album code would go here, saving for later.
                  console.log('imgur album');
                } else {
                  mediaData.type = 'img';
                  mediaData.src = 'http://i.imgur.com/' + groups[1] + '.jpg';
                  resolve(mediaData);
                }
              }
        });
        return promise;
      }
    }
  }
};


(function(u) {
  BetterZoom.init();
})();