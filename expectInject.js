var jsdom = require('jsdom');

global.document = jsdom.jsdom('<!doctype html><html><body></body></html>');
global.window = document.defaultView;
global.navigator = global.window.navigator;
global.expect = require('expect.js');
global._ = require('underscore');
global.Backbone = require('./src/backboneConfig.js');
