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

// Create input fields
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
        input.placeholder = `Enter target price`;

        container.appendChild(label);
        container.appendChild(input);
        eventsDiv.appendChild(container);
    }
}

// Calculate odds dynamically
function calculateOdds(currentPrice, targetPrice) {
    if (targetPrice <= currentPrice) {
        return 1.5; // easy targets, low reward
    }
    const difficulty = (targetPrice - currentPrice) / currentPrice;
    let odds = 2 + difficulty * 10;
    return Math.max(1.5, Math.min(odds, 50)); // Keep odds between 1.5x and 50x
}

// Handle parlay
document.getElementById('confirm-bet').addEventListener('click', () => {
    let selectedEvents = [];
    for (const symbol of Object.keys(livePrices)) {
        const targetInput = document.getElementById(`${symbol}-target`);
        const target = parseFloat(targetInput.value);
        if (!isNaN(target)) {
            const odds = calculateOdds(livePrices[symbol], target);
            selectedEvents.push({ coin: symbol, target, odds });
        }
    }

    if (selectedEvents.length === 0) {
        document.getElementById('parlay-summary').innerHTML = "<p style='color:red;'>Please enter at least one target!</p>";
        document.getElementById('potential-payout').innerHTML = "";
        return;
    }

    const betAmount = parseFloat(document.getElementById('bet-amount').value) || 0;
    const combinedOdds = selectedEvents.reduce((total, e) => total * e.odds, 1);
    const potentialPayout = betAmount * combinedOdds;

    document.getElementById('parlay-summary').innerHTML = `
        <h4>Your Parlay:</h4>
        <ul>
            ${selectedEvents.map(e => `<li>${e.coin} > $${e.target} (${e.odds.toFixed(2)}x)</li>`).join('')}
        </ul>
        <p><strong>Combined Odds:</strong> ${combinedOdds.toFixed(2)}x</p>
    `;

    document.getElementById('potential-payout').innerHTML = `<h4>Potential Payout: $${potentialPayout.toFixed(2)}</h4>`;
});

// Start app
fetchPrices();
