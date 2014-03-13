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

var BZ, BetterZoom;

BZ = BetterZoom = {
  addModule: function (moduleID, defineModule) {
    // TODO: maybe add a more useful base than this. Not sure if there's
    // anything else worth specifying here, though. The only required
    // function is checkLinkForMedia, and it must return a promise.
    var base = {
      moduleID: moduleID,
      moduleName: moduleID
    };

    var module = defineModule.call(base, base, moduleID) || base;
    BZ.siteModules[moduleID] = module;

    // if there are additional domains, put them in the site mapping
    // object so that they can be easily looked up.
    if (module.additionalDomains) {
      module.additionalDomains.forEach(function(domain) {
        BZ.domainToSiteModule[domain] = moduleID;
      });
    }

  },
  screenPadding: 20, // padding on screen
  //Album Vars
  currentAlbum: [],
  currentAlbumIndex: 0,
  showingAlbum: false, //If this is true, the forward/backwards shortcuts are enabled
  albumBookmarks: [],

  init: function() {
    this.container = $('<div id="BetterZoom-container"></div>');
    // the callout is a triangle that will connect with the image container
    this.callout = $('<div id="BetterZoom-callout"></div>');
    
    // header items
    this.header = $('<div id="BetterZoom-header"></div>');
    this.title = $('<span id="BetterZoom-title">BetterZoom</div>');
    this.toolbar = $('<div id="BetterZoom-toolbar"></div>');

    this.albumInfo = $('<span id="BetterZoom-albumInfo"></div>');
    this.closeButton = 
      $('<div id="BetterZoom-close">&times;</div>')
        .click(BZ.hideMedia);

    this.header.append(this.title, this.toolbar,this.albumInfo, this.closeButton);

    this.mediaContainer = $('<div id="BetterZoom-media">');
    this.loader = $('<div id="BetterZoom-loader"></div>');

    $(this.container)
      .append(this.header, this.mediaContainer)
      .mouseleave(BZ.handleMouseOut)
      .mouseover(BZ.cancelHideTimer);
    
    this.img = new Image();
    $(this.img)
      .on('load', BZ.handleImageLoad);
    this.video = $('<video>');
    this.audio = $('<audio>');

    // this.getMediaLinks();
    $(document.body)
      .on('mouseover', 'a, img', {}, BZ.handleMouseOver)
      .on('mouseout', 'a, img', {}, BZ.handleMouseOut)
      .append(this.container, this.callout);

    $(window).on('mousemove', 'body', BZ.setMouseXY);
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
    BZ.mouse = {
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
    BZ.showTimer = setTimeout(function() {
      BZ.processLink(event.target);
    }, 500);
  },
  processLink: function(ele) {
    if(ele.target === undefined && ele.parentNode !== undefined && ele.parentNode.target !== undefined)
      ele = ele.parentNode;
    BZ.checkLinkForGenericMedia(ele)
      .then(function(mediaData) {
        return BZ.checkLinkForMedia(mediaData);
      }).then(function(mediaData) {
        return BZ.showMedia(mediaData);
      });
  },
  handleMouseOverError: function(error) {
    console.log(error);
  },
  handleMouseOut: function(event) {
    if (BZ.lightBoxActive) {
      return;
    }
    if (BZ.showTimer) {
      clearTimeout(BZ.showTimer);
    }
    BZ.hideTimer = setTimeout(BZ.hideMedia, 500);
  },
  handleImageLoad: function(event) {
    var w = (event) ? event.target.width : null,
        h = (event) ? event.target.height : null,
        pos = BZ.getOptimalImagePosition(w, h);

    if (BZ.img.src) {
        // The callback needs to exist, but nothing needs to be done.
        BabelExt.history.add(BZ.img.src, function() {});
    }

    $(BZ.container)
      .css(
        pos.position
      )
      .css({
        height: 'auto',
        width: 'auto'
      })
      .show();

    BZ.showImageElement();
  },
  showImageElement: function() {
    $(BZ.loader).hide();
    $(BZ.img).show();
  },
  cancelHideTimer: function() {
    if (BZ.hideTimer) {
      clearTimeout(BZ.hideTimer);
    }
  },
  cancelShowTimer: function() {
    if (BZ.showTimer) {
      clearTimeout(BZ.showTimer);
    }
  },
  /**
   * get max width and height the image should be given the available
   * screen real estate to the right or left of the mouse as well as above
   * and below, as well as the proper position for the image.
   *
   * @param  {number} width  width of media
   * @param  {number} height height of media
   * 
   * @return {Object} - object containing maxWidth and maxHeight in integer values
   */
  getOptimalImagePosition: function(width, height) {
    var maxWidth, maxHeight,
        top, left, right, rel,
        offsetX = 30, // how far away horizintally from the mouse, in pixels? account for callout
        // offsetY = 0, // how far away vertically from the mouse, in pixels?
        headerHeight = 60,
        screenWidth = $(window).width(),
        screenHeight = $(window).height(),
        screenTop = $(window).scrollTop(),
        // screenBottom = screenTop + screenHeight,
        // screenCenterY = $(window).scrollTop() + (screenHeight / 2),
        screenCenterX = $(window).scrollLeft() + (screenWidth / 2);

    if (BZ.mouse.x < screenCenterX) {
      // if left of center:
      // - show image to right of the mouse
      // - maxWidth should be distance from mouse to right of screen minus offsetX minus screen padding (don't go all the way to edge of screen)
      rel = 'right';
      left = BZ.mouse.x + offsetX;
      right = null;
      maxWidth = screenWidth - BZ.mouse.x - offsetX - BZ.screenPadding;
    } else {
      // if right of center:
      // - show image to left of mouse, starting at 0
      // - maxWidth should be distance from left of screen to mouse, minus offsetX minus screen padding (don't go all the way to edge of screen)
      rel = 'left';
      left = null;
      right = (screenWidth - BZ.mouse.x) + offsetX - BZ.screenPadding;
      maxWidth = BZ.mouse.x - offsetX - BZ.screenPadding;
    }
  
    top = screenTop + BZ.screenPadding;

    // if the bottom of the image isn't low enough to be next to the callout,
    // fix that by adding more padding to the top.
    if (top + BZ.img.height < BZ.mouse.y) {
      top = BZ.mouse.y - BZ.img.height;
    }

    maxHeight = screenHeight - BZ.screenPadding - headerHeight;  

    return {
      relativeToCenter: rel,
      position: {
        top: top,
        left: left,
        right: right
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
    BZ.showingAlbum = false;      
    BZ.albumInfo.text("");

    $(window).on('keydown', BZ.handleKeyPress);
    var screenTop = $(window).scrollTop(),
        optimalPos = BZ.getOptimalImagePosition(),
        calloutPos;
    
    // cancel any pending hide timer
    this.cancelHideTimer();

    // show the callout arrow right next to the mouse, facing the proper
    // direction based on position relative to center of screen.
    calloutPos = {
      top: Math.max(BZ.mouse.y, screenTop + BZ.screenPadding)
    };
    
    if (optimalPos.relativeToCenter === 'right') {
      // add a bit of padding to allow clicks to still work.
      calloutPos.left = BZ.mouse.x + 10;
      calloutPos.right = null;
    } else {
      // add a bit of padding to allow clicks to still work.
      calloutPos.left = null;
      calloutPos.right = $(window).width() - BZ.mouse.x - 10;
    }

    $(this.callout)
      .css(calloutPos)
      .show()
      .attr('class',optimalPos.relativeToCenter);

    if (mediaData.type === 'img') {
      BZ.populateImage(optimalPos, mediaData.src, mediaData.title);

    } else if (mediaData.type === 'album') {
      // format for an album should always be:
      // {
      //    images: [
      //      {
      //        src: 'http://some.directimage.url/foo.jpg',
      //        title: 'some title text here.'
      //      },
      //      {
      //        src: 'http://some.directimage.url/foo.jpg',
      //        title: 'some title  text here.'
      //      }, 
      //      ...
      //    ]
      // }

      BZ.showingAlbum = true; //Enables Left/Right Shortcuts
      BZ.currentAlbum = mediaData.images;
      var firstImage = mediaData.images[0].src; //This is the best identifier I can find for an album - the url of the first image

      BZ.currentAlbumIndex = BZ.albumBookmarks[firstImage] | 0; //If the album doesn't exist in the bookmarks array, set the index to 0
      BZ.populateImage(optimalPos, mediaData.images[BZ.currentAlbumIndex].src, mediaData.images[BZ.currentAlbumIndex].title);
      BZ.albumInfo.text((BZ.currentAlbumIndex+1)+"/"+BZ.currentAlbum.length); //Sets toolbar album progress text
    }
    return true;
  },
  //The val is the number to add to the index- '1' to move forward, '-1' to move back
  changeAlbumImage: function(val){
    var currentIndex = (BZ.currentAlbumIndex + val)%BZ.currentAlbum.length, //Loops from last to first if needed
        length = BZ.currentAlbum.length;
    if(currentIndex < 0) currentIndex = length -1; //Loops around from the first image to the last if needed


    BZ.albumInfo.text((currentIndex+1)+"/"+length); //Sets the album progress text

    
    BZ.albumBookmarks[BZ.currentAlbum[0].src] = BZ.currentAlbumIndex = currentIndex; //Updates the bookmark array
    var optimalPos = BZ.getOptimalImagePosition();
    BZ.populateImage(optimalPos, BZ.currentAlbum[currentIndex].src, BZ.currentAlbum[currentIndex].title);
  },
  populateImage: function(optimalPos, src, title) {
    // if we've got an image:
    // 1) replace contents of mediaContainer with loader+img (as it might be .video, .audio etc)
    // 2) show the loader
    // 3) update the src of our betterzoom image to that URL
    // 4) upon load, calculate optimal screen position and size
    //    note: this is triggered by the 'load' event on the image

    // empty out the mediaContainer and place in our loader and image.
    $(BZ.mediaContainer)
      .empty()
      .append(BZ.loader)
      .append(BZ.img);

    // hide img and change src to new URL we just received.
    $(BZ.img)
      .hide()
      .attr('src',src);

    $(BZ.title).text(title || 'BetterZoom');

    // set the optimal size for the image
    $(BZ.img).css(optimalPos.size);

    // show container, which contains loader...
    $(BZ.container)
      .css(
        optimalPos.position
      )
      .show();

    // if the image was cached, the onload event won't trigger, so let's
    // trigger it manually if we have an image with a width.
    if (BZ.img.width > 0) {
      BZ.handleImageLoad();
    } else {
      // show loader only if we need to load a new image
      $(BZ.loader)
        .show();
    }
  },
  hideMedia: function() {
    // hide the container and callout
    $(BZ.container).hide();
    $(BZ.callout).hide();

    // stop listening for keys since popup is not showing.
    $(window).off('keydown', BZ.handleKeyPress);
    BZ.lightBoxActive = false;
  },
  lightBox: function() {
    BZ.lightBoxActive = true;
    $(BZ.callout).hide();
    $(BZ.container).css({
      top: BZ.screenPadding + $(window).scrollTop(),
      left: BZ.screenPadding,
      height: $(window).height() - (2 * BZ.screenPadding),
      width: $(window).width() - (2 * BZ.screenPadding)
    });
    $(BZ.img).css({
      maxHeight: $(window).height() - (2 * BZ.screenPadding) - $(BZ.header).height(),
      maxWidth: $(window).width() - (2 * BZ.screenPadding)
    });
  },
  handleKeyPress: function(e) {
    console.log(e.keyCode);
    // handle escape key
    switch (e.keyCode) {
      case 27:
        BZ.hideMedia();
        break;
      case 37: //Left
      if(BZ.showingAlbum)
          BZ.changeAlbumImage(-1);
        break;
      case 39: //Right
      if(BZ.showingAlbum)
           BZ.changeAlbumImage(1);
        break;
      case 90: // z
        BZ.lightBox();
        break;
      case 84: //t
        BabelExt.tabs.create(BZ.img.src, false); //Opens the image in a new tab
        break;
      default:
        break;
    }
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
      var mediaData = BZ.staticImage.checkLink(link);
      resolve(mediaData);
    });
    return promise;
  },
  checkLinkForMedia: function(mediaData) {
    var promise = new RSVP.Promise(function(resolve, reject) {
      // first, always check if there's a static image match.
      var link = mediaData.link,
          siteModule;

      mediaData = BZ.staticImage.checkLink(link);
      
      // look up which siteModule to use based on the hostname of this link
      siteModule = BZ.getSiteModule(link.hostname);
      
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
     if ((/\.(jpg|jpeg|png|apng|gif|.jpg)(\?.*)?$/ig).test(link.href)) {
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

    host = host.split(".").slice(-2).join(".");

    module = this.siteModules[host];
    mapping = this.domainToSiteModule[host];

    if (!module && mapping) {
      module = this.siteModules[mapping];
    }

    return module;
  },
  domainToSiteModule: {},
  siteModules: {}
};


(function(u) {
  BZ.init();
})();