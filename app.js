/*
Copyright 2018 Google Inc.
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

var express = require('express');
var formidable = require('formidable');
var cookieParser = require('cookie-parser');

var app = express();
app.use(cookieParser());
app.set('view engine', 'html');
app.engine('html', require('hogan-express'));
app.locals.delimiters = '<% %>';

var axios = require('axios');

var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

var AUTH_COOKIE_MAX_AGE = 1000 * 60 * 60 * 2; //2 hours

var products = [{
  "name": "Jeans"
}, {
  "name": "Hoody"
}, {
  "name": "Hat"
}];

var countries = {
  "items": [{
    "countries": [{
      name: "US"
    }, {
      name: "UK"
    }]
  }]
};

var skuToSizeAndPrice = {
  "1001": {
    "sizes": {
      "XS": 8.99,
      "S": 9.99,
    },
  },
  "1002": {
    "sizes": {
      "S": 10.99,
      "M": 12.99,
      "L": 14.99,
    },
  },
  "1010": {
    "sizes": {
      "L": 11.99,
      "XL": 13.99,
    },
  },
  "1014": {
    "sizes": {
      "M": 7.99,
      "L": 9.99,
      "XL": 11.99,
    },
  },
  "1015": {
    "sizes": {
      "XS": 8.99,
      "S": 10.99,
      "L": 15.99,
    },
  },
  "1016": {
    "sizes": {
      "S": 8.99,
      "L": 14.99,
      "XL": 11.99,
    },
  },
  "1021": {
    "sizes": {
      "XS": 8.99,
      "S": 9.99,
      "M": 12.99,
    },
  },
  "1030": {
    "sizes": {
      "M": 10.99,
      "L": 11.99,
    },
  },
};

app.get('/shirts/sizesAndPrices', function(req, res) {
  var sku = req.query.sku;
  var response = {};
  response[sku] = skuToSizeAndPrice[sku];
  setTimeout(() => res.json(response), 1000); // Simulate network delay.
});

app.get('/countries.json', function(req, res) {
  assertCors(req, res);
  res.send(countries);
});

app.get('/shipping', function(req, res) {
  assertCors(req, res);
  var nextDayAvailability = {};
  var location = req.query.location;
  if (location && location == 'UK') {
    nextDayAvailability = {
      "next-day-availability": "not available"
    }
  } else {
    nextDayAvailability = {
      "next-day-availability": "available"
    }
  }
  res.send(nextDayAvailability)
});

app.get('/autosuggest/search_list', function(req, res) {

  var query = req.query.q;
  var response = {};
  var new_obj_array = products.filter(function(obj) {
    if (obj.name.toLowerCase().includes(query.toLowerCase())) {
      return true;
    }

    return false;
  });
  response = new_obj_array;
  assertCors(req, res);
  res.json(response);
});

app.get('/login', function(req, res) {
  assertCors(req, res);
  var returnUrl = req.query.return;
  res.render('login.html', {
    returnUrl: req.query.return
  });
});

app.post('/submit', function(req, res) {
  var email = req.body.email;
  var password = req.body.password;
  var returnUrl = req.body.returnurl;
  assertCors(req, res);

  // set user as logged in via cookie
  res.cookie('ampEmailLogin', email, {
    maxAge: AUTH_COOKIE_MAX_AGE // 2hr
  });
  res.redirect(returnUrl + '#success=true');
});

app.get('/logout', function(req, res) {
  var email = req.cookies.ampEmailLogin;
  if (email) {
    res.clearCookie('ampEmailLogin');
  }
  assertCors(req, res);
  res.redirect(req.header('Referer') || '/');
});

app.get('/authorization', function(req, res) {
  var response = {};
  var deals = {};
  if (req.cookies.ampEmailLogin) {
    if (req.cookies.ampEmailLogin == 'test1@example.com') {
      deals = [{
        link: "/deals/tshirt-test1.jpg",
        img: "/deals/tshirt-test1.jpg",
        name: "tshirt"
      }, {
        link: "/deals/hoody-test1.jpg",
        img: "/deals/hoody-test1.jpg",
        name: "hoody"
      }]
    } else {
      deals = [{
        link: "/deals/hoody-test2.jpg",
        img: "/deals/hoody-test2.jpg",
        name: "hoody"
      }]
    }
    response = {
      'return': true,
      'loggedIn': true,
      'deals': deals,
      'name': req.cookies.ampEmailLogin.replace("@example.com", "")
    };
  } else {
    response = {
      'return': true,
      'loggedIn': false
    };
  }
  assertCors(req, res);
  res.json(response);

});

app.get("/location-specific-results.json", function(req, res) {
  var ip = 'google.com';

  axios.get('https://freegeoip.net/json/' + ip).then(response => {
    assertCors(req, res);
    res.send({
      location: response.data.city
    });
  });
});

app.post('/shirts/addToCart', function(req, res) {
  // Necessary for AMP CORS security protocol.
  // @see https://github.com/ampproject/amphtml/blob/master/spec/amp-cors-requests.md
  assertCors(req, res);

  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields) {
    if (fields.color && fields.size && fields.quantity) {
      res.status(200).json(fields);
    } else {
      res.status(400).json({
        error: 'Please select a size.'
      });
    }
  });
});

app.post('/favorite', function(req, res) {
  var id = req.query.id;
  assertCors(req, res);
  if (req.cookies.ampFavorite && req.cookies.ampFavorite == 'true') {
    res.clearCookie('ampFavorite');
    res.cookie('ampFavorite', false);
    res.json(false)
  } else {
    res.cookie('ampFavorite', true);
    res.json(true)
  }
});

app.get('/favorite', function(req, res) {
  var id = req.query.id;
  assertCors(req, res);
  if (req.cookies.name == 'ampFavorite') {
    res.json(true)
  } else {
    res.json(false)
  }
});

function assertCors(req, res, opt_validMethods, opt_exposeHeaders) {
  const validMethods = opt_validMethods || ['GET', 'POST', 'OPTIONS'];
  const invalidMethod = req.method + ' method is not allowed. Use POST.';
  const invalidOrigin = 'Origin header is invalid.';
  const invalidSourceOrigin = '__amp_source_origin parameter is invalid.';
  const unauthorized = 'Unauthorized Request';
  var origin;

  if (validMethods.indexOf(req.method) == -1) {
    res.statusCode = 405;
    res.end(JSON.stringify({
      message: invalidMethod
    }));
    throw invalidMethod;
  }

  if (req.headers.origin) {
    origin = req.headers.origin;

  } else if (req.headers['amp-same-origin'] == 'true') {
    origin = getUrlPrefix(req);
  } else {
    return;
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Expose-Headers', [
      'AMP-Access-Control-Allow-Source-Origin'
    ]
    .concat(opt_exposeHeaders || []).join(', '));
  if (req.query.__amp_source_origin) {
    res.setHeader('AMP-Access-Control-Allow-Source-Origin',
      req.query.__amp_source_origin);
  } else {
    res.setHeader('AMP-Access-Control-Allow-Source-Origin',
      origin);
  }
}

function getUrlPrefix(req) {
  return req.protocol + '://' + req.headers.host;
}

app.use('/', express.static('static'));

app.listen(3000, function() {
  console.log(
    'Server for "E-commerce AMP" codelab listening on port 3000!'
  );
});
