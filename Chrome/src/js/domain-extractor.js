/**
 * @file Works out which domain PwdHash salts a password with.
 * @description Shared by the content script, the popup, the website and (as a port) the Android
 * app. The two modes deliberately use different rules:
 *
 *   legacy  The original PwdHash rule, frozen. Ported line for line from Collin Jackson's 2005
 *           domain-extractor.js so that passwords created with the original site, the old Firefox
 *           extension or the old Android app keep working. It must never be "improved".
 *
 *   modern  A pinned snapshot of the Public Suffix List, which knows about the ~8,800 two-part
 *           suffixes the 2005 list never had (and the ones it got wrong). Pinned rather than live:
 *           a rule added upstream would otherwise silently change an existing password, and the
 *           three platforms would drift apart between releases.
 *
 * Keep this file byte-identical with docs/js/domain-extractor.js; a test enforces it.
 */
var PwdHashDomains = (function () {
    'use strict';

    /**
     * Verbatim from the original domain-extractor.js. Do not add to it: every entry here is part
     * of the compatibility contract, and so is every entry that is missing.
     */
    var LEGACY_TWO_PART_DOMAINS = 'ab.ca|ac.ac|ac.at|ac.be|ac.cn|ac.il|ac.in|ac.jp|ac.kr|ac.nz|ac.th|ac.uk|ac.za|adm.br|adv.br|agro.pl|ah.cn|aid.pl|alt.za|am.br|arq.br|art.br|arts.ro|asn.au|asso.fr|asso.mc|atm.pl|auto.pl|bbs.tr|bc.ca|bio.br|biz.pl|bj.cn|br.com|cn.com|cng.br|cnt.br|co.ac|co.at|co.il|co.in|co.jp|co.kr|co.nz|co.th|co.uk|co.za|com.au|com.br|com.cn|com.ec|com.fr|com.hk|com.mm|com.mx|com.pl|com.ro|com.ru|com.sg|com.tr|com.tw|cq.cn|cri.nz|de.com|ecn.br|edu.au|edu.cn|edu.hk|edu.mm|edu.mx|edu.pl|edu.tr|edu.za|eng.br|ernet.in|esp.br|etc.br|eti.br|eu.com|eu.lv|fin.ec|firm.ro|fm.br|fot.br|fst.br|g12.br|gb.com|gb.net|gd.cn|gen.nz|gmina.pl|go.jp|go.kr|go.th|gob.mx|gov.br|gov.cn|gov.ec|gov.il|gov.in|gov.mm|gov.mx|gov.sg|gov.tr|gov.za|govt.nz|gs.cn|gsm.pl|gv.ac|gv.at|gx.cn|gz.cn|hb.cn|he.cn|hi.cn|hk.cn|hl.cn|hn.cn|hu.com|idv.tw|ind.br|inf.br|info.pl|info.ro|iwi.nz|jl.cn|jor.br|jpn.com|js.cn|k12.il|k12.tr|lel.br|ln.cn|ltd.uk|mail.pl|maori.nz|mb.ca|me.uk|med.br|med.ec|media.pl|mi.th|miasta.pl|mil.br|mil.ec|mil.nz|mil.pl|mil.tr|mil.za|mo.cn|muni.il|nb.ca|ne.jp|ne.kr|net.au|net.br|net.cn|net.ec|net.hk|net.il|net.in|net.mm|net.mx|net.nz|net.pl|net.ru|net.sg|net.th|net.tr|net.tw|net.za|nf.ca|ngo.za|nm.cn|nm.kr|no.com|nom.br|nom.pl|nom.ro|nom.za|ns.ca|nt.ca|nt.ro|ntr.br|nx.cn|odo.br|on.ca|or.ac|or.at|or.jp|or.kr|or.th|org.au|org.br|org.cn|org.ec|org.hk|org.il|org.mm|org.mx|org.nz|org.pl|org.ro|org.ru|org.sg|org.tr|org.tw|org.uk|org.za|pc.pl|pe.ca|plc.uk|ppg.br|presse.fr|priv.pl|pro.br|psc.br|psi.br|qc.ca|qc.com|qh.cn|re.kr|realestate.pl|rec.br|rec.ro|rel.pl|res.in|ru.com|sa.com|sc.cn|school.nz|school.za|se.com|se.net|sh.cn|shop.pl|sk.ca|sklep.pl|slg.br|sn.cn|sos.pl|store.ro|targi.pl|tj.cn|tm.fr|tm.mc|tm.pl|tm.ro|tm.za|tmp.br|tourism.pl|travel.pl|tur.br|turystyka.pl|tv.br|tw.cn|uk.co|uk.com|uk.net|us.com|uy.com|vet.br|web.za|web.com|www.ro|xj.cn|xz.cn|yk.ca|yn.cn|za.com';

    /**
     * The original, kept faithful down to its quirks: it strips only http:// and https:// (and
     * only the first occurrence), takes everything up to the first slash, and never lowercases,
     * so a port number or an uppercase host ends up in the salt exactly as the original had it.
     *
     * Original:
     *   host=host.replace('http:\/\/','');  host=host.replace('https:\/\/','');
     *   re=new RegExp("([^/]+)");  host=host.match(re)[1];  host=host.split('.');
     *   if(host[2]!=null) { s=host[host.length-2]+'.'+host[host.length-1]; ...list lookup... }
     *   else { s=host.join('.'); }
     */
    function extractLegacyDomain(uri) {
        var host = String(uri).replace('http://', '').replace('https://', '');
        var match = host.match(/[^/]+/);
        if (!match) return '';

        var labels = match[0].split('.');
        if (labels[2] == null) return labels.join('.');

        var site = labels[labels.length - 2] + '.' + labels[labels.length - 1];
        var twoPartDomains = LEGACY_TWO_PART_DOMAINS.split('|');
        for (var i = 0; i < twoPartDomains.length; i++) {
            if (site === twoPartDomains[i]) {
                site = labels[labels.length - 3] + '.' + site;
                break;
            }
        }
        return site;
    }

    var publicSuffixRules = null;
    var publicSuffixLoad = null;

    /** Parses the pinned snapshot. Comment lines match the Public Suffix List's own "//" style. */
    function setPublicSuffixRules(text) {
        var rules = new Set();
        var lines = String(text).split('\n');
        for (var i = 0; i < lines.length; i++) {
            var rule = lines[i].trim();
            if (rule && rule.slice(0, 2) !== '//') rules.add(rule);
        }
        if (rules.size === 0) throw new Error('The public suffix list is empty');
        publicSuffixRules = rules;
        return rules;
    }

    /** Fetches the snapshot once and remembers it. Safe to call on every keystroke. */
    function loadPublicSuffixRules(url) {
        if (publicSuffixRules) return Promise.resolve(publicSuffixRules);
        if (!publicSuffixLoad) {
            publicSuffixLoad = fetch(url)
                .then(function (response) {
                    if (!response.ok) throw new Error('HTTP ' + response.status);
                    return response.text();
                })
                .then(setPublicSuffixRules)
                .catch(function (error) {
                    // Let the next attempt retry rather than caching the failure forever.
                    publicSuffixLoad = null;
                    throw error;
                });
        }
        return publicSuffixLoad;
    }

    function isIpAddress(host) {
        if (host.indexOf(':') !== -1) return true; // IPv6, bracketed or not
        return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
    }

    /**
     * How many labels of the host make up its public suffix, by the Public Suffix List algorithm:
     * an exception rule wins outright, otherwise the rule matching the most labels wins, and with
     * no match at all the suffix is the rightmost label. Rules of a single label are not in the
     * snapshot precisely because that last case already covers them.
     */
    function publicSuffixLength(labels, rules) {
        for (var i = 0; i < labels.length; i++) {
            if (rules.has('!' + labels.slice(i).join('.'))) return labels.length - i - 1;
        }

        var best = 1;
        for (var j = 0; j < labels.length; j++) {
            var candidate = labels.slice(j);
            if (candidate.length <= best) continue;
            var wildcard = ['*'].concat(candidate.slice(1)).join('.');
            if (rules.has(candidate.join('.')) || rules.has(wildcard)) best = candidate.length;
        }
        return Math.min(best, labels.length);
    }

    /** Expects a host name, not a URL: already lowercased and punycoded, as browsers hand them out. */
    function extractModernDomain(host) {
        if (!host) return '';
        if (isIpAddress(host)) return host;
        if (!publicSuffixRules) throw new Error('The public suffix list has not been loaded');

        var labels = host.split('.');
        var suffixLength = publicSuffixLength(labels, publicSuffixRules);
        if (labels.length <= suffixLength) return host;
        return labels.slice(labels.length - suffixLength - 1).join('.');
    }

    /**
     * Turns whatever someone typed into a host name. Unlike the legacy path this normalises: URL
     * parsing lowercases, punycodes an internationalised name and drops the port and the path.
     */
    function hostFromInput(value) {
        var trimmed = String(value == null ? '' : value).trim();
        if (!trimmed) return '';

        var withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed) ? trimmed : 'http://' + trimmed;
        var host;
        try {
            host = new URL(withScheme).hostname;
        } catch (error) {
            return '';
        }
        if (host.charAt(0) === '[') return host; // IPv6 literal
        return host.replace(/\.$/, '');
    }

    /** The domain to salt with, for a mode of 'legacy' or 'modern'. */
    function extractDomain(mode, uri) {
        return mode === 'legacy' ? extractLegacyDomain(uri) : extractModernDomain(hostFromInput(uri));
    }

    return {
        extractDomain: extractDomain,
        extractLegacyDomain: extractLegacyDomain,
        extractModernDomain: extractModernDomain,
        hostFromInput: hostFromInput,
        loadPublicSuffixRules: loadPublicSuffixRules,
        setPublicSuffixRules: setPublicSuffixRules
    };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = PwdHashDomains;
