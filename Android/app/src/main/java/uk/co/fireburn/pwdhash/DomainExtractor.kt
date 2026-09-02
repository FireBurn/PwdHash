package uk.co.fireburn.pwdhash

import android.content.Context
import java.net.IDN
import java.util.Locale

/**
 * Works out which domain PwdHash salts a password with. This is a port of
 * Chrome/src/js/domain-extractor.js and must stay in step with it; tests/vectors.txt holds the
 * expectations both are checked against.
 *
 * The two modes deliberately use different rules. Legacy is the original PwdHash rule, frozen, so
 * that passwords made with the original site, the old Firefox extension or the old Android app
 * keep working. Modern uses a pinned snapshot of the Public Suffix List.
 */
object DomainExtractor {

    const val PUBLIC_SUFFIX_LIST_ASSET = "public-suffix-list.txt"

    /**
     * Verbatim from the original domain-extractor.js. Do not add to it: every entry here is part
     * of the compatibility contract, and so is every entry that is missing.
     */
    private const val LEGACY_TWO_PART_DOMAINS = "ab.ca|ac.ac|ac.at|ac.be|ac.cn|ac.il|ac.in|ac.jp|ac.kr|ac.nz|ac.th|ac.uk|ac.za|adm.br|adv.br|agro.pl|ah.cn|aid.pl|alt.za|am.br|arq.br|art.br|arts.ro|asn.au|asso.fr|asso.mc|atm.pl|auto.pl|bbs.tr|bc.ca|bio.br|biz.pl|bj.cn|br.com|cn.com|cng.br|cnt.br|co.ac|co.at|co.il|co.in|co.jp|co.kr|co.nz|co.th|co.uk|co.za|com.au|com.br|com.cn|com.ec|com.fr|com.hk|com.mm|com.mx|com.pl|com.ro|com.ru|com.sg|com.tr|com.tw|cq.cn|cri.nz|de.com|ecn.br|edu.au|edu.cn|edu.hk|edu.mm|edu.mx|edu.pl|edu.tr|edu.za|eng.br|ernet.in|esp.br|etc.br|eti.br|eu.com|eu.lv|fin.ec|firm.ro|fm.br|fot.br|fst.br|g12.br|gb.com|gb.net|gd.cn|gen.nz|gmina.pl|go.jp|go.kr|go.th|gob.mx|gov.br|gov.cn|gov.ec|gov.il|gov.in|gov.mm|gov.mx|gov.sg|gov.tr|gov.za|govt.nz|gs.cn|gsm.pl|gv.ac|gv.at|gx.cn|gz.cn|hb.cn|he.cn|hi.cn|hk.cn|hl.cn|hn.cn|hu.com|idv.tw|ind.br|inf.br|info.pl|info.ro|iwi.nz|jl.cn|jor.br|jpn.com|js.cn|k12.il|k12.tr|lel.br|ln.cn|ltd.uk|mail.pl|maori.nz|mb.ca|me.uk|med.br|med.ec|media.pl|mi.th|miasta.pl|mil.br|mil.ec|mil.nz|mil.pl|mil.tr|mil.za|mo.cn|muni.il|nb.ca|ne.jp|ne.kr|net.au|net.br|net.cn|net.ec|net.hk|net.il|net.in|net.mm|net.mx|net.nz|net.pl|net.ru|net.sg|net.th|net.tr|net.tw|net.za|nf.ca|ngo.za|nm.cn|nm.kr|no.com|nom.br|nom.pl|nom.ro|nom.za|ns.ca|nt.ca|nt.ro|ntr.br|nx.cn|odo.br|on.ca|or.ac|or.at|or.jp|or.kr|or.th|org.au|org.br|org.cn|org.ec|org.hk|org.il|org.mm|org.mx|org.nz|org.pl|org.ro|org.ru|org.sg|org.tr|org.tw|org.uk|org.za|pc.pl|pe.ca|plc.uk|ppg.br|presse.fr|priv.pl|pro.br|psc.br|psi.br|qc.ca|qc.com|qh.cn|re.kr|realestate.pl|rec.br|rec.ro|rel.pl|res.in|ru.com|sa.com|sc.cn|school.nz|school.za|se.com|se.net|sh.cn|shop.pl|sk.ca|sklep.pl|slg.br|sn.cn|sos.pl|store.ro|targi.pl|tj.cn|tm.fr|tm.mc|tm.pl|tm.ro|tm.za|tmp.br|tourism.pl|travel.pl|tur.br|turystyka.pl|tv.br|tw.cn|uk.co|uk.com|uk.net|us.com|uy.com|vet.br|web.za|web.com|www.ro|xj.cn|xz.cn|yk.ca|yn.cn|za.com"

    @Volatile
    private var publicSuffixRules: Set<String>? = null

