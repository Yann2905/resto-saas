import {
    simulation,
    scenario,
    atOnceUsers,
    rampUsers,
    constantUsersPerSec,
    global,
    details,
} from "@gatling.io/core";
import { http, status } from "@gatling.io/http";

// ── Configuration ──────────────────────────────────────────────────
const BASE_URL = "https://www.resto-saas.com";
const RESTAURANT_SLUG = "petit-plat";
const TABLE_NUMBER = "1";

export default simulation((setUp) => {
    const httpProtocol = http
        .baseUrl(BASE_URL)
        .acceptHeader(
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        )
        .acceptLanguageHeader("fr-FR,fr;q=0.9,en;q=0.8")
        .acceptEncodingHeader("gzip, deflate, br")
        .userAgentHeader("Gatling-Spike-Test-v2/1.0")
        .disableFollowRedirect();

    // ── SPIKE : 100 utilisateurs lancent la MÊME requête au MÊME instant ──
    const scnSpikeLanding = scenario("SPIKE - Landing page x100")
        .exec(
            http("01 Landing page")
                .get("/")
                .check(status().in(200, 304)),
        );

    const scnSpikeMenu = scenario("SPIKE - Menu restaurant x100")
        .exec(
            http("02 Menu restaurant")
                .get(`/r/${RESTAURANT_SLUG}?table=${TABLE_NUMBER}`)
                .check(status().in(200, 304)),
        );

    const scnSpikePanier = scenario("SPIKE - Panier x100")
        .exec(
            http("03 Panier")
                .get(`/r/${RESTAURANT_SLUG}/cart?table=${TABLE_NUMBER}`)
                .check(status().in(200, 304, 404)),
        );

    const scnSpikeApi = scenario("SPIKE - API keepalive x100")
        .exec(
            http("04 API keepalive")
                .get("/api/keepalive")
                .header("Accept", "application/json")
                .check(status().in(200, 404)),
        );

    // ── Injection : TOUT LE MONDE EN MÊME TEMPS ───────────────────
    setUp(
        scnSpikeLanding.injectOpen(atOnceUsers(100)),
        scnSpikeMenu.injectOpen(atOnceUsers(100)),
        scnSpikePanier.injectOpen(atOnceUsers(100)),
        scnSpikeApi.injectOpen(atOnceUsers(100)),
    )
        .protocols(httpProtocol)
        .assertions(
            global().responseTime().percentile(95).lt(10000),
            global().successfulRequests().percent().gt(80),
            details("01 Landing page").responseTime().percentile(95).lt(8000),
            details("02 Menu restaurant").responseTime().percentile(95).lt(10000),
        );
});
