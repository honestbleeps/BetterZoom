files=("BabelExt.js" "extension.js" "zepto.min.js" "rsvp.js" "betterzoom.css")

mklink Chrome\extension.js ..\lib\extension.js
mklink Opera\includes\extension.user.js ..\..\lib\extension.js
mklink Firefox\data\extension.js ..\..\lib\extension.js
mklink /H Safari.safariextension\extension.js lib\extension.js

mklink Chrome\BabelExt.js ..\lib\BabelExt.js
mklink Opera\includes\BabelExt.js ..\..\lib\BabelExt.js
mklink Firefox\data\BabelExt.js ..\..\lib\BabelExt.js
mklink /H Safari.safariextension\BabelExt.js lib\BabelExt.js

mklink Chrome\zepto.min.js ..\lib\zepto.min.js
mklink Opera\includes\zepto.min.js ..\..\lib\zepto.min.js
mklink Firefox\data\zepto.min.js ..\..\lib\zepto.min.js
mklink /H Safari.safariextension\zepto.min.js lib\zepto.min.js

mklink Chrome\rsvp.js ..\lib\rsvp.js
mklink Opera\includes\rsvp.js ..\..\lib\rsvp.js
mklink Firefox\data\rsvp.js ..\..\lib\rsvp.js
mklink /H Safari.safariextension\rsvp.js lib\rsvp.js

mklink Chrome\betterzoom.css ..\lib\betterzoom.css
mklink Opera\includes\betterzoom.css ..\..\lib\betterzoom.css
mklink Firefox\data\betterzoom.css ..\..\lib\betterzoom.css
mklink /H Safari.safariextension\betterzoom.css lib\betterzoom.css