    /**
     * The original, kept faithful down to its quirks: it strips only http:// and https:// (and
     * only the first occurrence), takes everything up to the first slash, and never lowercases,
     * so a port number or an uppercase host ends up in the salt exactly as the original had it.
     */
    fun extractLegacyDomain(uri: String): String {
        val host = uri.replaceFirst("http://", "").replaceFirst("https://", "")
        val match = Regex("[^/]+").find(host) ?: return ""

        val labels = match.value.split('.')
        if (labels.size < 3) return labels.joinToString(".")

        val site = labels[labels.size - 2] + "." + labels[labels.size - 1]
        return if (LEGACY_TWO_PART_DOMAINS.split('|').contains(site)) {
            labels[labels.size - 3] + "." + site
        } else {
            site
        }
    }

    /** Parses the pinned snapshot. Comment lines match the Public Suffix List's own "//" style. */
    fun setPublicSuffixRules(text: String): Set<String> {
        val rules = text.lineSequence()
            .map { it.trim() }
            .filter { it.isNotEmpty() && !it.startsWith("//") }
            .toSet()
        check(rules.isNotEmpty()) { "The public suffix list is empty" }
        publicSuffixRules = rules
        return rules
    }

    fun loadPublicSuffixRules(context: Context) {
        if (publicSuffixRules != null) return
        val text = context.assets.open(PUBLIC_SUFFIX_LIST_ASSET)
            .bufferedReader()
            .use { it.readText() }
        setPublicSuffixRules(text)
    }

    /** Expects a host name, not a URL: already lowercased and punycoded. */
    fun extractModernDomain(host: String): String {
        if (host.isEmpty()) return ""
        if (isIpAddress(host)) return host
        val rules = checkNotNull(publicSuffixRules) { "The public suffix list has not been loaded" }

        val labels = host.split('.')
        val suffixLength = publicSuffixLength(labels, rules)
        if (labels.size <= suffixLength) return host
        return labels.subList(labels.size - suffixLength - 1, labels.size).joinToString(".")
    }

    /**
     * Turns whatever someone typed into a host name. Unlike the legacy path this normalises:
     * lowercase, punycode, no port and no path.
     */
    fun hostFromInput(value: String): String {
        var rest = value.trim()
        if (rest.isEmpty()) return ""

        val schemeIndex = rest.indexOf("://")
        if (schemeIndex > 0 && Regex("^[a-zA-Z][a-zA-Z0-9+.-]*$").matches(rest.take(schemeIndex))) {
            rest = rest.substring(schemeIndex + 3)
        }
        rest = rest.substringBefore('/').substringBefore('?').substringBefore('#')

        val credentials = rest.lastIndexOf('@')
        if (credentials >= 0) rest = rest.substring(credentials + 1)

        rest = if (rest.startsWith("[")) {
            // IPv6 literal: keep the brackets, drop anything after them.
            val close = rest.indexOf(']')
            if (close < 0) return "" else rest.substring(0, close + 1)
        } else {
            rest.substringBefore(':')
        }

        if (rest.isEmpty() || rest.any { it.isWhitespace() }) return ""
        return try {
            IDN.toASCII(rest).lowercase(Locale.ROOT).removeSuffix(".")
        } catch (_: IllegalArgumentException) {
            ""
        }
    }

    /** The domain to salt with, for the given mode. */
    fun extractDomain(mode: PasswordMode, uri: String): String = when (mode) {
        PasswordMode.LEGACY -> extractLegacyDomain(uri)
        PasswordMode.MODERN -> extractModernDomain(hostFromInput(uri))
    }

    private fun isIpAddress(host: String): Boolean {
        if (host.contains(':')) return true // IPv6, bracketed or not
        return Regex("""^\d{1,3}(\.\d{1,3}){3}$""").matches(host)
    }

    /**
     * How many labels of the host make up its public suffix, by the Public Suffix List algorithm:
     * an exception rule wins outright, otherwise the rule matching the most labels wins, and with
     * no match at all the suffix is the rightmost label. Rules of a single label are not in the
     * snapshot precisely because that last case already covers them.
     */
    private fun publicSuffixLength(labels: List<String>, rules: Set<String>): Int {
        for (i in labels.indices) {
            if (rules.contains("!" + labels.subList(i, labels.size).joinToString("."))) {
                return labels.size - i - 1
            }
        }

        var best = 1
        for (i in labels.indices) {
            val candidate = labels.subList(i, labels.size)
            if (candidate.size <= best) continue
            val wildcard = (listOf("*") + candidate.drop(1)).joinToString(".")
            if (rules.contains(candidate.joinToString(".")) || rules.contains(wildcard)) {
                best = candidate.size
            }
        }
        return minOf(best, labels.size)
    }
}
