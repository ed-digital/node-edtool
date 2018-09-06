module.exports = function(conf, options) {
  return [
    {
      title: "ED WP Plugin",
      name: "http://ed-wp-plugin.ed.com.au/release/ed-plugin-latest.zip"
    },
    {
      title: "ACF Pro",
      name: `https://connect.advancedcustomfields.com/index.php?p=pro&a=download&k=${conf.acfKey}`
    },
    {
      title: "Better Admin Bar",
      name: "better-admin-bar"
    },
    {
      title: "Nested Pages",
      name: "wp-nested-pages"
    }
  ];
};

// Limited Login Attempts
// Varnish
// Advanced WP Update
// Disable Comments
// Cloudflare
// WP Fastest Cache