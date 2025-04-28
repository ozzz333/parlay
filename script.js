function getMarginForAssetAndTimeframe(symbol, timeframe) {
    let baseMargin = 0.005; // BTC 0.5%

    let marketCapMultiplier = 1.0; // neutral

    switch (symbol) {
        case "BTC":
            marketCapMultiplier = 1.0; // stays 0.5%
            break;
        case "ETH":
            marketCapMultiplier = 1.2; // slightly larger
            break;
        case "BNB":
            marketCapMultiplier = 1.4;
            break;
        case "SOL":
            marketCapMultiplier = 2.0;
            break;
        case "ADA":
            marketCapMultiplier = 2.4;
            break;
        case "DOGE":
            marketCapMultiplier = 3.0;
            break;
        default:
            marketCapMultiplier = 2.0; // assume medium cap
    }

    let margin = baseMargin * marketCapMultiplier;

    // Now adjust for timeframe
    switch(timeframe) {
        case "1 Day": return margin * 0.7; // tighten margin
        case "3 Days": return margin * 0.85;
        case "7 Days": return margin; // normal
        case "30 Days": return margin * 1.3; // relax margin
        default: return margin;
    }
}
