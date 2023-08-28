## About

Agitodo is a cross-platform To-Do list / Calendar application. I started working on this project in 2013 and published the first stable version on the Android Store in 2014 as a paid app (under a different name).

The core application is developed in JavaScript (jQuery Mobile) and can be build as a web (Node.js), mobile (Android-Webview), or desktop (Windows/macOS/Linux Qt-Webview) application. Protecting user's privacy is built-in to the application - data are stored encrypted in HTML5 localStorage and can be optionally saved (encrypted) in Dropbox/Google Drive/hubiC. Cloud storage services can also be used to synchronize user's data between on all platforms. Furthermore, the application integrates with Gmail for emailing tasks.

Some parts of the code might still be useful to other projects, such as the Android & Qt Webviews, and Dropbox/Google Drive/hubiC/Gmail APIs integration.

Enjoy!

## Screenshots

![small](https://github.com/pasimako/agitodo/blob/master/small.png)
![large](https://github.com/pasimako/agitodo/blob/master/large.png)

## Building

The building instructions below are for Ubuntu. If you are on a different OS, you can still get an idea of what steps you need to follow.

### Node.js

Dependencies:

```
# Node.js
$ curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
$ sudo apt-get install -y nodejs

# MySQL
$ sudo apt-get install mysql-server
```

Create database:

```
$ mysql -u root -p
CREATE DATABASE agitodo;
USE agitodo;

CREATE TABLE IF NOT EXISTS users (
id INTEGER PRIMARY KEY AUTO_INCREMENT,
email VARCHAR(128) NOT NULL UNIQUE,
password_hash VARCHAR(256) NOT NULL DEFAULT '',
created VARCHAR(64),
last_login VARCHAR(64),
settings TEXT
) ENGINE=InnoDB ROW_FORMAT=COMPRESSED CHARACTER SET utf8 COLLATE utf8_bin;

CREATE TABLE IF NOT EXISTS pending (
id INTEGER PRIMARY KEY AUTO_INCREMENT,
email VARCHAR(128) NOT NULL UNIQUE,
password_hash VARCHAR(256) NOT NULL DEFAULT '',
created VARCHAR(64),
token VARCHAR(128) NOT NULL DEFAULT ''
) ENGINE=InnoDB ROW_FORMAT=COMPRESSED CHARACTER SET utf8 COLLATE utf8_bin;

CREATE USER 'agitodo'@'localhost' IDENTIFIED BY 'PASSWORD';
GRANT ALL ON agitodo.* TO 'agitodo'@'localhost';
FLUSH PRIVILEGES;
```

Build & Run:

```
$ ./build_node.py
$ cd www
$ npm install
$ node bin/create_test_account.js
$ node index.js

# Check bin/create_test_account.js for login credentials
```

### Android

The original version was developed in Eclipse, which I don't use anymore, so I imported the project in the latest Android Studio.

```
$ ./build_android.py

# Then open android/src in Android Studio
```

### Qt

Dependencies:

```
$ sudo apt-get install qtcreator qt5-default libqt5webkit5-dev
```

Build & Run:

```
$ ./build_qt.py

# Then open qt/agitodo/agitodo.pro in Qt Creator
```

## License

Copyright (C) 2013-2017 P. Asimakopoulos

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
