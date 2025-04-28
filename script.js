// Coin list
const coins = ["bitcoin", "ethereum", "solana", "binancecoin", "cardano", "dogecoin"];
const coinSymbols = {
    bitcoin: "BTC",
    ethereum: "ETH",
    solana: "SOL",
    binancecoin: "BNB",
    cardano: "ADA",
    dogecoin: "DOGE"
};

let livePrices = {};

// Fetch live prices
async function fetchPrices() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin,cardano,dogecoin&vs_currencies=usd');
        const data = await response.json();
        livePrices = {
            BTC: data.bitcoin.usd,
            ETH: data.ethereum.usd,
            SOL: data.solana.usd,
            BNB: data.binancecoin.usd,
            ADA: data.cardano.usd,
            DOGE: data.dogecoin.usd
        };
        buildEventInputs();
    } catch (error) {
        console.error("Error fetching prices:", error);
    }
}

// Build the dynamic inputs
function buildEventInputs() {
    const eventsDiv = document.getElementById('events');
    eventsDiv.innerHTML = "";

    for (const [symbol, price] of Object.entries(livePrices)) {
        const container = document.createElement('div');
        container.className = 'event';

        const label = document.createElement('label');
        label.innerText = `${symbol} Target Price (Current: $${price}):`;

        const input = document.createElement('input');
        input.type = 'number';
        input.id = `${symbol}-target`;
        input.placeholder = "Enter target price";

        const timeframe = document.createElement('select');
        timeframe.id = `${symbol}-timeframe`;

        ["1 Day", "3 Days", "7 Days", "30 Days"].forEach(days => {
            const option = document.createElement('option');
            option.value = days;
            option.innerText = days;
            timeframe.appendChild(option);
        });

        container.appendChild(label);
        container.appendChild(input);
        container.appendChild(timeframe);
        eventsDiv.appendChild(container);
    }
}

// Calculate odds dynamically
function calculateOdds(currentPrice, targetPrice, timeframe) {
    if (targetPrice <= currentPrice) {
        return 1.5; // easy
    }

    const difficulty = (targetPrice - currentPrice) / currentPrice;
    let baseOdds = 2 + difficulty * 10;

    let multiplier = 1.0;
    if (timeframe === "1 Day") multiplier = 1.5;
    if (timeframe === "3 Days") multiplier = 1.3;
    if (timeframe === "7 Days") multiplier = 1.1;
    if (timeframe === "30 Days") multiplier = 1.0;

    const odds = baseOdds * multiplier;

    return Math.max(1.5, Math.min(odds, 50));
}

// Main parlay logic
document.getElementById('confirm-bet').addEventListener('click', () => {
    let selectedEvents = [];

    for (const symbol of Object.keys(livePrices)) {
        const targetInput = document.getElementById(`${symbol}-target`);
        const timeframeSelect = document.getElementById(`${symbol}-timeframe`);
        const target = parseFloat(targetInput.value);

        if (!isNaN(target)) {
            const timeframe = timeframeSelect.value;
            const odds = calculateOdds(livePrices[symbol], target, timeframe);
            selectedEvents.push({ coin: symbol, target, timeframe, odds });
        }
    }

    // Require minimum 3 coins
    const errorMessage = document.getElementById('error-message');
    if (selectedEvents.length < 3) {
        errorMessage.innerText = "⚠️ Please select at least 3 coins with targets!";
        document.getElementById('parlay-summary').innerHTML = "";
        document.getElementById('potential-payout').innerHTML = "";
        return;
    } else {
        errorMessage.innerText = "";
    }

    const betAmount = parseFloat(document.getElementById('bet-amount').value) || 0;
    const combinedOdds = selectedEvents.reduce((total, e) => total * e.odds, 1);
    const potentialPayout = betAmount * combinedOdds;

    document.getElementById('parlay-summary').innerHTML = `
        <h4>Your Parlay:</h4>
        <ul>
            ${selectedEvents.map(e => `<li>${e.coin} > $${e.target} in ${e.timeframe} (${e.odds.toFixed(2)}x)</li>`).join('')}
        </ul>
        <p><strong>Combined Odds:</strong> ${combinedOdds.toFixed(2)}x</p>
    `;

    document.getElementById('potential-payout').innerHTML = `<h4>Potential Payout: $${potentialPayout.toFixed(2)}</h4>`;
});

// Start app
fetchPrices();
