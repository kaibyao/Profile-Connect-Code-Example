# Profile-Connect-Code-Example
This is a code example for a feature built (called “Profile Connect”) during my time at Sprout. It incorporates back-end API functionality, the JavaScript models and views that drive the user interaction + communication with the API, as well as the HTML/Mustache templates + LESSCSS that result in the view that the user sees.

## The Files

### networkconnect.php

This contains some of the API functionality of Profile Connect. More accurately, we used PHP for parts of our API (the rest of our API endpoints were built in Python/Django), which would then connect to our real API as well as help redirect users after receiving API responses.

### network_connect.stache

The HTML template for Profile Connect. Built using Mustache and rendered with Hogan.js.

### networkconnect.css

The LESSCSS code for Profile Connect.

### network_group_connect.js

The real meat and potatoes that drives the interaction between user and API. Loading the Profile Connect feature would connect to two separate API endpoints for authentication and then for pulling user profile data from the API. After the profile data is loaded into the view, the user would have the option to connect one of their social media profiles by clicking on widgets that would kick off new API requests. The view had to handle multiple states as well as multiple profile models. Built on jQuery, Lodash/underscore.js, and Backbone.js.

### network_group_connect.test

The tests used to make sure current and future functionality don't break. Built on QUnit and enhanced by sinon.js.
