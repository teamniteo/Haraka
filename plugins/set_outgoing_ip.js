var outbound = require('./outbound');
var dns      = require('dns');

exports.hook_get_mx = function (next, mail, domain) {
    var self = this;
    outbound.lookup_mx(domain, function (err, mxs) {
        if (err) {
            self.logerror("MX Lookup for " + domain + " failed: " + err);
            if (err.code === dns.NXDOMAIN || err.code === 'ENOTFOUND') {
                return next(DENY, "No Such Domain: " + domain);
            }
            else if (err.code === 'NOMX') {
                return next(DENY, "Nowhere to deliver mail to for domain: " + domain);
            }
            else {
                // every other error is transient
                return next(DENYSOFT, "DNS lookup failure: " + err);
            }
        }
        mxs.forEach(function (mx) {
            mx.bind = 'YOUR_IP_HERE';
        });
        return next(OK, mxs);
    });
}
