This tool automates the creation of new WordPress sites with ED. Digital's default plugins and theme. It's really only meant for ED. developers, but anyone is free to use it.

## Installation

Prerequisits and assumptions:

* A recent version of Node.js installed on your computer (v6.0+)
* Some kind of local web server (Apache, PHP, MySQL) — Try MAMP PRO or XAMPP on Mac.
* A default MySQL user account which has permission to create and manage databases
* Since we use MAMP PRO, we assume all sites will have a development domain, like `coolsite.dev` or something. You can achieve this manually by editing your `/etc/hosts` file... This is not covered by this guide or tool.

To install, open Terminal and type:

```
npm install -g edwp
```

This will add a new command for you to run at any time, the `ed` command. Note that this will overwrite the 'ed' editor which ships with Mac OS and some Linux distributions.

Now setup your local web server. If you're using MAMP you'll need to configure a couple of things first. 
1. Go to the ports tab and ensure that the MySQL port is set to 3306 (this is not default).
2. Open PHPMyAdmin and create a new user with full priviledges called something other than "root". (the "root" username can be used with XAMPP).

Next, you'll want to create a configuration for your local machine. Make sure MySQL is already running, as it'll attempt to connect.

```
ed settings
```

Follow the prompts to fill in the configuration file. You'll need to fill in the user section with the user your created in PHPMyAdmin.

And you're good to go!

## Creating a site

To create a new site, do something like the following:

```
cd ~/Sites/
ed create coolsite.dev
```

After answering each question carefully, the tool will begin downloading the required resources and creating your site. It may take a little time. At the end of the process, if successful, you'll be shown the URL, username and password for accessing your site.

**Don't forget** to create a new site in MAMP that points to the new folder! 
Alternatively, if you're using XAMPP, add `127.0.0.1 coolsite.dev` to `/etc/hosts` and in `/Applications/XAMPP/xamppfiles/etc/extra/httpd-vhosts.conf` add the following lines.

```
<VirtualHost *:80>
    ServerName coolsite.dev
    DocumentRoot "/path/to/site/"
    <Directory "/path/to/site/">
        Options Indexes FollowSymLinks Includes ExecCGI
        AllowOverride All
        Require all granted
    </Directory>
    ErrorLog "logs/coolsite.dev-error_log"
</VirtualHost> 
```

You may still need to make some configuration changes to your new site after logging in:

* Under **Settings &gt; Permalinks** make sure 'Post name' is selected
* Under **Settings &gt; General**, make sure the title, tagline and timezone is correct
* Advanced Custom Fields does not activate automatically at this point.

## Navigation

Once a site has been created, you can jump to that projects theme folder from anywhere, by typing

```
ed go <project-slug>
```

For sites that were created manually, you can import them using:

```
cd <path-to-site>
ed scan
```

It'll ask you for a project name, and then you're all sorted ;) All it does is create an entry in `~/.ed/projects/`


## Development

Clone this project to your local machine and if you've installed node-edtool from npm, uninstall it now.
```
npm uninstall -g ed-wp
```

Make your changes locally then test by running:

```
npm install
npm link
```
